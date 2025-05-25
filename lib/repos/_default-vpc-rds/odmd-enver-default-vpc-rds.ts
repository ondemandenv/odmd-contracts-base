//vpc->rds->schema->user
import {OdmdEnverCdk} from "../../model/odmd-enver-cdk";
import {OdmdIpAddresses, OdmdVpc, WithVpc} from "../../model/odmd-vpc";
import {OdmdRdsCluster} from "../../model/odmd-rds-cluster";
import {OdmdBuildDefaultVpcRds, SimpleVpc} from "./odmd-build-default-vpc-rds";
import {OdmdCrossRefConsumer, OdmdCrossRefProducer} from "../../model/odmd-cross-refs";
import {AnyOdmdEnVer} from "../../model/odmd-enver";
import {PgSchemaUsersProps} from "../../model/odmd-pg-schema-usrs";
import {SRC_Rev_REF} from "../../model/odmd-build";
import {OndemandContracts} from "../../OndemandContracts";
import {IPAM_AB} from "../__networking/odmd-build-networking";
import {AccountsCentralView} from "../../OdmdContractsCentralView";

export class OdmdEnverCdkDefaultVpc extends OdmdEnverCdk implements WithVpc {

    readonly vpcConfig: OdmdVpc
    readonly vpcIpv4Cidr: OdmdCrossRefProducer<OdmdEnverCdkDefaultVpc>
    readonly rdsConfigs = [] as OdmdRdsCluster[]
    readonly nameServers: OdmdCrossRefProducer<OdmdEnverCdkDefaultVpc>
    readonly centralVpcCidr: OdmdCrossRefConsumer<this, IPAM_AB>;
    readonly rdsTrustCentralRoleName: string
    readonly clientEnvers: Set<AnyOdmdEnVer> = new Set()

    constructor(owner: OdmdBuildDefaultVpcRds, clientAWSRegion: string, accountKey: keyof AccountsCentralView,
                vpc: SimpleVpc, defaultRev: SRC_Rev_REF = new SRC_Rev_REF("b", `${clientAWSRegion}_${accountKey}_${vpc.vpcName}`
            .replace(/[^a-zA-Z0-9_]/g, '_'))) {
        super(owner, owner.contracts.accounts[accountKey]!, clientAWSRegion, defaultRev);

        this.centralVpcCidr = new OdmdCrossRefConsumer(this, 'centralVpcCidr', vpc.ipamEnver.centralVpcCidr)

        const adr = new OdmdIpAddresses(this, vpc.ipamEnver.ipamPoolName, vpc.ipv4NetmaskLength, vpc.defaultSubnetIpv4NetmaskLength)

        const tgw = new OdmdCrossRefConsumer(
            this, 'tgw', vpc.ipamEnver.transitGatewayShareName
        )

        this.vpcConfig = new (class extends OdmdVpc {
            vpcName = vpc.vpcName
            transitGatewayRef = tgw
        })(adr, 'vpc');

        this.vpcIpv4Cidr = new OdmdCrossRefProducer(this, 'vpcIpv4Cidr_' + vpc.vpcName)
        this.nameServers = new OdmdCrossRefProducer(this, 'nameServers_' + vpc.vpcName)

        vpc.ipamEnver.addSubdomainServer(vpc.vpcName + '_' + owner.contracts.getAccountName(this.targetAWSAccountID), this.nameServers)
        this.rdsTrustCentralRoleName = `rds_${this.targetAWSAccountID}_trustCentral_${this.targetAWSRegion}`
    }

    addClient(c: AnyOdmdEnVer) {
        if (this.clientEnvers.has(c)) {
            console.warn("Adding client again?")
            return
        }
        this.clientEnvers.add(c)
    }


    ephemeral: boolean = false

    getOrCreateRdsCluster(rdsId: string) {
        const found = this.rdsConfigs.find(r => r.rdsId == rdsId);
        if (found != undefined) {
            return found;
        }

        const clusterHostname = new OdmdCrossRefProducer<AnyOdmdEnVer>(this, 'clusterHostname');
        const clusterPort = new OdmdCrossRefProducer<AnyOdmdEnVer>(this, 'clusterPort');
        const clusterSocketAddress = new OdmdCrossRefProducer<AnyOdmdEnVer>(this, 'clusterSocketAddress');
        const clusterMasterRoleArn = new OdmdCrossRefProducer<AnyOdmdEnVer>(this, 'clusterMasterRoleArn');

        const rdsConfig = new (class extends OdmdRdsCluster {
            clusterHostname = clusterHostname
            clusterPort = clusterPort
            clusterSocketAddress = clusterSocketAddress
            clusterMasterRoleArn = clusterMasterRoleArn
        })(this.vpcConfig, rdsId)

        this.rdsConfigs.push(rdsConfig)
        return rdsConfig
    }

    addSchemaUsers(rds: OdmdRdsCluster, schemaUsers: PgSchemaUsersProps) {
        if (!this.rdsConfigs.find(r => r == rds)) {
            throw new Error(`input rds is not one of this vpc's rds`)
        }

        if (rds.schemaRoleUsers.find(s => s.schema == schemaUsers.schema) != undefined) {
            throw new Error(`already schema ${schemaUsers.schema}, add your users to it instead of creating a new one`)
        }
        rds.schemaRoleUsers.push(schemaUsers)

        schemaUsers.userSecrets.forEach((us) => {
            if (rds.usernameToSecretId.has(us.userName)) {
                throw new Error(`pg username:${us.userName} already exist`)
            }
            rds.usernameToSecretId.set(us.userName, new OdmdCrossRefProducer<AnyOdmdEnVer>(this, 'clusteruser-' + us.userName))
        })
    }

    getRevStackNames(): Array<string> {
        const revStr = this.targetRevision.type == 'b' ? this.targetRevision.value : this.targetRevision.toPathPartStr();

        const stackName = `${this.owner.buildId}--${revStr}`;
        const rt = [stackName];
        this.rdsConfigs.forEach(r => {
            rt.push(stackName + '-' + r.clusterIdentifier)
            r.schemaRoleUsers.forEach(su => {
                rt.push(stackName + '-' + r.clusterIdentifier + '-' + su.schema)
            })
        })
        return rt.map(n => OdmdEnverCdk.SANITIZE_STACK_NAME(n))
    }
}