import {OdmdBuild, GithubRepo} from "./model/odmd-build";
import {AnyOdmdEnVer} from "./model/odmd-enver";
import {OdmdBuildNetworking} from "./repos/__networking/odmd-build-networking";
import {OdmdBuildDefaultVpcRds} from "./repos/_default-vpc-rds/odmd-build-default-vpc-rds";
import {OdmdBuildDefaultKubeEks} from "./repos/_default-kube-eks/odmd-build-default-kube-eks";
import {OdmdBuildContractsLib} from "./repos/__contracts/odmd-build-contracts-lib";
import {OdmdBuildUserAuth} from "./repos/__user-auth/odmd-build-user-auth";
import {OdmdEnverCdk} from "./model/odmd-enver-cdk";

export type GithubReposCentralView = {

    githubAppId: string;

    __contracts: GithubRepo
    __userAuth?: GithubRepo
    __eks?: GithubRepo
    __networking?: GithubRepo
    _defaultKubeEks?: GithubRepo
    _defaultVpcRds?: GithubRepo
}

export type AccountsCentralView = {
    central: string,
    networking?: string,
    workspace0: string,
}

export type AccountsToDefaultHostedZone = AccountsCentralView

export interface OdmdContractsCentralView<
    A extends AccountsCentralView,
    G extends GithubReposCentralView,
    C extends OdmdBuildContractsLib<A, G>
> {

    get contractsLibBuild(): C

    get accounts(): A

    get githubRepos(): G

    getAccountName(accId: string): keyof A

    getTargetEnver(): AnyOdmdEnVer | undefined

    get allAccounts(): string[]


    get odmdBuilds(): Array<OdmdBuild<AnyOdmdEnVer>>;


    readonly userAuth?: OdmdBuildUserAuth
    readonly networking?: OdmdBuildNetworking

    readonly eksCluster?: OdmdBuild<OdmdEnverCdk>
    readonly defaultVpcRds?: OdmdBuildDefaultVpcRds
    readonly defaultEcrEks?: OdmdBuildDefaultKubeEks

    readonly DEFAULTS_SVC?: OdmdBuild<AnyOdmdEnVer>[]


}
