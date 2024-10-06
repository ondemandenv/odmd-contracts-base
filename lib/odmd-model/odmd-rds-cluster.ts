import {
    AuroraPostgresEngineVersion,
    DatabaseClusterEngine,
    IClusterEngine,
    IParameterGroup,
    ServerlessScalingOptions
} from "aws-cdk-lib/aws-rds";
import {RemovalPolicy} from "aws-cdk-lib";
import {PgSchemaUsersProps} from "./odmd-pg-schema-usrs";
import {OdmdVpc, WithVpc} from "./odmd-vpc";
import {OdmdCrossRefConsumer, OdmdCrossRefProducer, OdmdNames} from "./odmd-cross-refs";
import {AnyOdmdEnVer} from "./odmd-enver";

export class OdmdRdsCluster {


    constructor(vpc: OdmdVpc, rdsId: string = 'db') {
        this.vpc = vpc;
        this.rdsId = rdsId;

        this.clusterIdentifier = (vpc.vpcName + '-rds-' + rdsId).toLowerCase().replace(/[^a-z0-9\-]+/g, '')

        this.rootSecretName = OdmdNames.create(vpc.build, vpc.vpcName + rdsId + 'secret')

        this.defaultSgName = OdmdNames.create(vpc.build, vpc.vpcName + rdsId + 'security')
    }

    public addAllowProducer(producer: OdmdCrossRefProducer<AnyOdmdEnVer>) {
        this.allowingCIDRS.push(new OdmdCrossRefConsumer(this.vpc.ipAddresses.enver, producer.name, producer, {
            defaultIfAbsent: '0.0.0.0/32',
            trigger: "directly"
        }))
    }

    public readonly allowingCIDRS: Array<OdmdCrossRefConsumer<AnyOdmdEnVer, AnyOdmdEnVer>> = []

    public readonly rdsId: string;
    public readonly vpc: OdmdVpc;
    public readonly clusterIdentifier: string
    public readonly rootSecretName: string;
    public readonly defaultSgName: string;
    public readonly defaultDatabaseName: string = 'defaultDatabaseName';
    public readonly rootUsername: string = 'pgadmin';
    public readonly scaling: ServerlessScalingOptions = {minCapacity: 2, maxCapacity: 8};
    public readonly engine: IClusterEngine = DatabaseClusterEngine.auroraPostgres({version: AuroraPostgresEngineVersion.VER_13_13});
    public readonly enableDataApi: boolean = false;
    public readonly removalPolicy: RemovalPolicy = RemovalPolicy.DESTROY;
    public readonly parameterGroup: IParameterGroup;
    public readonly copyTagsToSnapshot: boolean = true;
    public readonly schemaRoleUsers = [] as PgSchemaUsersProps[];

    public readonly clusterHostname: OdmdCrossRefProducer<AnyOdmdEnVer>
    public readonly clusterPort: OdmdCrossRefProducer<AnyOdmdEnVer>
    public readonly clusterSocketAddress: OdmdCrossRefProducer<AnyOdmdEnVer>
    public readonly clusterMasterRoleArn: OdmdCrossRefProducer<AnyOdmdEnVer>
    // public readonly clusterReadHostname: ContractsCrossRefProducer<AnyContractsEnVer>
    // public readonly clusterReadPort: ContractsCrossRefProducer<AnyContractsEnVer>
    // public readonly clusterReadSocketAddress: ContractsCrossRefProducer<AnyContractsEnVer>

    public readonly usernameToSecretId = new Map<string, OdmdCrossRefProducer<AnyOdmdEnVer>>()
}


export interface WithRds extends WithVpc {
    readonly rdsConfig: OdmdRdsCluster
}