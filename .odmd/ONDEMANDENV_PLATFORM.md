# ONDEMANDENV.DEV PLATFORM INTERFACE

## What ONDEMANDENV Is

ONDEMANDENV is a contract-orchestration layer for distributed systems on AWS. The premise: most CI/CD systems version *artifacts* (container images, Lambda zips, Helm charts) and leave service *interfaces* implicit — drifting in READMEs, discovered at runtime, debugged in staging. ONDEMANDENV versions the interfaces instead, as code, and makes services prove they conform before they deploy.

Concretely, you write a **ContractsLib** — a TypeScript library that declares every service (`OdmdBuild`), every deployable version of every service (`OdmdEnver`), and every producer/consumer edge between them (`OdmdCrossRefProducer` / `OdmdCrossRefConsumer`), with schema artifacts (OpenAPI 3.1, AsyncAPI 2.x) attached as children of the edges. The ContractsLib compiles; `odmdValidate()` checks the graph; service repos generate types from the declared schemas at build time; CI/CD deploys only graphs that type-check.

This document describes how to use the platform to build one. Key entry points below.

## ContractsLib as a Legislature, Not a Registry

Think of ContractsLib as the congress of your distributed system, not as a service registry.

- Every service sends **representatives** to ContractsLib: its `OdmdBuild`, its `OdmdEnver` instances, and the producers/consumers each enver declares.
- Cross-ref edges between envers are **enacted law**: once wired, they define an obligation that each side must implement. A producer owes its consumers a stable address and a schema-valid payload; a consumer declares which producer versions it speaks to.
- `tsc` plus `OndemandContracts.odmdValidate()` is the **constitutional court**: if the graph has a forbidden edge (same-build consumption, cross-region consumption, a ContractsLib enver trying to consume, a missing doc path), the bill fails to pass. The ContractsLib package does not publish.
- Services are **compelled to conform**: at build time, a consumer downloads its upstream producer's schema artifact, generates types into `__generated__/`, and compiles against them. A handler that doesn't match its declared contract fails to compile — not at runtime, not in staging, at `tsc`.

A service registry is passive: it records what services say about themselves. A legislature is active: it's where services negotiate, enact, and are bound. ContractsLib is the latter. Your PRs to it are legislation; its compiled output is law.

## The CI/CD Inversion

Conventional CI/CD versions outputs. It promotes artifact versions from one environment to the next and discovers whether the new version is compatible with its neighbors by running them together — staging is a compatibility-discovery mechanism dressed up as a QA gate.

ONDEMANDENV inverts this. The ContractsLib versions the **interfaces**, and the artifacts are *derived from* them. Services do not generate contracts; contracts generate the constraints that services must satisfy.

| Dimension | Linear stages | ONDEMANDENV |
|---|---|---|
| Unit of versioning | Service artifact (image/zip) | Interface (ContractsLib package) |
| Unit of deployment | Whole environment bag | Single enver |
| Unit of test | Full staging environment | A cross-ref edge |
| Contract between services | Implicit, in READMEs | Typed `OdmdCrossRefProducer`/`Consumer` with schema artifact |
| Compatibility discovered | At runtime in staging | At `tsc` / `odmdValidate()` — synth time |
| Coupling to AWS accounts | 1:1 (dev acct, staging acct, prod acct) | N:M, account mapping is a deployment-time concern |
| Phase / environment | Separate axes that drift | **Collapsed**: phase = enver = revision |
| Promotion model | Promote a bag across stages | Add new graph nodes; consumers migrate per-edge |

### What the inversion unlocks

- **Real per-service blue/green.** Interface versions are graph nodes, not states of a node. A service that needs a breaking change publishes a new producer (or a new schema-url child) alongside the old one. Old consumers keep consuming the old producer; new consumers wire to the new one. Both producers run in the same account at the same time. Traffic shifts **per edge**, not per environment. Retirement is visible in the graph (the old node has no consumers).
- **Compatibility is deductive, not observational.** If the graph validates and every service compiled against its generated types, every producer/consumer pair is provably compatible. You don't need to run them together to find out. Staging stops being an integration-test environment and becomes (optionally) a performance-test environment.
- **Constellations coexist.** Because compatibility is per-edge, many constellations (e.g., `mock-rooted`, `dev-rooted`, `main-v1-rooted`, `main-v2-rooted`) can live in the same accounts simultaneously. Cloning a constellation for a feature branch is cheap; no new environment required.
- **Contract errors surface early.** Wrong cross-ref, missing schema, cross-region edge → `odmdValidate()` throws at synth. You see the bug before any CloudFormation stack moves.

The cost is real too: all distributed-systems complexity migrates into the ContractsLib. Designing a good ContractsLib is harder than wiring services ad hoc, and the legislature's vocabulary (build, enver, producer, consumer, constellation) has a learning curve. You are trading *runtime surprise* for *design-time rigor*.

## From‑Scratch Quickstart (Generalized)

Follow this sequence to bring a new bounded context onto the platform with contract‑first discipline:

1) ContractsLib (organization repo)
- Define accounts/workspaces and GitHub repo mappings.
- Create one build per service and initialize its Envers (mock/dev/main at minimum).
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
  - Call `deploySchema(this, schemaString, enver.<baseUrl>.children[0], artifactBucket)` to publish the schema artifact. The fourth argument is the S3 `IBucket` to upload into; typically import the artifact bucket by name using the producer's `artifactSsmPath` SSM parameter.

3) Web client (optional)
- S3/CloudFront site that reads a runtime `config.json` with upstream endpoints (resolved via `getSharedValue(...)` at deploy time).
- Publish `webClientUrl` via `OdmdShareOut`.

4) BDD inside the enver
- API level: a dedicated BDD stack with a Step Functions state machine (native HTTP + SSM) and CloudWatch Logs.
- Browser level (optional): Playwright runner (Lambda/ECS) that targets `webClientUrl`; publish `bddResultsUrl`.

5) Build orchestration (platform‑driven)
- The platform runs `.scripts/build.sh` per repo:
  - Producers: compile handlers (no schema generation needed).
  - Consumers:
    - **Download**: A CDK-scope script uses `SchemaTypeLoader` to download upstream schema artifacts.
    - **Generate**: The download script invokes a handler-scope script to convert the downloaded schema into typed Zod code inside `lib/handlers/src/__generated__/`.
    - **Compile**: The handler and service are then compiled.
