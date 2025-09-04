# ONDEMANDENV.DEV PLATFORM INTERFACE

## From‑Scratch Quickstart (Generalized)

Follow this sequence to bring a new bounded context onto the platform with contract‑first discipline:

1) ContractsLib (organization repo)
- Define accounts/workspaces and GitHub repo mappings.
- Create one build per service and initialize its Envers (dev/main/mock at minimum).
- For each service Enver:
  - Define base URL producer (e.g., `identityApiBaseUrl`).
  - Attach a child schema artifact producer: `children: [{ pathPart: 'schema-url', s3artifact: true }]`.
- Wire cross‑service dependencies once all builds exist (e.g., `wireKey(...)`).

2) Service scaffolds (one repo per service)
- CDK app pattern: initialize ContractsLib, get target Enver, derive stack names via `getRevStackNames()`.
- Stack pattern:
  - Create minimal infra (e.g., HTTP API + Lambda handler).
  - Publish base URL via a single `OdmdShareOut`.
  - Generate service schema JSON in a handler npm script (Zod lives in handler code only).
  - Call `deploySchema(this, schemaString, enver.<baseUrl>.children[0])` to publish the schema artifact.

3) Web client (optional)
- S3/CloudFront site that reads a runtime `config.json` with upstream endpoints (resolved via `getSharedValue(...)` at deploy time).
- Publish `webClientUrl` via `OdmdShareOut`.

4) BDD inside the enver
- API level: a dedicated BDD stack with a Step Functions state machine (native HTTP + SSM) and CloudWatch Logs.
- Browser level (optional): Playwright runner (Lambda/ECS) that targets `webClientUrl`; publish `bddResultsUrl`.

5) Build orchestration (platform‑driven)
- The platform runs `.scripts/build.sh` per repo:
  - Producers: compile handlers (no schema generation needed).
  - Consumers: resolve upstream `schema-url` producers with `SchemaTypeGenerator` and emit generated types to `lib/handlers/src/__generated__`, then compile.
- CDK stacks must reference only prebuilt artifacts/strings; no Zod imports in CDK scope.

6) Deployment order and discovery
- The platform deploys the enver’s stacks in the order returned by `getRevStackNames()`.
- Prefer two stacks: app first, BDD second (e.g., `MyApp`, `MyApp-bdd`).
- Discover produced values via `/odmd-share/...` or the `OdmdCrossRefConsumer.getSharedValue(...)` helper during synth.

Checklist
- Single `OdmdShareOut` per stack; pass multiple producers in one Map.
- No constellation (dev/main/mock) names in IDs or resource names. Use stable IDs; enver selection is driven by revision (branch/tag) and platform mapping.
- ContractsLib `aws-cdk-lib` version pinned and matched by all service repos.

## Service Architecture Structure

Each service follows a standardized structure for consistency and maintainability:

```
services/my-service/
├── .scripts/
│   └── build.sh              # Platform build script
├── bin/
│   ├── cdk.ts                 # CDK app entry point
│   └── gen-schemas.ts         # Schema generation script
├── lib/
│   ├── handlers/              # Lambda handler package
│   │   ├── package.json       # Handler dependencies
│   │   ├── tsconfig.json      # Handler TypeScript config
│   │   ├── scripts/
│   │   │   └── schema-print.ts # Zod → JSON Schema converter
│   │   └── src/
│   │       ├── index.ts       # Lambda handlers
│   │       ├── schemas/
│   │       │   └── zod.ts     # Service Zod schemas
│   │       └── __generated__/ # Downloaded upstream schemas
│   └── my-service-stack.ts    # CDK stack definition
├── package.json               # Service CDK dependencies
└── tsconfig.json              # Service TypeScript config
```

**Critical Requirements:**
- **Handler package.json**: Must include zod, zod-to-json-schema, @types/aws-lambda
- **Handler tsconfig.json**: Must compile to ES2020/CommonJS for Lambda compatibility
- **Schema separation**: Zod schemas live in handler runtime scope, never in CDK scope
- **Build sequence**: Root deps → schema generation → handler build → service build

## Platform Core Purpose
ONDEMANDENV transforms distributed systems complexity through **Application-Centric Infrastructure** and **Contract-First Development**, enabling teams to focus on business innovation rather than integration complexity.

## Core Platform Abstractions

### **Enver (Environment Version)**
- **Definition**: A complete, deployable version of an application's bounded context
- **Base Class**: `OdmdEnver<T extends OdmdBuild<OdmdEnver<T>>>`
- **CDK Implementation**: `OdmdEnverCdk extends OdmdEnver<OdmdBuild<OdmdEnverCdk>>`
- **Key Method**: `getRevStackNames(): Array<string>` - Returns CDK stack names for deployment
- **Full SDLC Context**: Each Enver provides complete Software Development Lifecycle context with infrastructure, dependencies, and deployment automation
- **Types**:
    - **Branch Envers**: Dynamic, updates with dependency changes (dev/staging)
    - **Tag Envers**: Immutable, fixed point-in-time versions (production)

