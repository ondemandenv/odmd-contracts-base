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
        this.contractsLatestVerRepoPath = `/odmd-contracts-latest-version/${this.gitHubRepo.owner}/${this.gitHubRepo.name}`
    }

    readonly contractsLatestVerRepoPath:string

    getContractsLatestVerPath( enver:ContractsEnverCMDs){
        return this.contractsLatestVerRepoPath + '/' + enver.targetRevision.value
    }

}
