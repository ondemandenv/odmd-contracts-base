import {Construct} from "constructs";
import {OdmdEnver} from "./odmd-enver";
import {OdmdEnverCdk} from "./odmd-enver-cdk";
import {OdmdEnverCtnImg} from "./odmd-enver-ctn-img";
import {OndemandContracts} from "../OndemandContracts";
import {AccountsCentralView, GithubReposCentralView} from "../OdmdContractsCentralView";
import {OdmdBuildContractsLib} from "../repos/__contracts/odmd-build-contracts-lib";
import {PolicyStatement} from "aws-cdk-lib/aws-iam";


export type GithubRepo = {
    owner: string
    name: string
    ghAppInstallID: number
}

// export abstract class OdmdBuild<T extends OdmdEnVerConfig> extends Construct {
export abstract class OdmdBuild<T extends OdmdEnver<OdmdBuild<T>>> extends Construct {

    constructor(scope: OndemandContracts<
        AccountsCentralView,
        GithubReposCentralView, OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView>
    >, id: string, repo: GithubRepo) {
        super(scope, id);
        this.buildId = id
        this.gitHubRepo = repo

        // @ts-ignore
        scope._builds.push(this)
        
        // Initialize envers through dedicated method
        this.initializeEnvers()
        if( this.buildId == process.env['ODMD_build_id'] && OndemandContracts.REV_REF_value){
            const enverRef = OndemandContracts.REV_REF_value
            if (!enverRef.includes('-_')) {
                return
            }
            this.genDynamicEnvers(enverRef);
        }
    }

    private genDynamicEnvers(enverRef: string) {
        const idx = enverRef.indexOf('-_')
        const orgEnver = this.envers.find(e => e.targetRevision.toPathPartStr() == enverRef.substring(0, idx))!

        const nwEnverRevref = enverRef.substring(idx + 2)

        const nwEnver = orgEnver.generateDynamicEnver(new SRC_Rev_REF(
            nwEnverRevref.startsWith('b..') ? 'b' : 't',
            nwEnverRevref.substring(3), orgEnver.targetRevision
        ))

        this.envers.push(nwEnver as T)
    }

// New method for initializing envers
    protected abstract initializeEnvers(): void;

    public get contracts() {
        return this.node.scope as OndemandContracts<
            AccountsCentralView,
            GithubReposCentralView, OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView>
        >
    }

    public readonly extraIamStatements: PolicyStatement[]

    public readonly buildId: string

    readonly description?: string
    readonly gitHubRepo: GithubRepo

    abstract get envers(): Array<T>;

    readonly workDirs?: Array<string>

    /**
     * notification
     */
    abstract readonly ownerEmail?: string

    private getPathToRoot(obj: T): object[] {
        const path = [];
        while (obj) {
            path.push(obj);
            obj = Object.getPrototypeOf(obj);
        }
        return path.reverse()
    }

    public getEnverCommonAncestor() {
        if (this.envers.length == 0) {
            throw new Error('n/a')
        }
        const paths = this.envers.filter(e =>
            e.targetRevision.origin == undefined).map(this.getPathToRoot)
        const shortestPathLength = Math.min(...paths.map(path => path.length));
        if (shortestPathLength > 1000) {
            throw new Error('n/a')
        }

        let i = 0;
        for (; i < shortestPathLength; i++) {
            const currentClasses = paths.map(path => path[i].constructor);
            if (!currentClasses.every(cls => cls === currentClasses[0])) {
                break;
            }
        }

        let rt = paths[0][i - 1]!.constructor!;
        while (rt) {
            const n = OdmdBuild.SUPPORTED_ENVER_CLASSES.find(c => {
                return c == rt
            })
            if (n) {
                return n
            }
            rt = Object.getPrototypeOf(rt)
            console.log(rt)
        }

        return rt
    }

    static SUPPORTED_ENVER_CLASSES = [
        OdmdEnverCdk, OdmdEnverCtnImg, OdmdEnver
    ]
}


export class SRC_Rev_REF {
    constructor(type: "b" | "t", value: string, origin: SRC_Rev_REF | undefined = undefined) {
        this.type = type;
        if (!/^[a-zA-Z0-9_.-]+$/.test(value)) {
            throw new Error(`SRC_Rev_REF's value should be /^[a-zA-Z0-9_.-]+$/, got ${value}`)
        }
        if (value.includes('..')) {//reserved
            throw new Error(`SRC_Rev_REF's value should not have .. , got ${value}`)
        }
        if (value.includes('_-')) {// reserved
            throw new Error(`SRC_Rev_REF's value should not have _- , got ${value}`)
        }
        if (value.includes('-_')) {// is reserved
            throw new Error(`SRC_Rev_REF's value should not have -_ , got ${value}`)
        }
        if (type == 'b' && value.toLowerCase().startsWith('v')) {
            throw new Error(`branch name can't start with v which is reserved for tagging`)
        }

        this.value = value;

        /*OndemandContracts.inst.allAccounts.forEach(ac => {
            if (value.includes(ac)) {
                throw new Error(`${ac} is an account and should not be used in revRef!`)
            }
        })*/

        if (origin) {
            if (origin.origin) {
                throw new Error(`Illegal origin: ${origin}, origin can't have origin`)
            }
            if (origin.value == this.value && origin.type == this.type) {
                throw new Error(`type & value can not be same as origin :${origin.type}..${origin.value}`)
            }
        }
        this.origin = origin
    }

    // readonly type: "branch" | "tag"
    readonly type: "b" | "t"
    readonly value: string
    /**
     * b:branch_name
     * t:tag_name
     */
    readonly origin: SRC_Rev_REF | undefined

    toString() {
        throw new Error('n/a')
        // return this.toPathPartStr()
        // return this.type + ':' + this.value + (this.origin ? `@${this.origin}` : '');
    }

    /**
     *
     * Parameter names are case sensitive.
     *
     * A parameter name must be unique within an AWS Region
     *
     * A parameter name can't be prefixed with "aws" or "ssm" (case-insensitive).
     *
     * Parameter names can include only the following symbols and letters: a-zA-Z0-9_.-
     *
     * In addition, the slash character ( / ) is used to delineate hierarchies in parameter names. For example: /Dev/Production/East/Project-ABC/MyParameter
     *
     * A parameter name can't include spaces.
     *
     * Parameter hierarchies are limited to a maximum depth of fifteen levels.
     */
    toPathPartStr() {
        const orgStr = (this.origin ? (this.origin.toPathPartStr() + '-_') : '') as string
        return orgStr + this.type + '..' + this.value;
    }
}