### **Build Configuration**
- **Base Class**: `OdmdBuild<T extends OdmdEnver<OdmdBuild<T>>>`
- **Purpose**: Links Enver types to source repositories and build processes
- **Key Properties**:
    - `buildId: string` - Unique identifier for the build
    - `gitHubRepo: GithubRepo` - Repository configuration
    - `envers: Array<T>` - Environment instances
- **Initialization**: `protected abstract initializeEnvers(): void`

### **Source Revision References**
- **Class**: `SRC_Rev_REF(type: "b" | "t", value: string, origin?: SRC_Rev_REF)`
- **Branch Reference**: `new SRC_Rev_REF('b', '<branch-name>')` - Points to a branch (e.g., `dev`, feature branches)
- **Tag Reference**: `new SRC_Rev_REF('t', 'v1.0.0')` - Points to a tag
- **Path Conversion**: `toPathPartStr()` - Converts to SSM Parameter Store path

### **Cross-Reference System (Product/Consumer Pattern)**
- **Producer**: `OdmdCrossRefProducer<T extends OdmdEnver<any>>` - What an Enver publishes
- **Consumer**: `OdmdCrossRefConsumer<T extends OdmdEnver<any>>` - What an Enver requires
- **Platform Integration**:
    - `OdmdShareOut` - Publishes Products to AWS SSM Parameter Store
    - `OdmdShareIn` - Consumes Products from other Envers via parameter store
- **Resolution**: Platform handles cross-account dependency resolution at deployment time

### **Platform Service Integration**
- **Built-in Services**:
    - `__user-auth` - Authentication service (External Auth Provider → AWS IAM)
    - `__networking` - Shared VPC, TGW, networking infrastructure
    - `__contracts` - ContractsLib repository deployment itself
    - `_default-vpc-rds` - Standard database infrastructure templates
    - `_default-kube-eks` - Default Kubernetes cluster templates
#### Hosted Zone and DNS Integration
To facilitate service discovery, TLS termination, and human-readable endpoints, the platform provisions a Route53 Hosted Zone per target environment according to your organization configuration.

- **Configuration**: Hosted Zone access is exposed via the Enver configuration as a typed object: `this.enver.hostedZone?: { zoneId: string; zoneName: string }`.

- **Subdomain Structure**: Services can create predictable DNS records. A standard subdomain format is:
  `<rev>.<build-id>.<central-subdomain>` where `<rev>` originates from the revision (branch/tag), not hardcoded constellation names.

- **Usage Example**: Construct a domain name and create Route53 records (e.g., an 'A' record for ALB or CNAME for CloudFront). Obtain TLS certificates via ACM for the chosen domain.

#### Platform Console Webapp (User Auth Web UI)
- Purpose: Lightweight web console that connects to the OndemandEnv platform for authentication and visualization, consuming platform-published config.
- Location: `user-auth/webui` (Vite app). Entry: `user-auth/webui/src/main.ts`.
- Hosting: `user-auth/lib/web-hosting-stack.ts` provisions S3 + CloudFront with Route53 alias `web.<zone>`.
- Deployment: `user-auth/lib/web-ui-stack.ts` uploads `webui/dist` to S3 and writes runtime configuration files:
  - `config.json` (global) with auth and environment details
  - `config_region/<region>.json` (per-region) with visualization data and AppSync GraphQL URL
- Orchestration: `user-auth/bin/user-pool.ts` wires `UserPoolStack`, `WebHostingStack`, and `WebUiStack`, then calls `buildWebUiAndDeploy()`.
- Dependencies: Reads values from SSM Parameter Store and S3 via an assumed central role; AppSync endpoint and `/odmd-share` parameters must exist for full functionality.

## Service Constellation Architecture

### **Multi-Constellation Pattern (by revision, not names in IDs)**
- Example revisions include `SRC_Rev_REF('b', 'dev')`, `SRC_Rev_REF('b', 'main')`, and `SRC_Rev_REF('b', 'mock')` mapping to different context variants. Stack IDs remain revision-agnostic.

### **Constellation Characteristics**
### Tip: Constellations are emergent, not code-defined
- Do NOT encode constellation membership or service contract maps as static TypeScript types or constants.
- Constellations emerge from Enver wiring and cross-refs (producers/consumers) in ContractsLib. They are not tied to specific AWS accounts; mapping to accounts/workspaces is a deployment-time concern, not a property of enver semantics.
- Keep stable addresses at Layer 1 (ContractsLib), and let Layer 2 (services) publish schemas/artifacts at deploy time.

