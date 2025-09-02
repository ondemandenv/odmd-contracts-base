import * as cdk from 'aws-cdk-lib';
import {execSync} from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {GetParameterCommand, SSMClient} from '@aws-sdk/client-ssm';
import {Bucket} from 'aws-cdk-lib/aws-s3';
import {BucketDeployment, Source} from 'aws-cdk-lib/aws-s3-deployment';
import {Role} from 'aws-cdk-lib/aws-iam';

import {AwsCustomResource, PhysicalResourceId} from 'aws-cdk-lib/custom-resources';
import {OdmdCrossRefProducer, AnyOdmdEnVer} from "@ondemandenv/contracts-lib-base";

export async function deploySchema<T extends AnyOdmdEnVer>(
    scope: cdk.Stack,
    schemaStr: string,//schema: ZodObject<any>, JSON.stringify(zodToJsonSchema(schema), null, 2) import {ZodObject} from 'zod';import {zodToJsonSchema} from 'zod-to-json-schema';
    urlPrd: OdmdCrossRefProducer<T>
): Promise<string> {
    const gitSha = execSync('git rev-parse HEAD').toString().trim();
    const schemaFileName = `${urlPrd.node.id}.json`;

    const tempSchemaDir = path.join(process.cwd(), 'cdk.out', 'schemas');
    fs.mkdirSync(tempSchemaDir, {recursive: true});
    const tempSchemaPath = path.join(tempSchemaDir, schemaFileName);
    fs.writeFileSync(tempSchemaPath, schemaStr);

    const parameterName = urlPrd.owner.artifactPrefixSsm.substring(0, urlPrd.owner.artifactPrefixSsm.length - scope.account.length - 1);

    const ssm = new SSMClient({region: process.env.AWS_REGION ?? process.env.CDK_DEFAULT_REGION})
    const bucketResp = await ssm.send(new GetParameterCommand({Name: parameterName}))

    const artBucket = Bucket.fromBucketName(scope, `artBucket-${urlPrd.node.id}`, bucketResp.Parameter!.Value!);

    const buildRole = Role.fromRoleArn(scope, `currentRole-${urlPrd.node.id}`, urlPrd.owner.buildRoleArn);
    const destinationKeyPrefix = `${scope.account}/${urlPrd.owner.targetRevision.toPathPartStr()}`;
    const deployment = new BucketDeployment(scope, `SchemaDeployment-${urlPrd.node.id}`, {
        sources: [Source.asset(tempSchemaDir)],
        destinationBucket: artBucket,
        destinationKeyPrefix,
        retainOnDelete: true,
        prune: false,
        role: buildRole,
    });
    const s3ObjKey = destinationKeyPrefix + '/' + schemaFileName;

    const getObjectVersion = new AwsCustomResource(scope, `GetObjectVersion-${urlPrd.node.id}`, {
        onUpdate: {
            service: 'S3',
            action: 'listObjectVersions',
            parameters: {
                Bucket: bucketResp.Parameter!.Value!,
                Prefix: s3ObjKey,
            },
            physicalResourceId: PhysicalResourceId.of(`versioning_${urlPrd.node.id}_` + gitSha),
        },
        role: buildRole
    });
    getObjectVersion.node.addDependency(deployment);

    const addObjectTags = new AwsCustomResource(scope, `AddObjectTags-${urlPrd.node.id}`, {
        onUpdate: {
            service: 'S3',
            action: 'putObjectTagging',
            parameters: {
                Bucket: bucketResp.Parameter!.Value!,
                Key: s3ObjKey,
                VersionId: getObjectVersion.getResponseField('Versions.0.VersionId'),
                Tagging: {
                    TagSet: [
                        {Key: 'gitsha', Value: gitSha},
                    ],
                },
            },
            physicalResourceId: PhysicalResourceId.of(`gitSha_${urlPrd.node.id}_` + gitSha),
        },
        role: buildRole
    });
    addObjectTags.node.addDependency(deployment);

    return 's3://' + artBucket.bucketName + '/' + s3ObjKey + '@' + getObjectVersion.getResponseField('Versions.0.VersionId')
}