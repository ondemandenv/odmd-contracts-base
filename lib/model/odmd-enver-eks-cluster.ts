import {OdmdEnverCdk} from "./odmd-enver-cdk";
import {OdmdCrossRefConsumer, OdmdCrossRefProducer} from "./odmd-cross-refs";
import {IOdmdEnver} from "./odmd-enver";
import {OdmdVpc, WithVpc} from "./odmd-vpc";
import {OdmdBuild, SRC_Rev_REF} from "./odmd-build";
import {IPAM_AB} from "../repos/__networking/odmd-build-networking";

export abstract class OdmdEnverEksCluster extends OdmdEnverCdk implements WithVpc {

    readonly vpcConfig: OdmdVpc
    readonly vpcCidr: OdmdCrossRefProducer<OdmdEnverEksCluster> = new OdmdCrossRefProducer<OdmdEnverEksCluster>(this, 'vpcCidr')

    /*
openIdConnectProviderIssuer/openIdConnectProvider:
oidc.eks.<region>.amazonaws.com/id/<id>

openIdConnectProviderArn:
arn:aws:iam::<account>:oidc-provider/<openIdConnectProviderIssuer/openIdConnectProvider>
     */
    readonly oidcProvider: OdmdCrossRefProducer<OdmdEnverEksCluster> = new OdmdCrossRefProducer<OdmdEnverEksCluster>(this, 'oidcProvider')
    readonly clusterEndpoint: OdmdCrossRefProducer<OdmdEnverEksCluster> = new OdmdCrossRefProducer<OdmdEnverEksCluster>(this, 'clusterEndpoint')

    readonly kubectlRoleArn: OdmdCrossRefProducer<OdmdEnverEksCluster> = new OdmdCrossRefProducer<OdmdEnverEksCluster>(this, 'kubectlRoleArn')
    /**
     * https://docs.aws.amazon.com/AmazonECR/latest/userguide/ECR_on_EKS.html
     * the default node group role for consuming
     *
     * user can add more for extra node groups
     */
    readonly defaultNodeGroupRoleArn: OdmdCrossRefProducer<OdmdEnverEksCluster> = new OdmdCrossRefProducer<OdmdEnverEksCluster>(this, 'defaultNodeGroupRoleArn')


    readonly kubeTrustCentralRoleName: string
    readonly clusterName: string

    readonly ipamPoolName: OdmdCrossRefConsumer<OdmdEnverEksCluster, IPAM_AB>
    readonly transitGatewayShareName: OdmdCrossRefConsumer<OdmdEnverEksCluster, IPAM_AB>
    readonly natPublicIP: OdmdCrossRefConsumer<OdmdEnverEksCluster, IPAM_AB>

    constructor(owner: OdmdBuild<OdmdEnverCdk>, targetAWSAccountID: string, targetAWSRegion: string, targetRevision: SRC_Rev_REF) {
        super(owner, targetAWSAccountID, targetAWSRegion, targetRevision);
        this.kubeTrustCentralRoleName = `kube_${this.targetRevision.type}_${this.targetRevision.value}_trustCentral_${this.targetAWSRegion}`

        const ntEnver = owner.contracts.networking?.envers.find(e => e.targetAWSRegion == this.targetAWSRegion) as IPAM_AB
        if (!ntEnver) {
            throw new Error(`EKS enver ${this.targetRevision.toPathPartStr()}, Can't find network enver in same region`)
        }

        this.ipamPoolName = new OdmdCrossRefConsumer(this, 'ipamPoolName', ntEnver.ipamPoolName)
        this.transitGatewayShareName = new OdmdCrossRefConsumer(this, 'transitGatewayShareName', ntEnver.transitGatewayShareName)
        this.natPublicIP = new OdmdCrossRefConsumer(this, 'natPublicIP', ntEnver.natPublicIP)
    }
}

export interface KubeCtlThruCentral extends IOdmdEnver {

    readonly targetNamespace?: string
    readonly targetEksClusterEndpoint: OdmdCrossRefConsumer<KubeCtlThruCentral, OdmdEnverEksCluster>

}