# Service Phase Development Pattern - Implementation Guide

**CRITICAL PLATFORM PATTERN**: Standardized phased development approach for all services on the ondemandenv.dev platform.

## 📋 Overview

This document provides the complete implementation pattern for service phase development that ensures:
- **Systematic Progress**: Clear milestones and checkpoints
- **Quality Assurance**: Validation at each phase
- **Cross-Service Consistency**: Standardized development approach
- **Platform Integration**: Proper contract and schema integration
- **BDD Alignment**: Perfect test data consistency across all services

## 🚀 Standard Phase Structure

> IMPORTANT — Phase Status Gating
> - Phase 0A is automatically ✅ DONE upon service context generation.
> - All other phases require explicit user confirmation before marking ✅ COMPLETE.
> - Canonical progression: mock → dev → main (no forward references).

### Phase Status Indicators
- ✅ **COMPLETE**: Phase fully implemented and validated **[USER CONFIRMED]**
- 🟡 **PLANNED**: Phase designed but not yet implemented
- 🔵 **ROADMAP**: Future phase on development roadmap
- 🟠 **IN_PROGRESS**: Phase currently being worked on
- ⚠️  **NEEDS_VALIDATION**: Phase implementation complete but requires user confirmation

### 🚨 **CRITICAL PLATFORM RULE: PHASE STATUS CONFIRMATION**

**NO PHASE STATUS SHALL BE MARKED AS ✅ COMPLETE WITHOUT EXPLICIT USER CONFIRMATION**

**EXCEPTION: Phase 0A is automatically ✅ DONE when service context is generated**

When generating or updating service contexts:
1. **PHASE 0A ONLY**: Automatically mark as ✅ DONE since context generation = Phase 0A completion
2. **ALL OTHER PHASES**: NEVER automatically mark as ✅ COMPLETE 
3. **ALWAYS** ask user to confirm Phase 0B+ status before marking complete
4. **DEFAULT** all services to Phase 0A ✅ DONE, Phase 0B 🟠 IN_PROGRESS
5. **REQUIRE** user validation for Phase 0B+ progression
6. **DOCUMENT** user confirmation date and details when marking phases complete

## 📋 Phase 0: Contract Verification with Mock Data/Code using BDD Tests

**CRITICAL**: Phase 0 is specifically for verifying contracts, schema validation, and mocked data responses using dual BDD tests. NO business logic implementation.

**OBJECTIVE**: Establish and verify service contracts through comprehensive BDD testing with mocked responses.

### Phase 0A: Contract Surface Layer
**Objective**: Establish service contracts with mocked infrastructure

#### Required Deliverables:
```markdown
- [x] **CDK Stack Setup**: Basic service stack with an HTTP API and Lambda handlers.
- [x] **Domain and TLS**: A registered domain name, a valid TLS certificate (e.g., from AWS Certificate Manager), and a TLS-enabled (HTTPS) custom endpoint for the API.
- [x] **Contract Integration**: `OdmdShareOut` publishing the service's custom base URL, and consuming any upstream services.
- [x] **Basic Endpoints**: Core API endpoints returning MOCKED, schema-compliant responses only.
- [x] **Storage Layer**: S3/DynamoDB with proper encryption (SSE-KMS) - for schemas and mock data only.
- [x] **Event Integration**: SQS queues for mocked event publishing.
- [x] **Master Mock Dataset (Conception)**: Authoritative dataset authored at ContractsLib implementation level (IDs/tokens/keys and per-UC flows) to be projected to services in 0B.
```

**CRITICAL**: All endpoints must return **MOCKED DATA ONLY** - no business logic implementation.

#### Checkpoint Validation Template:
```bash
cd services/<service-name>
npm run Odmd<ServiceName>:cdk:ls --silent
# Expected output: Odmd<ServiceName>

# Verify contract integration
aws cloudformation describe-stacks --stack-name Odmd<ServiceName> \
  --query 'Stacks[0].Outputs[?OutputKey==`<serviceApiBaseUrl>`].OutputValue' --output text
# Should return valid API endpoint URL

# Verify mocked endpoint responses
curl -X POST https://<service>-api.<domain>/<endpoint> \
  -H "Content-Type: application/json" \
  -d '{<test-payload>}'
# Should return MOCKED response with proper schema structure
```

### Phase 0B: BDD Contract Verification
**Objective**: Verify contracts through dual-level BDD testing with mocked data

#### Required Deliverables:
```markdown
- [x] **Zod Schemas**: Complete request/response schemas in `lib/handlers/src/schemas/zod.ts`
- [x] **Schema Deployment**: `deploySchema(this, schemaString, enver.<baseUrl>.children[0])`
- [x] **Schema Consumption**: Downloads upstream schemas via `json-schema-to-zod`
- [x] **Mocked Handlers**: Lambda handlers returning schema-valid MOCKED responses
- [x] **Schema Validation**: All requests validated against Zod schemas
- [x] **BDD Test Integration**: Perfect alignment with web-client dual BDD (Step Functions + Playwright)
- [x] **Build Integration**: `bin/gen-schemas.ts` with AWS_REGION checks
- [x] **Contract Artifact (pick one or bundle)**:
  - **OpenAPI 3.1** for HTTP endpoints (multi-path), or
  - **AsyncAPI 2.x** for messaging channels/messages, or
  - **ODMD Bundle** referencing both.
  Keep OAS `servers[0].url` empty; consumers use the platform-resolved base URL.
- [x] **Service Mock Projection**: Decompose the master mock dataset into service-specific mock cases in `src/lib/repos/[service]/docs/MOCK_ENVER_CONTEXT.md`, covering every relevant UC step with concrete request/response/message examples that validate against artifacts.
```

