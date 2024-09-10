/**
 * a "build" here is a process to a repo without outputs
 * the process can have multiple versions
 * output can be:
 * 1) artifacts like npm package and container
 * 2) deployments without referencable resources like endpoints, arns
 */

import {PolicyStatement} from "aws-cdk-lib/aws-iam";
import {Construct, Node} from "constructs";
import {AnyContractsEnVer, ContractsEnver} from "./contracts-enver";
import {ContractsEnverCdk} from "./contracts-enver-cdk";
import {ContractsEnverCtnImg} from "./contracts-enver-ctn-img";
import {ContractsEnverNpm} from "./contracts-enver-npm";
import {OndemandContracts} from "../OndemandContracts";

type CentralConfigConstr = new (...args: any[]) => ContractsBuild<AnyContractsEnVer>;


export type GithubRepo = {
    owner: string
    name: string
    ghAppInstallID: number
}

// export abstract class OdmdBuild<T extends OdmdEnVerConfig> extends Construct {
export abstract class ContractsBuild<T extends ContractsEnver<ContractsBuild<T>>> extends Construct {

    static readonly CENTRAL_TO_INST = new Map<CentralConfigConstr, ContractsBuild<AnyContractsEnVer>>();

    static getInst(this: CentralConfigConstr): ContractsBuild<AnyContractsEnVer> {
        return ContractsBuild.CENTRAL_TO_INST.get(this)!
    }

    constructor(scope: Construct, id: string) {
        super(scope, id);
        this.buildId = id
        if (ContractsBuild.CENTRAL_TO_INST.has(this.constructor as CentralConfigConstr)) {
            throw new Error(`duplicate singleton: ${this.constructor.name}/${id}`)
        }
        ContractsBuild.CENTRAL_TO_INST.set(this.constructor as CentralConfigConstr, this)
    }

    public readonly buildId: string

    readonly description?: string
    abstract readonly gitHubRepo: GithubRepo

    /**
     * Configurations will be used by ODMD pipelines will NOT be overridden:
     *
     * 1) 1st element's region is primary region and should NOT be changed.
     * 2) 1st element's branch is primary branch and should NOT be changed.
     *
     * this means implementation
     */
    abstract readonly envers: Array<T>

    readonly workDirs?: Array<string>

    /**
     * notification
     */
    abstract readonly ownerEmail?: string

    /**
     * will be used for IAM
     */
    readonly canonicalPath?: string[]


    /**
     * extra permissions to build this app( running cdk deploy <stack1> <stack2> )
     * todo: is it necessary to move it into OdmdEnVerConfig, so that each branch/env
     * can have different role.
     */
    readonly extraBuildStatement?: PolicyStatement[]


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
            const n = ContractsBuild.SUPPORTED_ENVER_CLASSES.find(c => {
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
        ContractsEnverCdk, ContractsEnverCtnImg, ContractsEnverNpm
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

        OndemandContracts.inst.allAccounts.forEach(ac => {
            if (value.includes(ac)) {
                throw new Error(`${ac} is an account and should not be used in revRef!`)
            }
        })

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