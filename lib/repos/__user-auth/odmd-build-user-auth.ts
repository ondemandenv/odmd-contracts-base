import {OdmdBuild, SRC_Rev_REF} from "../../model/odmd-build";
import {OndemandContracts} from "../../OndemandContracts";
import {AccountsCentralView, GithubReposCentralView} from "../../OdmdContractsCentralView";
import {OdmdEnver} from "../../model/odmd-enver";
import {OdmdCrossRefProducer} from "../../model/odmd-cross-refs";
import {OdmdBuildContractsLib} from "../__contracts/odmd-build-contracts-lib";

export class OdmdBuildUserAuth extends OdmdBuild<OdmdEnverUserAuth> {
    envers: OdmdEnverUserAuth[] = [];
    ownerEmail?: string | undefined;

    constructor(scope: OndemandContracts<
        AccountsCentralView,
        GithubReposCentralView, OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView>
    >) {
        super(scope, "OdmdBuildUserAuth", scope.githubRepos.__userAuth);
    }

}

export class OdmdEnverUserAuth extends OdmdEnver<OdmdBuild<OdmdEnverUserAuth>> {

    readonly owner: OdmdBuildUserAuth

    readonly idProviderName: OdmdCrossRefProducer<OdmdEnverUserAuth>
    readonly idProviderClientId: OdmdCrossRefProducer<OdmdEnverUserAuth>


    constructor(owner: OdmdBuild<OdmdEnverUserAuth>, targetAWSAccountID: string, targetAWSRegion: string, targetRevision: SRC_Rev_REF) {
        super(owner, targetAWSAccountID, targetAWSRegion, targetRevision);
        this.owner = owner;
        this.idProviderName = new OdmdCrossRefProducer(this, 'id-provider-name')
        this.idProviderClientId = new OdmdCrossRefProducer(this, 'id-provider-clientId')
    }
}