**CRITICAL**: Two-level BDD verification:
1. **Step Functions BDD**: API-level contract testing with HTTP invoke
2. **Playwright BDD**: GUI-level contract testing through web interface

#### Checkpoint Validation Template:
```bash
cd services/<service-name>
npm run Odmd<ServiceName>:generate:schemas
# Should generate valid JSON schema without errors

# Verify schema deployment
aws s3 ls s3://odmd-<service>-schemas/<rev>/
# Should show: <serviceApiBaseUrl>-schema-url.json (OpenAPI/AsyncAPI/Bundle)

# Verify BDD integration - Step Functions level
aws stepfunctions start-execution --state-machine-arn <BDD_ARN> --input '{...}'
# Should test service contracts via HTTP invoke

# Verify BDD integration - Playwright level  
cd services/web-client/vite && npm run test:bdd
# Should test service contracts via web GUI

# Verify schema validation with invalid request
curl -X POST https://<service>-api.<domain>/<endpoint> \
  -H "Content-Type: application/json" \
  -d '{invalid-schema-payload}'
# Should return 400 with Zod validation error

# Verify schema validation with valid request
curl -X POST https://<service>-api-mock.amazonaws.com/<endpoint> \
  -H "Content-Type: application/json" \
  -d '{valid-schema-payload}'
# Should return 200 with mocked response matching response schema
```

## 📋 Phase 1: MVP (Essential)
**Constellation**: managed by revision (branch/tag); do not encode names in IDs. Canonical progression is mock → dev → main; avoid forward references in docs and wiring.
**Focus**: Real business logic implementation (replacing Phase 0 mocked responses)

### Phase 1A: Core Domain Logic
**Objective**: Implement real service domain functionality (replacing mocked responses)

#### Required Deliverables:
```markdown
- [ ] **Domain Operations**: Complete implementation of service-specific operations
- [ ] **Cross-Service Integration**: Real integration with upstream/downstream services
- [ ] **Data Storage**: Actual data persistence and retrieval
- [ ] **Event Publishing**: Real event publishing for state changes
- [ ] **Error Handling**: Comprehensive error responses and recovery mechanisms
- [ ] **Contract Update**: Keep OpenAPI (HTTP) and/or AsyncAPI (events) artifacts in sync with real behavior (or update bundle references).
```

### Phase 1B: Advanced MVP Features
**Objective**: Production-ready MVP with security and monitoring

#### Required Deliverables:
```markdown
- [ ] **Authentication/Authorization**: Real security implementation
- [ ] **Performance Optimization**: Efficient data access and processing
- [ ] **Monitoring Integration**: CloudWatch metrics and logging
- [ ] **Security Hardening**: Data protection and secure communication
```

#### Checkpoint Validation Template:
```bash
# Verify real business logic implementation (not mocked)
curl -X POST https://<service>-api.<domain>/<endpoint> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <real-token>" \
  -d '{<real-payload>}'
# Should return REAL response with actual business logic processing

# Verify event publishing with real data
aws sqs receive-message --queue-url <service-event-queue-url>
# Should show real events after actual operations
```

## 📋 Phase 3: Production Ready

### Phase 3A: BDD Integration & Testing
**Objective**: Complete testing integration and production readiness

#### Required Deliverables:
```markdown
- [x] **Mock Data Enhancement**: BDD-aligned mock responses in handlers
- [x] **Use Case Flow Support**: Complete UC flows that involve this service
- [x] **Test Data Alignment**: Consistent UUIDs and tokens with web-client BDD
- [x] **Error Handling**: Proper HTTP status codes and error responses
- [x] **Schema Validation**: Request/response validation using Zod schemas
```

#### Checkpoint Validation Template:
```bash
# BDD integration validation with centralized test data
curl -X POST https://<service>-api-mock.amazonaws.com/<endpoint> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock_temp_token_12345" \
  -d '{
    "entity_id": "550e8400-e29b-41d4-a716-446655440001",
    "test_data": "<bdd-aligned-test-payload>"
  }'
# Should return BDD-expected response format with consistent UUIDs

# Verify error handling
curl -X POST https://<service>-api-mock.amazonaws.com/<endpoint> \
  -H "Content-Type: application/json" \
  -d '{invalid-payload}'
# Should return proper 400 error with Zod validation details
```

## 📋 Phase 4: Advanced Features (FUTURE)

### Objective: Service-specific advanced capabilities

#### Standard Categories:
```markdown
- [ ] **Domain-Specific Enhancements**: Advanced features for service domain
- [ ] **Performance Optimization**: Advanced caching, optimization
- [ ] **Advanced Security**: Enhanced security features
- [ ] **Analytics Integration**: Service-specific metrics and insights
```

## 📋 Phase 5: Enterprise & Scale (FUTURE)

### Objective: Enterprise features and global scale

#### Standard Categories:
```markdown
- [ ] **Multi-Region Support**: Global deployment capabilities
- [ ] **Enterprise Integration**: Corporate integration features
- [ ] **Compliance**: Regulatory compliance features
- [ ] **Advanced Analytics**: Business intelligence and reporting
```

