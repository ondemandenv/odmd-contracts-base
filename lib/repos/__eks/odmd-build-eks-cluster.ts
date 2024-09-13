import {ContractsEnverEksCluster, ContractsEnverEksClusterArgoCd} from "../../odmd-model/contracts-enver-eks-cluster";
import {Construct} from "constructs";
import {OndemandContracts} from "../../OndemandContracts";
import {OdmdBuildEks} from "./odmd-build-eks";
import {ContractsCrossRefConsumer, ContractsCrossRefProducer} from "../../odmd-model/contracts-cross-refs";
import {ContractsBuild, SRC_Rev_REF} from "../../odmd-model/contracts-build";
import {ContractsEnverCdk} from "../../odmd-model/contracts-enver-cdk";
import {ContractsIpAddresses, ContractsVpc, WithVpc} from "../../odmd-model/contracts-vpc";
import {IPAM_AB} from "../__networking/odmd-config-networking";

export class OdmdBuildEksCluster extends OdmdBuildEks {

    public readonly envers: Array<ContractsEnverEksCluster>

    // public readonly clusterEnver: ContractsEnverEksCluster
    public readonly argoClusterEnver: EksClusterEnverArgo

    constructor(scope: Construct) {
        super(scope, 'eks');

        // this.clusterEnver = new EksCluster(this, 'odmdSbxUsw1');

        this.argoClusterEnver = new EksClusterEnverArgo(this, 'odmdSbxUsw1argo')

        this.envers = [
            // this.clusterEnver,
            this.argoClusterEnver
        ]
    }
}

export class EksClusterEnverArgo extends ContractsEnverEksClusterArgoCd implements WithVpc {
    ephemeral: boolean = false
    readonly vpcConfig: ContractsVpc
    readonly clusterName: string

    readonly privateDomainName = new ContractsCrossRefProducer<ContractsEnverEksCluster>(this, 'privateDomainName')
    readonly centralVpcCidr: ContractsCrossRefConsumer<this, IPAM_AB>;

    constructor(owner: ContractsBuild<ContractsEnverCdk>, id: string) {
        super(owner, OndemandContracts.inst.accounts.workspace0, 'us-west-1', new SRC_Rev_REF("b", 'odmdSbxUsw1Gyang'));
        const ipamWest1Le = OndemandContracts.inst.networking!.ipam_west1_le;
        const adr = new ContractsIpAddresses(this, ipamWest1Le.ipamPoolName)

        this.vpcConfig = new ContractsVpc(adr, 'the-vpc');
        this.clusterName = 'gyang-tst-eks-clusteragap1'

        this.centralVpcCidr = new ContractsCrossRefConsumer(this, 'centralVpcCidr', ipamWest1Le.centralVpcCidr)
    }
}
