import {
    AllocateCidrRequest,
    IIpAddresses,
    SubnetConfiguration,
    SubnetIpamOptions,
    VpcIpamOptions,
    VpcProps
} from "aws-cdk-lib/aws-ec2";
import {OdmdBuild} from "./odmd-build";
import {OdmdCrossRefConsumer, OdmdCrossRefProducer} from "./odmd-cross-refs";
import {AnyOdmdEnVer, IOdmdEnver} from "./odmd-enver";
import {IPAM_AB} from "../repos/__networking/odmd-build-networking";

export class OdmdVpc implements VpcProps {

    public readonly build: OdmdBuild<AnyOdmdEnVer>

    constructor(addresses: OdmdIpAddresses, name: string) {
        this.ipAddresses = addresses
        this.build = addresses.enver.owner
        this.vpcName = name.startsWith(this.build.buildId) ? name : this.build.buildId + name

        this.maxAzs = 2;
        this.natGateways = 0;

        this.transitGatewayRef = new OdmdCrossRefConsumer<AnyOdmdEnVer, IPAM_AB>(
            addresses.enver, addresses.enver.targetRevision.toPathPartStr() + '-' + addresses.ipv4IpamPoolRef.producer.name, addresses.ipv4IpamPoolRef.producer.owner.transitGatewayShareName)
    }

    public readonly transitGatewayRef: OdmdCrossRefConsumer<AnyOdmdEnVer, IPAM_AB>
    public readonly ipAddresses: OdmdIpAddresses;
    public readonly vpcName: string;
    public readonly maxAzs: number;
    public readonly natGateways: number;
    public readonly subnetConfiguration: SubnetConfiguration[];

}

export interface WithVpc extends IOdmdEnver {
    readonly vpcConfig: OdmdVpc
    readonly vpcCidr?: OdmdCrossRefProducer<WithVpc>
}

export class OdmdIpAddresses implements IIpAddresses {

    readonly enver: AnyOdmdEnVer;

    constructor(enver: AnyOdmdEnVer, ipv4IpamPoolRef: OdmdCrossRefProducer<IPAM_AB>,
                ipv4NetmaskLength: number = 26,
                defaultSubnetIpv4NetmaskLength: number = 28) {
        this.enver = enver;
        // this.ipv4IpamPoolRef = ipv4IpamPoolRef;
        this.ipv4IpamPoolRef = new OdmdCrossRefConsumer<AnyOdmdEnVer, IPAM_AB>(enver, ipv4IpamPoolRef.name, ipv4IpamPoolRef);
        this.ipv4NetmaskLength = ipv4NetmaskLength;
        this.defaultSubnetIpv4NetmaskLength = defaultSubnetIpv4NetmaskLength;
    }

    public readonly ipv4NetmaskLength: number
    public readonly defaultSubnetIpv4NetmaskLength: number
    public readonly ipv4IpamPoolRef: OdmdCrossRefConsumer<AnyOdmdEnVer, IPAM_AB>;

    allocateSubnetsCidr(input: AllocateCidrRequest): SubnetIpamOptions {
        throw new Error('n/a')
    }

    allocateVpcCidr(): VpcIpamOptions {
        throw new Error('n/a')
    }
}