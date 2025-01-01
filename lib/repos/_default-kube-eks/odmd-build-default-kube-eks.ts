import {OdmdEnverCdkDefaultEcrEks} from "./odmd-enver-default-ecr-eks";
import {OdmdBuild} from "../../model/odmd-build";
import {OdmdEnverCdk} from "../../model/odmd-enver-cdk";
import {AnyOdmdEnVer} from "../../model/odmd-enver";
import {OndemandContracts} from "../../OndemandContracts";
import {OdmdEnverEksCluster} from "../../model/odmd-enver-eks-cluster";
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
    private _envers: Array<OdmdEnverCdkDefaultEcrEks>;
    public get envers(): Array<OdmdEnverCdkDefaultEcrEks> {
        return this._envers;
    }

    protected initializeEnvers(): void {
        this._envers = [];
    }

    public getOrCreateOne(usr: AnyOdmdEnVer, targetEksCluster: OdmdEnverEksCluster, targetNamespace: string) {
        let rt = this._envers.find(e => e.userEnver == usr);
        if (rt) {
            return rt;
        }

        rt = new OdmdEnverCdkDefaultEcrEks(this, usr, targetEksCluster, targetNamespace);
        this._envers.push(rt);
        return rt;
    }

}
