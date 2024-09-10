import {ContractsBuild, GithubRepo} from "../../odmd-model/contracts-build";
import {ContractsEnver} from "../../odmd-model/contracts-enver";
import {OndemandContracts} from "../../OndemandContracts";
import {Construct} from "constructs";

export abstract class OdmdBuildOdmdContracts<T extends ContractsEnver<ContractsBuild<T>>> extends ContractsBuild<T> {

    ownerEmail?: string | undefined;

    public readonly gitHubRepo: GithubRepo


    constructor(scope: Construct, id: string) {
        super(scope, id);
        this.gitHubRepo = OndemandContracts.inst.githubRepos.__contracts
    }
}