- ✅ **Complete implementation** of ALL services working together
- ✅ **Full semantic contracts** and schema definitions
- ✅ **Self-contained** - no external dependencies between constellations
- ✅ **End-to-end functional** from input to output
- ✅ **Independent evolution** - constellations can evolve separately

### **Platform vs Application Services**
- **Platform Services** (singleton): user-auth, networking, monitoring
    - Shared across ALL constellations for consistency
    - Single identity provider, shared JWT tokens
- **Application Services** (multi-constellation): business logic services
    - Independent per constellation for isolation
    - Environment-specific configurations

## Dynamic Cloning for Development

### **Clone Commands**
- **Create**: Git commit with `odmd: create@baseEnver` in message body
- **Delete**: Git commit with `odmd: delete` in message body
- **Purpose**: Create isolated, temporary environments for feature development

### **Clone Workflow**
1. Developer creates feature branch
2. Commits code with `odmd: create@dev` command
3. Platform provisions complete isolated SDLC environment
4. Developer tests in isolated environment with unique endpoints
5. After testing, commits `odmd: delete` to cleanup resources

### **Full SDLC Context per Enver**
Each Enver provides complete Software Development Lifecycle context including:
- **Infrastructure**: Complete AWS infrastructure provisioning
- **Dependencies**: Automatic dependency resolution and monitoring
- **Build Pipeline**: Automated build and deployment processes
- **Testing Environment**: Isolated testing with unique endpoints
- **Monitoring**: Built-in observability and logging
- **Security**: Authentication, authorization, and access controls
- **Networking**: VPC, load balancing, and service discovery

### **Clone Benefits**
- **Resource Isolation**: Unique naming prevents conflicts with other environments
- **Static Envers Unchanged**: Cloning doesn't affect original static Envers
- **Parallel Development**: Multiple developers can work simultaneously
- **Safe Experimentation**: Test without impacting shared environments

## Platform Development Workflow
### BDD Checkpoint: Two-Layer Contract Verification

After implementing the schema workflow, validate inter-service contracts via BDD against the mock constellation:

- Producer responsibilities
  - Publish stable addresses for APIs and schemas via `OdmdShareOut`
  - Deploy concrete schemas (request/response/events) as artifacts; record versioned addresses

- Consumer responsibilities
  - Generate types from upstream schemas using `SchemaTypeGenerator`
  - Resolve upstream contract values at runtime via `getSharedValue(...)`
  - Validate requests/responses against fetched schemas

- Test strategy (mock-like revision)
  - Use Cucumber.js + Gherkin for feature specs; Jest for step execution
  - Build requests with generated types; assert responses validate against runtime schemas
  - Verify SSM `/odmd-share/...` entries exist and resolve to deployed endpoints and schema artifacts
  - Cover the primary user journeys and service interaction flows.

- CI gating
  - Run synth/ls on all services
  - Run BDD smoke suite against mock; block merges on contract regressions
  - Record schema versions used in test logs for traceability

### Implementation Schema Layer (service-level Zod)

**See `lib/utils/ONDEMANDENV_PLATFORM_schema.md` for complete schema architecture details.**

Key principles:
- **Zod Runtime Scope**: Zod schemas operate in Lambda handlers, not CDK scope
- **JSON Schema Artifacts**: S3 artifacts contain JSON Schema (converted from Zod via `zodToJsonSchema`)
- **Build-time Generation**: Prefer `SchemaTypeLoader` + `json-schema-to-zod` to create consumer types
- **Git Versioning**: All schema artifacts tagged with git SHA for traceability

#### Producer structure (child of base URL)

- Bind schema to its service endpoint by publishing it as a child of the base URL producer:
  - Example: `myApiBaseUrl` → children: `[ { pathPart: 'schema-url', s3artifact: true } ]`
- Publishing
  - In the app stack: `deploySchema(this, jsonSchemaString, myEnver.myApiBaseUrl.children[0])`
- Consumption
  - Downstream build step: Use `SchemaTypeLoader` to download upstream JSON schemas and convert to Zod types

#### Consumer structure (separate consumers for base URL and schema)

- For each upstream service, declare two consumers:
  - Base URL: `this.<service>ApiBaseUrl = new OdmdCrossRefConsumer(this, '<service>ApiBaseUrl', <service>Api)`
  - Schema: `this.<service>ApiBaseSchema = new OdmdCrossRefConsumer(this, '<service>ApiBaseSchema', <service>Api.children![0])`
- This keeps transport (endpoint) and schema (artifact) independently consumable while remaining coupled under the same producer tree.

### Code generation in `.scripts/build.sh`

**See `lib/utils/ONDEMANDENV_PLATFORM_schema.md` for complete build process details.**

