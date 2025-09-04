# Platform Schema Architecture: A Developer's Guide

> **Cross-Reference**: This document details the schema implementation workflow. See `_contractsLib-kk/node_modules/@ondemandenv/contracts-lib-base/.odmd/ONDEMANDENV_PLATFORM.md` for general platform concepts and service patterns.

## 📋 Overview

The ondemandenv.dev platform implements a **two-layer schema architecture** that separates stable contract boundaries from evolving data structures. This guide provides a step-by-step workflow for defining, publishing, and consuming schemas, which is the core of contract-first development on the platform.

## Schema Development Workflow

This workflow is a cycle: a service defines and publishes its data contracts (schemas), and downstream services consume them to ensure type-safe communication.

---

### **Step 1: Define Schemas in the Lambda Handler**

As a service author, you begin by defining the data structures for your API within your service's handler code. This is the single source of truth for your service's data contracts.

#### **1a. Create the Handler Structure**

Each service must have a complete handler package. This is typically located at `lib/handlers/` within your service directory.

```
services/my-service/lib/handlers/
├── package.json          # Handler dependencies and build config
├── tsconfig.json         # TypeScript compilation settings  
├── scripts/
│   └── schema-print.ts   # Zod → JSON Schema conversion
└── src/
    ├── index.ts          # Lambda handlers
    ├── schemas/
    │   └── zod.ts        # Service Zod schemas
    └── __generated__/    # Downloaded upstream schemas (auto-generated)
```

#### **1b. Define the Zod Schema**

Inside `src/schemas/zod.ts`, define your schemas using the Zod library.

```typescript
// In src/schemas/zod.ts
import { z } from 'zod';

export const MyServiceSchema = z.object({
  query: z.object({
    text: z.string().min(1),
    parameters: z.record(z.unknown()).optional()
  }),
  options: z.object({
    limit: z.number().int().positive().max(100).default(10),
  })
});

// Export TypeScript types for use within your own service
export type MyServiceRequest = z.infer<typeof MyServiceSchema>;
```

#### **1c. Implement the Schema Print Script**

To make your Zod schema available to the outside world, you need to convert it to a standard JSON Schema. Create a script at `scripts/schema-print.ts` that performs this conversion.

```typescript
// In scripts/schema-print.ts
import { MyServiceSchema } from '../src/schemas/zod';
import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";

// (Optional) A helper to make schemas more flexible for consumers
function loosenAll(schema: z.ZodTypeAny): z.ZodTypeAny { 
    /* ... implementation from previous examples ... */ 
}

const jsonSchema = JSON.stringify(zodToJsonSchema(MyServiceSchema), null, 2);
process.stdout.write(jsonSchema);
```

#### **1d. Use the Schema for Runtime Validation**

In your Lambda handler (`src/index.ts`), import and use your Zod schema to validate incoming requests at runtime.

```typescript
// In src/index.ts
import { MyServiceSchema, type MyServiceRequest } from './schemas/zod';

export const handler = async (event: APIGatewayProxyEvent) => {
  try {
    const requestBody = JSON.parse(event.body || '{}');
    const validatedRequest: MyServiceRequest = MyServiceSchema.parse(requestBody);
    // ... process validated request
  } catch (error) {
    // ... handle validation errors
  }
};
```

---

### **Step 2: Publish Schemas from the CDK Stack**

Next, you need to publish the JSON Schema so other services can find and use it. This is done in your service's CDK stack definition (e.g., `lib/my-service-stack.ts`).

The stack will execute the `schema-print.ts` script, take its output, and use the platform's `deploySchema` utility to upload it to a shared location.

