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

export interface IOdmdEnver extends IConstruct {

    readonly buildScript: string

    readonly targetAWSAccountID: string;
    readonly targetAWSRegion: string
    readonly targetRevision: SRC_Rev_REF


    get owner(): OdmdBuild<AnyOdmdEnVer>

    readonly ephemeral: boolean
    readonly overwriteGhWf: boolean

    readonly centralRoleName: string
    readonly centralRolePath: string
    readonly centralRoleArn: string

    readonly buildRoleName: string
    readonly buildRolePath: string
    readonly buildRoleArn: string

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

    readonly buildScript: string = `.scripts/build.sh`

    readonly description?: string

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

}

export abstract class AnyOdmdEnVer extends OdmdEnver<OdmdBuild<AnyOdmdEnVer>> implements IOdmdEnver {
}
