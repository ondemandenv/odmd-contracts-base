import {ContractsBuild} from "../../odmd-model/contracts-build";
import {ContractsEnverCdk} from "../../odmd-model/contracts-enver-cdk";
import {OndemandContracts} from "../../OndemandContracts";

export abstract class OdmdBuildEks extends ContractsBuild<ContractsEnverCdk> {

    gitHubRepo = OndemandContracts.myInst.githubRepos.__eks

    ownerEmail?: string | undefined;


}