## 🔧 Implementation Templates

### ENVER-Based Service Context Architecture - CRITICAL REQUIREMENTS

**🚀 REVOLUTIONARY INSIGHT: PHASES = ENVERS**

Every service repository **must** include **FIVE CONTEXT FILES** that decompose service development by enver:

```
src/lib/repos/[service]/docs/
├── SERVICE_CONTEXT.md          # Navigation hub with enver mapping
├── SERVICE_OVERVIEW.md         # High-level architecture (enver-agnostic)
├── MOCK_ENVER_CONTEXT.md      # Phase 0: Contract verification
├── DEV_ENVER_CONTEXT.md       # Phase 1: MVP development
└── MAIN_ENVER_CONTEXT.md      # Phase 2+: Production deployment
```

**🚨 ULTRA CRITICAL: ENVER CONTEXT COMPLETENESS REQUIREMENTS**

Each enver context **MUST BE COMPLETELY SELF-CONTAINED** for independent development:

1. **ALL EXTRACTED INFORMATION**: Must contain ALL relevant information extracted/projected from:
   - System design documents
   - Architecture specifications  
   - Cross-service integration requirements
   - Use case flows involving this service
   - Contract specifications and dependencies
   - Security and privacy requirements
   - DNS and infrastructure patterns

2. **INDEPENDENT DEVELOPMENT CAPABILITY**: A developer should be able to:
   - Understand the service's complete role in the system
   - Implement all required functionality
   - Integrate with all dependent services
   - Deploy and validate the service
   - **WITHOUT NEEDING TO REFERENCE ANY OTHER DOCUMENTS**

3. **CONSISTENT SYNCHRONIZATION**: Service contexts must be:
   - Updated whenever system design changes
   - Synchronized across all related services
   - Validated for consistency with platform patterns
   - Regenerated when dependencies change

This file acts as a self-contained, comprehensive guide for any developer or agent working on the service. It is generated by decomposing the high-level system design documents into a service-specific context with ALL necessary information included.

```markdown
# Service Context: [Service Name] (`[service-repo-name]`)

This document provides a complete, self-contained guide for developing and maintaining the [Service Name].

## 1. Service Goal & Overview

[A 1-2 paragraph summary of the service's purpose and its role in the overall system. What is its primary goal? What core philosophies from the system design does it embody?]

- **Core Philosophy**: "[A key design principle this service is responsible for.]"
- **Repository**: `[service-repo-name]`
- **Build ID**: `OdmdBuild[ServiceName]Kk`

## 2. Detailed Design

[This section should be decomposed from the main system design document.]

### Components
- **[Component 1]**: [Description of the component, e.g., AWS::ApiGatewayV2::Api]
- **[Component 2]**: [Description of the component, e.g., AWS::Lambda::Function]
- **[Component 3]**: [Description of the component, e.g., AWS::S3::Bucket]

### Storage Schema (`[SchemaName]`)
[A JSON block describing the data structure for this service's primary data store (e.g., a DynamoDB table item or an S3 object).]
```json
{
  "primary_key": "string",
  "attribute_1": "string",
  "attribute_2": "number"
}
```

## 3. Use Cases & Data Flows

[This section details every use case the service participates in, with a specific focus on the data contracts for each step.]

### Use Case: [Use Case Name]

#### [Step Name]
- **Flow**: `[Source] → [This Service]`
- **Action**: [A brief description of what happens in this step.]
- **Endpoint**: `[METHOD] /[resource]`
- **API Request Schema**:
  ```json
  {
    "request_field_1": "string",
    "request_field_2": "integer"
  }
  ```
- **API Response Schema**:
  ```json
  {
    "response_field_1": "string"
  }
  ```
- **Storage Action**: [Description of the Create, Read, Update, or Delete operation on the storage schema. E.g., "A new record is created in the S3 bucket."]
- **Event Emission**: [Optional: Describe any event emitted, e.g., "Emits a `ThingDone` event to an SQS queue."]

## 4. Security & Implementation Notes

[Include any critical security considerations, privacy requirements, or specific implementation details from the system design.]

- **[Security Topic 1]**: [Details]
- **[Implementation Note 1]**: [Details]

## 5. Contracts & Dependencies
- **Upstream Dependencies**:
    - `[Upstream Service 1]`: [Reason for dependency]
- **Downstream Consumers**:
    - `[Downstream Service 1]`: [Reason for dependency]
    - `Web Client`

## 6. Development & Validation
### Checkpoint Commands
- **List Constellations**: `npm run Odmd[ServiceName]:cdk:ls --silent`
- **Verify Mock Endpoint**: `curl -X [METHOD] https://<service>-api-mock.amazonaws.com/[resource] -d '{...}'`
- **Run BDD Tests**: `cd services/web-client/vite && npm run test:bdd`

## 🚀 Implementation Phases & Checkpoints

**CRITICAL**: Each service must follow the platform's phased development approach with explicit checkpoints.

### Phase 0: Contract Verification with Mock Data/Code using BDD Tests 🟠 IN_PROGRESS
**Constellation**: `mock` only initially
**Focus**: Contract verification, schema validation, and MOCKED responses with dual BDD testing

**CRITICAL**: Phase 0 focused on contract verification with MOCKED responses and BDD testing only.

