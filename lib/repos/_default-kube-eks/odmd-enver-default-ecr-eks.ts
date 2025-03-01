import {OdmdEnverCdk} from "../../model/odmd-enver-cdk";
import {OdmdBuildDefaultKubeEks} from "./odmd-build-default-kube-eks";
import {SRC_Rev_REF} from "../../model/odmd-build";
import {AnyOdmdEnVer, IOdmdEnver} from "../../model/odmd-enver";
import {OdmdEnverEksCluster, KubeCtlThruCentral} from "../../model/odmd-enver-eks-cluster";
import {OdmdCrossRefConsumer, OdmdCrossRefProducer} from "../../model/odmd-cross-refs";

export class OdmdEnverCdkDefaultEcrEks extends OdmdEnverCdk implements KubeCtlThruCentral {


    constructor(owner: OdmdBuildDefaultKubeEks, user: AnyOdmdEnVer,
                targetEksClusterEndpoint: OdmdCrossRefProducer< OdmdEnverEksCluster>,
                defaultRev = new SRC_Rev_REF("b", user.targetRevision.value)) {
        //always to user's account, so that it can be taken over by user
        super(owner, user.targetAWSAccountID, process.env.CDK_DEFAULT_REGION!, defaultRev);
        this.userEnver = user
        this.targetEksClusterEndpoint = new OdmdCrossRefConsumer( this, 'targetEksClusterEndpoint',  targetEksClusterEndpoint )
    }

    readonly userEnver: IOdmdEnver
    public readonly targetEksClusterEndpoint: OdmdCrossRefConsumer<KubeCtlThruCentral, OdmdEnverEksCluster>


    // import {DeploymentProps, IngressProps, JobProps, ServiceProps} from "cdk8s-plus-29";

    deployment:any // DeploymentProps
    job?:any // JobProps
    service?:any // ServiceProps
    ingress?:any // IngressProps

}