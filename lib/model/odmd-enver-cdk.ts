import {OdmdBuild, SRC_Rev_REF} from "./odmd-build";
import {AnyOdmdEnVer, OdmdEnver} from "./odmd-enver";
import {OdmdCrossRefConsumer} from "./odmd-cross-refs";

export abstract class OdmdEnverCdk extends OdmdEnver<OdmdBuild<OdmdEnverCdk>> {

    constructor(owner: OdmdBuild<OdmdEnverCdk>, targetAWSAccountID: string, targetAWSRegion: string, targetRevision: SRC_Rev_REF) {
        super(owner, targetAWSAccountID, targetAWSRegion, targetRevision);
        const thePkgOrg = this.owner.contracts.contractsLibBuild.pkgOrg;
        this.preInstallCmds = [

            `echo "@ondemandenv:registry=https://npm.pkg.github.com/" >> .npmrc`,
            `echo "${thePkgOrg}:registry=https://npm.pkg.github.com/" >> .npmrc`,
            'echo "//npm.pkg.github.com/:_authToken=$github_token" >> .npmrc'

        ]
    }

    /**
     * initial deployment will disable rollback withno changeset or approval automatically
     * this is only for deploying updates
     */
    readonly noRollback?: boolean

    //todo: diff any way
    // readonly changeSetNoDeploy?: boolean

    //todo: when team IAM is ready
    readonly approvalRole?: OdmdCrossRefConsumer<this, AnyOdmdEnVer>[]

    readonly preInstallCmds: Array<string>

    readonly preCdkCmds: Array<string> = []

    readonly contextStrs?: Array<string>


    /*todo
                    const subnetToEnv = acr.reduce((map, e) => {
                        let cs = e.rdsConfig!.subnets;
                        if (!map.has(cs)) {
                            map.set(cs, [])
                        }
                        map.get(cs)!.push(e)
                        return map;
                    }, new Map<SubnetSelection, OdmdEnVerConfig[]>())

                    if( subnetToEnv.size > 1 ){
                        throw new Error( "RDS subnets are not referencing ")
                    }
    */

    /**
     * what stacks the enver will generate?
     * different stacknames for different branches, avoid conflicts when all deployed into one region/account
     * especially when dynamic env by branching/tagging
     * stackname has to start with buildId name!!!
     * we need to know stack names to monitor, so no wildcard supported until we run cdk ls
     * Make sure it's consistent
     *
     * idempotent!
     */
    getRevStackNames(): Array<string> {
        const revStr = this.targetRevision.type == 'b' ? this.targetRevision.value : this.targetRevision.toPathPartStr();
        const rt = [`${this.owner.buildId}--${revStr}`];
        return rt.map(n => OdmdEnverCdk.SANITIZE_STACK_NAME(n))
    }

    public static SANITIZE_STACK_NAME(n: string) {
        let sanitized = n.replace(/[^a-zA-Z0-9]/g, '-');
        if (sanitized.startsWith('-')) {
            sanitized = 'A' + sanitized.slice(1);
        }
        if (sanitized.endsWith('-')) {
            sanitized = sanitized.slice(0, -1) + 'Z';
        }
        if (n != sanitized) {
            console.log(`${n} sanitized to ${sanitized}`)
        }
        return sanitized
    }
}
