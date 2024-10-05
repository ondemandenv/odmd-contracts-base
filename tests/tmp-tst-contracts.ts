import {OndemandContracts} from "../lib/OndemandContracts";
import {AccountsCentralView, GithubReposCentralView} from "../lib/OdmdContractsCentralView";
import {App} from "aws-cdk-lib";
import {OdmdBuildContractsLib} from "../lib/repos/__contracts/odmd-build-contracts-lib";
import {ContractsEnverCMDs} from "../lib/odmd-model/contracts-enver-c-m-ds";
import {SRC_Rev_REF} from "../lib/odmd-model/contracts-build";
import {ContractsCrossRefConsumer} from "../lib/odmd-model/contracts-cross-refs";

export class TmpTstContracts extends OndemandContracts<AccountsCentralView, GithubReposCentralView, OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView>> {
    private _odmdConfigOdmdContractsNpm: OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView>;

    constructor(app: App) {
        super(app);
        this._odmdConfigOdmdContractsNpm = new (class extends OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView> {
            public get packageName(): string {
                return '@ondemandenv/contracts-lib-base'
            }

            readonly envers: Array<ContractsEnverCMDs>
            readonly ownerEmail: string;


            constructor(scope: OndemandContracts<
                AccountsCentralView,
                GithubReposCentralView, OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView>
            >, id: string) {
                super(scope, id);
                const srcRevREF = new SRC_Rev_REF("b", "odmd_us_west_1__sandbox");

                this.envers = [new ContractsEnverCMDs(
                    this,
                    this.contracts.accounts.workspace0,
                    'us-west-1',
                    srcRevREF
                )];
            }
        })(this, 'aaa');
    }

    get contractsLibBuild(): OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView> {
        return this._odmdConfigOdmdContractsNpm
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

export class TmpTstContracts1  extends OndemandContracts<AccountsCentralView, GithubReposCentralView, OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView>> {
    private _odmdConfigOdmdContractsNpm: OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView>;

    // readonly networking?: OdmdConfigNetworking
    constructor(app: App) {
        super(app, 'TmpTstContracts1');

        // this.networking = new OdmdConfigNetworking(this)
        this._odmdConfigOdmdContractsNpm = new (class extends OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView> {
            public get packageName(): string {
                return '@ondemandenv/contracts-lib-base'
            }

            readonly envers: Array<ContractsEnverCMDs>
            readonly ownerEmail: string;


            constructor(scope: OndemandContracts<
                AccountsCentralView,
                GithubReposCentralView, OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView>
            >, id: string) {
                super(scope, id);
                const srcRevREF = new SRC_Rev_REF("b", "odmd_us_west_1__sandbox");

                this.envers = [new ContractsEnverCMDs(
                    this,
                    this.contracts.accounts.workspace0,
                    'us-west-1',
                    srcRevREF
                )];

                new ContractsCrossRefConsumer(this.envers[0], 'asdf', this.contracts.networking!.ipam_west1_le.centralVpcCidr)
            }
        })(this, 'aaa');

    }

    get contractsLibBuild(): OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView> {
        return this._odmdConfigOdmdContractsNpm
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