import {ContractsBuild, SRC_Rev_REF} from "./contracts-build";
import {ContractsEnver} from "./contracts-enver";

/**
 * we don't have producer of the repo here because:
 * all lib artifacts builds are used as library for an app/service, we only track the app/service version,
 * EXCEPT the CONTRACTS defining odmd self and all services' contracts.
 */
export class ContractsEnverNpm extends ContractsEnver<ContractsBuild<ContractsEnverNpm>> {

    constructor(owner: ContractsBuild<ContractsEnverNpm>, targetAWSAccountID: string, targetAWSRegion: string, targetRevision: SRC_Rev_REF, buildCmds: string[] | undefined = undefined) {
        super(owner, targetAWSAccountID, targetAWSRegion, targetRevision);
        if (buildCmds) {
            this.buildCmds.push(...buildCmds);
        }
    }

//Make sure WF has enough permission:  https://github.com/orgs/${organization}/packages/npm/${repo}/settings
    readonly buildCmds = [
        //todo: get the org dynamically
        'echo "@ondemandenv:registry=https://npm.pkg.github.com/" >> .npmrc',
        'echo "//npm.pkg.github.com/:_authToken=$github_token" >> .npmrc'
    ]


}