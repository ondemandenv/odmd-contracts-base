# Enver-Based Service Lifecycle

> This document is the authoritative lifecycle guide for services on the ONDEMANDENV platform. It covers what each enver of a service is for, what to build in it, and how to verify it. Phases and envers are the same axis (PHASES = ENVERS), so they are documented together here rather than in separate files.
>
> Note: `.odmd/SERVICE_PHASE_DEVELOPMENT_PATTERN.md` still exists but is a **bootstrap placeholder** — the default target of `OdmdBuild.serviceContextMD` for adopters who have not yet authored their own service-level context. Read that file for what an adopter should do; read this file to understand the lifecycle pattern they should implement.

## Why One Axis

The platform's core claim is **PHASES = ENVERS**: the lifecycle stages of a service (contract verification, MVP, production) are not separate from the platform's deployment targets — they are the same thing, named differently.

- **Phase 0** (Contract Verification) = `mock` enver
- **Phase 1** (MVP Development) = `dev` enver
- **Phase 2** (Production) = `main` enver
- **Phase 3** is intentionally unused.
- **Phase 4+** (advanced / enterprise) are additional envers your org may define if needed.

Canonical progression: `mock → dev → main`. No forward references: a `mock` enver cannot consume a `dev` producer; a `dev` enver cannot consume a `main` producer. Consumers wire within their revision, forming that revision's **constellation** (see `ONDEMANDENV_PLATFORM.md` for the strict definition).

> Phase status gating
> - Phase 0A is automatically ✅ DONE upon service context generation (the act of writing down the contract surface).
> - All other phases require explicit user confirmation before being marked ✅ COMPLETE.

## Docs-in-Code

Every service's ContractsLib declarations carry Markdown paths that the platform validates:

- **Build-level** (`OdmdBuild`):
  - `serviceOverviewMD` — intent, domain boundaries, public interfaces (names only, not types).
  - `serviceContextMD` — implementation specs shared across all envers of this service.
- **Enver-level** (`OdmdEnver` instance):
  - `enverContextMD` — enver-specific deltas (mock/dev/main differences, BDD focus, DNS specifics).

```ts
export class OdmdBuildIdentity extends OdmdBuild<OdmdEnverIdentity> {
  readonly serviceOverviewMD = 'src/lib/repos/identity/docs/SERVICE_OVERVIEW.md';
  readonly serviceContextMD  = 'src/lib/repos/identity/docs/SERVICE_CONTEXT.md';
}

export class OdmdEnverIdentity extends OdmdEnverCdk {
  readonly enverContextMD =
    `src/lib/repos/identity/docs/${this.targetRevision.value.toUpperCase()}_ENVER_CONTEXT.md`;
}
```

`odmdValidate()` fails if any of these paths don't resolve on disk, so docs-in-code is part of the contract, not an afterthought. Overriding the defaults matters: if you leave them, they point at the generic platform docs shipped with this package, not your service.

## Phase-to-Enver Mapping

```typescript
// In your service's OdmdBuild.initializeEnvers().
// Account targets (workspace fields) are organization-specific.
protected initializeEnvers(): void {
  this._envers = [
    // Canonical progression: mock → dev → main.
    new MyServiceEnver(this, this.contracts.accounts.<mockWorkspace>, 'us-east-1',
      new SRC_Rev_REF('b', 'mock')),
    new MyServiceEnver(this, this.contracts.accounts.<devWorkspace>, 'us-east-1',
      new SRC_Rev_REF('b', 'dev')),
    new MyServiceEnver(this, this.contracts.accounts.<mainWorkspace>, 'us-east-1',
      new SRC_Rev_REF('b', 'main'))
  ];
}
```

| Phase | Enver | Typical workspace | Status on first generation |
|-------|-------|-------------------|-----------------------------|
| 0A    | `mock` | isolated          | ✅ DONE (auto)               |
| 0B    | `mock` | isolated          | 🟠 IN_PROGRESS ⚠ USER CONFIRM |
| 1A    | `dev`  | development       | 🟡 PLANNED ⚠ USER CONFIRM   |
| 1B    | `dev`  | development       | 🟡 PLANNED ⚠ USER CONFIRM   |
| 2A/2B | `main` | production        | 🟡 PLANNED ⚠ USER CONFIRM   |