Platform build sequence:
1. **Root service**: `npm ci` installs CDK dependencies
2. **Schema generation**: `bin/gen-schemas.ts` handles both local debugging and GitHub Actions environments
3. **Schema download**: `SchemaTypeLoader` downloads upstream JSON schemas from S3 to `lib/handlers/src/__generated__/`
4. **Type generation**: `json-schema-to-zod` converts JSON schemas to TypeScript Zod types inline with proper imports
5. **Handler build**: `cd lib/handlers && npm ci && npm run build` installs handler dependencies and compiles
6. **Service build**: `npm run build` compiles the CDK service stack

### ContractsLib Enver Semantics
- The ContractsLib build is global across regions. In its Enver list, the first entry in `initializeEnvers()` is the canonical source of truth used by all regions.
- Any additional entries are placeholders representing other regions or deployment targets; they should not diverge in contract definitions.
- Service constellations (dev, main, mock) consume the same canonical ContractsLib products, with mock deployed per Enver workspace mapping configuration.

### Build initialization order and Enver wiring rules
- Instantiate all build classes first, then perform cross-build wiring. The typical flow in ContractsLib is:
  1) Construct all builds
  2) Each build populates its `_envers` strictly inside `initializeEnvers()`
  3) After all builds exist and their `_envers` are ready, run `initializeDefaults()` to wire cross-references (e.g., `wireKey(...)`, `wireAnonymous(...)`)
- Do not perform any cross-build consumption or side effects in build constructors. Keep constructors side-effect-free; all Enver creation belongs in `initializeEnvers()` only.
- This guarantees that cross-build `wireX(...)` calls operate on fully initialized `_envers` for every build and prevents accidental self-consumption during construction.
- Build auto-registration: base class constructors already register builds with the ContractsLib; do not manually push builds into internal arrays (e.g., avoid `this._builds.push(...)` in your ContractsLib implementation).

### **Step 1: ContractsLib Definition**
```typescript
// Define service boundaries and dependencies
export class MyOrgContracts extends OndemandContracts<
  MyAccountMappings, MyRepoMappings, MyContractsLibBuild
> {
  myServiceBuild = new MyServiceBuild(this, 'MyServiceBuild', {
    owner: 'yourorg', name: 'my-service-repo', ghAppInstallID: 12345
  });
}
```

### **Step 2: Service Implementation**
```typescript
// Service consumes dependencies and publishes outputs
export class MyServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MyServiceStackProps) {
    super(scope, id, props);
    
    // Consume shared resources
    const networkingInputs = new OdmdShareIn(this, 'NetworkingInputs', {
      consumerId: 'NetworkingConsumer'
    }).jsonValue();
    
    // Deploy service infrastructure
    // ...
    
    // Publish service outputs
    new OdmdShareOut(this, 'Outputs', {
      value: JSON.stringify({ serviceUrl: '...', healthCheck: '/health' })
    });
  }
}
```

### CDK app initialization pattern (all services)

- Always depend on the organization ContractsLib package and pin the exact same `aws-cdk-lib` version as the ContractsLib.
- Initialize the ContractsLib in the CDK app, then resolve the target Enver selected by environment context.
- Derive stable stack IDs from `getRevStackNames()`; do not encode constellation names in IDs.
- Read `CDK_DEFAULT_ACCOUNT` and `CDK_DEFAULT_REGION` for `env` and pass them to stacks.

Example (generalized; async init):

```ts
#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import type { StackProps } from 'aws-cdk-lib'
import { MyOrgContracts } from '@my-org/contracts-lib' // use your org ContractsLib
import { MyServiceStack } from '../lib/my-service-stack'

const app = new cdk.App()

async function main() {
  const account = process.env.CDK_DEFAULT_ACCOUNT
  const region = process.env.CDK_DEFAULT_REGION
  if (!account || !region) throw new Error('Missing CDK_DEFAULT_ACCOUNT/REGION')

  const props: StackProps = { env: { account, region } }

  // Initialize ContractsLib and get the target Enver for this service
  new MyOrgContracts(app)
  const enver = (MyOrgContracts as any).inst.getTargetEnver() as any

  // Use ContractsLib-provided, environment-agnostic stack names
  const [mainStackName] = enver.getRevStackNames()

  new MyServiceStack(app, mainStackName, {
    ...props,
    // Optionally pass the enver for OdmdShareIn/OdmdShareOut usage inside the stack
    // enver,
  })
}

main().catch((e) => { console.error(e); throw e })
```

