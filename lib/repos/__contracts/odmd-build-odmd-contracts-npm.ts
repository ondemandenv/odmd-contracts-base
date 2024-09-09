import {OdmdBuildOdmdContracts} from "./odmd-build-odmd-contracts";
import {ContractsEnverNpm} from "../../odmd-model/contracts-enver-npm";
import {OndemandContracts} from "../../OndemandContracts";
import {SRC_Rev_REF} from "../../odmd-model/contracts-build";


export class OdmdConfigOdmdContractsNpm extends OdmdBuildOdmdContracts<ContractsEnverNpm> {

    readonly envers: Array<ContractsEnverNpm>
    readonly theOne: ContractsEnverNpm

    public get packageName(): string {
        return '@ondemandenv/contracts-lib-base'
    }

    constructor(scope: OndemandContracts) {
        super(scope, 'odmd-contracts-npm');

        const srcRevREF = new SRC_Rev_REF("b", "odmd_us_west_1__sandbox");

        this.theOne = new ContractsEnverNpm(
            this,
            OndemandContracts.myInst.accounts.workplace2,
            'us-west-1',
            srcRevREF
        );
        this.envers = [this.theOne];

        const PKG_VER = `PKG_VER=$(jq -r '.version' package.json)`;

        /*
        /odmd-contracts-latest-version/ondemandenv/odmd-app-contracts/odmd_us_west_1__sandbox
       */
        const paramPath = `/odmd-contracts-latest-version/${this.gitHubRepo.owner}/${this.gitHubRepo.name}/${srcRevREF.value}`
        this.theOne.buildCmds.push(
            `PKG_NAME=$(jq -r '.name' package.json) && test "$PKG_NAME" != "${this.packageName}" || echo $PKG_NAME is good`,
            `npm install`,
            `npm run test`,
            `npm publish`,
            `git config user.name "odmd_us_west_1__workplace2[bot]"`,
            `git config user.email "odmd_us_west_1__workplace2@ondemandenv.dev"`,

            `${PKG_VER} && npm dist-tag add ${this.packageName}@$PKG_VER $GITHUB_SHA`,

            `${PKG_VER} && git tag "v$PKG_VER" && git tag "latest" -m "odmd" && git push origin --tags --force`,

            /*
# Step 1: Assume the role
assume_role_output=$(aws sts assume-role --role-arn arn:aws:iam::123456789012:role/MyRole --role-session-name MySessionName)

# Step 2: Export temporary credentials
export AWS_ACCESS_KEY_ID=$(echo $assume_role_output | jq -r '.Credentials.AccessKeyId')
export AWS_SECRET_ACCESS_KEY=$(echo $assume_role_output | jq -r '.Credentials.SecretAccessKey')
export AWS_SESSION_TOKEN=$(echo $assume_role_output | jq -r '.Credentials.SessionToken')

# Step 3: Execute the `aws ssm put-parameter` command
aws ssm put-parameter --name "MyParameter" --value "MyValue" --type "String" --overwrite
            */

            `${PKG_VER} \
&& assume_role_output=$(aws sts assume-role --role-arn ${this.theOne.centralRoleArn} --role-session-name contracts_pkg) \
&& export AWS_ACCESS_KEY_ID=$(echo $assume_role_output | jq -r '.Credentials.AccessKeyId') \
&& export AWS_SECRET_ACCESS_KEY=$(echo $assume_role_output | jq -r '.Credentials.SecretAccessKey') \
&& export AWS_SESSION_TOKEN=$(echo $assume_role_output | jq -r '.Credentials.SessionToken') \
&& aws ssm put-parameter --name ${paramPath} --type String --value "$GITHUB_SHA\n${this.packageName}:$PKG_VER" --overwrite`
        )
    }
}