import {ContractsBuild, GithubRepo} from "../../odmd-model/contracts-build";
import {ContractsEnver} from "../../odmd-model/contracts-enver";
import {OndemandContracts} from "../../OndemandContracts";

export abstract class OdmdBuildOdmdContracts<T extends ContractsEnver<ContractsBuild<T>>> extends ContractsBuild<T> {

    ownerEmail?: string | undefined;

    public readonly gitHubRepo: GithubRepo = OndemandContracts.myInst.githubRepos.__contracts

}
