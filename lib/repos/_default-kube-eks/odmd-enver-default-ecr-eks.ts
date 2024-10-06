import {OdmdEnverCdk} from "../../odmd-model/odmd-enver-cdk";
import {OdmdBuildDefaultKubeEks} from "./odmd-build-default-kube-eks";
import {SRC_Rev_REF} from "../../odmd-model/odmd-build";
import {AnyOdmdEnVer, IOdmdEnver} from "../../odmd-model/odmd-enver";
import {OdmdEnverEksCluster, KubeCtlThruCentral} from "../../odmd-model/odmd-enver-eks-cluster";
import {DeploymentProps, IngressProps, JobProps, ServiceProps} from "cdk8s-plus-29";

export class ContractsEnverCdkDefaultEcrEks extends OdmdEnverCdk implements KubeCtlThruCentral {


    constructor(owner: OdmdBuildDefaultKubeEks, user: AnyOdmdEnVer, targetEksCluster: OdmdEnverEksCluster, targetNamespace: string, defaultRev = new SRC_Rev_REF("b", user.targetRevision.value)) {
        //always to user's account, so that it can be taken over by user
        super(owner, user.targetAWSAccountID, process.env.CDK_DEFAULT_REGION!, defaultRev);
        this.userEnver = user
        this.targetNamespace = targetNamespace
        this.targetEksCluster = targetEksCluster
    }

    public readonly userEnver: IOdmdEnver
    public readonly targetNamespace: string
    public readonly targetEksCluster: OdmdEnverEksCluster


    deployment: DeploymentProps
    job?: JobProps
    service?: ServiceProps
    ingress?: IngressProps

}