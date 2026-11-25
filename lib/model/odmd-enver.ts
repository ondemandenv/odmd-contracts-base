/**
 * Provided interface to be used by central service, copied from ODMD_REPO to app repo
 * Single implementation with only one single export under config/apps folder for loading dynamically
 * then copy to ODMD_REPO for fall back
 *
 * todo: validation in ODMD app lib
 * todo: compare with app repo definition regularly
 *
 * do not change unless you are sure!
 */

import {Construct, IConstruct} from "constructs";
import {OdmdBuild, SRC_Rev_REF} from "./odmd-build";
import {OdmdHostedZoneRef} from "../OdmdContractsCentralView";

/**
 * Per-enver opt-in for the platform's service-owner agent step (`aiAgentDev`).
 *
 * The platform ships the TYPE, not the switch: which enver runs an agent is a per-customer decision
 * (usually gated on the phase, e.g. `if (targetRevision.value === 'dev')`), and `runnerLabel` names a
 * scale set registered to one GitHub org, which the base library cannot know. A customer contractsLib
 * sets the value on its enver; `odmd-customer-central`'s workflow generator reads it at synth time and
 * emits the step.
 *
 * The optional knobs mean what the action itself implements when omitted - the defaults are stated here
 * so a reader does not have to know the action's internals:
 *  - `allowPush` unset = ON. A session's memory is its own commits on the enver branch; with push off
 *    nothing lands and every run starts from zero history.
 *  - `maxSteps` unset = the action's default (40 tool calls per run).
 *  - `maxCostUsd` unset = no dollar cap (the wall-clock cap still applies).
 *  - `model` / `logLevel` unset = the runner's provider config / no opencode diagnostics.
 */
export interface AgentOptIn {
    readonly enabled: true
    /** ARC scale-set label (`runs-on`) registered to the customer's GitHub org. */
    readonly runnerLabel: string
    /** provider/model override; unset = the `model` of the runner's provider config. */
    readonly model?: string
    /** May the run push its filtered commit (and so start another cycle)? Unset = ON. */
    readonly allowPush?: boolean
    /** Tool calls per run; unset = the action's default. */
    readonly maxSteps?: number
    /** Dollar ceiling for one run; unset = no cap. */
    readonly maxCostUsd?: number
    /** opencode diagnostics level (DEBUG/INFO/WARN/ERROR); unset = off. */
    readonly logLevel?: string
}

export interface IOdmdEnver extends IConstruct {

    readonly buildScript: string

    readonly targetAWSAccountID: string;
    readonly targetAWSRegion: string
    readonly targetRevision: SRC_Rev_REF


    get owner(): OdmdBuild<AnyOdmdEnVer>

    get subdomain(): string | undefined

    get hostedZone(): OdmdHostedZoneRef | undefined

    /**
     * odmd platform will delete all resources created by this enver including stateful resources
     */
    readonly ephemeral: boolean

    //todo: developer will takeoverwrite Workflow file from odmd platform in their repo,
    readonly overwriteGhWf: boolean

    /**
     * Opt-in for the platform's service-owner agent step. Unset = no agent for this enver.
     * Set by the customer contractsLib; the workflow generator reads it at synth time.
     */
    readonly agentOptIn?: AgentOptIn

    /**
     * path to md doc
     */
    readonly enverContextMD: string

    readonly centralRoleName: string
    readonly centralRolePath: string
    readonly centralRoleArn: string

    readonly buildRoleName: string
    readonly buildRolePath: string
    readonly buildRoleArn: string

    readonly bdRoRoleName: string
    readonly bdRoRolePath: string
    readonly bdRoRoleArn: string

    readonly ctRoRoleName: string
    readonly ctRoRolePath: string
    readonly ctRoRoleArn: string

    /*
    static local ssm param path to get the s3 object prefix for cdk app to upload artifacts with buildRole
    typical usage: app/service has a schema to share thru producer/consumer model:
     producer app/service:
     1) in cdk code, use this path to get the bucket name and prefix;
        2) upload the schema to s3 bucket with this prefix,
        3) schema object key is used as producer value
            new OdmdShareOut(
                this, new Map([ ... [myEnver.documentMetadataSchemaS3Url_producer, <s3 bucket prefix/produceID@s3ObjVersion>] ...  ])
            );
        4) consumer app/service will be notified by ssm parameter change thru platform event bus
        5) as long as app/service using the provided s3 bucket prefix, and marking producer's 's3artifact, permission is granted by platform
     */
    readonly artifactPrefixSsm: string

    readonly productsReplicaToRegions: Set<string>

    generateDynamicEnver(org: SRC_Rev_REF): IOdmdEnver

}


/**
 * configurations required and interpreted  by odmd central, for a specific branch/env/version
 * defines how to build an enver:
 *
 * a cdk enver let self defined cdk project/repo to
 * 1) implement ref producer for others to consumer
 * 2) consume producers from other envers
 *
 * envers extending cdk enver can be pre defined cdk enver
 *
 * other envers do consume ref thru ssm StringParameter
 * ecr enver defines an ECR repo and tag/sha as producers,
 *
 *
 */
export abstract class OdmdEnver<T extends OdmdBuild<OdmdEnver<T>>> extends Construct implements IOdmdEnver {

    readonly owner: T

