import * as cdk from 'aws-cdk-lib';
import {execSync} from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {IBucket} from 'aws-cdk-lib/aws-s3';
import {BucketDeployment, Source} from 'aws-cdk-lib/aws-s3-deployment';

import {AnyOdmdEnVer} from "../model/odmd-enver";
import {OdmdCrossRefProducer} from "../model/odmd-cross-refs";
import {Role} from "aws-cdk-lib/aws-iam";

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

    const buildRole = Role.fromRoleArn(scope, `currentRole-${urlPrd.node.id}`, urlPrd.owner.buildRoleArn);

    const onEventHandler = new cdk.aws_lambda.Function(scope, `SchemaTaggingFunction-${urlPrd.node.id}`, {
        runtime: cdk.aws_lambda.Runtime.NODEJS_22_X,
        handler: 'index.handler',
        code: cdk.aws_lambda.Code.fromInline(`
            const { S3Client, HeadObjectCommand, PutObjectTaggingCommand } = require("@aws-sdk/client-s3");
            const s3 = new S3Client();

            exports.handler = async (event) => {
                const { RequestType, ResourceProperties } = event;
                const { Bucket, Key, GitSha } = ResourceProperties;
    
                if (RequestType === 'Delete') {
                    return;
                }
    
                try {
                    const headObjectParams = { Bucket, Key };
                    const headObjectCommand = new HeadObjectCommand(headObjectParams);
                    const headObjectResponse = await s3.send(headObjectCommand);
                    const versionId = headObjectResponse.VersionId;
    
                    if (!versionId) {
                        throw new Error('VersionId not found for object.');
                    }
    
                    const putTaggingParams = {
                        Bucket,
                        Key,
                        VersionId: versionId,
                        Tagging: {
                            TagSet: [{ Key: 'gitsha', Value: GitSha }],
                        },
                    };
                    const putTaggingCommand = new PutObjectTaggingCommand(putTaggingParams);
                    await s3.send(putTaggingCommand);

                    return {
                        PhysicalResourceId: \`versioning_\${Key}_\${GitSha}\`,
                        Data: { VersionId: versionId },
                    };
                } catch (error) {
                    console.error('Error:', error);
                    throw error;
                }
            };
        `),
        role: buildRole
    });

    const provider = new cdk.custom_resources.Provider(scope, `SchemaTaggingProvider-${urlPrd.node.id}`, {
        onEventHandler,
    });

    const customResource = new cdk.CustomResource(scope, `SchemaTaggingResource-${urlPrd.node.id}`, {
        serviceToken: provider.serviceToken,
        properties: {
            Bucket: artBucket.bucketName,
            Key: s3ObjKey,
            GitSha: gitSha,
        },
    });
    customResource.node.addDependency(deployment);

    const VersionId = customResource.getAttString('VersionId');

    return 's3://' + artBucket.bucketName + '/' + s3ObjKey + '@' + VersionId
}