import {OdmdEnverCdkDefaultEcrEks} from "./odmd-enver-default-ecr-eks";
import {OdmdBuild} from "../../model/odmd-build";
import {OdmdEnverCdk} from "../../model/odmd-enver-cdk";
import {AnyOdmdEnVer} from "../../model/odmd-enver";
import {OndemandContracts} from "../../OndemandContracts";
import {OdmdEnverEksCluster} from "../../model/odmd-enver-eks-cluster";
import {AccountsCentralView, GithubReposCentralView} from "../../OdmdContractsCentralView";
import {OdmdBuildContractsLib} from "../__contracts/odmd-build-contracts-lib";
import * as path from "node:path";


export class OdmdBuildDefaultKubeEks extends OdmdBuild<OdmdEnverCdk> {
    readonly serviceContextMD = path.resolve(__dirname, 'docs', 'placeholder.md')
    readonly serviceOverviewMD = path.resolve(__dirname, 'docs', 'placeholder.md')

    constructor(scope: OndemandContracts<
        AccountsCentralView,
        GithubReposCentralView, OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView>
    >) {
        super(scope, 'DefaultKubeEks', scope.githubRepos._defaultKubeEks!);
    }

    ownerEmail?: string | undefined;

    public get envers(): Array<OdmdEnverCdkDefaultEcrEks> {
        return this._envers as Array<OdmdEnverCdkDefaultEcrEks>;
    }

    protected initializeEnvers(): void {
        this._envers = [];
    }

    public getOrCreateOne(usr: AnyOdmdEnVer, targetEksCluster: OdmdEnverEksCluster, targetNamespace: string) {
        let rt = this.envers.find(e => e.userEnver == usr);
        if (rt) {
            return rt;
        }

        rt = new OdmdEnverCdkDefaultEcrEks(this, usr, targetEksCluster.clusterEndpoint);
        this._envers.push(rt);
        return rt;
    }

}
