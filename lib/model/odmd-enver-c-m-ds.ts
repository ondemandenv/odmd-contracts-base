import {OdmdBuild, SRC_Rev_REF} from "./odmd-build";
import {OdmdEnver} from "./odmd-enver";
import {Stack} from "aws-cdk-lib";

/**
 * we don't have producer of the repo here because:
 * Only cdk enver implement producers
 *
 */
export abstract class OdmdEnverCMDs extends OdmdEnver<OdmdBuild<OdmdEnverCMDs>> {

    abstract generateBuildCmds(stack: Stack, ...args: any[]): string[]

    genNpmRcCmds(): string[] {
        return [

            `echo "${this.owner.contracts.contractsLibBuild.pkgOrg
            }:registry=https://npm.pkg.github.com/" >> .npmrc`,
            'echo "//npm.pkg.github.com/:_authToken=$github_token" >> .npmrc'

        ]
    }

}