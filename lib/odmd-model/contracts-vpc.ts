import {
    AllocateCidrRequest,
    IIpAddresses,
    SubnetConfiguration,
    SubnetIpamOptions,
    VpcIpamOptions,
    VpcProps
} from "aws-cdk-lib/aws-ec2";
import {ContractsBuild} from "./contracts-build";
import {ContractsCrossRefConsumer, ContractsCrossRefProducer} from "./contracts-cross-refs";
import {AnyContractsEnVer, IContractsEnver} from "./contracts-enver";
import {IPAM_AB} from "../repos/__networking/odmd-config-networking";

export class ContractsVpc implements VpcProps {

    public readonly build: ContractsBuild<AnyContractsEnVer>

    constructor(addresses: ContractsIpAddresses, name: string) {
        this.ipAddresses = addresses
        this.build = addresses.enver.owner
        this.vpcName = name.startsWith(this.build.buildId) ? name : this.build.buildId + name

        this.maxAzs = 2;
        this.natGateways = 0;

        this.transitGatewayRef = new ContractsCrossRefConsumer<AnyContractsEnVer, IPAM_AB>(
            addresses.enver, addresses.enver.targetRevision.toPathPartStr() + '-' + addresses.ipv4IpamPoolRef.producer.name, addresses.ipv4IpamPoolRef.producer.owner.transitGatewayShareName)
    }

    public readonly transitGatewayRef: ContractsCrossRefConsumer<AnyContractsEnVer, IPAM_AB>
    public readonly ipAddresses: ContractsIpAddresses;
    public readonly vpcName: string;
    public readonly maxAzs: number;
    public readonly natGateways: number;
    public readonly subnetConfiguration: SubnetConfiguration[];

}

export interface WithVpc extends IContractsEnver {
    readonly vpcConfig: ContractsVpc
    readonly vpcCidr?: ContractsCrossRefProducer<WithVpc>
}

export class ContractsIpAddresses implements IIpAddresses {

    readonly enver: AnyContractsEnVer;

    constructor(enver: AnyContractsEnVer, ipv4IpamPoolRef: ContractsCrossRefProducer<IPAM_AB>,
                ipv4NetmaskLength: number = 26,
                defaultSubnetIpv4NetmaskLength: number = 28) {
        this.enver = enver;
        // this.ipv4IpamPoolRef = ipv4IpamPoolRef;
        this.ipv4IpamPoolRef = new ContractsCrossRefConsumer<AnyContractsEnVer, IPAM_AB>(enver, ipv4IpamPoolRef.name, ipv4IpamPoolRef);
        this.ipv4NetmaskLength = ipv4NetmaskLength;
        this.defaultSubnetIpv4NetmaskLength = defaultSubnetIpv4NetmaskLength;
    }

    public readonly ipv4NetmaskLength: number
    public readonly defaultSubnetIpv4NetmaskLength: number
    public readonly ipv4IpamPoolRef: ContractsCrossRefConsumer<AnyContractsEnVer, IPAM_AB>;

    allocateSubnetsCidr(input: AllocateCidrRequest): SubnetIpamOptions {
        throw new Error('n/a')
    }

    allocateVpcCidr(): VpcIpamOptions {
        throw new Error('n/a')
    }
}