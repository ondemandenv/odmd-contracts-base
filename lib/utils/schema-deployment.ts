import * as cdk from 'aws-cdk-lib';
import {execSync} from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {IBucket} from 'aws-cdk-lib/aws-s3';
import {BucketDeployment, Source} from 'aws-cdk-lib/aws-s3-deployment';

import {AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId} from 'aws-cdk-lib/custom-resources';
import {AnyOdmdEnVer} from "../model/odmd-enver";
import {OdmdCrossRefProducer} from "../model/odmd-cross-refs";

export async function deploySchema<T extends AnyOdmdEnVer>(
    scope: cdk.Stack,
    schemaStr: string,
    urlPrd: OdmdCrossRefProducer<T>,
    artBucket: IBucket
): Promise<string> {
    const gitSha = execSync('git rev-parse HEAD').toString().trim();
    const schemaFileName = `${urlPrd.node.id}.json`;

    const tempSchemaDir = path.join(process.cwd(), 'cdk.out', 'schemas');
    fs.mkdirSync(tempSchemaDir, {recursive: true});
    const tempSchemaPath = path.join(tempSchemaDir, schemaFileName);
    fs.writeFileSync(tempSchemaPath, schemaStr);



    const destinationKeyPrefix = `${scope.account}/${urlPrd.owner.targetRevision.toPathPartStr()}`;
    const deployment = new BucketDeployment(scope, `SchemaDeployment-${urlPrd.node.id}`, {
        sources: [Source.asset(tempSchemaDir)],
        destinationBucket: artBucket,
        destinationKeyPrefix,
        retainOnDelete: true,
        prune: false,
    });
    const s3ObjKey = destinationKeyPrefix + '/' + schemaFileName;

    const arnForObjects = artBucket.arnForObjects(s3ObjKey);
    const getObjectVersion = new AwsCustomResource(scope, `GetObjectVersion-${urlPrd.node.id}`, {
        onUpdate: {
            service: 'S3',
            action: 'headObject',
            parameters: {
                Bucket: artBucket.bucketName,
                Key: s3ObjKey,
            },
            physicalResourceId: PhysicalResourceId.of(`versioning_${urlPrd.node.id}_` + gitSha),
        },
        policy: AwsCustomResourcePolicy.fromSdkCalls({resources: [arnForObjects]})
    });
    getObjectVersion.node.addDependency(deployment);

    const VersionId = getObjectVersion.getResponseField('VersionId');
    const addObjectTags = new AwsCustomResource(scope, `AddObjectTags-${urlPrd.node.id}`, {
        onUpdate: {
            service: 'S3',
            action: 'putObjectTagging',
            parameters: {
                Bucket: artBucket.bucketName,
                Key: s3ObjKey,
                VersionId,
                Tagging: {
                    TagSet: [
                        {Key: 'gitsha', Value: gitSha},
                    ],
                },
            },
            physicalResourceId: PhysicalResourceId.of(`gitSha_${urlPrd.node.id}_` + gitSha),
        },

        policy: AwsCustomResourcePolicy.fromStatements([
            new cdk.aws_iam.PolicyStatement({
                actions: ['s3:PutObjectTagging', 's3:PutObjectVersionTagging'],
                resources: [arnForObjects],
            }),
        ]),
    })
    addObjectTags.node.addDependency(deployment);

    return 's3://' + artBucket.bucketName + '/' + s3ObjKey + '@' + VersionId
}