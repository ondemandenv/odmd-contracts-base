import {OdmdBuild} from "./odmd-build";
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
        const thePkgOrg = this.owner.contracts.contractsLibBuild.pkgOrg;
        return [

            `echo "@ondemandenv:registry=https://npm.pkg.github.com/" >> .npmrc`,
            `echo "${thePkgOrg}:registry=https://npm.pkg.github.com/" >> .npmrc`,
            'echo "//npm.pkg.github.com/:_authToken=$github_token" >> .npmrc'

        ]
    }

}