- CDK stacks must reference only prebuilt artifacts/strings; no Zod imports in CDK scope.

6) Deployment order and discovery
- The platform deploys the enver’s stacks in the order returned by `getRevStackNames()`.
- Prefer two stacks: app first, BDD second (e.g., `MyApp`, `MyApp-bdd`).
- Discover produced values via `/odmd-share/...` or the `OdmdCrossRefConsumer.getSharedValue(...)` helper during synth.

Checklist
- Single `OdmdShareOut` per stack; pass multiple producers in one Map.
- No revision labels (dev/main/mock) in stack IDs or resource names. Use stable IDs; enver selection is driven by revision (branch/tag) and platform mapping. Revision labels are enver identity, not constellation identity — and never resource-naming input.
- ContractsLib `aws-cdk-lib` version pinned and matched by all service repos.

## Service Architecture Structure

Each service follows a standardized structure for consistency and maintainability:

```
services/my-service/
├── .scripts/
│   └── build.sh              # Platform build script
├── bin/
│   ├── cdk.ts                 # CDK app entry point
│   └── download-gen-schemas.ts # Downloads dependency schemas and generates types
├── lib/
│   ├── handlers/              # Lambda handler package
│   │   ├── package.json       # Handler dependencies
│   │   ├── tsconfig.json      # Handler TypeScript config
│   │   ├── scripts/
│   │   │   ├── gen-import-schema.ts  # Generates code to import/consume downloaded schemas
│   │   │   └── gen-export-schemas.ts # Generates schemas to export/publish for dependents
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
- **Build sequence**: Root deps → Schema Download (CDK) → Code Generation (Handler) → Handler Build → Service Build
 - **Docs in code**: Provide Markdown paths via code — `serviceOverviewMD`, `serviceContextMD` on the Build; `enverContextMD` on each Enver instance. No MD generation required; add unit tests to validate existence.

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

Build class template (concise buildId & repo assignment):
```ts
export class <ServiceName>Build extends OdmdBuild<<ServiceName>Enver> {
  constructor(scope: OndemandContracts<any>) {
    // Prefer a short, stable buildId (often the service name) and pick the mapped repo
    super(scope, '<service-name>', scope.githubRepos.<serviceRepo>);
  }
  protected initializeEnvers(): void {
    // ... populate this._envers with mock/dev/main in canonical order
  }
}
```

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

#### Hard Constraints (enforced at construction / validation time)

These rules are enforced by the platform and will `throw` if violated; there are no opt-outs. Knowing them up front will save you from surprise failures during `tsc` / `odmdValidate()`.

1. **A build cannot consume from itself.** Constructing an `OdmdCrossRefConsumer` whose producer belongs to the same `OdmdBuild` as the consumer throws `consuming from same build is ILLEGAL!`. Cross-refs exist to model cross-service edges; intra-service coupling should be plain TypeScript, not a producer/consumer pair.

2. **ContractsLib envers cannot be consumers.** The `__contracts` build has producers only (e.g., `contractsLibLatest`). Any attempt to construct an `OdmdCrossRefConsumer` inside a `ContractsLib` enver throws `OdmdBuildOdmdContracts should not consume anything!`. This prevents circular platform dependencies — the legislature cannot depend on the services whose laws it writes.

3. **Cross-region consumers are forbidden.** A consumer's enver and its producer's enver must share `targetAWSRegion`. `odmdValidate()` rejects any graph with a consumer pointing at a producer in a different region. Cross-region communication is modeled as distinct producers in each region, not as a single producer consumed from elsewhere.

4. **Container-image (`OdmdEnverCtnImg`) envers cannot be consumers.** Image-build envers are producer-only by design (they export an ECR image reference); they have no runtime that could consume upstream values.

5. **Every build and enver must have doc paths that resolve.** `odmdValidate()` fails if `serviceOverviewMD`, `serviceContextMD`, or `enverContextMD` point to files that don't exist on disk. The platform treats docs-in-code as part of the contract.

### **Platform Service Integration**
- **Built-in Services**:
    - `contractsLib` (code: `__contracts`) - **MANDATORY** - ContractsLib repository deployment itself
    - `__user-auth` - **OPTIONAL** - Authentication service (External Auth Provider → AWS IAM)
    - `__networking` - **OPTIONAL** - Shared VPC, TGW, networking infrastructure
    - `_default-vpc-rds` - Standard database infrastructure templates
    - `_default-kube-eks` - Default Kubernetes cluster templates
#### Hosted Zone and DNS Integration
To facilitate service discovery, TLS termination, and human-readable endpoints, the platform provisions a Route53 Hosted Zone per target environment according to your organization configuration.

- **Configuration**: Hosted Zone access is exposed via the Enver configuration as a typed object: `this.enver.hostedZone?: { zoneId: string; zoneName: string }`.

- **Subdomain Structure**: Services can create predictable DNS records. A standard subdomain format is:
  `<rev>.<build-id>.<central-subdomain>` where `<rev>` originates from the enver's revision (branch/tag). Do not hardcode revision labels into resource names — derive them.

- **Usage Example**: Construct a domain name and create Route53 records (e.g., an 'A' record for ALB or CNAME for CloudFront). Obtain TLS certificates via ACM for the chosen domain.

#### Platform Console Webapp (User Auth Web UI)
- Purpose: Lightweight web console that connects to the OndemandEnv platform for authentication and visualization, consuming platform-published config.
- Location: `<user-auth>/webui` (Vite app). Entry: `<user-auth>/webui/src/main.ts`.
- Hosting: `<user-auth>/lib/web-hosting-stack.ts` provisions S3 + CloudFront with Route53 alias `web.<zone>`.
- Deployment: `<user-auth>/lib/web-ui-stack.ts` uploads `webui/dist` to S3 and writes runtime configuration files:
  - `config.json` (global) with auth and environment details
  - `config_region/<region>.json` (per-region) with visualization data and AppSync GraphQL URL
- Orchestration: `<user-auth>/bin/user-pool.ts` wires `UserPoolStack`, `WebHostingStack`, and `WebUiStack`, then calls `buildWebUiAndDeploy()`.
- Dependencies: Reads values from SSM Parameter Store and S3 via an assumed central role; AppSync endpoint and `/odmd-share` parameters must exist for full functionality.

## Service Constellations

### What a constellation is

A **constellation** is the subgraph of envers reachable by following `OdmdCrossRefProducer`/`OdmdCrossRefConsumer` edges from any starting enver. Constellations are **emergent**: they come into existence when ContractsLib wiring is enacted, not when anything is declared. They have no names, no registry, no enumeration.

"Mock constellation" is informal shorthand for *the constellation rooted at a mock-revision enver*. It is not a class, type, constant, directory, or stack-name token. Do not encode the word `mock`/`dev`/`main` in stack IDs, file paths, or resource names — those labels belong to the enver's `SRC_Rev_REF`, not to the constellation.

### How constellations form

1. Each service declares one or more envers in ContractsLib (commonly `mock`, `dev`, `main`).
2. Each enver declares producers and consumers.
3. ContractsLib wires consumers to specific upstream producers (typically same-revision → same-revision, e.g., a `dev` consumer wires to a `dev` producer).
4. The transitive closure of those edges *is* a constellation. Multiple constellations coexist in the same AWS accounts, distinguished only by their `SRC_Rev_REF`.

Because constellations are emergent, a service can participate in many of them with different upstream versions per constellation — the graph tells you what runs together.

### Rules

- **Revision labels ≠ constellation names.** Treat `mock`/`dev`/`main` as enver labels. The constellation is whatever wiring connects them.
- **No forward references.** A `mock` enver never consumes a `dev` or `main` enver; a `dev` enver never consumes a `main` enver. Canonical progression: mock → dev → main.
- **Account-agnostic.** Constellations are not tied to AWS accounts. Revision→account mapping is a deployment-time concern configured per organization, not a property of the graph.
- **Stable addresses at Layer 1 (ContractsLib); artifacts at Layer 2 (services).** ContractsLib declares producer/consumer identities; services publish schemas/values at deploy time.
- **ContractsLib cannot consume.** The `__contracts` build has producers only (e.g., `contractsLibLatest`). Enforced at runtime: constructing an `OdmdCrossRefConsumer` inside a ContractsLib enver throws.

### Platform vs. Application envers

- **Platform envers** (`__contracts` mandatory; `__user-auth`, `__networking` optional) typically expose a single enver that every application enver consumes, regardless of which constellation the consumer belongs to. One identity provider, one networking layer, shared across all constellations.
- **Application envers** participate per-revision. A service's `mock`, `dev`, and `main` envers belong to different constellations and evolve independently.

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

After implementing the schema workflow, validate inter-service contracts via BDD against the mock-rooted constellation (i.e., the subgraph where every enver has `SRC_Rev_REF('b', 'mock')`):

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

#### Schema artifact kinds (HTTP and async)

- The `schema-url` child supports multiple artifact kinds. Pick what fits the interface:
  - **OpenAPI 3.1 (HTTP RPC)**: For REST-style APIs; includes `paths` and `components.schemas`.
  - **AsyncAPI 2.x (Async events/bus/pub-sub)**: For topics/queues/streams; includes `channels`, `messages`, and payload schemas.
  - **ODMD Bundle (mixed)**: A small JSON envelope that references multiple artifacts (e.g., `{ http: <openapi-url>, events: <asyncapi-url> }`) while keeping a single `schema-url` address.

Consumers must detect the artifact kind via a single top-level discriminator `odmdKind: 'openapi'|'asyncapi'|'bundle'`. If `odmdKind` is `openapi` or `asyncapi`, the corresponding native field must be present and consistent.

#### OpenAPI 3.1 single-artifact pattern (recommended for multi-path endpoints)

- Purpose: Share full route information (HTTP methods and path templates) together with request/response schemas using a single artifact. No extra producers beyond the existing `schema-url` child are required.

- Producer (build-time): Before deployment, a handler-scope script (e.g., `lib/handlers/scripts/schema-print.ts`) is run to convert the service's Zod schemas into a final JSON Schema or OpenAPI 3.1 document. The main CDK stack then reads this generated artifact from disk and publishes it using `deploySchema(this, openApiJsonString, enver.<baseUrl>.children[0], artifactBucket)` during synthesis.

  Minimal structure of the uploaded artifact:
  ```json
  {
    "openapi": "3.1.0",
    "info": { "title": "<ServiceName>", "version": "<git-sha>" },
    "servers": [ { "url": "" } ],
    "paths": {
      "/resource/{id}": {
        "get": { "operationId": "getResource", "responses": {"200": {"content": {"application/json": {"schema": {"$ref": "#/components/schemas/GetResourceResponse"}}}}} },
        "put": { "operationId": "updateResource", "requestBody": {"content": {"application/json": {"schema": {"$ref": "#/components/schemas/UpdateResourceRequest"}}}}, "responses": {"200": {"content": {"application/json": {"schema": {"$ref": "#/components/schemas/UpdateResourceResponse"}}}}} }
      }
    },
    "components": {
      "schemas": {
        "GetResourceResponse": {"type": "object", "properties": {"id": {"type": "string"}}},
        "UpdateResourceRequest": {"type": "object", "properties": {"id": {"type": "string"}}},
        "UpdateResourceResponse": {"type": "object", "properties": {"ok": {"type": "boolean"}}}
      }
    }
  }
  ```

  Notes:
  - Generate `components.schemas` from Zod models via `zod-to-json-schema` (or `zod-openapi`), then reference them from operations under `paths`.
  - Keep `servers[0].url` empty; consumers derive the runtime base URL from the contracts system and concatenate path templates.

- Consumer (build/codegen-time): Enhance your type generation step to recognize OpenAPI artifacts.
  - If the artifact has an `openapi` property, then:
    1) Generate runtime validation/types from `components.schemas` (unchanged).
    2) Generate a typed `routes.ts` with helpers for each `operationId`:
       ```ts
       export function buildUrl(baseUrl: string, template: string, params: Record<string, string>): string {
         return baseUrl.replace(/\/$/, "") + template.replace(/\{(.*?)\}/g, (_, k) => encodeURIComponent(params[k] ?? ""));
       }
       export const routes = {
         getResource: (baseUrl: string, p: { id: string }) => ({ method: 'GET' as const, url: buildUrl(baseUrl, '/resource/{id}', p) }),
         updateResource: (baseUrl: string, p: { id: string }) => ({ method: 'PUT' as const, url: buildUrl(baseUrl, '/resource/{id}', p) })
       };
       ```
    3) Optionally generate an API client from OAS (`openapi-typescript`, `openapi-zod-client`).
    4) For strong typing while assembling OAS documents in code, prefer `openapi3-ts` (OAS 3.1). Example:
       ```ts
       import type { OpenAPIObject, SchemaObject, OperationObject } from 'openapi3-ts';
       const schemas: Record<string, SchemaObject> = { MyRequest: { type: 'object', properties: { id: { type: 'string' } } } };
       const op = (id: string, req: string, res: string): OperationObject => ({
         operationId: id,
         requestBody: { required: true, content: { 'application/json': { schema: { $ref: req } } } },
         responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: res } } } } }
       });
       const doc: OpenAPIObject = { openapi: '3.1.0', info: { title: 'Svc', version: 'dev' }, servers: [{ url: '' }], paths: { '/auth/login': { post: op('authLogin', '#/components/schemas/MyRequest', '#/components/schemas/MyResponse') } }, components: { schemas } };
       ```

- BDD and web client usage:
  - Step Functions BDD: Build request URLs with `routes.<op>(baseUrl, params).url` and the generated HTTP method.
  - Playwright/Web client: Use the same `routes.ts` helpers so UI tests hit the exact documented paths.

This keeps path semantics inside the single schema artifact already published via S3 while preserving base URL discovery through the platform.

#### AsyncAPI 2.x artifact pattern (recommended for messaging)

- Purpose: Share pub/sub channel names, bindings, and message schemas for queues, topics, or streams.

- Producer: Upload an AsyncAPI 2.x document as the `schema-url` artifact (or reference via ODMD Bundle). Example fields: `asyncapi`, `info`, `channels` (e.g., `"thing/events": { subscribe: { message: { $ref: '#/components/messages/ThingEvent' }}}`), `components.messages`, `components.schemas`.

- Consumer: At build/codegen time, detect `asyncapi`, generate payload types from `components.schemas`, and emit typed channel helpers (e.g., `publishThingEvent(channel, payload)`). For infrastructure-native BDD/state machines, derive queue/topic names from `channels` to validate event flows.

### Master Mock Data Lifecycle (generalized)

To guarantee cross-service consistency in Phase 0, manage a single authoritative mock dataset at the ContractsLib level and project it to services at generation time.

1) Authoritative source (Phase 0A conception)
- Location: ContractsLib implementation docs (e.g., `src/lib/repos/<system>/docs/_design/` or implementation package `.odmd-<impl>`)
- Content: Master set of IDs, tokens, keys, nonces, and per-use-case flows; covers both HTTP requests/responses and event payloads.
- Requirements:
  - Global identity constants (UUIDs, subdomains) are unique and reused across services.
  - Use-case completeness: for each UC step, include request, response, and/or message payloads that validate against schemas.
  - Transport-agnostic: data defined independent of HTTP/event mechanics; later mapped by service contexts.

2) Projection (Phase 0B decomposition)
- During service context generation (MOCK enver), extract service-specific slices into `src/lib/repos/[service]/docs/MOCK_ENVER_CONTEXT.md`:
  - List the UC steps involving this service; embed exact request/response/message examples.
  - Reference the same global IDs/tokens to preserve cross-service correlation.
  - Provide minimal route/channel mapping so BDD can locate endpoints/channels via artifacts.

3) Consumption in BDD
- Step Functions API BDD uses the projected examples to call HTTP endpoints (from OpenAPI) and/or assert events (from AsyncAPI).
- Web client BDD uses the same dataset for UI flows; both layers must use identical constants.

4) Validation
- Add a generator/check that verifies:
  - All embedded examples validate against the published artifacts (OpenAPI/AsyncAPI).
  - Cross-file consistency of shared IDs across all service contexts.
  - UC coverage: every master UC step has a corresponding service projection where relevant.

#### Producer structure (child of base URL)

- Bind schema to its service endpoint by publishing it as a child of the base URL producer:
  - Example: `myApiBaseUrl` → children: `[ { pathPart: 'schema-url', s3artifact: true } ]`
- Publishing
  - In the app stack: `deploySchema(this, jsonSchemaString, myEnver.myApiBaseUrl.children[0], artifactBucket)`
- Consumption
  - Downstream build step: Use `SchemaTypeLoader` to download upstream JSON schemas and convert to Zod types
  - Note: If the artifact is OpenAPI 3.1 (has `openapi`), use `components.schemas` for types and generate typed route helpers from `paths` (see OpenAPI single-artifact pattern above).

#### Consumer structure (separate consumers for base URL and schema)

- For each upstream service, declare two consumers:
  - Base URL: `this.<service>ApiBaseUrl = new OdmdCrossRefConsumer(this, '<service>ApiBaseUrl', <service>Api)`
  - Schema URL: `this.<service>ApiSchemaUrl = new OdmdCrossRefConsumer(this, '<service>ApiSchemaUrl', <service>Api.children![0])` (child `pathPart: 'schema-url'`)
- This keeps transport (endpoint) and schema (artifact) independently consumable while remaining coupled under the same producer tree.

### Code generation in `.scripts/build.sh`

**See `lib/utils/ONDEMANDENV_PLATFORM_schema.md` for complete build process details.**

The platform build sequence for a consumer service follows a clear separation of concerns: downloading artifacts in the CDK scope and generating code in an isolated handler scope.

1.  **Root Service Dependencies**: `npm ci` installs the service's CDK dependencies.
2.  **Schema Download (CDK Scope)**: The consumer-side build script (e.g., `bin/download-gen-schemas.ts`) is executed. Its sole responsibility is to use `SchemaTypeLoader` to download upstream JSON schema artifacts from S3 into a staging directory (e.g., `lib/handlers/src/__generated__/`).
3.  **Code Generation (Handler Scope)**: The download script then invokes a dedicated generation script (e.g., `lib/handlers/scripts/gen-import-schema.ts`). This script:
    -   Takes the path to the downloaded JSON schema as an argument.
    -   Executes `json-schema-to-zod` to convert the JSON schema into a Zod TypeScript file.
    -   This isolates the code generation tooling and its dependencies within the handler's context, away from the CDK scope.
4.  **Handler Build**: `cd lib/handlers && npm ci && npm run build` installs handler-specific dependencies and compiles the handler code, including the newly generated types.
5.  **Service Build**: `npm run build` compiles the main CDK service stack, which can now reference the pre-built handler artifacts.

### Schema Script Naming Conventions

The platform uses consistent naming to indicate the **direction of data flow** and **purpose** of schema scripts:

**Script Names by Purpose:**

| Script | Location | Purpose | Data Flow |
|--------|----------|---------|-----------|
| `download-gen-schemas.ts` | `bin/` | Downloads schemas from dependencies AND generates local import types | **IMPORT** (consume) |
| `gen-import-schema.ts` | `lib/handlers/scripts/` | Generates code to import/use downloaded schemas | **IMPORT** (consume) |
| `gen-export-schemas.ts` | `lib/handlers/scripts/` | Generates schemas to export/publish for dependents | **EXPORT** (produce) |

**Key Principle**: Names reflect **INTENT** (import vs export), not implementation details (zod, json-schema, etc).

**NPM Scripts:**
```json
// Root package.json
{
  "scripts": {
    "OdmdService:download-gen-schemas": "tsx bin/download-gen-schemas.ts"
  }
}