Enver → account mapping is organizational; the enver **identity** (`SRC_Rev_REF`) is what the platform cares about.

---

## `mock` enver (Phase 0): Contract Verification

**Focus**: verify contracts, schema validation, and mocked responses using dual BDD (Step Functions + Playwright). **No business logic.**

### Phase 0A: Contract Surface Layer

**Objective**: establish the contract surface with mock infrastructure.

**Deliverables**:
- **CDK stack**: basic HTTP API + Lambda handlers.
- **Domain and TLS**: registered domain, ACM certificate, HTTPS custom endpoint.
- **Contract integration**: `OdmdShareOut` publishing the service's base URL; consumers declared for upstream services.
- **Endpoints**: core endpoints returning schema-compliant **mocked** responses.
- **Storage**: S3 / DynamoDB with SSE-KMS (for schemas and mock data only).
- **Event integration**: SQS queues for mock event publication.
- **Master mock dataset (conception)**: authored at ContractsLib implementation level (shared IDs, tokens, per-use-case flows) to be projected into this service in 0B.

**Checkpoint**:
```bash
cd services/<service-name>
npm run Odmd<ServiceName>:cdk:ls --silent
# Expected: Odmd<ServiceName>

aws cloudformation describe-stacks --stack-name Odmd<ServiceName> \
  --query 'Stacks[0].Outputs[?OutputKey==`<serviceApiBaseUrl>`].OutputValue' --output text
# Expected: valid endpoint URL

curl -X POST https://<service>-api.<domain>/<endpoint> \
  -H "Content-Type: application/json" -d '{<test-payload>}'
# Expected: mocked response with the right schema shape
```

### Phase 0B: BDD Contract Verification

**Objective**: verify the contract end-to-end through dual-level BDD against mocked responses.

**Deliverables**:
- **Zod schemas**: complete request/response schemas in `lib/handlers/src/schemas/zod.ts`.
- **Schema deployment**: `deploySchema(this, schemaString, enver.<baseUrl>.children[0], artifactBucket)`.
- **Schema consumption**: downloads upstream schemas in `bin/download-gen-schemas.ts` and converts to Zod via `json-schema-to-zod`.
- **Mocked handlers**: Lambda handlers returning schema-valid mocked responses using the master mock data.
- **Schema validation**: all requests validated against Zod.
- **Contract artifact** (pick one):
  - **OpenAPI 3.1** for HTTP endpoints (supports multi-path).
  - **AsyncAPI 2.x** for messaging channels / messages.
  - **ODMD Bundle** referencing both.
  Keep OpenAPI `servers[0].url` empty — consumers use the platform-resolved base URL.
- **BDD integration**: aligned with web-client dual BDD (Step Functions + Playwright).
- **Service mock projection**: decompose the master mock dataset into a service-specific slice inside `src/lib/repos/[service]/docs/MOCK_ENVER_CONTEXT.md`, covering every relevant UC step with concrete request / response / message examples validated against the artifact.

**Checkpoint**:
```bash
npm run Odmd<ServiceName>:gen-export-schemas
# Should generate JSON schema without errors

aws s3 ls s3://odmd-<service>-schemas/<rev>/
# Should show: <serviceApiBaseUrl>-schema-url.json (OpenAPI / AsyncAPI / Bundle)

# Step Functions BDD
aws stepfunctions start-execution --state-machine-arn <BDD_ARN> --input '{...}'

# Playwright BDD
cd services/web-client/vite && npm run test:bdd

# Negative path
curl -X POST https://<service>-api.<domain>/<endpoint> \
  -H "Content-Type: application/json" -d '{invalid-payload}'
# Expected: 400 with Zod validation error

# Positive path
curl -X POST https://<service>-api.<domain>/<endpoint> \
  -H "Content-Type: application/json" -d '{valid-payload}'
# Expected: 200 with mocked response matching the response schema
```

