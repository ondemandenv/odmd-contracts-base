import {ContractsBuild, GithubRepo} from "../../odmd-model/contracts-build";
import {OndemandContracts} from "../../OndemandContracts";
import {Construct} from "constructs";
import {AccountsCentralView, GithubReposCentralView} from "../../OdmdContractsCentralView";
import {ContractsEnverNpm} from "../../odmd-model/contracts-enver-npm";

export abstract class OdmdBuildOdmdContracts<A extends AccountsCentralView, G extends GithubReposCentralView>
    extends ContractsBuild<ContractsEnverNpm> {

    public abstract get packageName(): string/* {
        return '@ondemandenv/contracts-lib-base'
    }*/


    constructor(scope: Construct, id: string) {
        super(scope, id, OndemandContracts.inst.githubRepos.__contracts);
    }
}