// lib/handlers/package.json
{
  "scripts": {
    "gen-export-schemas": "ts-node scripts/gen-export-schemas.ts"
  }
}
```

**Benefits:**
- **Clarity**: Purpose immediately clear from name
- **Consistency**: All services follow same pattern
- **Maintainability**: Easy to find correct script
- **Direction**: "import" vs "export" shows data flow

### ContractsLib Enver Semantics
- The ContractsLib build is global across regions. In its Enver list, the first entry in `initializeEnvers()` is the canonical source of truth used by all regions.
- Any additional entries are placeholders representing other regions or deployment targets; they should not diverge in contract definitions.
- All constellations (mock-rooted, dev-rooted, main-rooted) consume the same canonical ContractsLib products. Revision→workspace mapping is configured per-organization; the ContractsLib semantics are identical across constellations.

### ContractsLib Strong Typing and Canonical Enver Pattern

Define ContractsLib with explicit, strongly-typed GitHub repos, AWS accounts, and hosted zone mappings, and model a single canonical enver as the source of truth:

```ts
// contracts-lib/src/lib/OndemandContractsX.ts
import { App } from 'aws-cdk-lib';
import {
  OndemandContracts,
  GithubRepo,
  GithubReposCentralView,
  AccountsCentralView,
  AccountToOdmdHostedZoneIdName,
  OdmdBuildContractsLib,
  OdmdEnverContractsLib,
  SRC_Rev_REF
} from '@ondemandenv.dev/contracts-lib-base';

