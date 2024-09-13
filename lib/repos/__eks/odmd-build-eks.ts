import {ContractsBuild, GithubRepo} from "../../odmd-model/contracts-build";
import {ContractsEnverCdk} from "../../odmd-model/contracts-enver-cdk";
import {OndemandContracts} from "../../OndemandContracts";
import {Construct} from "constructs";

export abstract class OdmdBuildEks extends ContractsBuild<ContractsEnverCdk> {


    constructor(scope: Construct, id: string) {
        super(scope, id, OndemandContracts.inst.githubRepos.__eks!);
    }


    ownerEmail?: string | undefined;


}
