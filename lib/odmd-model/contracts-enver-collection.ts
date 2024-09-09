import {AnyContractsEnVer} from "./contracts-enver";
import {ContractsBuild} from "./contracts-build";
import {ContractsRdsCluster} from "./contracts-rds-cluster";


export interface OdmdModel {
    envers: AnyContractsEnVer[]
}

export interface OdmdAccountModel extends OdmdModel {
    account: string
}

export interface OdmdBuildModel extends OdmdModel {
    buildCentral: ContractsBuild<AnyContractsEnVer>
}//build

export interface OdmdBuildAccountModel extends OdmdBuildModel, OdmdAccountModel {
}//build>>>account


export interface OdmdBuildAccountVpcModel extends OdmdBuildAccountModel {
    vpcName: string
}//build>>>account>>>vpcName


export interface OdmdBuildAccountVpcRdsModel extends OdmdBuildAccountVpcModel {
    rds: ContractsRdsCluster
}//build>>>account>>>vpcName >rds