export type GithubReposX = GithubReposCentralView & {
  identityService: GithubRepo;
  keyService: GithubRepo;
  anonymousService: GithubRepo;
  chainService: GithubRepo;
  jwksService: GithubRepo;
  certificateService: GithubRepo;
  webClient: GithubRepo;
};

export type AccountsX = AccountsCentralView & { workspace1: string };
export type AccountToHZIDX = AccountToOdmdHostedZoneIdName & {
  workspace1: [string, string];
};

export class OndemandContractsX extends OndemandContracts<AccountsX, GithubReposX, OdmdBuildContractsX> {
  constructor(app: App) { super(app, 'OndemandContractsX'); }

  private _accounts!: AccountsX;
  get accounts(): AccountsX { return this._accounts ??= { central: '111111111111', workspace0: '222222222222', workspace1: '333333333333' }; }

  get accountToOdmdHostedZone(): AccountToHZIDX { return { central: ['ZHOSTEDZONEID', 'example.com'], workspace0: ['ZWS0ZONEID', 'ws0.example.com'], workspace1: ['ZWS1ZONEID', 'ws1.example.com'] }; }

  private _github!: GithubReposX;
  get githubRepos(): GithubReposX { const ghAppInstallID = 12345678; return this._github ??= { githubAppId: '123456', __contracts: { owner: 'my-org', name: 'contracts-lib', ghAppInstallID }, __userAuth: { owner: 'my-org', name: 'user-auth', ghAppInstallID }, identityService: { owner: 'my-org', name: 'identity-service', ghAppInstallID }, keyService: { owner: 'my-org', name: 'key-service', ghAppInstallID }, anonymousService: { owner: 'my-org', name: 'anonymous-service', ghAppInstallID }, chainService: { owner: 'my-org', name: 'chain-service', ghAppInstallID }, jwksService: { owner: 'my-org', name: 'jwks-service', ghAppInstallID }, certificateService: { owner: 'my-org', name: 'certificate-service', ghAppInstallID }, webClient: { owner: 'my-org', name: 'web-client', ghAppInstallID } }; }
}

