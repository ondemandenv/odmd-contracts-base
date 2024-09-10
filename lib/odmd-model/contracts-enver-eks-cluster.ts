import {ContractsEnverCdk} from "./contracts-enver-cdk";
import {ContractsCrossRefConsumer, ContractsCrossRefProducer} from "./contracts-cross-refs";
import {IContractsEnver} from "./contracts-enver";
import {ContractsVpc, WithVpc} from "./contracts-vpc";
import {ContractsBuild, SRC_Rev_REF} from "./contracts-build";
import {OndemandContracts} from "../OndemandContracts";
import {IPAM_AB} from "../repos/__networking/odmd-config-networking";


export abstract class ContractsEnverEksCluster extends ContractsEnverCdk implements WithVpc {


    readonly vpcConfig: ContractsVpc
    readonly vpcCidr: ContractsCrossRefProducer<ContractsEnverEksCluster> = new ContractsCrossRefProducer<ContractsEnverEksCluster>(this, 'vpcCidr')

    readonly oidcProviderArn: ContractsCrossRefProducer<ContractsEnverEksCluster> = new ContractsCrossRefProducer<ContractsEnverEksCluster>(this, 'oidcProviderArn')
    readonly clusterEndpoint: ContractsCrossRefProducer<ContractsEnverEksCluster> = new ContractsCrossRefProducer<ContractsEnverEksCluster>(this, 'clusterEndpoint')

    readonly kubectlRoleArn: ContractsCrossRefProducer<ContractsEnverEksCluster> = new ContractsCrossRefProducer<ContractsEnverEksCluster>(this, 'kubectlRoleArn')


    readonly kubeTrustCentralRoleName: string
    readonly clusterName: string

    readonly ipamPoolName: ContractsCrossRefConsumer<ContractsEnverEksCluster, IPAM_AB>
    readonly transitGatewayShareName: ContractsCrossRefConsumer<ContractsEnverEksCluster, IPAM_AB>
    readonly natPublicIP: ContractsCrossRefConsumer<ContractsEnverEksCluster, IPAM_AB>

    constructor(owner: ContractsBuild<ContractsEnverCdk>, targetAWSAccountID: string, targetAWSRegion: string, targetRevision: SRC_Rev_REF) {
        super(owner, targetAWSAccountID, targetAWSRegion, targetRevision);
        this.kubeTrustCentralRoleName = `kube_${this.targetRevision.type}_${this.targetRevision.value}_trustCentral_${this.targetAWSRegion}`

        this.ipamPoolName = new ContractsCrossRefConsumer(this, 'ipamPoolName', OndemandContracts.inst.networking.ipam_west1_le.ipamPoolName)
        this.transitGatewayShareName = new ContractsCrossRefConsumer(this, 'transitGatewayShareName', OndemandContracts.inst.networking.ipam_west1_le.transitGatewayShareName)
        this.natPublicIP = new ContractsCrossRefConsumer(this, 'natPublicIP', OndemandContracts.inst.networking.ipam_west1_le.natPublicIP)
    }
}

export abstract class ContractsEnverEksClusterArgoCd extends ContractsEnverEksCluster {


    readonly argocdRepoSa = new ContractsCrossRefProducer<ContractsEnverEksClusterArgoCd>(this, 'argocd-repo-sa')
    readonly argocdRepoName = new ContractsCrossRefProducer(this, 'argocdRepoName')

    constructor(owner: ContractsBuild<ContractsEnverCdk>, targetAWSAccountID: string, targetAWSRegion: string, targetRevision: SRC_Rev_REF) {
        super(owner, targetAWSAccountID, targetAWSRegion, targetRevision);
        this.preCdkCmds.push('npm --prefix lib/update-argocd-appOfApps install')
    }
}


export interface KubeCtlThruCentral extends IContractsEnver {

    readonly userEnver: IContractsEnver
    readonly targetNamespace: string
    readonly targetEksCluster: ContractsEnverEksCluster

}