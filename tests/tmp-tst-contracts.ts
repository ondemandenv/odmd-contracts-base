import {OndemandContracts} from "../lib/OndemandContracts";
import {AccountsCentralView, GithubReposCentralView} from "../lib/OdmdContractsCentralView";
import {OdmdConfigOdmdContractsNpm} from "../lib/repos/__contracts/odmd-build-odmd-contracts-npm";
import {App} from "aws-cdk-lib";

export class TmpTstContracts extends OndemandContracts<AccountsCentralView, GithubReposCentralView, OdmdConfigOdmdContractsNpm<AccountsCentralView, GithubReposCentralView>> {
    private _odmdConfigOdmdContractsNpm: OdmdConfigOdmdContractsNpm<AccountsCentralView, GithubReposCentralView>;

    constructor(app: App) {
        super(app);
        this._odmdConfigOdmdContractsNpm = new OdmdConfigOdmdContractsNpm(this);
    }

    get odmdConfigOdmdContractsNpm(): OdmdConfigOdmdContractsNpm<AccountsCentralView, GithubReposCentralView> {
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