Notes:
- Constellation selection is driven by Enver revision (branch/tag) and platform mapping; do not hardcode it in names.
- Use `OdmdShareIn` to read upstream producer values and `OdmdShareOut` to publish this service’s outputs within stacks.
- When the ContractsLib `aws-cdk-lib` version changes, update all service repos in the same commit to avoid type mismatches across `App` instances.
- If your workspace still pulls multiple `aws-cdk-lib` copies (private property mismatch on `App`), ensure a single version is hoisted, or cast the ContractsLib constructor and `inst` access through `any` as shown above until the version alignment is fixed.

### **Step 3: Deployment Automation**
 
## Web Client Build Pattern (Generalized)

To validate user journeys and run browser-based BDD inside the platform, define a reusable Web Client build:

- Build definition (ContractsLib)
  - Create `OdmdBuildWebClient` and `OdmdEnverWebClient`
  - Producers: `webClientUrl`
  - Consumers: upstream service URLs (e.g., `myApiBaseUrl`) via `OdmdCrossRefConsumer`
  - Wire consumers in `initializeDefaults()` alongside other services

- Service implementation (per project)
  - S3 static hosting + CloudFront (optional Route53) for a Vite/SPA
  - During deploy, resolve upstream endpoints using `getSharedValue(...)` and write a runtime `config.json` to S3
  - Publish `webClientUrl` via `OdmdShareOut` (e.g., CloudFront domain or S3 website URL)
  - S3 public access: prefer `blockPublicAccess: BlockPublicAccess.BLOCK_ACLS_ONLY` when `publicReadAccess` is used

### Build-time artifact staging (platform-aligned)

- Pre-deploy build script
  - The platform will invoke `.scripts/build.sh` before deployment to compile/bundle and stage artifacts under a `.build/` directory.
  - Example: place static site files at `.build/web-client/web`.

- CDK consumption
  - CDK stacks should reference prebuilt artifacts via `s3deploy.Source.asset('<staged-path>')`.
  - Avoid building in CDK (no bundling) to ensure deterministic, platform-controlled builds.

- Contract publishing
  - Use a single `OdmdShareOut` per stack; if publishing multiple producers, pass them together in one `Map`.

- Benefits
  - Contract-driven discovery in the browser; no hardcoded env
  - Works across mock/dev/main and cloned envers without drift

## In-Enver Playwright BDD (Generalized)

Run browser BDD from within each enver to ensure parity with production:

- Test executor
  - A lightweight runner (Lambda or Fargate) packaged with Playwright
  - Discovers `webClientUrl` and upstream endpoints via `getSharedValue(...)`
  - Executes Playwright scenarios; uploads artifacts (videos, traces, JUnit) to S3
  - Publishes `bddResultsUrl` via `OdmdShareOut` for visibility

- Triggers and policy
  - Auto-invoke post-deploy for each enver
  - Gate promotions on the published BDD result instead of external CI state

- Recommended browser setup
  - Support both headless and visible modes (VNC) for debugging
  - Centralize browser window sizing/positioning and auth helpers in a shared test lib

## In-Enver API BDD via Step Functions (Generalized)

For infrastructure-native, context-rich validation, define a BDD State Machine per enver:

- Stack: BddRunnerStack (separate from app stack, deployed after it)
  - Step Functions Standard state machine with CloudWatch Logs
  - Sequential Lambda tasks that call each service API and assert JSON (e.g., ServiceA -> ServiceB -> ServiceC)
  - Input shape: `{ testId: string; message: string }` (testId must be unique)
  - Same region/account as the enver (no cross-account by default)
- ContractsLib producers (example under WebClient build):
  - `webClientUrl` (for browser tests later)
  - `bddStateMachineArn` (to allow manual StartExecution)
- Invocation
  - Manual: StartExecution from Console/CLI with the input payload
  - Optional: EventBridge or platform hook to auto-run post-deploy
- IAM
  - SFN role can invoke per-step Lambdas
  - Lambdas can read `/odmd-share/...` via SSM and write logs
- Results
  - Summarize step aggregates pass/fail and writes `bddStatus` (and optional `bddResultsUrl`) to SSM for visibility

### Stack independence and triggering

- Separation
  - The BDD stack is independent of the app stack and uses shared values (`/odmd-share/...`) for context; no direct resource coupling.
  - Deploy the BDD stack after the app stack so endpoints are ready.

- Auto trigger on create
  - Use an `AwsCustomResource` in the BDD stack to call `states:StartExecution` once on stack creation with inputs like `{ testId, message }`.
  - Continue to support manual triggers (Console/CLI) using the shared `bddStateMachineArn`.

- Native integrations
  - Prefer Step Functions native integrations:
    - HTTP: `arn:aws:states:::http:invoke` for API calls with retries/backoff
    - SSM: `getParameter`/`getParametersByPath` to resolve `/odmd-share/...`, and `putParameter` to publish results
  - Add a small `Wait` or retry loop when reading endpoints to accommodate eventual consistency

