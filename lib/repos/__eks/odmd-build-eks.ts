import {OdmdBuild} from "../../odmd-model/odmd-build";
import {OdmdEnverCdk} from "../../odmd-model/odmd-enver-cdk";
import {OndemandContracts} from "../../OndemandContracts";
import {AccountsCentralView, GithubReposCentralView} from "../../OdmdContractsCentralView";
import {OdmdBuildContractsLib} from "../__contracts/odmd-build-contracts-lib";

export abstract class OdmdBuildEks extends OdmdBuild<OdmdEnverCdk> {


    constructor(scope: OndemandContracts<
        AccountsCentralView,
        GithubReposCentralView, OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView>
    >, id: string) {
        super(scope, id, scope.githubRepos.__eks!);
    }


    ownerEmail?: string | undefined;


}