### `MOCK_ENVER_CONTEXT.md` — content template

Each service's mock enver context lives at `src/lib/repos/<service>/docs/MOCK_ENVER_CONTEXT.md`. Minimum shape:

```markdown
# [Service] — Mock Enver Context

## 🎯 Mock Enver Deployment
**Target**: Phase 0 — contract verification via BDD. **No business logic.**

## 🚀 Focus
- ✅ Schema validation and mocked responses
- ✅ BDD integration and contract verification
- ❌ NO real business logic implementation

## 🏗️ Infrastructure
[Mock-specific CDK configuration]

## 🔐 DNS & TLS
- Use `enver.hostedZone?: { zoneId: string; zoneName: string }` to build domain names and obtain ACM certificates.
- Keep OpenAPI `servers[0].url` empty; clients derive the runtime base URL from contracts.

## 📋 Implementation Tasks
[Phase 0A and 0B tasks specific to this service]

## 🧪 Mock Data Specification
Source of truth: master mock dataset in ContractsLib design docs. This section embeds this service's slice.

For each relevant UC step:
- Shared IDs/tokens from the master set (unchanged)
- Request / response / message examples validated against the published schema
- Minimal mapping to OpenAPI paths or AsyncAPI channels

## 📦 Contract Artifact
- Top-level discriminator: `odmdKind: 'openapi' | 'asyncapi' | 'bundle'`.
- For `openapi`, include `"openapi": "3.1.0"` and consistent `paths` / `components.schemas`.
- For `asyncapi`, include `"asyncapi": "2.6.0"` and consistent `channels` / `components.messages`.
- Consumer property naming for the schema child: `<service>ApiSchemaUrl` (e.g., `identityApiSchemaUrl`).
```

---

## `dev` enver (Phase 1): MVP

**Focus**: real business logic, real upstream/downstream integration. **All mock code removed.**

### Phase 1A: Core Domain Logic

**Objective**: implement the service's primary operations.

**Deliverables**:
- Implementation of the service's primary operations.
- Integration with essential upstream / downstream services (real calls, not mocks).
- Core data persistence and retrieval.

### Phase 1B: Core Feature Implementation

**Objective**: implement the MVP feature set.

**Deliverables**:
- All primary MVP features.
- Main business logic.
- Complex use cases and edge cases handled.
- Basic observability sufficient for dev debugging.

*(Production-grade AuthN/AuthZ, performance tuning, and hardening move to Phase 2.)*

### Mock-code elimination

**MANDATORY**: when moving code from `mock` to `dev`, **all mock code must be completely removed**. Mock handlers, mock data generators, mock responses, and any code path that returns hardcoded mock data must be eliminated from `dev` handlers. Schema validation stays; business logic replaces mock logic.

### Checkpoint

```bash
curl -X POST https://<service>-api-dev.<domain>/<endpoint> \
  -H "Authorization: Bearer <real-token>" -d '{<real-payload>}'
# Expected: real response from real business logic

aws sqs receive-message --queue-url <service-event-queue-url>
# Expected: real events, not canned mock payloads
```

### `DEV_ENVER_CONTEXT.md` — content template

```markdown
# [Service] — Dev Enver Context

## 🎯 Dev Enver Deployment
**Target**: Phase 1 — MVP with real business logic.
**Building on**: contract verification completed in `mock`.
**Transition**: from Phase 0 mocked responses to real operations.

## 🚀 Focus
- ✅ Real business logic only — no mock handlers, no canned responses
- ✅ Schema validation retained
- ✅ Integration with real upstream / downstream services
- ❌ NO production traffic

## 🏗️ Infrastructure
[Development-grade CDK configuration]

## 📋 Implementation Tasks
### Phase 1A: Core Domain Logic 🟡 PLANNED ⚠️ REQUIRES USER CONFIRMATION
- [ ] Primary operations
- [ ] Upstream / downstream integration
- [ ] Data persistence

### Phase 1B: Core Feature Implementation 🟡 PLANNED ⚠️ REQUIRES USER CONFIRMATION
- [ ] MVP features
- [ ] Main business logic
- [ ] Edge cases

## ⚙️ Real Business Logic & Use Case Flows
[Per-UC: source reference, flow, endpoint, schemas, storage action, events, Mermaid diagram]

## 📦 Contract Artifact
Keep OpenAPI / AsyncAPI / Bundle in sync with real behavior so consumers and tests derive accurate routes and channels. When authoring OAS in code, prefer `openapi3-ts` types for compile-time correctness.
```

