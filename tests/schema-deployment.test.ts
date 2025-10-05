
jest.mock('aws-cdk-lib/aws-s3-deployment', () => ({
  BucketDeployment: class {
    constructor(..._args: any[]) {}
  },
  Source: { asset: () => ({}) }
}));

import { App, Stack } from 'aws-cdk-lib';
import { deploySchema } from '../lib/utils/schema-deployment';

// We will stub AWS CDK S3/S3-Deployment behavior by passing fake bucket and role contexts via minimal shapes.
// Since deploySchema returns a formatted S3 URL string using inputs, we can validate path construction without real AWS.

jest.mock('child_process', () => ({
  execSync: () => Buffer.from('deadbeefdeadbeefdeadbeefdeadbeefdeadbeef\n')
}));

describe('deploySchema (shape-level test)', () => {
  test('returns expected s3 URL format with version placeholder', async () => {
    // Build a fake stack with required account/region
    const app = new App();
    const fakeStack = new Stack(app, 'S', { env: { account: '123456789012', region: 'us-east-1' } });

    // Minimal fake producer with required fields used by deploySchema
    const fakeProducer: any = {
      node: { id: 'mySchema' },
      owner: {
        buildRoleArn: 'arn:aws:iam::123456789012:role/some-role',
        targetRevision: { toPathPartStr: () => 'b..dev' }
      }
    };

    // Minimal fake bucket implementing the IBucket shape used in code (bucketName)
    const fakeBucket: any = { bucketName: 'my-bucket', grantReadWrite: () => ({}), arnForObjects:()=>'arn:aws:s3:::my-bucket/index.html' };

    const out = await deploySchema(fakeStack as any, '{"$schema":"http://json-schema.org/draft-07/schema#"}', fakeProducer, fakeBucket);
    expect(out.startsWith('s3://my-bucket/123456789012/b..dev/mySchema.json@')).toBe(true);
  });
});

