import {Construct, IConstruct} from "constructs";
import {OdmdConfigNetworking} from "./repos/__networking/odmd-config-networking";
import {OdmdBuildEksCluster} from "./repos/__eks/odmd-build-eks-cluster";
import {OdmdBuildDefaultVpcRds} from "./repos/_default-vpc-rds/odmd-build-default-vpc-rds";
import {AnyContractsEnVer} from "./odmd-model/contracts-enver";
import {ContractsBuild, SRC_Rev_REF} from "./odmd-model/contracts-build";
import {OdmdBuildDefaultKubeEks} from "./repos/_default-kube-eks/odmd-build-default-kube-eks";
import {Aspects} from "aws-cdk-lib";
import {ContractsAspect} from "./odmd-model/contracts-aspect";
import {execSync} from "child_process";
import {AccountsCentralView, GithubReposCentralView, OdmdContractsCentralView} from "./OdmdContractsCentralView";
import {OdmdBuildOdmdContracts} from "./repos/__contracts/odmd-build-odmd-contracts";
import {ContractsCrossRefConsumer} from "./odmd-model/contracts-cross-refs";
import {ContractsShareIn} from "./odmd-model/contracts-share-values";
import {ContractsEnverCtnImg} from "./odmd-model/contracts-enver-ctn-img";


