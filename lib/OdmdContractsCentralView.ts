import {ContractsBuild, GithubRepo} from "./odmd-model/contracts-build";
import {AnyContractsEnVer} from "./odmd-model/contracts-enver";
import {OdmdConfigNetworking} from "./repos/__networking/odmd-config-networking";
import {OdmdBuildEksCluster} from "./repos/__eks/odmd-build-eks-cluster";
import {OdmdBuildDefaultVpcRds} from "./repos/_default-vpc-rds/odmd-build-default-vpc-rds";
import {OdmdBuildDefaultKubeEks} from "./repos/_default-kube-eks/odmd-build-default-kube-eks";
import {OdmdBuildOdmdContracts} from "./repos/__contracts/odmd-build-odmd-contracts";

export type GithubReposCentralView = {

    __contracts: GithubRepo
    __eks: GithubRepo
    __networking: GithubRepo
    _defaultKubeEks: GithubRepo
    _defaultVpcRds: GithubRepo
}
export type AccountsCentralView = {
    central: string,
    networking: string,
    workspace0: string,
}

export interface OdmdContractsCentralView<A extends AccountsCentralView,
    G extends GithubReposCentralView, C extends OdmdBuildOdmdContracts<A, G>> {

    get odmdConfigOdmdContractsNpm(): C

    get accounts(): A

    get githubRepos(): G

    getAccountName(accId: string): keyof A

    getTargetEnver(): AnyContractsEnVer | undefined

    get allAccounts(): string[]


    get odmdBuilds(): Array<ContractsBuild<AnyContractsEnVer>>;


    readonly networking: OdmdConfigNetworking

    readonly eksCluster: OdmdBuildEksCluster
    readonly defaultVpcRds: OdmdBuildDefaultVpcRds
    readonly defaultEcrEks: OdmdBuildDefaultKubeEks

    readonly DEFAULTS_SVC: ContractsBuild<AnyContractsEnVer>[]


}
