import {OdmdBuild, SRC_Rev_REF} from "../../model/odmd-build";
import {OndemandContracts} from "../../OndemandContracts";
import {AccountsCentralView, GithubReposCentralView} from "../../OdmdContractsCentralView";
import {OdmdCrossRefProducer} from "../../model/odmd-cross-refs";
import {OdmdEnver} from "../../model/odmd-enver";

export abstract class OdmdBuildContractsLib<
    A extends AccountsCentralView,
    G extends GithubReposCentralView
> extends OdmdBuild<OdmdEnverContractsLib> {

    /*
    the s3 bucket object key for saving the latest contracts ver info
     */
    public static readonly LATEST_CONTRACTS_LIB_VER_KEY = "LATEST_CONTRACTS_LIB_VER_KEY"

    public abstract get packageName(): string/* {
        return '@ondemandenv/contracts-lib-base'
    }*/

    public get pkgOrg(): string {
        return this.packageName.split('/')[0];
    }


    constructor(scope: OndemandContracts<
        AccountsCentralView,
        GithubReposCentralView, OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView>
    >, id: string) {
        super(scope, id, scope.githubRepos.__contracts);
    }

    // createEnver(region: string, ref: SRC_Rev_REF) {
    //     return new OdmdEnverContractsLib(this, this.contracts.accounts.workspace0, region, ref)
    // }

}


export class OdmdEnverContractsLib extends OdmdEnver<OdmdBuild<OdmdEnverContractsLib>> {
    /**
     *
     * @see the build cmds which populate this producer and
     * cp to the bucket which drives the sqs passing to seed central root
     */
    readonly contractsLibLatest: OdmdCrossRefProducer<OdmdEnverContractsLib>;

    readonly owner: OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView>;

    constructor(owner: OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView>, targetAWSAccountID: string, targetAWSRegion: string, targetRevision: SRC_Rev_REF) {
        super(owner, targetAWSAccountID, targetAWSRegion, targetRevision);
        this.contractsLibLatest = new OdmdCrossRefProducer(this, 'contractsLibLatest')
    }


}