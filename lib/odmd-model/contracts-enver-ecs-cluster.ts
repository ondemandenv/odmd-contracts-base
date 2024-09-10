import {ContractsEnverCdk} from "./contracts-enver-cdk";
import {ContractsCrossRefConsumer, ContractsCrossRefProducer} from "./contracts-cross-refs";
import {ContractsVpc, WithVpc} from "./contracts-vpc";
import {ContractsBuild, SRC_Rev_REF} from "./contracts-build";
import {OndemandContracts} from "../OndemandContracts";
import {IPAM_AB} from "../repos/__networking/odmd-config-networking";


export abstract class ContractsEnverEcsCluster extends ContractsEnverCdk implements WithVpc {


    readonly vpcConfig: ContractsVpc
    readonly vpcCidr: ContractsCrossRefProducer<ContractsEnverEcsCluster> = new ContractsCrossRefProducer<ContractsEnverEcsCluster>(this, 'vpcCidr')


    readonly clusterName?: string

    readonly ipamPoolName: ContractsCrossRefConsumer<ContractsEnverEcsCluster, IPAM_AB>
    readonly transitGatewayShareName: ContractsCrossRefConsumer<ContractsEnverEcsCluster, IPAM_AB>
    readonly natPublicIP: ContractsCrossRefConsumer<ContractsEnverEcsCluster, IPAM_AB>

    constructor(owner: ContractsBuild<ContractsEnverCdk>, targetAWSAccountID: string, targetAWSRegion: string, targetRevision: SRC_Rev_REF) {
        super(owner, targetAWSAccountID, targetAWSRegion, targetRevision);

        this.ipamPoolName = new ContractsCrossRefConsumer(this, 'ipamPoolName', OndemandContracts.inst.networking.ipam_west1_le.ipamPoolName)
        this.transitGatewayShareName = new ContractsCrossRefConsumer(this, 'transitGatewayShareName', OndemandContracts.inst.networking.ipam_west1_le.transitGatewayShareName)
        this.natPublicIP = new ContractsCrossRefConsumer(this, 'natPublicIP', OndemandContracts.inst.networking.ipam_west1_le.natPublicIP)
    }
}