```typescript
// In lib/my-service-stack.ts
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { deploySchema } from '@your-org/contracts-lib/dist/lib/utils/schema-deployment';
import { execSync } from 'node:child_process';
import { fromIni } from "@aws-sdk/credential-providers";
import { OdmdShareOut } from '@ondemandenv/contracts-lib-base/lib/model/odmd-share-refs';
import type { MyEnverType } from '@your-org/contracts-lib';

export class MyServiceStack extends Stack {
    /* ... constructor ... */

    async render() {
        const httpApi = new apigwv2.HttpApi(this, 'MyHttpApi');
        const baseUrl = httpApi.apiEndpoint;

        const schemaStr = execSync('ts-node scripts/schema-print.ts', {
            cwd: __dirname + '/handlers',
            stdio: ['ignore', 'pipe', 'inherit']
        }).toString();

        const shareOut = new Map([
            [this.enver.apiBaseUrl, baseUrl],
        ]);

        // Platform-aware schema deployment for CI/CD vs. Local
        if (process.env.ODMD_centralRoleArn && process.env.ODMD_centralRoleArn.length > 3) {
            const schemaUrl = await deploySchema(this, schemaStr, this.enver.apiBaseUrl.children![0]);
            shareOut.set(this.enver.apiBaseUrl.children![0], schemaUrl);
        } else {
            try {
                const creds = await fromIni({ profile: 'your-org-workspace-profile' })();
                /* ... set env vars for local credentials ... */
                const schemaUrl = await deploySchema(this, schemaStr, this.enver.apiBaseUrl.children![0]);
                shareOut.set(this.enver.apiBaseUrl.children![0], schemaUrl);
            } catch (e) {
                console.warn(`Could not deploy schema for local debugging. Error: ${e}`);
            }
        }

        new OdmdShareOut(this, shareOut);
    }
}
```

---

### **Step 3: Consume Schemas in Downstream Services**

Now, another service that needs to call your service (a "consumer") can download your published schema and generate type-safe client code.

This is done via a `gen-schemas.ts` script in the *consuming* service's `bin/` directory. This script uses the `SchemaTypeLoader` utility from the contracts library.

```typescript
// In the consuming service's bin/gen-schemas.ts file
import { type ConsumerEnverType, YourOrgContracts } from '@your-org/contracts-lib';
import { SchemaTypeLoader } from '@your-org/contracts-lib/dist/lib/utils/schema-downloader';
import { App } from "aws-cdk-lib";
import { fromIni } from "@aws-sdk/credential-providers";
import { execSync } from "node:child_process";
import * as fs from "node:fs";

async function main() {
    /* ... credential setup for local vs. CI/CD ... */

    new YourOrgContracts(new App());
    const enver = YourOrgContracts.inst.getTargetEnver() as ConsumerEnverType;

    // Define which upstream schemas to consume
    const consumers = [ enver.myServiceApiBaseSchema ]; 

    const generator = new SchemaTypeLoader(enver, consumers as any, 'lib/handlers/src/__generated__');
    const downloadedSchemas = await generator.download();
    
    // For each schema, generate a TypeScript Zod file
    downloadedSchemas.forEach((item) => {
        const typeName = item.consumerId.replace(/Schema$/, '');
        const zodSchemas = execSync(
            `npx json-schema-to-zod --input "${item.outFilePath}" --name "${typeName}" --noImport`
        ).toString();

        const zodContent = `/* AUTO-GENERATED */ ... 

import { z } from 'zod';

${zodSchemas}

export type ${typeName} = z.infer<typeof ${typeName}>;`;

        fs.writeFileSync(item.outFilePath + '.ts', zodContent);
    });
}

main().catch((e) => { console.error(e); process.exit(1); });
```

---

### **Step 4: Use Generated Types in the Consumer Lambda**

After running the `gen-schemas.ts` script, the consuming service will have a new file at `lib/handlers/src/__generated__/myServiceApiBase.ts`.

Its Lambda handler can now import the generated types and use them to make type-safe calls to your service.

```typescript
// In the consuming service's handler
import { MyServiceApiBase, MyServiceApiBaseSchema } from './__generated__/myServiceApiBase.ts';

async function callMyService(data: unknown) {
  // 1. Validate the data against the generated Zod schema
  const validatedRequest: MyServiceApiBase = MyServiceApiBaseSchema.parse(data);

  // 2. Make a type-safe API call
  const response = await httpClient.post(
    'https://url-of-my-service',
    validatedRequest
  );
  return response;
}
```

This completes the end-to-end, type-safe workflow, ensuring that services can evolve independently while respecting their public contracts.