export class OdmdBuildContractsX extends OdmdBuildContractsLib<AccountsX, GithubReposX> {
  private _envers!: OdmdEnverContractsLib[];
  get envers(): OdmdEnverContractsLib[] { return this._envers; }
  get theOne(): OdmdEnverContractsLib { return this._envers[0]; }

  protected initializeEnvers(): void {
    this._envers = [
      new OdmdEnverContractsLib(this, this.contracts.accounts.workspace0, 'us-east-1', new SRC_Rev_REF('b', 'main')),
      new OdmdEnverContractsLib(this, this.contracts.accounts.workspace0, 'us-west-1', new SRC_Rev_REF('b', 'us-west-1'))
    ];
  }
}
```

Guidance:
- The canonical enver is `envers[0]` (or expose `theOne`), which defines the authoritative couplings/dependencies across all services. Additional entries are placeholders for other regions; the platform copies the canonical semantics cross-region.
- This strong typing forms a “contracts of contracts”: between GitHub repositories, AWS accounts/hosted zones, and the ContractsLib itself (its build class). It ensures 1:1 mappings and prevents drift.
- Consumers should pin `aws-cdk-lib`/`constructs` versions to those used by `@ondemandenv.dev/contracts-lib-base` and depend on the org ContractsLib package accordingly.

### Build initialization order and Enver wiring rules
- Instantiate all build classes first, then perform cross-build wiring. The typical flow in ContractsLib is:
  1) Construct all builds
  2) Each build populates its `_envers` strictly inside `initializeEnvers()`
  3) After all builds exist and their `_envers` are ready, wire cross-build couplings
- Do not perform any cross-build consumption or side effects in build constructors. Keep constructors side-effect-free; all Enver creation belongs in `initializeEnvers()` only.
- Build auto-registration: base class constructors already register builds with the ContractsLib; do not manually push builds into internal arrays (e.g., avoid `this._builds.push(...)` in your ContractsLib implementation).

#### Two valid wiring styles

The base library does not prescribe *where* cross-build wiring happens, as long as it happens after all builds exist. Two conventions are in common use; both compile, both validate, both are fine:

**Style A — Central `wireBuildCouplings()` hook on your `OndemandContracts` subclass.** Recommended when you have many services and want one obvious place to read the graph. This is a *method you define on your subclass* — the base class does not provide it and does not call it for you. Call it yourself at the end of your constructor (after `super()` and after all builds are instantiated).

```ts
export class MyOrgContracts extends OndemandContracts<Accounts, Repos, ContractsLib> {
  constructor(app: App) {
    super(app, 'MyOrgContracts');
    // ... builds constructed, initializeEnvers() ran
    this.wireBuildCouplings();
  }

