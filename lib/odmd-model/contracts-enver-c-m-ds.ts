import {ContractsBuild, SRC_Rev_REF} from "./contracts-build";
import {ContractsEnver} from "./contracts-enver";
import {Stack} from "aws-cdk-lib";

/**
 * we don't have producer of the repo here because:
 * Only cdk enver implement producers
 *
 */
export class ContractsEnverCMDs extends ContractsEnver<ContractsBuild<ContractsEnverCMDs>> {


    generateBuildCmds(stack: Stack): string[] {
        return [

            `echo "${this.owner.contracts.odmdConfigOdmdContractsNpm.packageName.split('/')[0]}:registry=https://npm.pkg.github.com/" >> .npmrc`,
            'echo "//npm.pkg.github.com/:_authToken=$github_token" >> .npmrc'

        ]
    }


}