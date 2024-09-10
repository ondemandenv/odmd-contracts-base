//vpc->rds->schema->user
import {ContractsEnverCdk} from "../../odmd-model/contracts-enver-cdk";
import {ContractsIpAddresses, ContractsVpc, WithVpc} from "../../odmd-model/contracts-vpc";
import {ContractsRdsCluster} from "../../odmd-model/contracts-rds-cluster";
import {OdmdBuildDefaultVpcRds, SimpleVpc} from "./odmd-build-default-vpc-rds";
import {ContractsCrossRefConsumer, ContractsCrossRefProducer} from "../../odmd-model/contracts-cross-refs";
import {AnyContractsEnVer} from "../../odmd-model/contracts-enver";
import {PgSchemaUsersProps} from "../../odmd-model/contracts-pg-schema-usrs";
import {SRC_Rev_REF} from "../../odmd-model/contracts-build";
import {Accounts, OndemandContracts} from "../../OndemandContracts";
import {IPAM_AB} from "../__networking/odmd-config-networking";

export class ContractsEnverCdkDefaultVpc extends ContractsEnverCdk implements WithVpc {

    readonly vpcConfig: ContractsVpc
    readonly vpcIpv4Cidr: ContractsCrossRefProducer<ContractsEnverCdkDefaultVpc>
    readonly rdsConfigs = [] as ContractsRdsCluster[]
    readonly nameServers: ContractsCrossRefProducer<ContractsEnverCdkDefaultVpc>
    readonly centralVpcCidr: ContractsCrossRefConsumer<this, IPAM_AB>;
    readonly rdsTrustCentralRoleName: string
    readonly clientEnvers: Set<AnyContractsEnVer> = new Set()

    constructor(owner: OdmdBuildDefaultVpcRds, clientAWSRegion: string, accountKey: keyof Accounts,
                vpc: SimpleVpc, defaultRev: SRC_Rev_REF = new SRC_Rev_REF("b", `${clientAWSRegion}_${accountKey}_${vpc.vpcName}`
            .replace(/[^a-zA-Z0-9_]/g, '_'))) {
        super(owner, OndemandContracts.inst.accounts[accountKey]!, clientAWSRegion, defaultRev);

        this.centralVpcCidr = new ContractsCrossRefConsumer(this, 'centralVpcCidr', vpc.ipamEnver.centralVpcCidr)

        const adr = new ContractsIpAddresses(this, vpc.ipamEnver.ipamPoolName, vpc.ipv4NetmaskLength, vpc.defaultSubnetIpv4NetmaskLength)

        const tgw = new ContractsCrossRefConsumer(
            this, 'tgw', vpc.ipamEnver.transitGatewayShareName
        )

        this.vpcConfig = new (class extends ContractsVpc {
            vpcName = vpc.vpcName
            transitGatewayRef = tgw
        })(adr, 'vpc');

        this.vpcIpv4Cidr = new ContractsCrossRefProducer(this, 'vpcIpv4Cidr_' + vpc.vpcName)
        this.nameServers = new ContractsCrossRefProducer(this, 'nameServers_' + vpc.vpcName)

        vpc.ipamEnver.addSubdomainServer(vpc.vpcName + '_' + OndemandContracts.inst.getAccountName(this.targetAWSAccountID), this.nameServers)
        this.rdsTrustCentralRoleName = `rds_${this.targetAWSAccountID}_trustCentral_${this.targetAWSRegion}`
    }

    addClient(c: AnyContractsEnVer) {
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

        const clusterHostname = new ContractsCrossRefProducer<AnyContractsEnVer>(this, 'clusterHostname');
        const clusterPort = new ContractsCrossRefProducer<AnyContractsEnVer>(this, 'clusterPort');
        const clusterSocketAddress = new ContractsCrossRefProducer<AnyContractsEnVer>(this, 'clusterSocketAddress');
        const clusterMasterRoleArn = new ContractsCrossRefProducer<AnyContractsEnVer>(this, 'clusterMasterRoleArn');

        const rdsConfig = new (class extends ContractsRdsCluster {
            clusterHostname = clusterHostname
            clusterPort = clusterPort
            clusterSocketAddress = clusterSocketAddress
            clusterMasterRoleArn = clusterMasterRoleArn
        })(this.vpcConfig, rdsId)

        this.rdsConfigs.push(rdsConfig)
        return rdsConfig
    }

    addSchemaUsers(rds: ContractsRdsCluster, schemaUsers: PgSchemaUsersProps) {
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
            rds.usernameToSecretId.set(us.userName, new ContractsCrossRefProducer<AnyContractsEnVer>(this, 'clusteruser-' + us.userName))
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
        return rt.map(n => ContractsEnverCdk.SANITIZE_STACK_NAME(n))
    }
}