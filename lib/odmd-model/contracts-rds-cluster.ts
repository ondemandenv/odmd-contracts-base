import {
    AuroraPostgresEngineVersion,
    DatabaseClusterEngine,
    IClusterEngine,
    IParameterGroup,
    ServerlessScalingOptions
} from "aws-cdk-lib/aws-rds";
import {RemovalPolicy} from "aws-cdk-lib";
import {PgSchemaUsersProps} from "./contracts-pg-schema-usrs";
import {ContractsVpc, WithVpc} from "./contracts-vpc";
import {ContractsCrossRefConsumer, ContractsCrossRefProducer, OdmdNames} from "./contracts-cross-refs";
import {AnyContractsEnVer} from "./contracts-enver";

export class ContractsRdsCluster {


    constructor(vpc: ContractsVpc, rdsId: string = 'db') {
        this.vpc = vpc;
        this.rdsId = rdsId;

        this.clusterIdentifier = (vpc.vpcName + '-rds-' + rdsId).toLowerCase().replace(/[^a-z0-9\-]+/g, '')

        this.rootSecretName = OdmdNames.create(vpc.build, vpc.vpcName + rdsId + 'secret')

        this.defaultSgName = OdmdNames.create(vpc.build, vpc.vpcName + rdsId + 'security')
    }

    public addAllowProducer(producer: ContractsCrossRefProducer<AnyContractsEnVer>) {
        this.allowingCIDRS.push(new ContractsCrossRefConsumer(this.vpc.ipAddresses.enver, producer.name, producer, {
            defaultIfAbsent: '0.0.0.0/32',
            trigger: "directly"
        }))
    }

    public readonly allowingCIDRS: Array<ContractsCrossRefConsumer<AnyContractsEnVer, AnyContractsEnVer>> = []

    public readonly rdsId: string;
    public readonly vpc: ContractsVpc;
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

    public readonly clusterHostname: ContractsCrossRefProducer<AnyContractsEnVer>
    public readonly clusterPort: ContractsCrossRefProducer<AnyContractsEnVer>
    public readonly clusterSocketAddress: ContractsCrossRefProducer<AnyContractsEnVer>
    public readonly clusterMasterRoleArn: ContractsCrossRefProducer<AnyContractsEnVer>
    // public readonly clusterReadHostname: ContractsCrossRefProducer<AnyContractsEnVer>
    // public readonly clusterReadPort: ContractsCrossRefProducer<AnyContractsEnVer>
    // public readonly clusterReadSocketAddress: ContractsCrossRefProducer<AnyContractsEnVer>

    public readonly usernameToSecretId = new Map<string, ContractsCrossRefProducer<AnyContractsEnVer>>()
}


export interface WithRds extends WithVpc {
    readonly rdsConfig: ContractsRdsCluster
}