  protected wireBuildCouplings(): void {
    const get = (arr: any[], v: string) => arr.find(e => e.targetRevision.value === v)!;
    const svcMock = get(this.myServiceBuild.envers, 'mock');
    const idMock  = get(this.identityBuild.envers, 'mock');
    svcMock.wireCoupling({ identityEnver: idMock /* , ...other upstream envers */ });
  }
}
```

Note: `wireCoupling({...upstreamEnvers})` is likewise a method *you* define on your enver classes. Inside it, construct the `OdmdCrossRefConsumer` instances using the upstream producers you received.

**Style B — Inline wiring inside enver constructors.** Simpler for small graphs. Since the consumer build depends on upstream builds already existing, make sure your `initializeBuilds()` constructs them in dependency order, then have the downstream enver pull the matching upstream enver off the scope when it constructs its consumers.

```ts
export class MyServiceEnver extends OdmdEnverCdk {
  readonly identityApiBaseUrl: OdmdCrossRefConsumer<MyServiceEnver, IdentityEnver>;

  constructor(owner: MyServiceBuild, acct: string, region: string, rev: SRC_Rev_REF) {
    super(owner, acct, region, rev);
    const identityBuild = owner.contracts.identityBuild;
    const identityEnver = identityBuild.envers.find(e => e.targetRevision.value === rev.value)!;
    this.identityApiBaseUrl = new OdmdCrossRefConsumer(this, 'identityApiBaseUrl', identityEnver.identityApiBaseUrl);
  }
}
```

Style A is easier to audit at scale (one grep shows the whole graph). Style B is easier to start with. Pick one and stick to it in your ContractsLib — mixing styles fragments the mental model.

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
    new OdmdShareOut(this,  new Map([
      [( my enver's OdmdCrossRefProducer1), value1],
      [( my enver's OdmdCrossRefProducer2), value2]
    ]));
  }
}
```

### CDK app initialization pattern (all services)

- Always depend on the organization ContractsLib package and pin the exact same `aws-cdk-lib` version as the ContractsLib.
- Initialize the ContractsLib in the CDK app, then resolve the target Enver selected by environment context.
- Derive stable stack IDs from `getRevStackNames()`; do not encode revision labels (mock/dev/main) in IDs.
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
- Enver selection is driven by its revision (branch/tag) and platform mapping; do not hardcode revision labels in stack/resource names. Which constellation an enver participates in is then emergent from its cross-ref wiring.
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
  - Wire consumers in `wireBuildCouplings()` alongside other services

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

### Web Client BDD Step Functions Stack (explicit)

- Purpose: Orchestrate end-to-end mock BDD flows by calling multiple application services using the master dataset; complements Playwright.
- File layout (web client repo):
  ```
  web-client/
  ├── infra/
  │   └── web-client-bdd-stack.ts     # Step Functions BDD stack for web client
  ├── vite/tests/test-data/constants.ts
  └── vite/tests/bdd/*.spec.ts         # Browser specs (optional at 0B)
  ```
- Inputs: Resolves `webClientUrl` and upstream service base URLs from contracts; loads master mock constants; reads OpenAPI/AsyncAPI-generated helpers for routes/channels.
- State machine: Sequential HTTP tasks (and optional assertions) that traverse UC flows (e.g., Identity → Key → Anonymous → Chain), asserting schema-valid responses.
- Outputs: Publishes `bddStateMachineArn` (and optional result URL) via `OdmdShareOut`.

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
  - Do not encode revision labels (dev/main/mock) in IDs.
  - Appending a stable suffix like `-bdd` for a secondary stack within the same enver is acceptable.

- Producers for discovery
  - Publish `bddStateMachineArn` (and optional `bddResultsUrl`) via `OdmdShareOut` so the platform and tools can StartExecution and read results.
- **GitHub Integration**: Automatic workflows generated for each Enver
- **Dependency Monitoring**: Platform monitors dependencies and determines whether to trigger deployment when any of an Enver's dependencies change
- **Cross-Account Resolution**: Platform handles IAM roles and resource access

## Multi-Account Architecture

### Guidance
- Enver and constellation semantics are account-agnostic. Organizations decide how revisions map to accounts/workspaces. The platform supports cross-account resolution via roles without prescribing fixed mappings.

### Rule: Do not encode revision labels in stack names
- Do NOT include `mock`/`dev`/`main` in CDK stack IDs, class names, or resource names.
- Enver identity is selected by `SRC_Rev_REF` (e.g., `b..mock`) and workspace mapping; constellation membership emerges from cross-ref wiring. Neither is expressed in names.
- Keep stack IDs stable per service; uniqueness and isolation come from enver context and `OdmdShare` wiring.

### Rule: CDK repos must depend on org ContractsLib and match CDK version
- Each service CDK repo must declare a dependency on the organization contracts library package (e.g., `@<org>/<contracts-lib-pkg>`).
- The `aws-cdk-lib` version in every service repo must be exactly the same as the version used in the contracts library to avoid type/runtime drift.
- When bumping `aws-cdk-lib` in the contracts library, bump the same version in all service repos in the same commit.

### ContractsLib package.json (Generalized)

Define your organization ContractsLib as a TypeScript CDK library that depends on `@ondemandenv.dev/contracts-lib-base` and pins `aws-cdk-lib` to the EXACT same version used by the base. Expose only built artifacts.

