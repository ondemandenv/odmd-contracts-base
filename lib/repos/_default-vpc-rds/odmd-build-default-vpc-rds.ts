import {OdmdBuild} from "../../model/odmd-build";
import {OdmdEnverCdk} from "../../model/odmd-enver-cdk";
import {AnyOdmdEnVer, IOdmdEnver} from "../../model/odmd-enver";
import {IPAM_AB} from "../__networking/odmd-config-networking";
import {ContractsEnverCdkDefaultVpc} from "./odmd-enver-default-vpc-rds";
import {OndemandContracts} from "../../OndemandContracts";
import {AccountsCentralView, GithubReposCentralView} from "../../OdmdContractsCentralView";
import {OdmdBuildContractsLib} from "../__contracts/odmd-build-contracts-lib";


export type SimpleVpc = {
    vpcName: string,
    ipamEnver: IPAM_AB,
    ipv4NetmaskLength?: number,
    defaultSubnetIpv4NetmaskLength?: number
};

export class OdmdBuildDefaultVpcRds extends OdmdBuild<OdmdEnverCdk> {

    constructor(scope: OndemandContracts<
        AccountsCentralView,
        GithubReposCentralView, OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView>
    >) {
        super(scope, 'OdmdBuildDefaultVpcRds', scope.githubRepos._defaultVpcRds!);
    }

    ownerEmail?: string | undefined;
    readonly envers: Array<ContractsEnverCdkDefaultVpc> = []

    public getOrCreateOne(client: AnyOdmdEnVer, vpc: SimpleVpc) {
        let rt =
            this.envers.find(e => e.targetAWSAccountID == client.targetAWSAccountID
                && e.targetAWSRegion == client.targetAWSRegion && e.vpcConfig.vpcName == vpc.vpcName)
        if (rt) {
            rt.addClient(client)
            return rt
        }

        rt = new ContractsEnverCdkDefaultVpc(this, client.targetAWSRegion, client.owner.contracts.getAccountName(client.targetAWSAccountID), vpc);
        this.envers.push(rt)
        rt.addClient(client)
        return rt;
    }

}

export interface BorrowVpcRds extends IOdmdEnver {
    vpcRdsProvidingEnver: ContractsEnverCdkDefaultVpc
}
