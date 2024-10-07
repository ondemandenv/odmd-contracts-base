import {OdmdBuild, SRC_Rev_REF} from "../../model/odmd-build";
import {OndemandContracts} from "../../OndemandContracts";
import {AccountsCentralView, GithubReposCentralView} from "../../OdmdContractsCentralView";
import {OdmdEnverCMDs} from "../../model/odmd-enver-c-m-ds";
import {OdmdCrossRefProducer} from "../../model/odmd-cross-refs";
import {Stack} from "aws-cdk-lib";

export abstract class OdmdBuildContractsLib<
    A extends AccountsCentralView,
    G extends GithubReposCentralView
> extends OdmdBuild<OdmdEnverContractsLib> {

    /*
    the s3 bucket object key for saving the latest contracts ver info
     */
    public static readonly LATEST_CONTRACTS_LIB_VER_KEY = "LATEST_CONTRACTS_LIB_VER_KEY"

    public abstract get packageName(): string/* {
        return '@ondemandenv/contracts-lib-base'
    }*/

    public get pkgOrg(): string {
        return this.packageName.split('/')[0];
    }


    constructor(scope: OndemandContracts<
        AccountsCentralView,
        GithubReposCentralView, OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView>
    >, id: string) {
        super(scope, id, scope.githubRepos.__contracts);
    }

    // createEnver(region: string, ref: SRC_Rev_REF) {
    //     return new OdmdEnverContractsLib(this, this.contracts.accounts.workspace0, region, ref)
    // }

    public abstract get theOne(): OdmdEnverContractsLib

}


export class OdmdEnverContractsLib extends OdmdEnverCMDs {
    /**
     *
     * @see the build cmds which populate this producer and
     * cp to the bucket which drives the sqs passing to seed central root
     */
    readonly contractsLibLatest: OdmdCrossRefProducer<OdmdEnverContractsLib>;

    readonly owner: OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView>;

    constructor(owner: OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView>, targetAWSAccountID: string, targetAWSRegion: string, targetRevision: SRC_Rev_REF) {
        super(owner, targetAWSAccountID, targetAWSRegion, targetRevision);
        this.contractsLibLatest = new OdmdCrossRefProducer(this, 'contractsLibLatest')
    }

    /*
    contracts( this ) case should get targetBucketName from its central which always will be there
    central-customer should get targetBucketName from rootCentralPerS3bucket
    private targetBucketConsumer?: ContractsCrossRefConsumer<ContractsEnverCMDs, RootCentralPerS3bucketEnver>
    get targetBucketName(): ContractsCrossRefConsumer<ContractsEnverCMDs, RootCentralPerS3bucketEnver> {
        if (!this.targetBucketConsumer)
            this.targetBucketConsumer = new ContractsCrossRefConsumer(this, 'targetBucketName',
                (this.owner as OdmdBuildOdmdContractsSeed).contracts.rootCentralPerS3bucket.rootOdmdSeedCentral.targetBucketName);
        return this.targetBucketConsumer
    }*/


    generateBuildCmds(stack: Stack, targetBucketName: string): string[] {
        const ret = this.genNpmRcCmds()
        ret.push(...this.genContractsLibBuildCmds(targetBucketName))
        return ret
    }

    genContractsLibBuildCmds(targetBucketName: string): string[] {

        const ret = []
        ret.push(
            `PKG_NAME=$(jq -r '.name' package.json) && test "$PKG_NAME" != "${this.owner.packageName}" || echo $PKG_NAME is good`,
            `npm install`,
            `npm run test`,
            `npm publish`,
            `git config user.name "${this.node.path}[bot]"`,
            `git config user.email "${this.node.path}@ondemandenv.dev"`,


            `PKG_VER=$(jq -r '.version' package.json)
 git tag "v$PKG_VER" && git tag "latest" -m "odmd" && git push origin --tags --force
 assume_role_output=$(aws sts assume-role --role-arn ${this.owner.theOne.centralRoleArn} --role-session-name contracts_pkg) 
 export AWS_ACCESS_KEY_ID=$(echo $assume_role_output | jq -r '.Credentials.AccessKeyId')
 export AWS_SECRET_ACCESS_KEY=$(echo $assume_role_output | jq -r '.Credentials.SecretAccessKey')
 export AWS_SESSION_TOKEN=$(echo $assume_role_output | jq -r '.Credentials.SessionToken')
 aws ssm put-parameter --name ${this.contractsLibLatest.toSharePath()} --type String --value "$GITHUB_SHA\n${this.owner.packageName}:$PKG_VER" --overwrite
 echo "$GITHUB_SHA\n${this.owner.packageName}:$PKG_VER" | aws s3 cp - s3://${targetBucketName}${OdmdBuildContractsLib.LATEST_CONTRACTS_LIB_VER_KEY}
 npm dist-tag add ${this.owner.packageName}@$PKG_VER $GITHUB_SHA --registry=https://npm.pkg.github.com`,
        )
        return ret;
    }

}