export abstract class OndemandContracts<
    A extends AccountsCentralView,
    G extends GithubReposCentralView,
    C extends OdmdBuildOdmdContracts<A, G>
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


    readonly networking?: OdmdConfigNetworking

    readonly eksCluster?: OdmdBuildEksCluster
    readonly defaultVpcRds?: OdmdBuildDefaultVpcRds
    readonly defaultEcrEks?: OdmdBuildDefaultKubeEks

    readonly DEFAULTS_SVC?: ContractsBuild<AnyContractsEnVer>[]


    public getAccountName(accId: string) {
        return Object.entries(this.accounts).find(([k, v]) => v == accId)![0] as keyof AccountsCentralView
    }

    abstract get allAccounts(): string[]

    abstract get odmdConfigOdmdContractsNpm(): C

    abstract get accounts(): A

    get githubRepos(): G {
        throw new Error("abstract!")
    }

    private _builds: Array<ContractsBuild<AnyContractsEnVer>>

    public get odmdBuilds(): Array<ContractsBuild<AnyContractsEnVer>> {
        if (!this._builds) {
            this._builds = [
                this.odmdConfigOdmdContractsNpm
            ]

            if (this.networking) {
                this._builds.push(this.networking)
            }
            if (this.eksCluster) {
                this._builds.push(this.eksCluster)
            }
            if (this.defaultVpcRds) {
                this._builds.push(this.defaultVpcRds)
            }
            if (this.defaultEcrEks) {
                this._builds.push(this.defaultEcrEks)
            }
        }
        return this._builds
    }

    public static readonly REV_REF_name = 'target_rev_ref'

    public static get REV_REF_value(): string {
        return process.env[this.REV_REF_name]!
    }

    constructor(scope: IConstruct, id?: string) {
        super(scope, id ?? 'ondemandenv');

        const aspects = Aspects.of(scope);
        if (!aspects.all.find(a => a instanceof ContractsAspect)) {
            aspects.add(new ContractsAspect())
        }

        if (this.githubRepos.__networking) {
            this.networking = new OdmdConfigNetworking(this)
        }

        if (this.githubRepos.__eks) {
            this.eksCluster = new OdmdBuildEksCluster(this)
        }

        this.DEFAULTS_SVC = [] as ContractsBuild<AnyContractsEnVer>[]
        if (this.githubRepos._defaultVpcRds) {
            this.defaultVpcRds = new OdmdBuildDefaultVpcRds(this)
            this.DEFAULTS_SVC.push(this.defaultVpcRds)
        }

        if (this.githubRepos._defaultKubeEks) {
            this.defaultEcrEks = new OdmdBuildDefaultKubeEks(this)
            this.DEFAULTS_SVC.push(this.defaultEcrEks)
        }

        if (!process.env.CDK_CLI_VERSION) {
            throw new Error("have to have process.env.CDK_CLI_VERSION!")
        }

        const buildRegion = process.env.CDK_DEFAULT_REGION;
        let buildAccount: string;
        if (process.env.CDK_DEFAULT_ACCOUNT) {
            buildAccount = process.env.CDK_DEFAULT_ACCOUNT;
        } else {
            console.log(`process.env.CDK_DEFAULT_ACCOUNT undefined, trying to find account in CodeBuild with CODEBUILD_BUILD_ARN: ${process.env.CODEBUILD_BUILD_ARN}`)
            if (!process.env.CODEBUILD_BUILD_ARN) {
                throw new Error(`process.env.CODEBUILD_BUILD_ARN undefined, unable to initialize without account information.`)
            }
            buildAccount = process.env.CODEBUILD_BUILD_ARN!.split(":")[4];
        }
        if (!buildRegion || !buildAccount) {
            throw new Error("buildRegion>" + buildRegion + "; buildAccount>" + buildAccount)
        }
    }

    getTargetEnver() {
        const buildId = process.env['target_build_id']

        //target_rev_ref=b..master-_b..ta
        const enverRef = OndemandContracts.REV_REF_value
        if (!buildId || !enverRef) {
            throw new Error(`if (!buildId || !enverRef): ${buildId} || ${enverRef} check: env: target_build_id`);
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

        if (!enverRef.includes('-_')) {
            console.log(`${enverRef} not found `)
            return undefined
        }
        const idx = enverRef.indexOf('-_')
        const orgEnver = b.envers.find(e => e.targetRevision.toPathPartStr() == enverRef.substring(0, idx))!

        const nwEnverRevref = enverRef.substring(idx + 2)

        const nwEnver = orgEnver.generateDynamicEnver(new SRC_Rev_REF(
            nwEnverRevref.startsWith('b..') ? 'b' : 't',
            nwEnverRevref.substring(3), orgEnver.targetRevision
        ))

        b.envers.push(nwEnver)

        return nwEnver
    }

    /**
     *
     * @param s  `${ContractsCrossRefConsumer.OdmdRef_prefix}\${${this.node.path}}`
     * @param s  "OdmdRefConsumer: ${a/b/c}"
     *
     */
    public getRefConsumerFromOdmdRef(s: string): ContractsCrossRefConsumer<AnyContractsEnVer, AnyContractsEnVer> {
        if (!s.startsWith(ContractsCrossRefConsumer.OdmdRef_prefix + "${")) {
            throw new Error('Only OdmdRefConsumer')
        }

        const tmp = s.substring(ContractsCrossRefConsumer.OdmdRef_prefix.length + 2)
        const targetPath = tmp.substring(0, tmp.indexOf("}"));

        for (const b of this.odmdBuilds) {
            const f = b.node.findAll().find(e => e.node.path == targetPath)
            if (f) {
                return f as ContractsCrossRefConsumer<AnyContractsEnVer, AnyContractsEnVer>;
            }
        }
        throw new Error('/')
    }

    //used in ContractsCrossRefConsumer.getSharedValue
    private readonly _sharingIns: Map<string, ContractsShareIn> = new Map<string, ContractsShareIn>();


    public validate() {
        function onlyProducerAllowed(enver: IConstruct) {
            const f = enver.node.findAll().find(n => n instanceof ContractsCrossRefConsumer)
            if (f) {
                throw new Error(`onlyProducerAllowed but found: ${enver.node.path} contains ${f.node.path}`)
            }
        }

        this.odmdConfigOdmdContractsNpm.envers.forEach(enver => {
            onlyProducerAllowed(enver);
        })

        this._builds.forEach(b => {
            b.envers.forEach(enver => {
                if (enver instanceof ContractsEnverCtnImg) {
                    onlyProducerAllowed(enver);
                }
            })
        })
    }
}
