import {OdmdEnverCdk} from "./odmd-enver-cdk";
import {OdmdCrossRefConsumer, OdmdCrossRefProducer} from "./odmd-cross-refs";
import {IOdmdEnver} from "./odmd-enver";
import {OdmdVpc, WithVpc} from "./odmd-vpc";
import {OdmdBuild, SRC_Rev_REF} from "./odmd-build";
import {OndemandContracts} from "../OndemandContracts";
import {IPAM_AB} from "../repos/__networking/odmd-config-networking";


export abstract class OdmdEnverEksCluster extends OdmdEnverCdk implements WithVpc {


    readonly vpcConfig: OdmdVpc
    readonly vpcCidr: OdmdCrossRefProducer<OdmdEnverEksCluster> = new OdmdCrossRefProducer<OdmdEnverEksCluster>(this, 'vpcCidr')

    readonly oidcProviderArn: OdmdCrossRefProducer<OdmdEnverEksCluster> = new OdmdCrossRefProducer<OdmdEnverEksCluster>(this, 'oidcProviderArn')
    readonly clusterEndpoint: OdmdCrossRefProducer<OdmdEnverEksCluster> = new OdmdCrossRefProducer<OdmdEnverEksCluster>(this, 'clusterEndpoint')

    readonly kubectlRoleArn: OdmdCrossRefProducer<OdmdEnverEksCluster> = new OdmdCrossRefProducer<OdmdEnverEksCluster>(this, 'kubectlRoleArn')


    readonly kubeTrustCentralRoleName: string
    readonly clusterName: string

    readonly ipamPoolName: OdmdCrossRefConsumer<OdmdEnverEksCluster, IPAM_AB>
    readonly transitGatewayShareName: OdmdCrossRefConsumer<OdmdEnverEksCluster, IPAM_AB>
    readonly natPublicIP: OdmdCrossRefConsumer<OdmdEnverEksCluster, IPAM_AB>

    constructor(owner: OdmdBuild<OdmdEnverCdk>, targetAWSAccountID: string, targetAWSRegion: string, targetRevision: SRC_Rev_REF) {
        super(owner, targetAWSAccountID, targetAWSRegion, targetRevision);
        this.kubeTrustCentralRoleName = `kube_${this.targetRevision.type}_${this.targetRevision.value}_trustCentral_${this.targetAWSRegion}`

        this.ipamPoolName = new OdmdCrossRefConsumer(this, 'ipamPoolName', owner.contracts.networking!.ipam_west1_le.ipamPoolName)
        this.transitGatewayShareName = new OdmdCrossRefConsumer(this, 'transitGatewayShareName', owner.contracts.networking!.ipam_west1_le.transitGatewayShareName)
        this.natPublicIP = new OdmdCrossRefConsumer(this, 'natPublicIP', owner.contracts.networking!.ipam_west1_le.natPublicIP)
    }
}

export abstract class OdmdEnverEksClusterArgoCd extends OdmdEnverEksCluster {


    readonly argocdRepoSa = new OdmdCrossRefProducer<OdmdEnverEksClusterArgoCd>(this, 'argocd-repo-sa')
    readonly argocdRepoName = new OdmdCrossRefProducer(this, 'argocdRepoName')

    constructor(owner: OdmdBuild<OdmdEnverCdk>, targetAWSAccountID: string, targetAWSRegion: string, targetRevision: SRC_Rev_REF) {
        super(owner, targetAWSAccountID, targetAWSRegion, targetRevision);
        this.preCdkCmds.push('npm --prefix lib/update-argocd-appOfApps install')
    }
}


export interface KubeCtlThruCentral extends IOdmdEnver {

    readonly userEnver: IOdmdEnver
    readonly targetNamespace: string
    readonly targetEksCluster: OdmdEnverEksCluster

}