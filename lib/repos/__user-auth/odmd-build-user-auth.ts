import {OdmdBuild, SRC_Rev_REF} from "../../model/odmd-build";
import {OndemandContracts} from "../../OndemandContracts";
import {AccountsCentralView, GithubReposCentralView} from "../../OdmdContractsCentralView";
import {OdmdCrossRefProducer} from "../../model/odmd-cross-refs";
import {OdmdBuildContractsLib} from "../__contracts/odmd-build-contracts-lib";
import {OdmdEnverCdk} from "../../model/odmd-enver-cdk";

export class OdmdBuildUserAuth extends OdmdBuild<OdmdEnverUserAuth> {
    protected _envers: OdmdEnverUserAuth[];
    public get envers(): OdmdEnverUserAuth[] {
        return this._envers;
    }

    ownerEmail?: string | undefined;

    constructor(scope: OndemandContracts<
        AccountsCentralView,
        GithubReposCentralView, OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView>
    >) {
        super(scope, "OdmdBuildUserAuth", scope.githubRepos.__userAuth!);
    }

    protected initializeEnvers(): void {
        this._envers = [];
    }
}

export class OdmdEnverUserAuth extends OdmdEnverCdk {

    readonly owner: OdmdBuildUserAuth

    readonly idProviderName: OdmdCrossRefProducer<OdmdEnverUserAuth>
    readonly idProviderClientId: OdmdCrossRefProducer<OdmdEnverUserAuth>


    constructor(owner: OdmdBuildUserAuth, targetAWSAccountID: string, targetAWSRegion: string, targetRevision: SRC_Rev_REF) {
        super(owner, targetAWSAccountID, targetAWSRegion, targetRevision);
        this.owner = owner;
        this.idProviderName = new OdmdCrossRefProducer(this, 'id-provider-name')
        this.idProviderClientId = new OdmdCrossRefProducer(this, 'id-provider-clientId')
    }
}