### Enver multi-stack pattern and naming

- Multi-stack per enver
  - An enver can synthesize multiple stacks via `getRevStackNames()`.
  - Pattern: return the main app stack first, then append the BDD stack name second (e.g., `OdmdWebClient--mock` and `OdmdWebClient--mock-bdd`).

- Example override
  - In the enver type (ContractsLib), append the BDD stack name:
```ts
getRevStackNames(): Array<string> {
  const stackNames = super.getRevStackNames();
  return [...stackNames, stackNames[0] + '-bdd'];
}
```

- Deployment order and dependencies
  - The platform deploys enver stacks in order; ensure the BDD stack is listed after the app stack.
  - In CDK, set the BDD stack to depend on the app stack so it has full context (endpoints published, `/odmd-share/...` populated).

- Naming rules
  - Do not encode constellation names (dev/main/mock) in IDs.
  - Appending a stable suffix like `-bdd` for a secondary stack within the same enver is acceptable.

- Producers for discovery
  - Publish `bddStateMachineArn` (and optional `bddResultsUrl`) via `OdmdShareOut` so the platform and tools can StartExecution and read results.
- **GitHub Integration**: Automatic workflows generated for each Enver
- **Dependency Monitoring**: Platform monitors dependencies and determines whether to trigger deployment when any of an Enver's dependencies change
- **Cross-Account Resolution**: Platform handles IAM roles and resource access

## Multi-Account Architecture

### Guidance
- Enver and constellation semantics are account-agnostic. Organizations decide how revisions map to accounts/workspaces. The platform supports cross-account resolution via roles without prescribing fixed mappings.

### Rule: Do not encode constellation in stack names
- Do NOT include `mock`/`dev`/`main` in CDK stack IDs, class names, or resource names.
- Constellation is selected by Enver `SRC_Rev_REF` (e.g., `b..mock`) and workspace mapping, not by names.
- Keep stack IDs stable per service; uniqueness and isolation come from Enver context and OdmdShare wiring.

### Rule: CDK repos must depend on org ContractsLib and match CDK version
- Each service CDK repo must declare a dependency on the organization contracts library package (e.g., `@<org>/<contracts-lib-pkg>`).
- The `aws-cdk-lib` version in every service repo must be exactly the same as the version used in the contracts library to avoid type/runtime drift.
- When bumping `aws-cdk-lib` in the contracts library, bump the same version in all service repos in the same commit.

### **Resource Naming**
- **CDK Auto-Generated**: No static names to avoid conflicts
- **BuildId Prefix**: All resources use `buildId-resourceType-account-region` pattern
- **Physical Name Resolution**: Use `aws cloudformation describe-stack-resources` to map logical→physical IDs

## Platform Dependency Management

### **Automatic Dependency Monitoring**
- **Real-time Tracking**: Platform continuously monitors all Enver dependencies
- **Smart Triggering**: Only triggers downstream deployments when meaningful changes occur
- **Cross-Service Resolution**: Handles complex dependency graphs across multiple services
- **Failure Handling**: Rollback and recovery mechanisms for failed deployments

### **SDLC Integration**
- **Version Control**: Git integration with branch and tag management
- **CI/CD Pipeline**: Automated build, test, and deployment workflows
- **Environment Promotion**: Seamless promotion from dev → staging → production
- **Configuration Management**: Environment-specific configuration handling

