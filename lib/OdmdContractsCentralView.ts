import {ContractsBuild, GithubRepo} from "./odmd-model/contracts-build";
import {AnyContractsEnVer} from "./odmd-model/contracts-enver";
import {OdmdConfigOdmdContractsNpm} from "./repos/__contracts/odmd-build-odmd-contracts-npm";
import {OdmdConfigNetworking} from "./repos/__networking/odmd-config-networking";
import {OdmdBuildEksCluster} from "./repos/__eks/odmd-build-eks-cluster";
import {OdmdBuildDefaultVpcRds} from "./repos/_default-vpc-rds/odmd-build-default-vpc-rds";
import {OdmdBuildDefaultKubeEks} from "./repos/_default-kube-eks/odmd-build-default-kube-eks";

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

export interface OdmdContractsCentralView {

    readonly accounts: AccountsCentralView

    getAccountName(accId: string): keyof AccountsCentralView

    getTargetEnver(): AnyContractsEnVer | undefined

    readonly allAccounts: string[]

    readonly githubRepos: GithubReposCentralView

    readonly odmdBuilds: Array<ContractsBuild<AnyContractsEnVer>>;


    readonly odmdConfigOdmdContractsNpm: OdmdConfigOdmdContractsNpm

    readonly networking: OdmdConfigNetworking

    readonly eksCluster: OdmdBuildEksCluster
    readonly defaultVpcRds: OdmdBuildDefaultVpcRds
    readonly defaultEcrEks: OdmdBuildDefaultKubeEks

    readonly DEFAULTS_SVC: ContractsBuild<AnyContractsEnVer>[]


}
