import {Construct} from "constructs";
import {OdmdConfigNetworking} from "./repos/__networking/odmd-config-networking";
import {OdmdBuildEksCluster} from "./repos/__eks/odmd-build-eks-cluster";
import {OdmdBuildDefaultVpcRds} from "./repos/_default-vpc-rds/odmd-build-default-vpc-rds";
import {AnyContractsEnVer} from "./odmd-model/contracts-enver";
import {ContractsBuild, SRC_Rev_REF} from "./odmd-model/contracts-build";
import {OdmdBuildDefaultKubeEks} from "./repos/_default-kube-eks/odmd-build-default-kube-eks";
import {App, Aspects} from "aws-cdk-lib";
import {ContractsAspect} from "./odmd-model/contracts-aspect";
import {OdmdConfigOdmdContractsNpm} from "./repos/__contracts/odmd-build-odmd-contracts-npm";
import {execSync} from "child_process";
import {AccountsCentralView, GithubReposCentralView, OdmdContractsCentralView} from "./OdmdContractsCentralView";


export abstract class OndemandContracts extends Construct implements OdmdContractsCentralView {

    static readonly RES_PREFIX = "odmd-"
    static readonly REGEX_DBClusterIdentifier = /^[a-z](?:(?![-]{2,})[a-z0-9-]){1,62}(?<!-)$/
    static readonly REGEX_DabaseName = /^[A-Za-z_][A-Za-z0-9_$]{0,62}$/
    static readonly STACK_PARAM_ODMD_DEP_REV = 'odmdDepRev'
    static readonly STACK_PARAM_ODMD_BUILD = 'odmdBuildId'
    static readonly STACK_PARAM_BUILD_SRC_REV = 'buildSrcRev'
    static readonly STACK_PARAM_BUILD_SRC_REF = 'buildSrcRef'
    static readonly STACK_PARAM_BUILD_SRC_REPO = 'buildSrcRepo'

    public readonly odmdConfigOdmdContractsNpm

    public readonly networking

    public readonly eksCluster
    public readonly defaultVpcRds
    public readonly defaultEcrEks

    public readonly DEFAULTS_SVC


    public readonly accounts: AccountsCentralView

    public getAccountName(accId: string) {
        return Object.entries(this.accounts).find(([k, v]) => v == accId)![0] as keyof AccountsCentralView
    }

    public readonly allAccounts: string[]

    public readonly githubRepos: GithubReposCentralView

    public readonly odmdBuilds: Array<ContractsBuild<AnyContractsEnVer>>;


    private static _inst: OdmdContractsCentralView;

    public static get inst(): OdmdContractsCentralView {
        return this._inst
    }

    public static readonly REV_REF_name = 'target_rev_ref'

    public static get REV_REF_value(): string {
        return process.env[this.REV_REF_name]!
    }

    constructor(app: App,
                contractsBuildClass: new (scope: OndemandContracts
                ) => OdmdConfigOdmdContractsNpm,
                accountOverriding: AccountsCentralView | undefined = undefined,
                srcReposOverriding: GithubReposCentralView | undefined = undefined) {
        super(app, 'ondemandenv');
        if (OndemandContracts._inst) {
            throw new Error(`can't init twice`)
        }
        OndemandContracts._inst = this
        Aspects.of(app).add(new ContractsAspect())

        this.accounts = {
            central: '1111central111',
            networking: '222networking222',
            workspace0: '333workspace333',
        }

        if (!accountOverriding && process.env.ODMD_ACCOUNTS) {
            let accountsJsonStr = Buffer.from(process.env.ODMD_ACCOUNTS!, 'base64').toString('utf-8');
            accountOverriding = JSON.parse(accountsJsonStr) as AccountsCentralView
            console.log(`accountsJsonStr>>>
            
            ${accountsJsonStr}
            
            accountsJsonStr<<<`)
        }
        if (accountOverriding) {
            const keys = Object.keys(this.accounts)
            console.warn(`keys: ${JSON.stringify(keys)}`)
            console.warn(`accountOverriding: ${JSON.stringify(accountOverriding)}`)

            for (const k in accountOverriding) {
                // @ts-ignore
                console.log(`${k} >> ${accountOverriding[k]}`)
            }


            Object.entries(accountOverriding).forEach(ovr => {


                console.warn(`
                
                ovr[0]: ${ovr[0]}
                ovr[1]: ${ovr[1]} 
                
                `)


                if (!keys.includes(ovr[0])) {
                    throw new Error(`wrong account overriding: ${ovr[0]}:  ${ovr[1]}`)
                }
                this.accounts[ovr[0] as keyof AccountsCentralView] = ovr[1] as string
            })
        }

        const accEntries = Object.entries(this.accounts);
        if (Array.from(accEntries.keys()).length != Array.from(accEntries.values()).length) {
            throw new Error("Account name to number has to be 1:1!")
        }

        if (srcReposOverriding) {
            this.githubRepos = srcReposOverriding
        } else if (process.env.ODMD_GH_REPOS) {
            this.githubRepos = JSON.parse(Buffer.from(process.env.ODMD_GH_REPOS, 'base64').toString("utf-8")) as GithubReposCentralView
        } else {
            this.githubRepos = {
                __contracts: {owner: 'odmd', name: 'contracts', ghAppInstallID: 1234},
                __eks: {owner: 'odmd', name: 'eks', ghAppInstallID: 1234},
                __networking: {owner: 'odmd', name: 'networking', ghAppInstallID: 1234},
                _defaultKubeEks: {owner: 'odmd', name: 'defaultKubeEks', ghAppInstallID: 1234},
                _defaultVpcRds: {owner: 'odmd', name: 'defaultVpcRds', ghAppInstallID: 1234}
            }
        }

        this.allAccounts = Object.values(this.accounts)
        this.odmdConfigOdmdContractsNpm = new contractsBuildClass(this)

        this.networking = new OdmdConfigNetworking(this)

        this.eksCluster = new OdmdBuildEksCluster(this)
        this.defaultVpcRds = new OdmdBuildDefaultVpcRds(this)
        this.defaultEcrEks = new OdmdBuildDefaultKubeEks(this)

        this.DEFAULTS_SVC = [this.defaultVpcRds, this.defaultEcrEks] as ContractsBuild<AnyContractsEnVer>[]


        this.odmdBuilds = [
            this.odmdConfigOdmdContractsNpm,
            this.networking,
            this.eksCluster,
            this.defaultVpcRds,
            this.defaultEcrEks,
        ]
        if (new Set(this.odmdBuilds).size != this.odmdBuilds.length) {
            throw new Error('duplicated envers?!')
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
            throw new Error(`if (!buildId || !enverRef): ${buildId} || ${enverRef}`);
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
}
