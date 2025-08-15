import {Construct, IConstruct} from "constructs";
import {OdmdBuildNetworking} from "./repos/__networking/odmd-build-networking";
import {OdmdBuildDefaultVpcRds} from "./repos/_default-vpc-rds/odmd-build-default-vpc-rds";
import {AnyOdmdEnVer} from "./model/odmd-enver";
import {OdmdBuild} from "./model/odmd-build";
import {OdmdBuildDefaultKubeEks} from "./repos/_default-kube-eks/odmd-build-default-kube-eks";
import {Aspects} from "aws-cdk-lib";
import {OdmdAspect} from "./model/odmd-aspect";
import {execSync} from "child_process";
import {
    AccountsCentralView,
    AccountToOdmdHostedZoneID,
    GithubReposCentralView,
    OdmdContractsCentralView
} from "./OdmdContractsCentralView";
import {OdmdBuildContractsLib} from "./repos/__contracts/odmd-build-contracts-lib";
import {OdmdCrossRefConsumer} from "./model/odmd-cross-refs";
import {OdmdShareIn} from "./model/odmd-share-refs";
import {OdmdEnverCtnImg} from "./model/odmd-enver-ctn-img";
import {OdmdBuildUserAuth} from "./repos/__user-auth/odmd-build-user-auth";
import {OdmdEnverCdk} from "./model/odmd-enver-cdk";


export abstract class OndemandContracts<
    A extends AccountsCentralView,
    G extends GithubReposCentralView,
    C extends OdmdBuildContractsLib<A, G>