---

## `main` enver (Phase 2): Production Ready

**Focus**: production-grade security, observability, scaling; end-to-end testing; hardening.

### Phase 2A: Production Readiness

**Deliverables**:
- Advanced AuthN / AuthZ, security hardening, vulnerability scanning.
- Performance optimization and tuning.
- Comprehensive monitoring, logging, alerting.
- Contract artifact kept in sync with real production behavior.

### Phase 2B: Comprehensive Testing

**Deliverables**:
- End-to-end BDD across all use cases.
- Integration tests with all dependent services.
- Load and performance tests to baseline.
- Security testing (penetration, audit).

### Checkpoint

```bash
curl -X POST https://<service>-api.<domain>/<endpoint> \
  -H "Content-Type: application/json" -H "Authorization: Bearer <prod-token>" \
  -d '{<payload>}'
# Expected: production response with observability signals
```

### `MAIN_ENVER_CONTEXT.md` — content template

```markdown
# [Service] — Main Enver Context

## 🎯 Main Enver Deployment
**Target**: Phase 2+ — production-ready and advanced features.
**Building on**: MVP from `dev`.
**Transition**: development-grade → enterprise-grade.

## 🚀 Focus
- ✅ Production security and monitoring
- ✅ Auto-scaling and high availability
- ✅ Real user traffic

## 🏗️ Infrastructure
[Enterprise-grade CDK configuration]

## 📋 Implementation Tasks
### Phase 2A: Production Readiness 🟡 PLANNED ⚠️ REQUIRES USER CONFIRMATION
- [ ] Security / AuthN / AuthZ
- [ ] Performance
- [ ] Observability
- [ ] Hardening

### Phase 2B: Comprehensive Testing 🟡 PLANNED ⚠️ REQUIRES USER CONFIRMATION
- [ ] E2E BDD
- [ ] Integration testing
- [ ] Load / performance testing
- [ ] Security testing

## ⚙️ Enterprise-Grade Enhancements
[Per-UC: production-specific security checks, replication, advanced analytics, high-throughput event processing]

## ✅ Checkpoint Validation
- Performance baseline: [SLOs]
- Security audit: [scan + manual review results]
- Load testing: [results against production-like environment]
```

---

## Future phases

Phase 4 (advanced service-specific capabilities) and Phase 5 (enterprise & scale) are optional. If your org needs them, define additional envers beyond `main` (tags or per-region branches) and follow the same pattern: declare the enver in ContractsLib, give it an `enverContextMD`, wire its consumers within its revision. There is no built-in template for these — shape them to what your organization actually needs rather than filling in scaffolding.

## Platform Rules (apply across all envers)

### Enver progression (no forward references)

```
mock  ──▶  dev  ──▶  main
 │          │          │
 │          │          └─ may reference `dev` and `mock` for "building on"
 │          └─ may reference `mock` for "transition from"
 └─ foundation; cannot reference later envers
```

### Enver isolation and constellation wiring

Cross-ref wiring is constrained by revision. Consumers of a given revision wire only to producers of the same revision; the resulting subgraph is that revision's constellation.

- **`main` envers**: strictly isolated — `main` consumers wire only to `main` producers (main-rooted constellation).
- **`dev` envers**: integration testing — `dev` consumers wire to `dev` producers (dev-rooted constellation). **No mock code.**
- **`mock` envers**: contract verification — `mock` consumers wire to `mock` producers (mock-rooted constellation), giving a stable isolated baseline.

### Enver merging rule