Key requirements:
- Depend on `@ondemandenv.dev/contracts-lib-base` (organization-agnostic platform base).
- Pin `aws-cdk-lib` and `constructs` to the same versions as the base package.
- Declare `aws-cdk-lib` and `constructs` in both `dependencies` and `peerDependencies` to force consumer alignment.
- Export `dist/index.js` and `dist/index.d.ts` only; keep sources out of the published package (except if you intentionally share `.odmd` docs).
- All consumer service repos must pin `aws-cdk-lib` to EXACTLY the same version as this ContractsLib.

Generalized example (replace placeholders):

```json
{
  "name": "@<org>/contracts-lib",
  "version": "0.1.0",
  "private": false,
  "license": "MIT",
  "type": "commonjs",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist/**", "README.md", "LICENSE", ".odmd"],
  "engines": { "node": ">=18" },
  "sideEffects": false,
  "scripts": {
    "clean": "tsc --build --clean",
    "build": "tsc --build",
    "watch": "tsc --build -w",
    "test": "jest --verbose",
    "prepare": "npm run build"
  },
  "dependencies": {
    "@ondemandenv.dev/contracts-lib-base": "<latest>",
    "aws-cdk-lib": "<cdk-version-from-base>",
    "constructs": "<constructs-version-from-base>"
  },
  "peerDependencies": {
    "aws-cdk-lib": "<cdk-version-from-base>",
    "constructs": "<constructs-version-from-base>"
  },
  "devDependencies": {
    "typescript": "~5.9.2",
    "ts-node": "^10.9.2",
    "@types/node": "^22.0.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.5"
  }
}
```

Notes:
- Source your `<cdk-version-from-base>` and `<constructs-version-from-base>` from the published `@ondemandenv.dev/contracts-lib-base` (prefer its `peerDependencies`).
- When upgrading `@ondemandenv.dev/contracts-lib-base`, update `aws-cdk-lib`/`constructs` here to match; then update ALL service repos in the same change.
- Consumers import via `import { MyOrgContracts } from '@<org>/contracts-lib'` and must pin `aws-cdk-lib` to the same version.

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

For the full lifecycle pattern — what belongs in each enver, deliverables and checkpoints per phase, and templates for the per-service `SERVICE_CONTEXT.md` / `MOCK_ENVER_CONTEXT.md` / `DEV_ENVER_CONTEXT.md` / `MAIN_ENVER_CONTEXT.md` — see:

- **[ENVER_BASED_SERVICE_CONTEXT_PATTERN.md](./ENVER_BASED_SERVICE_CONTEXT_PATTERN.md)** — the PHASES = ENVERS lifecycle, end to end.

Note: `SERVICE_PHASE_DEVELOPMENT_PATTERN.md` in this directory is a **bootstrap placeholder** (the default target of `OdmdBuild.serviceContextMD`), not a lifecycle reference. Adopters override it per-service.

## 🚀 **REVOLUTIONARY PLATFORM INSIGHT: PHASES = ENVERS**

The ultimate realization for ONDEMANDENV platform service development:

**Different development phases are actually DIFFERENT ENVERS:**
- **Phase 0** (Contract Verification) = `mock` enver
- **Phase 1** (MVP Development) = `dev` enver
- **Phase 2+** (Production) = `main` enver

The enver → AWS account mapping is an **organizational choice**, not part of the pattern. Some teams put every enver in one workspace account; others split mock off into an isolated workspace; others fan out per-phase. Declare the mapping in your `OndemandContracts` subclass's `accounts` field and keep the pattern above free of account specifics — that way it scales whether your org has 1 workspace or 10.

This collapses phase, environment, and revision onto a single axis with appropriate infrastructure, security, and objectives at each stage.

### Standard Service Phases

#### Phase 0: Contract Verification with Mock Data/Code using BDD Tests
**Enver**: `mock` only initially
**Focus**: Verify contracts, schema validation, and mocked data responses using dual BDD tests

**CRITICAL**: Phase 0 is for contract verification with MOCKED responses and BDD testing only. NO real business logic.

**Phase 0A: Contract Surface Layer**
- [ ] **CDK Stack Setup**: Basic service stack with HTTP API + Lambda
- [ ] **Contract Integration**: `OdmdShareOut` publishing service base URL, consuming upstream services
- [ ] **ContractsLib Declarations Location**: Define each service's `OdmdBuild` and `<ServiceName>Enver` inside the organization ContractsLib repo at `contracts-lib/src/lib/repos/<repo>/<Org>-<Service>.ts`. A single ContractsLib can host multiple builds; per-service repos do not define builds/envers.
- [ ] **Basic Endpoints**: Core API endpoints returning MOCKED responses only
- [ ] **Storage Layer**: S3/DynamoDB with proper encryption (SSE-KMS) - for schemas only
- [ ] **Event Integration**: SQS queues for mocked event publishing

Example (Phase 0A minimal contracts declarations, generic):

