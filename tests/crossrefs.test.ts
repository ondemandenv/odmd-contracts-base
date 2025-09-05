
import { App } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AccountsCentralView, GithubReposCentralView } from '../lib/OdmdContractsCentralView';
import { OndemandContracts } from "../lib/OndemandContracts";
import { OdmdCrossRefConsumer, OdmdCrossRefProducer } from '../lib/model/odmd-cross-refs';
import { OdmdBuild, SRC_Rev_REF } from '../lib/model/odmd-build';
import { OdmdEnver } from '../lib/model/odmd-enver';

// Minimal fake enver for unit-style testing (avoid importing real enver classes to prevent cycles)
class TestContracts extends OndemandContracts<AccountsCentralView, GithubReposCentralView, any> {
    createContractsLibBuild(): any { return { envers: [] }; }
    get accounts(): AccountsCentralView { return { central: '000000000000', workspace0: '111111111111' } as any; }
    get allAccounts(): string[] { return Object.values(this.accounts as any); }
    get githubRepos(): GithubReposCentralView { return { githubAppId: '1', __contracts: { owner: 'org', name: 'contracts', ghAppInstallID: 1 } } as any; }
}

class TestBuild extends OdmdBuild<TestEnver> {
    public envers!: Array<TestEnver>;
    ownerEmail?: string | undefined;
    protected initializeEnvers(): void {
        this.envers = [ new TestEnver(this, this.contracts.accounts.workspace0, 'us-east-1', new SRC_Rev_REF('b', 'dev')) ];
    }
}

class TestEnver extends OdmdEnver<OdmdBuild<TestEnver>> {}

describe('OdmdCrossRefProducer / OdmdCrossRefConsumer (lifecycle)', () => {
    test('producer enforces name validation and hierarchical children', () => {
        const app = new App();
        const contracts = new TestContracts(app, 'T');
        const build = new TestBuild(contracts as any, 'buildA', { owner: 'org', name: 'svcA', ghAppInstallID: 1 });
        const enver = build.envers[0];

        const p = new OdmdCrossRefProducer(enver, 'apiBaseUrl', {
            children: [{ pathPart: 'schema-url', s3artifact: true }]
        });
        expect(p.name).toBe('apiBaseUrl');
        expect(p.children?.[0].name).toBe('apiBaseUrl/schema-url');
        expect(p.children?.[0].s3artifact).toBe(true);

        expect(() => new OdmdCrossRefProducer(enver, 'bad..name')).toThrow();
    });

    test('consumer cannot consume from same build and registers with producer', () => {
        const app = new App();
        const contracts = new TestContracts(app, 'T');
        const buildA = new TestBuild(contracts as any, 'buildA', { owner: 'org', name: 'svcA', ghAppInstallID: 1 });
        const buildB = new TestBuild(contracts as any, 'buildB', { owner: 'org', name: 'svcB', ghAppInstallID: 1 });
        const prodEnver = buildA.envers[0];
        const consEnver = buildB.envers[0];

        const p = new OdmdCrossRefProducer(prodEnver, 'apiBaseUrl');
        const c = new OdmdCrossRefConsumer(consEnver, 'Upstream', p, { trigger: 'directly', defaultIfAbsent: 'x' });

        // Producer tracks consumer registrations (path-based uniqueness)
        expect(p.consumers.size).toBe(1);

        // Same-build consumption must throw
        expect(() => new OdmdCrossRefConsumer(prodEnver, 'Illegal', p, { trigger: 'directly', defaultIfAbsent: 'x' }))
            .toThrow();
    });
});

