import {ContractsEnverEksClusterArgoCd} from "./contracts-enver-eks-cluster";
import {ContractsEnverCdk} from "./contracts-enver-cdk";

export abstract class ContractsEnverEcrToEksArgo extends ContractsEnverCdk {

    abstract readonly argocdEksEnv: ContractsEnverEksClusterArgoCd


}
