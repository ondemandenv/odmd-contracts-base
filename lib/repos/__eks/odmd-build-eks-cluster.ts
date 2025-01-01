import {OdmdEnverEksCluster, OdmdEnverEksClusterArgoCd} from "../../model/odmd-enver-eks-cluster";
import {OndemandContracts} from "../../OndemandContracts";
import {OdmdBuildEks} from "./odmd-build-eks";
import {OdmdCrossRefConsumer, OdmdCrossRefProducer} from "../../model/odmd-cross-refs";
import {OdmdBuild, SRC_Rev_REF} from "../../model/odmd-build";
import {OdmdEnverCdk} from "../../model/odmd-enver-cdk";
import {OdmdIpAddresses, OdmdVpc, WithVpc} from "../../model/odmd-vpc";
import {IPAM_AB} from "../__networking/odmd-config-networking";
import {AccountsCentralView, GithubReposCentralView} from "../../OdmdContractsCentralView";
import {OdmdBuildContractsLib} from "../__contracts/odmd-build-contracts-lib";

export class OdmdBuildEksCluster extends OdmdBuildEks {
    private _envers: Array<OdmdEnverEksCluster>;
    public get envers(): Array<OdmdEnverEksCluster> {
        return this._envers;
    }
    
    private _argoClusterEnver!: EksClusterEnverArgo;
    public get argoClusterEnver(): EksClusterEnverArgo {
        return this._argoClusterEnver;
    }

    constructor(scope: OndemandContracts<
        AccountsCentralView,
        GithubReposCentralView, OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView>
    >) {
        super(scope, 'eks');
    }

    protected initializeEnvers(): void {
        this._envers = [];
        this._argoClusterEnver = new EksClusterEnverArgo(this, 'odmdSbxUsw1argo');
        this._envers.push(this.argoClusterEnver);
    }
}

export class EksClusterEnverArgo extends OdmdEnverEksClusterArgoCd implements WithVpc {
    ephemeral: boolean = false
    readonly vpcConfig: OdmdVpc
    readonly clusterName: string

    readonly privateDomainName = new OdmdCrossRefProducer<OdmdEnverEksCluster>(this, 'privateDomainName')
    readonly centralVpcCidr: OdmdCrossRefConsumer<this, IPAM_AB>;

    constructor(owner: OdmdBuild<OdmdEnverCdk>, id: string) {
        super(owner, owner.contracts.accounts.workspace0, 'us-west-1', new SRC_Rev_REF("b", 'odmdSbxUsw1Gyang'));
        const ipamWest1Le = owner.contracts.networking!.ipam_west1_le;
        const adr = new OdmdIpAddresses(this, ipamWest1Le.ipamPoolName)

        this.vpcConfig = new OdmdVpc(adr, 'the-vpc');
        this.clusterName = 'gyang-tst-eks-clusteragap1'

        this.centralVpcCidr = new OdmdCrossRefConsumer(this, 'centralVpcCidr', ipamWest1Le.centralVpcCidr)
    }
}
