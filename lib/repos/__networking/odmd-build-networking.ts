import {OdmdBuild, SRC_Rev_REF} from "../../model/odmd-build";
import {OdmdEnverCdk} from "../../model/odmd-enver-cdk";
import {OdmdCrossRefConsumer, OdmdCrossRefProducer} from "../../model/odmd-cross-refs";
import {OndemandContracts} from "../../OndemandContracts";
import {AnyOdmdEnVer} from "../../model/odmd-enver";
import {AccountsCentralView, GithubReposCentralView} from "../../OdmdContractsCentralView";
import {OdmdBuildContractsLib} from "../__contracts/odmd-build-contracts-lib";

export class OdmdBuildNetworking extends OdmdBuild<OdmdEnverCdk> {
    ownerEmail = undefined;
    public ipam_west1_le!: IPAM_AB;

    protected _envers: IPAM_AB[];
    public get envers(): IPAM_AB[] {
        return this._envers;
    }

    constructor(scope: OndemandContracts<
        AccountsCentralView,
        GithubReposCentralView, OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView>
    >) {
        super(scope, 'networking', scope.githubRepos.__networking!);
    }

    protected initializeEnvers(): void {
        this._envers = [];
        this.ipam_west1_le = new IPAM_WEST1_LE(this, new SRC_Rev_REF("b", "ipam_west1_le"));
        this._envers.push(this.ipam_west1_le);
    }
}

export abstract class IPAM_AB extends OdmdEnverCdk {

    readonly centralVpcCidr: OdmdCrossRefProducer<IPAM_AB> = new OdmdCrossRefProducer(this, 'central-Vpc-Cidr')
    readonly ipamPoolName: OdmdCrossRefProducer<IPAM_AB> = new OdmdCrossRefProducer(this, 'share-pool')
    readonly transitGatewayShareName: OdmdCrossRefProducer<IPAM_AB> = new OdmdCrossRefProducer(this, 'share-tgw')

    //todo if wanted multiple NAT,  have to declare each separatedly
    readonly natPublicIP: OdmdCrossRefProducer<IPAM_AB> = new OdmdCrossRefProducer(this, 'nat-pub-ip')

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
    readonly subdomainNameservers = new Map<string, OdmdCrossRefConsumer<IPAM_AB, AnyOdmdEnVer>>()

    public addSubdomainServer(d: string, nsServers: OdmdCrossRefProducer<AnyOdmdEnVer>) {
        if (this.subdomainNameservers.has(d)) {
            throw new Error('already exist!')
        }

        this.subdomainNameservers.set(d, new OdmdCrossRefConsumer<IPAM_AB, AnyOdmdEnVer>(this, 'nameServer_' + d, nsServers))
    }

    constructor(owner: OdmdBuildNetworking, region: string, rev: SRC_Rev_REF) {
        super(owner, owner.contracts.accounts.networking!, region, rev);
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

    constructor(owner: OdmdBuildNetworking, rev: SRC_Rev_REF) {
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