#### Phase 0A: Contract Surface Layer ✅ DONE
- [x] **CDK Stack Setup**: [Service-specific CDK stack with HTTP API + Lambda]
- [x] **Contract Integration**: [Service-specific OdmdShareOut publishing and consuming]
- [x] **Basic Endpoints**: [List of core endpoints returning MOCKED responses only]
- [x] **Storage Layer**: [S3/DynamoDB for schemas only - no business data in Phase 0]
- [x] **Event Integration**: [SQS queues for mocked event publishing]

#### Phase 0B: BDD Contract Verification 🟠 IN_PROGRESS ⚠️ REQUIRES USER CONFIRMATION
- [ ] **Zod Schemas**: [Complete request/response schemas in lib/handlers/src/schemas/zod.ts]
- [ ] **Schema Deployment**: [deploySchema() implementation with S3 artifact publishing]
- [ ] **Schema Consumption**: [Upstream schema downloads via json-schema-to-zod]
- [ ] **🚀 COMPLETE MOCK DATA INTEGRATION**: [Service-specific mock data extracted from master data set]
- [ ] **Mocked Handlers**: [Lambda handlers returning schema-valid MOCKED responses using generated mock data]
- [ ] **Cross-Service Mock Consistency**: [Mock data correlates correctly with upstream/downstream services]
- [ ] **Use Case Mock Scenarios**: [Mock data supports all relevant use case flows]
- [ ] **Schema Validation**: [All requests validated against Zod schemas using mock data]
- [ ] **BDD Test Integration**: [Perfect alignment with web-client dual BDD testing using consistent mock data]
- [ ] **Build Integration**: [bin/gen-schemas.ts with AWS_REGION checks and mock data validation]

**🚨 CRITICAL: Phase 0B Mock Data Requirements:**
- **Master Data Consistency**: All mock data derived from master data set generated from user design
- **Cross-Service Correlation**: Mock responses must correlate with other services' mock data
- **Use Case Coverage**: Mock data must support testing of all relevant use case scenarios
- **Realistic Scenarios**: Mock data represents actual system usage patterns and edge cases

**Checkpoint Validation**:
```bash
# Service-specific validation commands
cd services/<service-name>
npm run Odmd<ServiceName>:cdk:ls --silent
# Expected: Odmd<ServiceName>--mock

# Verify BDD integration
aws stepfunctions start-execution --state-machine-arn <BDD_ARN> --input '{...}'
cd services/web-client/vite && npm run test:bdd
# Both should test service contracts successfully
```

### Phase 1: MVP (Essential) 🟡 PLANNED
**Constellation**: `mock` → `dev` → `main`
**Focus**: Real business logic implementation (replacing Phase 0 mocked responses)

#### Phase 1A: Core Domain Logic 🟡 PLANNED
- [ ] **Domain Operations**: [Real implementation replacing mocked responses]
- [ ] **Cross-Service Integration**: [Real integration with upstream/downstream services]
- [ ] **Data Storage**: [Actual data persistence and retrieval]
- [ ] **Event Publishing**: [Real event publishing for state changes]
- [ ] **Error Handling**: [Comprehensive error handling and recovery]

#### Phase 1B: Advanced MVP Features 🟡 PLANNED
- [ ] **Authentication/Authorization**: [Real security implementation]
- [ ] **Performance Optimization**: [Efficient data access and processing]
- [ ] **Monitoring Integration**: [CloudWatch metrics and logging]
- [ ] **Security Hardening**: [Data protection and secure communication]

**Checkpoint Validation**:
```bash
# Verify real business logic (not mocked)
curl -X POST https://<service>-api-dev.amazonaws.com/<endpoint> \
  -H "Authorization: Bearer <real-token>" \
  -d '{<real-payload>}'
# Should return REAL response with actual business logic processing
```

### Phase 2: Core Features 🟡 PLANNED
**Focus**: Real business logic implementation - [Service-specific domain functionality]

#### Phase 2A: [Service-specific Core Domain Logic] 🟡 PLANNED
- [ ] **[Core Business Feature 1]**: [Real implementation replacing mocked responses]
- [ ] **[Core Business Feature 2]**: [Cross-service integration implementation]
- [ ] **[Core Business Feature 3]**: [Domain-specific operations implementation]
- [ ] **[Storage Integration]**: [Real data storage and retrieval]
- [ ] **[Event Publishing]**: [Real event publishing for state changes]

#### Phase 2B: [Service-specific Advanced Features] 🟡 PLANNED
- [ ] **[Advanced Feature 1]**: [Performance optimization implementation]
- [ ] **[Advanced Feature 2]**: [Security hardening implementation]
- [ ] **[Monitoring Integration]**: [CloudWatch metrics and logging]
- [ ] **[Error Handling]**: [Comprehensive error handling and recovery]

**Checkpoint Validation**:
```bash
# Service-specific Phase 2 validation
curl -X POST https://<service>-api-mock.amazonaws.com/<endpoint> \
  -H "Content-Type: application/json" \
  -d '{<service-specific-test-payload>}'
# Expected: [Service-specific expected response]
```

### Phase 3: Production Ready 🟡 PLANNED
**Focus**: BDD integration, testing, and production readiness

