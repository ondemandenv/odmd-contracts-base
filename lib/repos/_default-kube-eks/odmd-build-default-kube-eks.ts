import {Construct} from "constructs";
import {ContractsEnverCdkDefaultEcrEks} from "./odmd-enver-default-ecr-eks";
import {ContractsBuild} from "../../odmd-model/contracts-build";
import {ContractsEnverCdk} from "../../odmd-model/contracts-enver-cdk";
import {AnyContractsEnVer} from "../../odmd-model/contracts-enver";
import {OndemandContracts} from "../../OndemandContracts";
import {ContractsEnverEksCluster} from "../../odmd-model/contracts-enver-eks-cluster";


export class OdmdBuildDefaultKubeEks extends ContractsBuild<ContractsEnverCdk> {

    constructor(scope: Construct) {
        super(scope, 'DefaultKubeEks');
    }

    gitHubRepo= OndemandContracts.inst.githubRepos._defaultKubeEks
    ownerEmail?: string | undefined;
    readonly envers: Array<ContractsEnverCdkDefaultEcrEks> = []

    public getOrCreateOne(usr: AnyContractsEnVer, targetEksCluster: ContractsEnverEksCluster, targetNamespace:string) {
        let rt = this.envers.find(e => e.userEnver == usr)
        if (rt) {
            return rt
        }

        rt = new ContractsEnverCdkDefaultEcrEks(this, usr, targetEksCluster, targetNamespace);
        this.envers.push(rt)
        return rt;
    }

}
