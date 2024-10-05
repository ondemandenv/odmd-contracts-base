import {ContractsBuild} from "../../odmd-model/contracts-build";
import {OndemandContracts} from "../../OndemandContracts";
import {AccountsCentralView, GithubReposCentralView} from "../../OdmdContractsCentralView";
import {ContractsEnverCMDs} from "../../odmd-model/contracts-enver-c-m-ds";

export abstract class OdmdBuildContractsLib<
    A extends AccountsCentralView,
    G extends GithubReposCentralView
> extends ContractsBuild<ContractsEnverCMDs> {

    /*
    the s3 bucket object key for saving the latest contracts ver info
     */
    public static readonly LATEST_CONTRACTS_LIB_VER_KEY = "LATEST_CONTRACTS_LIB_VER_KEY"

    public abstract get packageName(): string/* {
        return '@ondemandenv/contracts-lib-base'
    }*/


    constructor(scope: OndemandContracts<
        AccountsCentralView,
        GithubReposCentralView, OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView>
    >, id: string) {
        super(scope, id, scope.githubRepos.__contracts);
    }


}
