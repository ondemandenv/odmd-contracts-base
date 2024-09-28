import {ContractsBuild} from "../../odmd-model/contracts-build";
import {OndemandContracts} from "../../OndemandContracts";
import {AccountsCentralView, GithubReposCentralView} from "../../OdmdContractsCentralView";
import {ContractsEnverCMDs} from "../../odmd-model/contracts-enver-c-m-ds";

export abstract class OdmdBuildOdmdContracts<

    A extends AccountsCentralView,
    G extends GithubReposCentralView
>
    extends ContractsBuild<ContractsEnverCMDs> {

    public abstract get packageName(): string/* {
        return '@ondemandenv/contracts-lib-base'
    }*/


    constructor(scope: OndemandContracts<
        AccountsCentralView,
        GithubReposCentralView, OdmdBuildOdmdContracts<AccountsCentralView, GithubReposCentralView>
    >, id: string) {
        super(scope, id, scope.githubRepos.__contracts);
    }
}
