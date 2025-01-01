import {OndemandContracts} from "../lib/OndemandContracts";
import {AccountsCentralView, GithubReposCentralView} from "../lib/OdmdContractsCentralView";
import {App} from "aws-cdk-lib";
import {OdmdBuildContractsLib, OdmdEnverContractsLib} from "../lib/repos/__contracts/odmd-build-contracts-lib";
import {SRC_Rev_REF} from "../lib/model/odmd-build";


export class TmpTstOdmdBuildContractsLib extends OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView> {
    public get packageName(): string {
        return '@ondemandenv/contracts-lib-base'
    }

    public get theOne(): OdmdEnverContractsLib {
        return this.envers[0]
    }

    envers: OdmdEnverContractsLib[];
    ownerEmail?: string | undefined;


    constructor(scope: OndemandContracts<AccountsCentralView, GithubReposCentralView, OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView>>, id: string) {
        super(scope, id);
        this.envers = [
            new OdmdEnverContractsLib(
                this,
                this.contracts.accounts.workspace0,
                'us-west-1',
                new SRC_Rev_REF("b", "odmd_us_west_1__sandbox")
            )
        ]
    }
}


export class TmpTstContracts extends OndemandContracts<
    AccountsCentralView,
    GithubReposCentralView,
    OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView>
> {
    createContractsLibBuild(): OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView> {
        return new TmpTstOdmdBuildContractsLib(this, 'aaa')
    }


    private _accounts: AccountsCentralView
    get accounts(): AccountsCentralView {
        if (!this._accounts) {
            this._accounts = {central: 'ccc', networking: 'nnn', workspace0: 'www'}
        }
        return this._accounts
    }

    private _allAccounts: string[]
    get allAccounts(): string[] {

        if (!this._allAccounts) {

            const accEntries = Object.entries(this.accounts);
            if (Array.from(accEntries.keys()).length != Array.from(accEntries.values()).length) {
                throw new Error("Account name to number has to be 1:1!")
            }

            this._allAccounts = Object.values(this.accounts)

        }
        return this._allAccounts
    }

    private _githubRepos: GithubReposCentralView
    get githubRepos(): GithubReposCentralView {
        if (!this._githubRepos) {
            this._githubRepos = {
                githubAppId: "123",

                __userAuth: {owner: 'odmd', name: 'userAuth', ghAppInstallID: 1234},
                __contracts: {owner: 'odmd', name: 'contracts', ghAppInstallID: 1234},
                __eks: {owner: 'odmd', name: 'eks', ghAppInstallID: 1234},
                __networking: {owner: 'odmd', name: 'networking', ghAppInstallID: 1234},
                _defaultKubeEks: {owner: 'odmd', name: 'defaultKubeEks', ghAppInstallID: 1234},
                _defaultVpcRds: {owner: 'odmd', name: 'defaultVpcRds', ghAppInstallID: 1234}
            }
        }
        return this._githubRepos
    }

}

export class TmpTstContracts1 extends OndemandContracts<AccountsCentralView, GithubReposCentralView, OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView>> {
    createContractsLibBuild(): OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView> {
        return new TmpTstOdmdBuildContractsLib(this, 'aaa')
    }

    // readonly networking?: OdmdConfigNetworking
    constructor(app: App) {
        super(app, 'TmpTstContracts1');
    }


    private _accounts: AccountsCentralView
    get accounts(): AccountsCentralView {
        if (!this._accounts) {
            this._accounts = {central: 'ccc', networking: 'nnn', workspace0: 'www'}
        }
        return this._accounts
    }

    private _allAccounts: string[]
    get allAccounts(): string[] {

        if (!this._allAccounts) {


            const accEntries = Object.entries(this.accounts);
            if (Array.from(accEntries.keys()).length != Array.from(accEntries.values()).length) {
                throw new Error("Account name to number has to be 1:1!")
            }

            this._allAccounts = Object.values(this.accounts)

        }
        return this._allAccounts
    }

    private _githubRepos: GithubReposCentralView
    get githubRepos(): GithubReposCentralView {
        if (!this._githubRepos) {
            this._githubRepos = {

                githubAppId: "123",
                __userAuth: {owner: 'odmd', name: 'userAuth', ghAppInstallID: 1234},
                __contracts: {owner: 'odmd', name: 'contracts', ghAppInstallID: 1234},
                __eks: {owner: 'odmd', name: 'eks', ghAppInstallID: 1234},
                __networking: {owner: 'odmd', name: 'networking', ghAppInstallID: 1234},
                _defaultKubeEks: {owner: 'odmd', name: 'defaultKubeEks', ghAppInstallID: 1234},
                _defaultVpcRds: {owner: 'odmd', name: 'defaultVpcRds', ghAppInstallID: 1234}
            }
        }
        return this._githubRepos
    }

}