import {OdmdEnverEksCluster, ContractsEnverEksClusterArgoCd} from "../../odmd-model/odmd-enver-eks-cluster";
import {OndemandContracts} from "../../OndemandContracts";
import {OdmdBuildEks} from "./odmd-build-eks";
import {OdmdCrossRefConsumer, OdmdCrossRefProducer} from "../../odmd-model/odmd-cross-refs";
import {OdmdBuild, SRC_Rev_REF} from "../../odmd-model/odmd-build";
import {OdmdEnverCdk} from "../../odmd-model/odmd-enver-cdk";
import {ContractsIpAddresses, OdmdVpc, WithVpc} from "../../odmd-model/odmd-vpc";
import {IPAM_AB} from "../__networking/odmd-config-networking";
import {AccountsCentralView, GithubReposCentralView} from "../../OdmdContractsCentralView";
import {OdmdBuildContractsLib} from "../__contracts/odmd-build-contracts-lib";

export class OdmdBuildEksCluster extends OdmdBuildEks {

    public readonly envers: Array<OdmdEnverEksCluster>

    // public readonly clusterEnver: ContractsEnverEksCluster
    public readonly argoClusterEnver: EksClusterEnverArgo

    constructor(scope: OndemandContracts<
        AccountsCentralView,
        GithubReposCentralView, OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView>
    >) {
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
    readonly vpcConfig: OdmdVpc
    readonly clusterName: string

    readonly privateDomainName = new OdmdCrossRefProducer<OdmdEnverEksCluster>(this, 'privateDomainName')
    readonly centralVpcCidr: OdmdCrossRefConsumer<this, IPAM_AB>;

    constructor(owner: OdmdBuild<OdmdEnverCdk>, id: string) {
        super(owner, owner.contracts.accounts.workspace0, 'us-west-1', new SRC_Rev_REF("b", 'odmdSbxUsw1Gyang'));
        const ipamWest1Le = owner.contracts.networking!.ipam_west1_le;
        const adr = new ContractsIpAddresses(this, ipamWest1Le.ipamPoolName)

        this.vpcConfig = new OdmdVpc(adr, 'the-vpc');
        this.clusterName = 'gyang-tst-eks-clusteragap1'

        this.centralVpcCidr = new OdmdCrossRefConsumer(this, 'centralVpcCidr', ipamWest1Le.centralVpcCidr)
    }
}
