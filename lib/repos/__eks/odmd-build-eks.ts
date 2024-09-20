import {ContractsBuild} from "../../odmd-model/contracts-build";
import {ContractsEnverCdk} from "../../odmd-model/contracts-enver-cdk";
import {OndemandContracts} from "../../OndemandContracts";
import {AccountsCentralView, GithubReposCentralView} from "../../OdmdContractsCentralView";
import {OdmdBuildOdmdContracts} from "../__contracts/odmd-build-odmd-contracts";

export abstract class OdmdBuildEks extends ContractsBuild<ContractsEnverCdk> {


    constructor(scope: OndemandContracts<
        AccountsCentralView,
        GithubReposCentralView, OdmdBuildOdmdContracts<AccountsCentralView, GithubReposCentralView>
    >, id: string) {
        super(scope, id, OndemandContracts.inst.githubRepos.__eks!);
    }


    ownerEmail?: string | undefined;


}