[//]: # (### Build and Test Discipline)
[//]: # (- After any TypeScript code change in any project, run `tsc --build` at minimum to ensure type correctness.)
[//]: # (- For `@org/contracts-lib`, `npm run test` must remain green locally and in CI; treat failures as publish/merge blockers.)
[//]: # (- Windows PowerShell tip: if scripts are blocked, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force` before `npm ci` and `npm run test`.)
[//]: # (- CI must set required env vars used by tests: `ODMD_rev_ref`, `CDK_DEFAULT_ACCOUNT`, `CDK_DEFAULT_REGION`, `CDK_CLI_VERSION`.)

## Service Phase Development Pattern

**CRITICAL PLATFORM PATTERN**: Every service must follow explicit phased development with checkpoints.

For detailed service development lifecycle and phase management patterns, see:
- **[SERVICE_PHASE_DEVELOPMENT_PATTERN.md](./SERVICE_PHASE_DEVELOPMENT_PATTERN.md)** - Generic phased development approach
- **[ENVER_BASED_SERVICE_CONTEXT_PATTERN.md](./ENVER_BASED_SERVICE_CONTEXT_PATTERN.md)** - Revolutionary PHASES = ENVERS architecture

## 🚀 **REVOLUTIONARY PLATFORM INSIGHT: PHASES = ENVERS**

The ultimate realization for ONDEMANDENV platform service development:

**Different development phases are actually DIFFERENT ENVERS:**
- **Phase 0** (Contract Verification) = `mock` enver (`workspace1`)
- **Phase 1** (MVP Development) = `dev` enver (`workspace0`)  
- **Phase 2+** (Production) = `main` enver (`workspace0`)

This creates **perfect phase-environment alignment** with appropriate infrastructure, security, and objectives for each stage, representing the ultimate evolution of ONDEMANDENV platform service development.

### Standard Service Phases

#### Phase 0: Contract Verification with Mock Data/Code using BDD Tests
**Constellation**: `mock` only initially
**Focus**: Verify contracts, schema validation, and mocked data responses using dual BDD tests

**CRITICAL**: Phase 0 is for contract verification with MOCKED responses and BDD testing only. NO real business logic.

**Phase 0A: Contract Surface Layer**
- [ ] **CDK Stack Setup**: Basic service stack with HTTP API + Lambda
- [ ] **Contract Integration**: `OdmdShareOut` publishing service base URL, consuming upstream services
- [ ] **Basic Endpoints**: Core API endpoints returning MOCKED responses only
- [ ] **Storage Layer**: S3/DynamoDB with proper encryption (SSE-KMS) - for schemas only
- [ ] **Event Integration**: SQS queues for mocked event publishing

**Phase 0B: BDD Contract Verification**
- [ ] **Zod Schemas**: Complete request/response schemas in `lib/handlers/src/schemas/zod.ts`
- [ ] **Schema Deployment**: `deploySchema(this, schemaString, enver.<baseUrl>.children[0])`
- [ ] **Schema Consumption**: Downloads upstream schemas via `json-schema-to-zod`
- [ ] **Mocked Handlers**: Lambda handlers returning schema-valid MOCKED responses
- [ ] **Schema Validation**: All requests validated against Zod schemas
- [ ] **BDD Test Integration**: Perfect alignment with web-client dual BDD (Step Functions + Playwright)
- [ ] **Build Integration**: `bin/gen-schemas.ts` with AWS_REGION checks

**Checkpoint Validation**:
```bash
cd services/<service-name>
npm run Odmd<ServiceName>:cdk:ls --silent
# Should show: Odmd<ServiceName>--mock

# Verify BDD integration - Step Functions level
aws stepfunctions start-execution --state-machine-arn <BDD_ARN> --input '{...}'
# Should test service contracts via HTTP invoke

# Verify BDD integration - Playwright level  
cd services/web-client/vite && npm run test:bdd
# Should test service contracts via web GUI

# Verify schema validation
curl -X POST https://<service>-api-mock.amazonaws.com/<endpoint> \
  -H "Content-Type: application/json" -d '{invalid-payload}'
# Should return 400 with Zod validation error
```

#### Phase 1: MVP (Essential)
**Constellation**: `mock` → `dev` → `main`
**Focus**: Real business logic implementation (replacing Phase 0 mocked responses)

**Phase 1A: Core Domain Logic**
- [ ] **Domain Operations**: Complete implementation of service-specific operations
- [ ] **Cross-Service Integration**: Real integration with upstream/downstream services
- [ ] **Data Storage**: Actual data persistence and retrieval
- [ ] **Event Publishing**: Real event publishing for state changes
- [ ] **Error Handling**: Comprehensive error responses and recovery mechanisms

**Phase 1B: Advanced MVP Features**
- [ ] **Authentication/Authorization**: Real security implementation
- [ ] **Performance Optimization**: Efficient data access and processing
- [ ] **Monitoring Integration**: CloudWatch metrics and logging
- [ ] **Security Hardening**: Data protection and secure communication

#### Phase 2: Core Features
**Focus**: Domain-specific functionality and cross-service integration

**Phase 2A: Core Domain Logic**
- [ ] **Domain Operations**: Complete implementation of service-specific operations
- [ ] **Cross-Service Integration**: Proper integration with upstream/downstream services
- [ ] **Event Publishing**: Comprehensive event publishing for state changes
- [ ] **Error Handling**: Proper error responses and recovery mechanisms

**Phase 2B: Advanced Features**
- [ ] **Performance Optimization**: Efficient data access and processing
- [ ] **Security Hardening**: Proper authentication, authorization, and data protection
- [ ] **Monitoring Integration**: CloudWatch metrics and logging

**Checkpoint Validation**:
```bash
# Service-specific validation commands
curl -X POST https://<service>-api-mock.amazonaws.com/<endpoint> \
  -H "Content-Type: application/json" \
  -d '{<test-payload>}'
# Should return expected response format
```

#### Phase 3: Production Ready
**Focus**: BDD integration, testing, and production readiness

**Phase 3A: BDD Integration & Testing**
- [ ] **Mock Data Enhancement**: BDD-aligned mock responses in handlers
- [ ] **Use Case Flow Support**: Complete UC flows that involve this service
- [ ] **Test Data Alignment**: Consistent UUIDs and tokens with web-client BDD
- [ ] **Error Handling**: Proper HTTP status codes and error responses
- [ ] **Schema Validation**: Request/response validation using Zod schemas

**Checkpoint Validation**:
```bash
# BDD integration validation
curl -X POST https://<service>-api.<domain>/<endpoint> \
  -H "Content-Type: application/json" \
  -d '{<bdd-aligned-test-data>}'
# Should return BDD-expected response format
```

#### Phase 4: Advanced Features (FUTURE)
**Focus**: Service-specific advanced capabilities
- [ ] **Domain-Specific Enhancements**: Advanced features for service domain
- [ ] **Performance Optimization**: Advanced caching, optimization
- [ ] **Advanced Security**: Enhanced security features
- [ ] **Analytics Integration**: Service-specific metrics and insights

#### Phase 5: Enterprise & Scale (FUTURE)
**Focus**: Enterprise features and global scale
- [ ] **Multi-Region Support**: Global deployment capabilities
- [ ] **Enterprise Integration**: Corporate integration features
- [ ] **Compliance**: Regulatory compliance features
- [ ] **Advanced Analytics**: Business intelligence and reporting

### Service Context Template

Every service must include a comprehensive `SERVICE_CONTEXT.md` with:

```markdown
## 🚀 Implementation Phases & Checkpoints

**CRITICAL**: Each service must follow the platform's phased development approach with explicit checkpoints.

### Phase 1: MVP (Essential) ✅ COMPLETE
**Focus**: [Service-specific focus]
- [x] **Phase 1A**: [Service-specific Phase 1A tasks]
- [x] **Phase 1B**: [Service-specific Phase 1B tasks]

**Key Checkpoints**:
```bash
# Service-specific validation commands
```

### Phase 2: Core Features ✅ COMPLETE
**Focus**: [Service-specific focus]
- [x] **Phase 2A**: [Service-specific Phase 2A tasks]
- [x] **Phase 2B**: [Service-specific Phase 2B tasks]

### Phase 3: Production Ready ✅ COMPLETE
**Focus**: [Service-specific focus]
- [x] **Phase 3A**: [Service-specific Phase 3A tasks]

### Phase 4: Advanced Features (FUTURE) 🟡 PLANNED
- [ ] **[Feature Category]**: [Specific planned features]

### Phase 5: Enterprise & Scale (FUTURE) 🔵 ROADMAP
- [ ] **[Feature Category]**: [Specific roadmap features]

**Checkpoint Requirements**:
- All Phase 1-3 checkpoints must pass
- Performance baseline: [Service-specific metrics]
- Security audit: [Service-specific security requirements]
- Load testing: [Service-specific load requirements]
```

### Platform Integration Requirements

#### Contract Integration Pattern
```typescript
export interface <ServiceName>Enver extends OdmdEnverCdk {
  // Upstream consumers (services this service depends on)
  upstreamServiceApiBaseUrl?: OdmdCrossRefConsumer<ServiceEnver, OdmdEnverCdk>;
  
  // Producers (what this service provides)
  readonly serviceApiBaseUrl: OdmdCrossRefProducer<OdmdEnverCdk>;
  
  // Environment metadata
  envId?: string;
}
```

#### Schema Contracting Pattern
```typescript
// In CDK stack
const deployedSchema = await deploySchema(
  this, 
  schemaString, 
  props.enver.serviceApiBaseUrl.children[0]
);

// Publish both base URL and schema URL
new OdmdShareOut(this, 'ServiceApiBaseUrl', {
  enver: props.enver,
  producer: props.enver.serviceApiBaseUrl,
  value: this.api.apiEndpoint
});
```

#### BDD Integration Pattern
```typescript
// Mock data must align with centralized BDD test constants
export const SERVICE_TEST_DATA = {
  // Use consistent UUIDs across all services
  ENTITY_ID: "550e8400-e29b-41d4-a716-446655440001",
  // Use consistent tokens and signatures
  AUTH_TOKEN: "mock_token_12345",
  // Service-specific test data
  SERVICE_SPECIFIC_DATA: {...}
};
```

## AI-Assisted Development Support

The ondemandenv.dev platform provides ideal structure for AI-assisted development:
- **Clear Boundaries**: Each service has well-defined contracts and SDLC context
- **Isolated Testing**: Clone environments for safe AI experimentation
- **Phase-Driven Development**: Explicit checkpoints ensure systematic progress
- **Contract Validation**: Platform ensures AI-generated code respects service boundaries
- **Historical Context**: Git integration provides temporal context for AI decisions
- **Automated Testing**: Built-in testing and validation for AI-generated changes