import {ContractsEnverEksClusterArgoCd} from "./odmd-enver-eks-cluster";
import {OdmdEnverCdk} from "./odmd-enver-cdk";

export abstract class OdmdEnverEcrToEksArgo extends OdmdEnverCdk {

    abstract readonly argocdEksEnv: ContractsEnverEksClusterArgoCd


}