>
    extends Construct implements OdmdContractsCentralView<A, G, C> {

    static readonly RES_PREFIX = "odmd-"
    static readonly REGEX_DBClusterIdentifier = /^[a-z](?:(?![-]{2,})[a-z0-9-]){1,62}(?<!-)$/
    static readonly REGEX_DabaseName = /^[A-Za-z_][A-Za-z0-9_$]{0,62}$/
    static readonly STACK_PARAM_ODMD_DEP_REV = 'odmdDepRev'
    static readonly STACK_PARAM_ODMD_BUILD = 'odmdBuildId'
    static readonly STACK_PARAM_BUILD_SRC_REV = 'buildSrcRev'
    static readonly STACK_PARAM_BUILD_SRC_REF = 'buildSrcRef'
    static readonly STACK_PARAM_BUILD_SRC_REPO = 'buildSrcRepo'


    protected _userAuth?: OdmdBuildUserAuth;
    get userAuth(): OdmdBuildUserAuth | undefined {
        return this._userAuth;
    }

    protected _networking?: OdmdBuildNetworking;
    get networking(): OdmdBuildNetworking | undefined {
        return this._networking;
    }

    protected _eksCluster?: OdmdBuild<OdmdEnverCdk>;
    get eksCluster(): OdmdBuild<OdmdEnverCdk> | undefined {
        return this._eksCluster;
    }

    protected _defaultVpcRds?: OdmdBuildDefaultVpcRds;
    get defaultVpcRds(): OdmdBuildDefaultVpcRds | undefined {
        return this._defaultVpcRds;
    }

    protected _defaultEcrEks?: OdmdBuildDefaultKubeEks;
    get defaultEcrEks(): OdmdBuildDefaultKubeEks | undefined {
        return this._defaultEcrEks;
    }

    public getAccountName(accId: string) {
        return Object.entries(this.accounts).find(([k, v]) => v == accId)![0] as keyof AccountsCentralView
    }

    abstract get allAccounts(): string[]

    get subDomain(): string|undefined{
        return undefined
    }

    get accountToOdmdHostedZoneID(): AccountToOdmdHostedZoneID|undefined{
        return undefined
    }

    protected _contractsLibBuild: C;
    get contractsLibBuild(): C {
        if (!this._contractsLibBuild) {
            throw new Error('Contracts Lib not initialized yet')
        }
        return this._contractsLibBuild
    }

    abstract createContractsLibBuild(): C

    abstract get accounts(): A

    get githubRepos(): G {
        throw new Error("abstract!")
    }

    protected _builds: Array<OdmdBuild<AnyOdmdEnVer>> = []

    public get odmdBuilds(): Array<OdmdBuild<AnyOdmdEnVer>> {
        return this._builds
    }

    public static readonly REV_REF_name = 'ODMD_rev_ref'

    public static get REV_REF_value(): string | undefined {
        return process.env[this.REV_REF_name]
    }

    constructor(scope: IConstruct, id?: string) {
        super(scope, id ?? 'ondemandenv');

        const aspects = Aspects.of(scope);
        if (!aspects.all.find(a => a instanceof OdmdAspect)) {
            aspects.add(new OdmdAspect())
        }

        // Initialize all builds
        this.initializeBuilds();
    }

    // Main initialization method
    protected initializeBuilds(): void {
        this._contractsLibBuild = this.createContractsLibBuild();
        if (this.githubRepos.__userAuth) {
            this.initializeUserAuth();
        }
        if (this.githubRepos.__networking && this.accounts.networking) {
            this.initializeNetworking();
        } else if (this.githubRepos.__networking || this.accounts.networking) {
            throw new Error(`githubRepos.__networking: ${
                this.githubRepos.__networking
            } accounts.networking: ${
                this.accounts.networking
            } have to be defined together to define networking `);

        }
        if (this.githubRepos.__eks) {
            this.initializeEksCluster();
        }
        if (this.githubRepos._defaultVpcRds) {
            this.initializeDefaultVpcRds()
        }
        if (this.githubRepos._defaultKubeEks) {
            this.initializeDefaultKubeEks()
        }
    }


    protected initializeUserAuth(): void {
        // this._userAuth = new OdmdBuildUserAuth(this);
        throw new Error('initializeUserAuth is not implemented/overridden !')
    }

    protected initializeNetworking(): void {
        throw new Error('initializeNetworking is not implemented/overridden !')
    }

    protected initializeEksCluster(): void {
        throw new Error('initializeEksCluster is not implemented/overridden !')
    }

    protected initializeDefaultVpcRds(): void {
        this._defaultVpcRds = new OdmdBuildDefaultVpcRds(this);
    }

    protected initializeDefaultKubeEks(): void {
        this._defaultEcrEks = new OdmdBuildDefaultKubeEks(this);
    }

    getTargetEnver(buildId = process.env['ODMD_build_id'], enverRef = OndemandContracts.REV_REF_value) {

        //ODMD_rev_ref=b..master-_b..ta

        if (!buildId || !enverRef) {
            throw new Error(`if (!buildId || !enverRef): ${buildId} || ${enverRef} check: env: ODMD_build_id`);
        }
        const b = this.odmdBuilds.find(b => b.buildId == buildId)
        if (!b) {
            throw new Error(`can't find build by id:${buildId}`)
        }

        const found = b.envers.find(e => e.targetRevision.toPathPartStr() == enverRef)
        if (found) {
            if (found.targetRevision.type == "b") {
                const currentBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
                if (currentBranch != found.targetRevision.value) {
                    console.warn(`currentBranch[ ${currentBranch} ]!= found.targetRevision.value[ ${found.targetRevision.value} ]`)
                }
            } else {
                const currentTags = execSync('git tag --points-at HEAD').toString().trim().split('\n')
                if (!currentTags.find(t => t == found.targetRevision.value)) {
                    console.warn(`currentTags[ ${currentTags.join()} ] not including found.targetRevision.value[ ${found.targetRevision.value} ]`)
                }
            }
            return found
        }
        throw new Error(`can't find envers by ref:${enverRef} in buildId:${buildId}`)
    }

    /**
     *
     * @param s  `${OdmdCrossRefConsumer.OdmdRef_prefix}\${${this.node.path}}`
     * @param s  "OdmdRefConsumer: ${a/b/c}"
     *
     */
    public getRefConsumerFromOdmdRef(s: string): OdmdCrossRefConsumer<AnyOdmdEnVer, AnyOdmdEnVer> {
        if (!s.startsWith(OdmdCrossRefConsumer.OdmdRef_prefix + "${")) {
            throw new Error('Only OdmdRefConsumer')
        }

        const tmp = s.substring(OdmdCrossRefConsumer.OdmdRef_prefix.length + 2)
        const targetPath = tmp.substring(0, tmp.indexOf("}"));

        for (const b of this.odmdBuilds) {
            const f = b.node.findAll().find(e => e.node.path == targetPath)
            if (f) {
                return f as OdmdCrossRefConsumer<AnyOdmdEnVer, AnyOdmdEnVer>;
            }
        }
        throw new Error('/')
    }

    //being used in OdmdCrossRefConsumer.getSharedValue
    private readonly _sharingIns: Map<string, OdmdShareIn> = new Map<string, OdmdShareIn>();


    public odmdValidate() {
        function onlyProducerAllowed(enver: IConstruct) {
            const f = enver.node.findAll().find(n => n instanceof OdmdCrossRefConsumer)
            if (f) {
                throw new Error(`onlyProducerAllowed but found: ${enver.node.path} contains ${f.node.path}`)
            }
        }

        this.contractsLibBuild.envers.forEach(enver => {
            onlyProducerAllowed(enver);
        })

        this._builds.forEach(b => {
            b.envers.forEach(enver => {
                if (enver instanceof OdmdEnverCtnImg) {
                    onlyProducerAllowed(enver);
                }
            })
        })


        this.node.findAll().filter(enver => enver instanceof OdmdCrossRefConsumer).forEach(enver => {
            const c = enver as OdmdCrossRefConsumer<AnyOdmdEnVer, AnyOdmdEnVer>
            if (c.owner.targetAWSRegion != c.producer.owner.targetAWSRegion) {
                throw new Error(` cross region is not supported: consumer ${c.owner.node.path} in region ${c.owner.targetAWSRegion}, but producer ${c.producer.node.path} is in region ${c.producer.owner.targetRevision}`)
            }
        })


        let tmpSet = new Set(this.odmdBuilds);
        if (tmpSet.size != this.odmdBuilds.length) {
            tmpSet.forEach(b => {
                const i = this.odmdBuilds.indexOf(b)
                this.odmdBuilds.splice(i, 1)
            })

            throw new Error('duplicated envers?!')
        }

        this._builds.forEach(b => {
            if (!(b instanceof OdmdBuildDefaultVpcRds || b instanceof OdmdBuildDefaultKubeEks)
                && (b.envers == undefined || b.envers.length == 0)) {
                throw new Error(b.buildId + ' has 0 envers defined!')
            }
        })


    }
}
