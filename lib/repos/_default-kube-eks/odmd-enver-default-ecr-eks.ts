import {ContractsEnverCdk} from "../../odmd-model/contracts-enver-cdk";
import {OdmdBuildDefaultKubeEks} from "./odmd-build-default-kube-eks";
import {SRC_Rev_REF} from "../../odmd-model/contracts-build";
import {AnyContractsEnVer, IContractsEnver} from "../../odmd-model/contracts-enver";
import {ContractsEnverEksCluster, KubeCtlThruCentral} from "../../odmd-model/contracts-enver-eks-cluster";
import {DeploymentProps, IngressProps, JobProps, ServiceProps} from "cdk8s-plus-29";

export class ContractsEnverCdkDefaultEcrEks extends ContractsEnverCdk implements KubeCtlThruCentral {


    constructor(owner: OdmdBuildDefaultKubeEks, user: AnyContractsEnVer, targetEksCluster: ContractsEnverEksCluster, targetNamespace: string, defaultRev = new SRC_Rev_REF("b", user.targetRevision.value)) {
        //always to user's account, so that it can be taken over by user
        super(owner, user.targetAWSAccountID, process.env.CDK_DEFAULT_REGION!, defaultRev);
        this.userEnver = user
        this.targetNamespace = targetNamespace
        this.targetEksCluster = targetEksCluster
    }

    public readonly userEnver: IContractsEnver
    public readonly targetNamespace: string
    public readonly targetEksCluster: ContractsEnverEksCluster


    deployment: DeploymentProps
    job?: JobProps
    service?: ServiceProps
    ingress?: IngressProps

}