- **One-way progression**: never merge `dev` → `mock` or `main` → `dev` as a codepath. `mock` exists only for contract verification.
- **Dev ↔ main consistency**: forward merges `dev` → `main` for promotion; reverse merges `main` → `dev` for hotfixes when necessary.
- **Infrastructure differences only**: business logic should be identical between `dev` and `main`; the difference is infrastructure (scaling, monitoring, hardening).

### Build / enver location

- `OdmdBuild` and `OdmdEnver` definitions **must live in the organization ContractsLib**.
- Service repositories must not declare builds or enver classes — only stacks and runtime/handler code.

### Wiring rule

- Enver constructors create producers. Consumers may be constructed inside enver constructors (inline style) or inside a user-defined `wireCoupling()` method called later (centralized style).
- Cross-build wiring — any code reading a producer owned by *another* build to construct a consumer — must run **after all builds exist**, never inside a build constructor before `initializeEnvers()` has finished for every build.
- Two valid styles (see `ONDEMANDENV_PLATFORM.md` → "Two valid wiring styles"):
  - **Style A (centralized)**: a `wireBuildCouplings()` method on your `OndemandContracts` subclass that, after super-constructor returns, looks up envers per revision and calls a `wireCoupling()` method you define on each enver.
  - **Style B (inline)**: enver constructors themselves look up the matching upstream enver off the scope and construct `OdmdCrossRefConsumer` instances directly. Order builds carefully in `initializeBuilds()`.
- ContractsLib must not import service handler Zod or generated types. Validation and codegen happen in service repos and BDD stacks only.

### Context completeness

Each enver context must be **completely self-contained**: a developer (human or agent) working on a given enver should not need any other document to implement it. Cross-service consistency is maintained through the master mock dataset.

## Quality Gates (Phase Completion Criteria)

### Phase 0 — `mock` enver
- [ ] All Phase 0A checkpoints pass (contract surface deployed).
- [ ] All Phase 0B checkpoints pass (BDD against mocked responses).
- [ ] Schemas deployed and accessible via S3.
- [ ] Service participates in the mock-rooted constellation.

### Phase 1 — `dev` enver
- [ ] All Phase 0 requirements met.
- [ ] Phase 1A / 1B checkpoints pass.
- [ ] All mock code removed; real business logic in place.
- [ ] Cross-service integration working against real upstream / downstream envers.
- [ ] Events published correctly.

### Phase 2 — `main` enver
- [ ] All Phase 0–1 requirements met.
- [ ] Phase 2A / 2B checkpoints pass.
- [ ] Production-grade security, observability, hardening in place.
- [ ] End-to-end BDD passing.
- [ ] Performance and load testing meet baseline.

## Master Mock Dataset

All mock envers use the same master mock dataset to guarantee cross-service consistency.

```typescript
// Authored in ContractsLib implementation docs; projected per-service.
export const MASTER_MOCK_DATA = {
  ROOT_ENTITY_ID: "550e8400-e29b-41d4-a716-446655440001",
  USER_ID: "user_12345_system",
  // ... other shared constants

  [SERVICE]_MOCK_DATA: {
    // Service-specific slice derived from the master set.
  }
};
```

Each service's `MOCK_ENVER_CONTEXT.md` embeds the slice relevant to that service, with the shared IDs kept unchanged so that UC flows correlate end-to-end across services.

## Service Context File Layout

The authoritative service contexts live in the ContractsLib, versioned with it:

```
@org/contracts-lib/src/lib/repos/[service]/docs/
├── SERVICE_CONTEXT.md          # Navigation hub
├── SERVICE_OVERVIEW.md         # Enver-agnostic architecture
├── MOCK_ENVER_CONTEXT.md       # Phase 0
├── DEV_ENVER_CONTEXT.md        # Phase 1
└── MAIN_ENVER_CONTEXT.md       # Phase 2+
```

These are distributed automatically to consumers because they ship with the ContractsLib package. Do not duplicate them in service repos.

### `SERVICE_CONTEXT.md` — template