#### Phase 3A: BDD Integration & Testing 🟡 PLANNED
- [ ] **Mock Data Enhancement**: [BDD alignment details]
- [ ] **UC Flow Support**: [Supported use case flows]
- [ ] **Test Data Alignment**: [Test data alignment specifics]
- [ ] **Error Handling**: [Error handling implementation]
- [ ] **Schema Validation**: [Schema validation details]

**Checkpoint Validation**:
```bash
# BDD integration validation
curl -X POST https://<service>-api-mock.amazonaws.com/<endpoint> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock_temp_token_12345" \
  -d '{
    "<entity_id>": "550e8400-e29b-41d4-a716-446655440001",
    "<service_specific_data>": {...}
  }'
# Expected: [BDD-expected response format]
```

### Phase 4: Advanced Features (FUTURE) 🟡 PLANNED
**Focus**: [Service-specific advanced features focus]

#### Phase 4A: [Service-specific Phase 4A name]
- [ ] **[Advanced Feature 1]**: [Feature description]
- [ ] **[Advanced Feature 2]**: [Feature description]
- [ ] **[Advanced Feature 3]**: [Feature description]

#### Phase 4B: [Service-specific Phase 4B name]
- [ ] **[Advanced Feature 1]**: [Feature description]
- [ ] **[Advanced Feature 2]**: [Feature description]

**Checkpoint Requirements**:
- All Phase 1-3 checkpoints must pass
- Performance baseline: [Service-specific metrics]
- Security audit: [Service-specific security requirements]
- Load testing: [Service-specific load requirements]

### Phase 5: Enterprise & Scale (FUTURE) 🔵 ROADMAP
**Focus**: [Service-specific enterprise focus]

#### Phase 5A: [Service-specific Phase 5A name]
- [ ] **[Enterprise Feature 1]**: [Feature description]
- [ ] **[Enterprise Feature 2]**: [Feature description]

#### Phase 5B: [Service-specific Phase 5B name]
- [ ] **[Enterprise Feature 1]**: [Feature description]
- [ ] **[Enterprise Feature 2]**: [Feature description]
```

### Contract Integration Pattern
```typescript
// services/<service-name>/lib/<service-name>-stack.ts
export interface <ServiceName>Enver extends OdmdEnverCdk {
  // Upstream consumers (services this service depends on)
  upstreamServiceApiBaseUrl?: OdmdCrossRefConsumer<<ServiceName>Enver, OdmdEnverCdk>;
  
  // Producers (what this service provides)
  readonly serviceApiBaseUrl: OdmdCrossRefProducer<OdmdEnverCdk>;
  
  // Environment metadata
  envId?: string;
}

export interface <ServiceName>StackProps extends StackProps {
  enver: <ServiceName>Enver;
}

export class <ServiceName>Stack extends Stack {
  constructor(scope: Construct, id: string, props: <ServiceName>StackProps) {
    super(scope, id, props);

    // Phase 1A: Basic infrastructure
    const api = new HttpApi(this, '<ServiceName>Api');
    const handler = new Function(this, '<ServiceName>Handler', {
      // Lambda configuration
    });

    // Phase 1B: Schema deployment
    const schemaString = readFileSync('lib/handlers/src/schemas/schema.json', 'utf8');
    const deployedSchema = await deploySchema(
      this, 
      schemaString, 
      props.enver.serviceApiBaseUrl.children[0]
    );

    // Contract publishing
    new OdmdShareOut(this, '<ServiceName>ApiBaseUrl', {
      enver: props.enver,
      producer: props.enver.serviceApiBaseUrl,
      value: api.apiEndpoint
    });
  }
}
```

### BDD Integration Pattern
```typescript
// services/<service-name>/lib/handlers/src/index.ts
import { TEST_CONSTANTS } from './test-constants';

