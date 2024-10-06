import {ContractsEnverCdkDefaultEcrEks} from "./odmd-enver-default-ecr-eks";
import {OdmdBuild} from "../../odmd-model/odmd-build";
import {OdmdEnverCdk} from "../../odmd-model/odmd-enver-cdk";
import {AnyOdmdEnVer} from "../../odmd-model/odmd-enver";
import {OndemandContracts} from "../../OndemandContracts";
import {OdmdEnverEksCluster} from "../../odmd-model/odmd-enver-eks-cluster";
import {AccountsCentralView, GithubReposCentralView} from "../../OdmdContractsCentralView";
import {OdmdBuildContractsLib} from "../__contracts/odmd-build-contracts-lib";


export class OdmdBuildDefaultKubeEks extends OdmdBuild<OdmdEnverCdk> {

    constructor(scope: OndemandContracts<
        AccountsCentralView,
        GithubReposCentralView, OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView>
    >) {
        super(scope, 'DefaultKubeEks', scope.githubRepos._defaultKubeEks!);
    }

    ownerEmail?: string | undefined;
    readonly envers: Array<ContractsEnverCdkDefaultEcrEks> = []

    public getOrCreateOne(usr: AnyOdmdEnVer, targetEksCluster: OdmdEnverEksCluster, targetNamespace: string) {
        let rt = this.envers.find(e => e.userEnver == usr)
        if (rt) {
            return rt
        }

        rt = new ContractsEnverCdkDefaultEcrEks(this, usr, targetEksCluster, targetNamespace);
        this.envers.push(rt)
        return rt;
    }

}