```markdown
# [Service Name] — Context Navigation

## Files
- **[SERVICE_OVERVIEW.md](./SERVICE_OVERVIEW.md)** — high-level architecture (enver-agnostic)
- **[MOCK_ENVER_CONTEXT.md](./MOCK_ENVER_CONTEXT.md)** — Phase 0 (contract verification)
- **[DEV_ENVER_CONTEXT.md](./DEV_ENVER_CONTEXT.md)** — Phase 1 (MVP)
- **[MAIN_ENVER_CONTEXT.md](./MAIN_ENVER_CONTEXT.md)** — Phase 2+ (production)

## Phase Status
| Phase | Enver | Status |
|---|---|---|
| 0A | `mock` | ✅ DONE (auto on generation) |
| 0B | `mock` | ⚠ REQUIRES USER CONFIRMATION |
| 1A / 1B | `dev` | ⚠ REQUIRES USER CONFIRMATION |
| 2A / 2B | `main` | ⚠ REQUIRES USER CONFIRMATION |
```

### `SERVICE_OVERVIEW.md` — template

```markdown
# [Service Name] — Overview

## 🎯 Mission
[1–2 paragraphs: what the service exists to do, which design philosophy it embodies.]

- **Repository**: `[service-repo-name]`
- **Build ID**: `OdmdBuild[ServiceName]`

## 🏗️ Architecture
[Components, domain boundaries; optional Mermaid.]

### Components
- **[Component 1]**: [e.g. AWS::ApiGatewayV2::Api]
- **[Component 2]**: [e.g. AWS::Lambda::Function]

### Storage Schema (`[SchemaName]`)
```json
{ "primary_key": "string", "attribute_1": "string" }
```

## 🔐 API (enver-agnostic)
- **`[METHOD] /[resource]`** — [purpose]

## 🔗 Contracts & Dependencies
- **Upstream**: `[Service]` — [reason]
- **Downstream**: `[Service]` — [reason]
```

## Contract Integration Pattern (reference)

Typical service stack wiring at the CDK level:

```typescript
export interface MyServiceEnver extends OdmdEnverCdk {
  // Upstream consumers (declared in ContractsLib)
  upstreamServiceApiBaseUrl?: OdmdCrossRefConsumer<MyServiceEnver, UpstreamEnver>;

  // Producers (this service's public surface)
  readonly serviceApiBaseUrl: OdmdCrossRefProducer<MyServiceEnver>;
}

export class MyServiceStack extends Stack {
  constructor(scope: Construct, id: string, props: { enver: MyServiceEnver } & StackProps) {
    super(scope, id, props);

    const api = new HttpApi(this, 'MyServiceApi');

    // Phase 0B: schema deployment
    const schemaString = readFileSync('lib/handlers/src/schemas/schema.json', 'utf8');
    await deploySchema(
      this,
      schemaString,
      props.enver.serviceApiBaseUrl.children[0],
      artifactBucket
    );

    // Contract publishing
    new OdmdShareOut(this, new Map([
      [props.enver.serviceApiBaseUrl, api.apiEndpoint]
    ]));
  }
}
```

## BDD Integration Pattern (reference)

Mock handlers align with the master mock dataset via shared constants:

```typescript
import { TEST_CONSTANTS } from './test-constants';

export const SERVICE_TEST_DATA = {
  ENTITY_ID: TEST_CONSTANTS.ROOT_ENTITY_ID,   // "550e8400-e29b-41d4-a716-446655440001"
  USER_ID:   TEST_CONSTANTS.USER_ID,
  AUTH_TOKEN: TEST_CONSTANTS.TEMP_TOKEN,       // "mock_temp_token_12345"
};

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  if (!event.body) return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request' }) };
  const req = JSON.parse(event.body);
  if (req.entity_id !== SERVICE_TEST_DATA.ENTITY_ID) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request' }) };
  }
  return {
    statusCode: 200,
    body: JSON.stringify({ entity_id: SERVICE_TEST_DATA.ENTITY_ID, result: 'success' })
  };
};
```

Both Step Functions BDD and Playwright BDD drive these handlers with the same master mock dataset; see `WEB_CLIENT_BDD_PATTERN.md` for the dual-layer BDD architecture.