    constructor(owner: T, targetAWSAccountID: string, targetAWSRegion: string, targetRevision: SRC_Rev_REF) {
        super(owner, targetRevision.toPathPartStr());
        this.owner = owner;
        this.targetAWSAccountID = targetAWSAccountID;
        this.targetAWSRegion = targetAWSRegion;
        this.targetRevision = targetRevision;

    }

    readonly enverContextMD: string = '.odmd/ENVER_BASED_SERVICE_CONTEXT_PATTERN.md'

    readonly buildScript: string = `.scripts/build.sh`

    readonly description?: string

    /**
     * contracts is doing it in github action, we want to abstract it into a function
     */
    readonly productsReplicaToRegions = new Set<string>()

    /**
     * this branch/environment will be deployed to specific account and region,
     * stacknames are generated by singleton AppInfraConfig.getBranchStackNames
     */
    readonly targetAWSAccountID: string;
    readonly targetAWSRegion: string


    /**
     * branch name, revision or tag
     */
    readonly targetRevision: SRC_Rev_REF;


    /**
     * auto delete all ?
     */
    readonly ephemeral: boolean = true

    /**
     * do system overwrite user changed GhWf?
     */
    readonly overwriteGhWf: boolean = false

    /**
     * Per-enver agent opt-in. Mutable rather than readonly because a customer sets it inside its own
     * constructor, usually gated on the phase. Unset = no agent.
     */
    agentOptIn?: AgentOptIn


    /**
     * usually Cdk generate logical id based on stackname and resource id, which is good enough.
     * this method is when user want to define customize a resource's logical/physical name,
     * to make the name depend on branch/enver so that they don't conflict when deploying in
     * same scope
     *
     * @param originalName original resource name
     */
    //todo: add regex check for different kinds
    // public genDynamicName(originalName: string) {
    //     if (process.env.SRC_BRANCH == this.baseBranch) {
    //         return originalName
    //     }
    //     return originalName + '_' + process.env.SRC_BRANCH
    // } use OdmdNames.create with enver


    public get centralRoleName(): string {
        return `${this.owner.buildId}-${this.targetAWSRegion}${this.targetAWSAccountID}-centerRole`
    }

    public get centralRolePath(): string {
        return `/${this.owner.buildId}/`
    }

    public get centralRoleArn(): string {
        return `arn:aws:iam::${this.owner.contracts.accounts.central}:role${this.centralRolePath}${this.centralRoleName}`;
    }

    public get buildRoleName(): string {
        return `${this.owner.buildId}-${this.targetAWSRegion}${this.targetAWSAccountID}-buildRole`;
    }

    public get buildRolePath(): string {
        return `/${this.owner.buildId}/`
    }

    public get buildRoleArn(): string {
        return `arn:aws:iam::${this.targetAWSAccountID}:role${this.buildRolePath}${this.buildRoleName}`;
    }

    public get bdRoRoleName(): string {
        return `${this.owner.buildId}-${this.targetAWSRegion}${this.targetAWSAccountID}-bdRoRole`;
    }

    public get bdRoRolePath(): string {
        return `/${this.owner.buildId}/`
    }

    public get bdRoRoleArn(): string {
        return `arn:aws:iam::${this.targetAWSAccountID}:role${this.bdRoRolePath}${this.bdRoRoleName}`;
    }

    public get ctRoRoleName(): string {
        return `${this.owner.buildId}-${this.targetAWSRegion}${this.targetAWSAccountID}-ctRoRole`
    }

    public get ctRoRolePath(): string {
        return `/${this.owner.buildId}/`
    }

    public get ctRoRoleArn(): string {
        return `arn:aws:iam::${this.owner.contracts.accounts.central}:role${this.ctRoRolePath}${this.ctRoRoleName}`;
    }

    public get artifactPrefixSsm(): string {
        return `${this.owner.artifactSsmPath}/${this.targetAWSAccountID}`;
    }

    generateDynamicEnver(rev: SRC_Rev_REF, newInst: IOdmdEnver | undefined = undefined): IOdmdEnver {
        if (!newInst) {
            const cf = this.constructor
            // @ts-ignore
            newInst = new cf(this.owner, this.targetAWSAccountID, this.targetAWSRegion, rev) as IOdmdEnver
        }
        if (rev.origin != this.targetRevision) {
            throw new Error(`org and gen enver's origin should be same`)
        }
        return newInst
    }

    get subdomain(): string | undefined {
        return this.owner.subDomain ? this.targetRevision.toPathPartStr().replace(/[^a-zA-Z0-9-]/g, "").replace(/^-+|-+$/g, "").toLowerCase() + '.' + this.owner.subDomain : undefined
    }

    get hostedZone(): OdmdHostedZoneRef | undefined {
        const accountName = this.owner.contracts.getAccountName(this.targetAWSAccountID)
        if (!accountName) return undefined
        const name = this.owner.contracts.zoneNameForAccount(accountName)
        if (!name) return undefined
        return {
            name,
            id: this.owner.contracts.zoneIdForAccount(accountName),
            autoManaged: this.owner.contracts.zoneIsAutoManaged(accountName),
        }
    }

}

export abstract class AnyOdmdEnVer extends OdmdEnver<OdmdBuild<AnyOdmdEnVer>> implements IOdmdEnver {
}
