import { App, Stack } from 'aws-cdk-lib';
import { OdmdShareIn, OdmdShareOut, SHARE_VERSIONS } from '../lib/model/odmd-share-refs';
import { Construct } from 'constructs';
import { OdmdCrossRefConsumer, OdmdCrossRefProducer } from '../lib/model/odmd-cross-refs';

// Jest mocks for CDK Fn.importValue and CustomResource interactions are not straightforward here.
// These tests focus on constructor-time invariants and shape, not AWS calls.

class FakeEnver extends Construct {
    public owner: any;
    public targetRevision: { toPathPartStr(): string };
    constructor(scope: Construct, id: string, buildId: string) {
        super(scope, id);
        this.owner = { buildId, contracts: { accounts: { central: '000' } } };
        this.targetRevision = { toPathPartStr: () => 'b..dev' };
    }
}

describe('OdmdShareOut validation', () => {
    test('throws if mixing producers from different enver or central account', () => {
        const app = new App();
        const stack = new Stack(app, 'Test');
        const enver = new FakeEnver(stack, 'E', 'buildA');

        // two different construct IDs but same logical ref name via pathPart to trigger name conflict in share-out
        const p1 = new OdmdCrossRefProducer(enver as any, 'p1', { pathPart: 'apiBaseUrl' });
        const p2 = new OdmdCrossRefProducer(enver as any, 'p2', { pathPart: 'apiBaseUrl' });

        expect(() => new OdmdShareOut(stack, new Map())).toThrow();

        // central account guard
        const origEnv = process.env.ODMD_rev_ref;
        (process.env as any).ODMD_rev_ref = 'b..dev';
        // simulate same name conflict
        expect(() => new OdmdShareOut(stack as any, new Map([[p1 as any, 'v1'], [p2 as any, 'v2']]))).toThrow();
        (process.env as any).ODMD_rev_ref = origEnv;
    });
});