```ts
// contracts-lib/src/lib/repos/<repo>/<Org>-<Service>.ts
// Declare an endpoint producer with a schema child that stores an S3 artifact URL
export class <ServiceName>Enver extends OdmdEnverCdk {
  constructor(owner: OdmdBuild<ServiceName>, targetAWSAccountID: string, targetAWSRegion: string, targetRevision: SRC_Rev_REF){
      super(owner, targetAWSAccountID, targetAWSRegion )
      this.<service>ApiBaseUrl = new OdmdCrossRefProducer(this, '<service>ApiBaseUrl', {
        children: [{ pathPart: 'schema-url', s3artifact: true }]
      });
  }
    
  readonly <service>ApiBaseUrl: OdmdCrossRefProducer<<ServiceName>Enver>

  getRevStackNames(): Array<string> { return ['Odmd<ServiceName>']; }
}

// Build wires the envers (mock/dev/main shown conceptually).
// Account fields (workspace0/workspace1) are illustrative; match them to
// whatever your `OndemandContracts.accounts` exposes.
export class <ServiceName>Build extends OdmdBuild<<ServiceName>Enver> {
  protected initializeEnvers(): void {
    this._envers = [
      new <ServiceName>Enver(this, this.contracts.accounts.workspace1, 'us-east-1', new SRC_Rev_REF('b', 'mock')),
      new <ServiceName>Enver(this, this.contracts.accounts.workspace0, 'us-east-1', new SRC_Rev_REF('b', 'dev')),
      new <ServiceName>Enver(this, this.contracts.accounts.workspace0, 'us-east-1', new SRC_Rev_REF('b', 'main'))
    ];
  }
}

// In the service app stack (producer): publish base URL and deploy the schema artifact under the child
// props.enver is <ServiceName>Enver; this.api is your HttpApi
new OdmdShareOut(this, new Map([
  [props.enver.<service>ApiBaseUrl, this.api.apiEndpoint]
]));

await deploySchema(this, openApiOrAsyncApiJsonString, props.enver.<service>ApiBaseUrl.children[0], artifactBucket);

// In a consumer (another service): declare consumers for base URL and its schema child
// identity example shown; generalize by replacing names accordingly
this.identityApiBaseUrl = new OdmdCrossRefConsumer(this, 'identityApiBaseUrl', identityApi /* OdmdCrossRefProducer<OdmdEnverCdk> */);
if (identityApi.children && identityApi.children[0]) {
  this.identityApiSchemaUrl = new OdmdCrossRefConsumer(this, 'identityApiSchemaUrl', identityApi.children[0]);
}

// In consumer build/codegen: resolve the child and download the artifact (S3 path)
const schemaChild = upstreamEnver.<service>ApiBaseUrl.children[0];
const schemaUrl = schemaChild.getSharedValue(this); // s3://.../(openapi|asyncapi|bundle).json
// → feed schemaUrl to your SchemaTypeLoader/codegen

// Notes:
// - s3artifact: true makes the child value an S3 URL published by the producer and consumed by downstreams.
// - If HTTP, publish OpenAPI 3.1 (keep servers[0].url empty). Generate types from components.schemas and route helpers from paths/operationId.
// - If messaging, publish AsyncAPI 2.x. Generate payload types from components.schemas and channel helpers from channels.
// - You may publish an ODMD Bundle that references both HTTP and async artifacts while keeping a single schema-url child.
```

**Phase 0B: BDD Contract Verification**
- [ ] **Zod Schemas**: Complete request/response schemas in `lib/handlers/src/schemas/zod.ts`
- [ ] **Schema Deployment**: `deploySchema(this, schemaString, enver.<baseUrl>.children[0], artifactBucket)`
- [ ] **Schema Consumption**: Downloads upstream schemas via `json-schema-to-zod`
- [ ] **Mocked Handlers**: Lambda handlers returning schema-valid MOCKED responses
- [ ] **Schema Validation**: All requests validated against Zod schemas
- [ ] **BDD Test Integration**: Perfect alignment with web-client dual BDD (Step Functions + Playwright)
- [ ] **Build Integration**: `bin/download-gen-schemas.ts` with AWS_REGION checks

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
**Focus**: A fully working MVP with all core application features.

**Phase 1A: Core Domain Logic**
- [ ] **Domain Operations**: Implementation of the service's primary operations.
- [ ] **Cross-Service Integration**: Integration with essential upstream/downstream services.
- [ ] **Data Storage**: Core data persistence and retrieval logic.

**Phase 1B: Core Feature Implementation**
- [ ] **Feature Implementation**: Implementation of all primary features required for the MVP.
- [ ] **Business Logic**: Implementation of the main business logic.
- [ ] **Use Cases**: Handling of complex use cases and edge cases.

#### Phase 2: Production Ready
**Focus**: Add production-grade monitoring, alerting, analytics, operational interfaces, and robust testing.

**Phase 2A: Production Readiness**
- [ ] **Security**: Advanced security implementation for Authentication/Authorization.
- [ ] **Performance**: Performance optimization and tuning.
- [ ] **Observability**: Comprehensive monitoring, logging, and alerting.
- [ ] **Hardening**: Security hardening and vulnerability scanning.

**Phase 2B: Comprehensive Testing**
- [ ] **BDD Testing**: End-to-end BDD testing for all use cases.
- [ ] **Integration Testing**: Integration testing with all dependent services.
- [ ] **Performance Testing**: Load and performance testing.
- [ ] **Security Testing**: Security testing.

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

### Phase 0: Contract Verification (`mock` enver)
**Focus**: [Service-specific contract surface and BDD]
- [x] **Phase 0A**: [Service-specific contract surface tasks]
- [x] **Phase 0B**: [Service-specific BDD verification tasks]

### Phase 1: MVP (`dev` enver)
**Focus**: [Service-specific MVP focus]
- [ ] **Phase 1A**: [Service-specific Phase 1A tasks]
- [ ] **Phase 1B**: [Service-specific Phase 1B tasks]

**Key Checkpoints**:
```bash
# Service-specific validation commands
```

### Phase 2: Production Ready (`main` enver)
**Focus**: [Service-specific production focus]
- [ ] **Phase 2A**: [Service-specific Phase 2A tasks]
- [ ] **Phase 2B**: [Service-specific Phase 2B tasks]

### Phase 4: Advanced Features (FUTURE)
- [ ] **[Feature Category]**: [Specific planned features]

### Phase 5: Enterprise & Scale (FUTURE)
- [ ] **[Feature Category]**: [Specific roadmap features]

**Checkpoint Requirements**:
- All Phase 0–2 checkpoints must pass
- Performance baseline: [Service-specific metrics]
- Security audit: [Service-specific security requirements]
- Load testing: [Service-specific load requirements]
```

> Phase numbering note: the platform uses Phase 0 → 1 → 2 for the canonical mock → dev → main progression. Phase 3 is intentionally unused; Phase 4 and 5 are future/optional. If you see older docs referring to "Phase 3: Production Ready", treat it as an earlier numbering of what is now Phase 2.

### Platform Integration Requirements

#### Contract Integration Pattern
```typescript
export interface <ServiceName>Enver extends OdmdEnverCdk {
  // Upstream consumers (services this service depends on)
  upstreamServiceApiBaseUrl?: OdmdCrossRefConsumer<<ServiceName>Enver, <ProducerServiceEnver>>;
  
  // Producers (what this service provides)
  readonly serviceApiBaseUrl: OdmdCrossRefProducer<<ServiceName>Enver>;
  
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
  props.enver.serviceApiBaseUrl.children[0],
  artifactBucket
);

// Publish both base URL and schema URL
new OdmdShareOut(this, new Map([
  [props.enver.serviceApiBaseUrl, this.api.apiEndpoint]
]));
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
