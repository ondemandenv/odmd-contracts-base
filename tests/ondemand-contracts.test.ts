import { App } from 'aws-cdk-lib';
import { OndemandContracts } from '../lib/OndemandContracts';
import { AccountsCentralView, GithubReposCentralView } from '../lib/OdmdContractsCentralView';
import { OdmdBuildContractsLib } from '../lib/repos/__contracts/odmd-build-contracts-lib';

class MinimalContracts extends OndemandContracts<AccountsCentralView, GithubReposCentralView, OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView>> {
  createContractsLibBuild(): OdmdBuildContractsLib<AccountsCentralView, GithubReposCentralView> {
    // @ts-ignore
    return { envers: [], packageName: '@x/y' } as OdmdBuildContractsLib<any, any>;
  }

  get accounts(): AccountsCentralView {
    return { central: '000' } as any;
  }

  get allAccounts(): string[] {
    return ['000'];
  }

  get githubRepos(): GithubReposCentralView {
    return { githubAppId: '1', __contracts: { owner: 'x', name: 'y', ghAppInstallID: 1 } } as any;
  }
}

describe('OndemandContracts basics', () => {
  test('initializes builds without throwing with minimal overrides', () => {
    const app = new App();
    expect(() => new MinimalContracts(app)).not.toThrow();
  });
});

