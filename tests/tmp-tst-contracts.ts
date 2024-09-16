import {OndemandContracts} from "../lib/OndemandContracts";
import {AccountsCentralView, GithubReposCentralView} from "../lib/OdmdContractsCentralView";
import {App} from "aws-cdk-lib";
import {OdmdBuildOdmdContracts} from "../lib/repos/__contracts/odmd-build-odmd-contracts";
import {ContractsEnverNpm} from "../lib/odmd-model/contracts-enver-npm";
import {Construct} from "constructs";
import {SRC_Rev_REF} from "../lib/odmd-model/contracts-build";

export class TmpTstContracts extends OndemandContracts<AccountsCentralView, GithubReposCentralView, OdmdBuildOdmdContracts<AccountsCentralView, GithubReposCentralView>> {
    private _odmdConfigOdmdContractsNpm: OdmdBuildOdmdContracts<AccountsCentralView, GithubReposCentralView>;

    constructor(app: App) {
        super(app);
        this._odmdConfigOdmdContractsNpm = new (class extends OdmdBuildOdmdContracts<AccountsCentralView, GithubReposCentralView> {
            public get packageName(): string {
                return '@ondemandenv/contracts-lib-base'
            }

            readonly envers: Array<ContractsEnverNpm>
            readonly ownerEmail: string;


            constructor(scope: Construct, id: string) {
                super(scope, id);
                const srcRevREF = new SRC_Rev_REF("b", "odmd_us_west_1__sandbox");

                this.envers = [new ContractsEnverNpm(
                    this,
                    OndemandContracts.inst.accounts.workspace0,
                    'us-west-1',
                    srcRevREF
                )];
            }
        })(this, 'aaa');
    }

    get odmdConfigOdmdContractsNpm(): OdmdBuildOdmdContracts<AccountsCentralView, GithubReposCentralView> {
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