export const SERVICE_TEST_DATA = {
  // Use consistent UUIDs across all services (from centralized constants)
  ENTITY_ID: TEST_CONSTANTS.ROOT_IDENTITY_ID, // "550e8400-e29b-41d4-a716-446655440001"
  USER_ID: TEST_CONSTANTS.USER_ID,
  
  // Use consistent tokens and signatures
  AUTH_TOKEN: TEST_CONSTANTS.TEMP_TOKEN, // "mock_temp_token_12345"
  AUTH_JWT: TEST_CONSTANTS.AUTH_JWT_TOKEN, // "mock_auth_jwt_token_for_testing"
  
  // Service-specific test data (must align with other services)
  SERVICE_SPECIFIC_DATA: {
    // Service-specific constants that align with centralized test data
  }
};

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  // Phase 3A: BDD-aligned mock responses
  if (event.body) {
    const req = JSON.parse(event.body);
    
    // Use centralized test constants for consistent responses
    if (req.entity_id === SERVICE_TEST_DATA.ENTITY_ID) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          // BDD-aligned response using centralized constants
          entity_id: SERVICE_TEST_DATA.ENTITY_ID,
          result: "success",
          // Service-specific response data
        })
      };
    }
  }
  
  // Standard error response
  return {
    statusCode: 400,
    body: JSON.stringify({ error: "Invalid request" })
  };
};
```

## 🎯 Quality Gates

### Phase Completion Criteria

#### Phase 1 Completion Requirements:
- [ ] All Phase 1A checkpoint validations pass
- [ ] All Phase 1B checkpoint validations pass
- [ ] Service deploys successfully across all constellations (mock, dev, main)
- [ ] Basic API endpoints return expected responses
- [ ] Schemas deploy and are accessible via S3

#### Phase 2 Completion Requirements:
- [ ] All Phase 1 requirements met
- [ ] Core domain functionality fully implemented
- [ ] Cross-service integration working
- [ ] Events published correctly
- [ ] Performance meets baseline requirements

#### Phase 3 Completion Requirements:
- [ ] All Phase 1-2 requirements met
- [ ] BDD integration complete and validated
- [ ] Test data perfectly aligned with centralized constants
- [ ] All use case flows supported
- [ ] Production readiness validated

## 🚀 Usage Instructions

### For New Services - SERVICE CONTEXT GENERATION REQUIREMENTS:

**🚨 CRITICAL: SERVICE CONTEXT MUST BE COMPLETELY SELF-CONTAINED**

1. **EXTRACT ALL RELEVANT INFORMATION** from source documents:
   - **System Design**: Extract ALL service-specific requirements, responsibilities, boundaries
   - **Detailed Design**: ⚠️ **CRITICAL - ASK USER IF NOT PROVIDED**: Detailed service design specifications
   - **Use Cases**: Include ALL use case flows that involve this service with complete data flows
   - **Cross-Service Integration**: Document ALL upstream/downstream dependencies with exact contracts
   - **Security & Privacy**: Include ALL relevant security requirements and privacy constraints  
   - **DNS & Infrastructure**: Include ALL hosting, domain, and infrastructure patterns
   - **Test Data & Constants**: Include ALL BDD test data and validation requirements

   **🚨 MANDATORY: IF DETAILED DESIGN IS MISSING OR INCOMPLETE - ASK USER TO PROVIDE:**
   - Complete service specifications
   - Detailed endpoint definitions  
   - Data schemas and validation rules
   - Error handling requirements
   - Performance and scalability requirements
   - Integration patterns and dependencies
   - **🚨 CRITICAL: COMPLETE MOCK DATA DESIGN SPECIFICATION**

   **🚀 ULTRA CRITICAL: COMPLETE MOCK DATA SET GENERATION REQUIREMENT**

   The user-provided design MUST be comprehensive enough to generate a COMPLETE, CONSISTENT mock data set that:

   **1. CROSS-SERVICE DATA CONSISTENCY:**
   - **Service A**: Mock domain-specific entities, tokens, session data, user IDs
   - **Service B**: Mock cryptographic materials, signatures, key data, nonces
   - **Service C**: Mock privacy-preserving entities, encrypted data, metadata
   - **Service D**: Mock relationship data, references, operations
   - **Service E**: Mock public distribution data, key sets, domain-specific keys
   - **Service F**: Mock credential data, certificates, validation chains
   - **Web Client**: Mock UI state, test scenarios, user interactions

   **2. USE CASE DATA FLOWS:**
   - **UC1**: Complete authentication → key management → entity creation flow data
   - **UC2**: Entity creation → data management → relationship establishment flow data  
   - **UC3**: Relationship management → privacy operations → protection flow data
   - **UC4**: Credential generation → public distribution → verification flow data
   - **UC5**: Multi-level entities → complex operations → advanced features flow data
   - **UC6**: Cross-service integration → end-to-end validation flow data

   **3. PHASE 0B BDD TEST DATA:**
   - **Consistent UUIDs/IDs**: Same entity IDs across all services for correlation
   - **Realistic Data Scenarios**: Mock data that represents real-world usage patterns
   - **Error Condition Data**: Mock data for testing error handling and edge cases
   - **Validation Test Cases**: Mock data for schema validation and contract testing
   - **Cross-Service Correlation**: Mock data that flows correctly between services

   **4. DATA GENERATION REQUIREMENTS FROM USER DESIGN:**
   - **Entity Relationships**: How identities, keys, chains, certificates relate
   - **Data Flow Specifications**: Exact data transformations between services
   - **Business Logic Scenarios**: Realistic scenarios for each use case
   - **Security Constraints**: Mock data that respects privacy and security requirements
   - **Integration Patterns**: How mock data flows through service integrations

2. **ENSURE INDEPENDENT DEVELOPMENT CAPABILITY**:
   - Service context must enable complete implementation without external references
   - Include ALL endpoint specifications, schemas, and data flows
   - Document ALL error conditions, edge cases, and validation requirements
   - Specify ALL deployment and validation procedures

3. **SERVICE CONTEXT GENERATION PROCESS**:
   - **Copy the Service Context Template** into `services/<service-name>/SERVICE_CONTEXT.md`
   - **Extract and customize ALL service-specific details** from source documents
   - **🚀 GENERATE COMPLETE MOCK DATA SET** from user design:
     
     **A. MASTER MOCK DATA GENERATION:**
     - **Generate master mock data set** spanning ALL 7 services and ALL 6 use cases
     - **Ensure cross-service data consistency** with shared UUIDs, tokens, and entity relationships
     - **Create realistic data scenarios** that represent actual system usage patterns
     - **Include error condition data** for comprehensive testing coverage
     
     **B. SERVICE-SPECIFIC MOCK DATA EXTRACTION:**
     - **Extract service-specific mock data** from the master data set
     - **Include upstream service data** that this service consumes
     - **Include downstream service data** that this service produces
     - **Ensure data correlation** across all service interactions
     
     **C. PHASE 0B BDD TEST DATA INTEGRATION:**
     - **Embed mock data in service context** as Phase 0B test scenarios
     - **Specify exact request/response pairs** for BDD testing
     - **Include validation test cases** for schema and contract verification
     - **Document cross-service test flows** for integration validation

   - **⚠️ CRITICAL: Set Phase 0A as ✅ DONE (since context generation = Phase 0A completion)**
   - **Set Phase 0B with generated mock data** ready for user confirmation and BDD testing
   - **Set ALL other phases to require user confirmation**
   - **Validate completeness**: Ensure context contains everything needed for independent development
   - **Synchronize with related services**: Update cross-references, dependencies, and mock data consistency

4. **PHASE STATUS MANAGEMENT**:
   - **Phase 0A**: Automatically ✅ DONE (service context generation completes Phase 0A)
   - **Phase 0B+**: Ask user to confirm current phase status before marking any phase complete
   - **Continue through phases systematically with user confirmation**

5. **CONSISTENCY VALIDATION**:
   - **Cross-check all service contexts** for consistency
   - **Validate contract integration** patterns match across all services  
   - **Ensure DNS and infrastructure** patterns are consistent
   - **Verify test data alignment** across all services

### For Existing Services - SERVICE CONTEXT COMPLETENESS AUDIT:

**🚨 CRITICAL: AUDIT AND ENSURE COMPLETE SELF-CONTAINMENT**

1. **COMPLETENESS AUDIT**: Verify service context contains ALL necessary information:
   - **System Design Information**: All service-specific requirements extracted
   - **Detailed Design Specifications**: ⚠️ **ASK USER IF MISSING**: Complete service design details
   - **Use Case Coverage**: All relevant use case flows documented completely
   - **Integration Contracts**: All upstream/downstream dependencies specified
   - **Security & Privacy**: All relevant constraints and requirements included
   - **Infrastructure Patterns**: All DNS, hosting, and deployment patterns documented
   - **Test Data Alignment**: All BDD constants and validation requirements included

   **🚨 IF ANY INFORMATION IS MISSING - STOP AND ASK USER TO PROVIDE:**
   - Missing detailed design specifications
   - Incomplete endpoint definitions or schemas
   - Unclear integration requirements
   - Missing security or privacy constraints
   - Incomplete use case flows or data flows

2. **INDEPENDENT DEVELOPMENT TEST**: Verify that a developer can:
   - Understand complete service role and responsibilities
   - Implement all functionality without external document references
   - Deploy and validate the service independently
   - Integrate with all dependent services using only the service context

3. **PHASE STATUS RESET AND CONFIRMATION**:
   - **⚠️ CRITICAL: Reset Phase 0A to ✅ DONE (context completeness = Phase 0A completion)**
   - **Reset all other phases** to require user confirmation
   - **Ask user to confirm actual current phase status** before updating any phase beyond 0A
   - **Document phase completion status with user confirmation**

4. **SYNCHRONIZATION REQUIREMENTS**:
   - **Cross-check with related services** for consistency
   - **Validate contract alignment** across all service contexts
   - **Ensure infrastructure patterns** match platform standards
   - **Align test data** with centralized BDD constants

5. **MAINTENANCE REQUIREMENTS**:
   - **Update when system design changes** to maintain completeness
   - **Regenerate when dependencies change** to maintain accuracy
   - **Validate consistency** across all service contexts regularly

### For Platform Teams - SERVICE CONTEXT GOVERNANCE:

**🚨 CRITICAL: ENFORCE SERVICE CONTEXT COMPLETENESS STANDARDS**

1. **SERVICE CONTEXT VALIDATION CHECKLIST**:
   - [ ] **Completeness**: Service context enables independent development
   - [ ] **Detailed Design**: All service specifications provided by user and extracted
   - [ ] **⚠️ USER CONFIRMATION**: If detailed design missing, user has been asked to provide
   - [ ] **🚀 MASTER MOCK DATA SET**: Complete mock data generated from user design for all services/use cases
   - [ ] **Service Mock Data**: Service-specific mock data extracted and integrated into context
   - [ ] **Cross-Service Mock Consistency**: Mock data correlates correctly across all services
   - [ ] **Use Case Mock Coverage**: Mock data supports all relevant use case scenarios
   - [ ] **Phase 0B Mock Integration**: Mock data properly embedded for BDD testing
   - [ ] **Extraction**: All relevant information from source documents included
   - [ ] **Self-Containment**: No external document references required
   - [ ] **Consistency**: Aligned with all related service contexts
   - [ ] **Synchronization**: Updated when dependencies change
   - [ ] **Phase Status**: Phase 0A marked as ✅ DONE, others require user confirmation

2. **QUALITY GATES**:
   - **Before Phase 0A Completion**: Validate service context completeness
   - **Before Phase Promotion**: Ensure all dependencies are documented
   - **Regular Audits**: Verify service contexts remain synchronized
   - **Change Management**: Update service contexts when system design evolves

3. **PLATFORM RESPONSIBILITIES**:
   - **Enforce phase completion** standards before service promotion
   - **Validate checkpoint commands** work across all services
   - **Maintain centralized test constants** for BDD alignment
   - **Monitor service context consistency** across all services
   - **Update this pattern** as platform evolves
   - **Provide tooling** for service context validation and synchronization

4. **SERVICE CONTEXT GENERATION STANDARDS**:
   - **Template Compliance**: All service contexts follow the standard template
   - **Information Completeness**: All necessary information extracted from source documents
   - **Independent Development**: Contexts enable standalone service development
   - **Cross-Service Consistency**: Integration patterns aligned across all services

## 🚀 **MASTER MOCK DATA SET ARCHITECTURE**

### **CRITICAL INTEGRATION: Complete Mock Data Ecosystem Generation**

The platform MUST generate a comprehensive, consistent mock data ecosystem from user design input:

#### **1. MASTER DATA SET GENERATION PROCESS:**

```markdown
USER DESIGN INPUT → MASTER MOCK DATA SET → SERVICE-SPECIFIC EXTRACTION → PHASE 0B INTEGRATION

