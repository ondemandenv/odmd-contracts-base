import {OdmdBuild, GithubRepo} from "./odmd-model/odmd-build";
import {AnyOdmdEnVer} from "./odmd-model/odmd-enver";
import {OdmdConfigNetworking} from "./repos/__networking/odmd-config-networking";
import {OdmdBuildEksCluster} from "./repos/__eks/odmd-build-eks-cluster";
import {OdmdBuildDefaultVpcRds} from "./repos/_default-vpc-rds/odmd-build-default-vpc-rds";
import {OdmdBuildDefaultKubeEks} from "./repos/_default-kube-eks/odmd-build-default-kube-eks";
import {OdmdBuildContractsLib} from "./repos/__contracts/odmd-build-contracts-lib";

export type GithubReposCentralView = {

    githubAppId: string;

    __contracts: GithubRepo
    __eks?: GithubRepo
    __networking?: GithubRepo
    _defaultKubeEks?: GithubRepo
    _defaultVpcRds?: GithubRepo
}
export type AccountsCentralView = {
    central: string,
    networking: string,
    workspace0: string,
}

export interface OdmdContractsCentralView<A extends AccountsCentralView,
    G extends GithubReposCentralView, C extends OdmdBuildContractsLib<A, G>> {

    get contractsLibBuild(): C

    get accounts(): A

    get githubRepos(): G

    getAccountName(accId: string): keyof A

    getTargetEnver(): AnyOdmdEnVer | undefined

    get allAccounts(): string[]


    get odmdBuilds(): Array<OdmdBuild<AnyOdmdEnVer>>;


    readonly networking?: OdmdConfigNetworking

    readonly eksCluster?: OdmdBuildEksCluster
    readonly defaultVpcRds?: OdmdBuildDefaultVpcRds
    readonly defaultEcrEks?: OdmdBuildDefaultKubeEks

    readonly DEFAULTS_SVC?: OdmdBuild<AnyOdmdEnVer>[]


}
