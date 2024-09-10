import {Construct} from "constructs";
import {ContractsBuild, SRC_Rev_REF} from "../../odmd-model/contracts-build";
import {ContractsEnverCdk} from "../../odmd-model/contracts-enver-cdk";
import {ContractsCrossRefConsumer, ContractsCrossRefProducer} from "../../odmd-model/contracts-cross-refs";
import {OndemandContracts} from "../../OndemandContracts";
import {AnyContractsEnVer} from "../../odmd-model/contracts-enver";

export class OdmdConfigNetworking extends ContractsBuild<ContractsEnverCdk> {

    gitHubRepo = OndemandContracts.inst.githubRepos.__networking

    ownerEmail = undefined

    public readonly ipam_west1_le: IPAM_AB;
    readonly envers: IPAM_AB[]

    constructor(scope: Construct) {
        super(scope, 'networking');
        this.envers = [
            this.ipam_west1_le = new IPAM_WEST1_LE(this, new SRC_Rev_REF("b", "ipam_west1_le")),
        ]
    }
}

export abstract class IPAM_AB extends ContractsEnverCdk {

    readonly centralVpcCidr: ContractsCrossRefProducer<IPAM_AB> = new ContractsCrossRefProducer(this, 'central-Vpc-Cidr')
    readonly ipamPoolName: ContractsCrossRefProducer<IPAM_AB> = new ContractsCrossRefProducer(this, 'share-pool')
    readonly transitGatewayShareName: ContractsCrossRefProducer<IPAM_AB> = new ContractsCrossRefProducer(this, 'share-tgw')

    //todo if wanted multiple NAT,  have to declare each separatedly
    readonly natPublicIP: ContractsCrossRefProducer<IPAM_AB> = new ContractsCrossRefProducer(this, 'nat-pub-ip')

    readonly ephemeral: boolean = false

    abstract readonly cidrs: string[];

    /**
     * for dns delegation,
     * 1) each ipam_ab has a root hostedzone
     * 2) each ipam_ab implementation( networking repo ) will have a lambda
     *      a, triggered by cross ref change
     *      b, go thru each of the ref get actual ns servers
     *      3, create ns record in root hostedzone
     * 3) this means dns delegation won't support dynamic enver.
     */
    abstract readonly hostedZoneName: string
    readonly subdomainNameservers = new Map<string, ContractsCrossRefConsumer<IPAM_AB, AnyContractsEnVer>>()

    public addSubdomainServer(d: string, nsServers: ContractsCrossRefProducer<AnyContractsEnVer>) {
        if (this.subdomainNameservers.has(d)) {
            throw new Error('already exist!')
        }

        this.subdomainNameservers.set(d, new ContractsCrossRefConsumer<IPAM_AB, AnyContractsEnVer>(this, 'nameServer_' + d, nsServers))
    }

    constructor(owner: OdmdConfigNetworking, region: string, rev: SRC_Rev_REF) {
        super(owner, OndemandContracts.inst.accounts.networking, region, rev);
    }

    getRevStackNames() {
        const rt = [
            `${this.owner.buildId}--${this.targetRevision.type == 'b' ? this.targetRevision.value : this.targetRevision.toPathPartStr()}`,
            `${this.owner.buildId}-share-nat--${this.targetRevision.type == 'b' ? this.targetRevision.value : this.targetRevision.toPathPartStr()}`
        ];

        return rt.map(n => IPAM_AB.SANITIZE_STACK_NAME(n))
    }
}

class IPAM_WEST1_LE extends IPAM_AB {

    constructor(owner: OdmdConfigNetworking, rev: SRC_Rev_REF) {
        super(owner, 'us-west-1', rev);
    }

    cidrs = ['10.0.0.0/12', '10.16.0.0/12']
    // preCdkCmds = [
    //     `TOKEN=$(aws secretsmanager get-secret-value --secret-id networking-bk-gh-pat --query 'SecretString' --output text)`,
    //     `echo "@gyanglz:registry=https://npm.pkg.github.com/" >> .npmrc`,
    //     `echo "//npm.pkg.github.com/:_authToken=$TOKEN" >> .npmrc`,
    // ]

    readonly hostedZoneName: string = 'odmd-le.internal'

}

class IPAM_WEST1_PROD extends IPAM_AB {
    targetAWSRegion: string = 'us-west-1'
    readonly targetRevision = new SRC_Rev_REF("b", "odmd-prod-west1")
    cidrs = ['10.32.0.0/12', '10.48.0.0/12']

    readonly hostedZoneName: string = 'odmd-prd.internal'
}