**A. Master Data Generation:**
- **Cross-Service Entity Graph**: Generate consistent UUIDs, tokens, keys across all services
- **Use Case Flow Data**: Create complete data scenarios for all 6 use cases
- **Realistic Data Patterns**: Generate data that represents actual system usage
- **Error Condition Data**: Include edge cases and error scenarios for comprehensive testing

**B. Service-Specific Data Extraction:**
- **Service A**: Extract domain-specific entities, authentication data, session tokens
- **Service B**: Extract cryptographic materials, signatures, key data, nonces
- **Service C**: Extract privacy-preserving entities, encrypted data, metadata
- **Service D**: Extract relationship data, references, operations
- **Service E**: Extract public distribution data, key sets, domain-specific keys
- **Service F**: Extract credential data, certificates, validation chains
- **Web Client**: Extract UI scenarios, test flows, user interactions

**C. Phase 0B BDD Integration:**
- **Embed in Service Context**: Mock data becomes part of service documentation
- **BDD Test Scenarios**: Mock data drives Step Functions and Playwright testing
- **Cross-Service Validation**: Mock data enables integration testing across services
- **Schema Validation**: Mock data validates request/response schemas
```

#### **2. MOCK DATA CONSISTENCY REQUIREMENTS:**

- **🚨 CRITICAL**: Same entity IDs (entity_id, resource_id, reference_id) across ALL services
- **Data Flow Integrity**: Mock data flows correctly through service interactions
- **Use Case Completeness**: Mock data supports end-to-end use case testing
- **Realistic Scenarios**: Mock data represents actual system usage patterns
- **Error Coverage**: Mock data includes error conditions and edge cases

#### **3. PHASE 0B INTEGRATION ARCHITECTURE:**

- **Service Context Embedding**: Mock data becomes part of service documentation
- **BDD Test Foundation**: Mock data drives all Phase 0B BDD testing
- **Cross-Service Correlation**: Mock responses correlate with other services
- **Validation Foundation**: Mock data enables comprehensive contract validation

This standardized approach ensures every service on the platform follows consistent development practices, maintains quality gates, integrates properly with the broader system architecture, and has a complete mock data foundation for comprehensive testing.

## 🔗 **IMPLEMENTATION EXAMPLES**

For concrete implementation examples of these generic patterns, see:
- **`../_impl/`**: Contains system-specific implementations of these patterns
- **`../_impl/ODMD_KK_IMPLEMENTATION.md`**: Complete example of master mock data set generation
- **Service contexts in individual service repositories**: Real-world applications of these patterns

## 🚀 **ULTIMATE PLATFORM BEST PRACTICE**

### **REVOLUTIONARY INSIGHT: PHASES = ENVERS**

The ultimate realization for ONDEMANDENV platform service development:

**Different development phases are actually DIFFERENT ENVERS:**
- **Phase 0** (Contract Verification) = `mock` enver (`workspace1`)
- **Phase 1** (MVP Development) = `dev` enver (`workspace0`)  
- **Phase 2+** (Production) = `main` enver (`workspace0`)

This creates **perfect phase-environment alignment** with appropriate infrastructure, security, and objectives for each stage.

### **ENVER-BASED SERVICE CONTEXT ARCHITECTURE**

For the complete ultimate best practice pattern, see:
**[ENVER_BASED_SERVICE_CONTEXT_PATTERN.md](./ENVER_BASED_SERVICE_CONTEXT_PATTERN.md)**

This pattern provides:
- ✅ **Perfect Phase-Environment Alignment**: Each phase maps to appropriate enver infrastructure
- ✅ **Independent Development Streams**: Isolated testing, safe development, production deployment
- ✅ **ONDEMANDENV Platform Optimization**: Leverages platform's native enver-based model
- ✅ **Scalable Architecture**: Consistent pattern across all services

These generic patterns are designed to be adaptable to any system architecture while maintaining consistency and quality across all implementations, with the **ENVER-BASED PATTERN** representing the ultimate evolution of ONDEMANDENV platform service development.

## 🔒 Cycle Prevention and Location Rules
- OdmdBuild and OdmdEnver definitions MUST live in the organization ContractsLib. Service repositories must not declare builds/envers; they define stacks and runtime/handlers only.
- Do not import service handler Zod or generated consumer types into ContractsLib; validation and codegen happen in service repos and BDD stacks.
- Web client is a consumer of services; services must not depend on `webClientUrl` in app stacks. BDD stacks may reference `webClientUrl` if needed.
- Wiring is centralized in `OndemandContracts.wireBuildCouplings()` after all builds exist; enver constructors create producers and declare consumers, and wiring passes upstream enver instances into `enver.wireCoupling(...)`, where the enver initializes its consumers.
