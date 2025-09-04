# Platform Schema Architecture

> Cross-Reference: This document details the schema implementation workflow. See `.odmd/ONDEMANDENV_PLATFORM.md` for platform concepts and service patterns.

## 📋 Overview

The ondemandenv.dev platform implements a **two-layer schema architecture** that separates stable contract boundaries from evolving data structures. This guide provides a step-by-step workflow for defining, publishing, and consuming schemas, which is the core of contract-first development on the platform.

## Schema Development Workflow

This workflow is a cycle: a service defines and publishes its data contracts (schemas), and downstream services consume them to ensure type-safe communication.

---

### **Step 1: Define Schemas in the Lambda Handler**

As a service author, you begin by defining the data structures for your API within your service's handler code. This is the single source of truth for your service's data contracts.

#### **1a. Create the Handler Structure**

Each service must have a complete handler package. This is located at `services/<service>/lib/handlers/` within your service repository.

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

### **Step 2: Publish Schemas from the CDK Stack (no await in constructor)**

Next, you need to publish the JSON Schema so other services can find and use it. This is done in your service's CDK stack definition (e.g., `lib/my-service-stack.ts`).

The stack will execute the `schema-print.ts` script, take its output, and use the platform's `deploySchema` utility to upload it to a shared location.
Do not perform async work inside a CDK construct constructor. Publish schemas from an async `render()` method or a custom resource.

```typescript
// In lib/my-service-stack.ts
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { deploySchema } from '@your-org/contracts-lib/dist/lib/utils/schema-deployment';
import { execSync } from 'node:child_process';
import { OdmdShareOut } from '@ondemandenv/contracts-lib-base/lib/model/odmd-share-refs';

export class MyServiceStack extends Stack {
  async render() {
    const httpApi = new apigwv2.HttpApi(this, 'MyHttpApi');
    const baseUrl = httpApi.apiEndpoint;

    const schemaStr = execSync('ts-node scripts/schema-print.ts', {
      cwd: __dirname + '/handlers',
      stdio: ['ignore', 'pipe', 'inherit']
    }).toString();

    const schemaUrl = await deploySchema(this, schemaStr, this.enver.apiBaseUrl.children![0]);

    new OdmdShareOut(this, new Map([
      [this.enver.apiBaseUrl, baseUrl],
      [this.enver.apiBaseUrl.children![0], schemaUrl]
    ]));
  }
}
```

---

### **Step 3: Consume Schemas in Downstream Services (SchemaTypeLoader preferred)**

Now, another service that needs to call your service (a "consumer") can download your published schema and generate type-safe client code.

This is done via a `gen-schemas.ts` script in the consuming service's `bin/` directory. Use the `SchemaTypeLoader` utility to download JSON Schemas, then convert to Zod with `json-schema-to-zod`.

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

---

# Platform Schema Architecture Best Practices (Merged)

> Cross-Reference: See `.odmd/ONDEMANDENV_PLATFORM.md` for platform concepts and service patterns.

## 🏗️ Dual-Layer Model

### Contract Surface Layer
- Stable boundaries and addresses; define producers/consumers in ContractsLib

### Implementation Schema Layer
- Zod (or other) schemas live in handlers; evolve independently; publish JSON Schemas as artifacts

## Consumer Schema Access and Generation
- Prefer `SchemaTypeLoader` to download upstream JSON Schemas into `lib/handlers/src/__generated__/`
- Convert to Zod via `json-schema-to-zod`; generate TypeScript types from Zod
- Note: `SchemaTypeGenerator` is deprecated in favor of the two-step Loader + conversion flow

## CDK Integration Pattern
- Publish contract surfaces (e.g., base URLs) in the stack constructor
- Publish schemas asynchronously from an explicit `render()` method or custom resource; never `await` in constructors
- Use stable stack IDs that do not encode constellation names; enver selection is driven by revision (branch/tag)

## Handler Package Pattern
```
services/<service>/lib/handlers/
├── package.json
├── tsconfig.json
├── scripts/schema-print.ts
└── src/
    ├── schemas/zod.ts
    ├── __generated__/
    └── index.ts
```

## Build and Deployment Flow (Recap)
1) Root deps install
2) Consumers download upstream schemas (SchemaTypeLoader) and convert to Zod
3) Build handlers
4) Build CDK
5) During deploy, call `render()` to generate and deploy this service's JSON Schemas, publish via `OdmdShareOut`