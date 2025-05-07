import {OdmdBuild, SRC_Rev_REF} from "../../model/odmd-build";
import {OndemandContracts} from "../../OndemandContracts";
import {AccountsCentralView, GithubReposCentralView} from "../../OdmdContractsCentralView";
import {OdmdCrossRefConsumer, OdmdCrossRefProducer} from "../../model/odmd-cross-refs";
import {OdmdBuildContractsLib} from "../__contracts/odmd-build-contracts-lib";
import {OdmdEnverCdk} from "../../model/odmd-enver-cdk";
import {IOdmdEnver} from "../../model/odmd-enver";

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

export abstract class OdmdEnverUserAuth extends OdmdEnverCdk {

    abstract readonly hostedZoneId:string
    abstract readonly hostedZoneName:string
    abstract readonly subDomainName:string

    readonly owner: OdmdBuildUserAuth
    readonly ephemeral: boolean = false;

    readonly idProviderName: OdmdCrossRefProducer<OdmdEnverUserAuth>
    readonly idProviderClientId: OdmdCrossRefProducer<OdmdEnverUserAuth>

    /*
    provided by central
     */
    readonly appsyncGraphqlUrl: OdmdCrossRefProducer<OdmdEnverUserAuth>
    readonly identityPoolId: OdmdCrossRefProducer<OdmdEnverUserAuth>

    readonly callbackUrls: OdmdCrossRefConsumer<this, IOdmdEnver>[]
    readonly logoutUrls: OdmdCrossRefConsumer<this, IOdmdEnver>[]

    constructor(owner: OdmdBuildUserAuth, targetAWSAccountID: string, targetAWSRegion: string, targetRevision: SRC_Rev_REF) {
        super(owner, targetAWSAccountID, targetAWSRegion, targetRevision);
        this.owner = owner;
        this.idProviderName = new OdmdCrossRefProducer(this, 'id-provider-name')
        this.idProviderClientId = new OdmdCrossRefProducer(this, 'id-provider-clientId')

        this.appsyncGraphqlUrl = new OdmdCrossRefProducer(this, 'appsyncGraphqlUrl')

        this.identityPoolId = new OdmdCrossRefProducer(this, "IdentityPoolId");
        this.callbackUrls = []
        this.logoutUrls = []
    }
}