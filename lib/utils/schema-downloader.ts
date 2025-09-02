#!/usr/bin/env npx tsx

import * as fs from 'fs';
import * as path from 'path';
import {SSMClient, GetParameterCommand} from '@aws-sdk/client-ssm';
import {S3Client, GetObjectCommand} from '@aws-sdk/client-s3';
import {STSClient, AssumeRoleCommand, GetCallerIdentityCommand} from '@aws-sdk/client-sts';
import {AwsCredentialIdentity} from "@smithy/types/dist-types/identity/awsCredentialIdentity";
import {OdmdCrossRefConsumer, AnyOdmdEnVer} from "@ondemandenv/contracts-lib-base";

interface DownloadingSchema {
    consumerId: string;
    schemaPath: string;
    schemaS3Url: string;
    ver: string;
    jsonSchemaStr: any;
    outFilePath: string;
}

export class SchemaTypeLoader<T extends AnyOdmdEnVer> {
    private outputDir: string;

    constructor(
        private myEnver: T,
        private consumers: OdmdCrossRefConsumer<T, AnyOdmdEnVer>[],
        outputRelativePath: string = 'lib/handlers/src/__generated__'
    ) {
        this.outputDir = path.join(process.cwd(), outputRelativePath);
        console.log(`🚀 Starting schema type generation for ${process.env.ODMD_build_id!}/${process.env.ODMD_rev_ref!}`);
    }

    async download(): Promise<DownloadingSchema[]> {
        const client = new STSClient({});
        const callerIdResp = await client.send(new GetCallerIdentityCommand({}));

        console.log("Caller:", JSON.stringify(callerIdResp, null, 2));

        let buildRoleCreds;
        if (callerIdResp.Arn !== this.myEnver.buildRoleArn) {
            buildRoleCreds = await this.stsAssumeRole(this.myEnver.buildRoleArn);
        } else {
            buildRoleCreds = undefined;
        }

        const ssmClient = new SSMClient({credentials: buildRoleCreds})

        const enverConfResp = await ssmClient.send(new GetParameterCommand({
            Name: `/odmd-${this.myEnver.owner.buildId}/${this.myEnver.targetRevision.toPathPartStr()}/enver_config`
        }));

        const paramValLineArr = enverConfResp.Parameter!.Value!.split('\n') as string[]

        this.ensureOutputDirectory();

        const s3Client = new S3Client({credentials: await this.stsAssumeRole(this.myEnver.centralRoleArn, buildRoleCreds)})

        const schemas = await Promise.allSettled(
            this.consumers.map(async c => {
                const cl = paramValLineArr.find(p => p.startsWith(c.node.id + ':'))!
                if (!cl) {
                    throw new Error(`can't find consuming(${c.node.id}) value, run GHWF manually to refresh`);
                }
                const schemaS3Url = cl.substring((c.node.id + ':').length).trim();
                if (!schemaS3Url.startsWith('s3://')) {
                    throw new Error(`Unexpected schemaS3Url value(${schemaS3Url}) from consuming(${c.node.id}) value, run GHWF manually to refresh`);
                }
                const tmpArr = schemaS3Url.split('/')
                const [Bucket, Kav] = [tmpArr[2], tmpArr.slice(3).join('/')]
                const [Key, ver] = Kav.split('@')

                const response = await s3Client.send(new GetObjectCommand({Bucket, Key}))

                const jsonSchemaStr = await response.Body!.transformToString();
                const ret = {
                    consumerId: c.node.id,
                    schemaS3Url,
                    ver: ver,
                    jsonSchemaStr
                } as DownloadingSchema;
                await this.generateTypeScriptTypes(ret)
                return ret
            }))

        const generatedSchemas: DownloadingSchema[] = schemas.map(a => {
            if (a.status == 'fulfilled') {
                return a.value as DownloadingSchema
            } else {
                throw a.reason
            }
        })

        console.log(`\n🎉 Successfully generated types for ${generatedSchemas.length} schema(s)`);
        console.log(`📁 Output directory: ${this.outputDir}`);
        return generatedSchemas
    }

    private async stsAssumeRole(roleArn: string, credentials?: AwsCredentialIdentity): Promise<AwsCredentialIdentity> {
        console.log('🔑 Assuming build role...');
        const stsClient = new STSClient({credentials});
        const command = new AssumeRoleCommand({
            RoleArn: roleArn,
            RoleSessionName: `schema-gen-${Date.now()}`,
            DurationSeconds: 3600
        });

        const response = await stsClient.send(command);

        const creds = response.Credentials;
        if (!creds) {
            throw new Error('Failed to assume role - no credentials returned');
        }

        return {
            accessKeyId: creds.AccessKeyId,
            secretAccessKey: creds.SecretAccessKey,
            sessionToken: creds.SessionToken
        } as AwsCredentialIdentity
    }

    private ensureOutputDirectory(): void {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, {recursive: true});
            console.log(`📁 Created output directory: ${this.outputDir}`);
        } else {
            console.log(`files in output dir: ${fs.readdirSync(this.outputDir).map(f => {
                return path.join(this.outputDir, f);
            }).join('\n')}`);
        }
    }

    private async generateTypeScriptTypes(schema: DownloadingSchema): Promise<void> {
        console.log(`generateTypeScriptTypes: ${JSON.stringify(schema, null, 2)}`);
        const {consumerId, schemaS3Url, ver, jsonSchemaStr} = schema;

        const schemaFileName = `${consumerId}-${schema.ver}.schema.json`;
        const schemaFilePath = path.join(this.outputDir, schemaFileName);

        console.log(`generateTypeScriptTypes fs.writeFileSync: ${schemaFilePath}`);
        fs.writeFileSync(schemaFilePath, jsonSchemaStr);
        schema.outFilePath = schemaFilePath
    }
}