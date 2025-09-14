# 🧪 ONDEMANDENV Web Client BDD Testing Pattern

This document defines the standardized BDD (Behavior-Driven Development) testing pattern for ONDEMANDENV web clients, providing comprehensive validation from infrastructure APIs to browser-based user interfaces.

## 🚀 **ENVER-BASED BDD ARCHITECTURE**

> IMPORTANT — Phase Status Gating
> - Phase 0A is automatically ✅ DONE upon service context generation.
> - All other phases require explicit user confirmation before marking ✅ COMPLETE.
> - Canonical progression: mock → dev → main (no forward references).

The BDD testing pattern aligns with the **PHASES = ENVERS** architecture:

- **Mock Enver BDD** (`workspace1`): Contract verification with mocked service responses
- **Dev Enver BDD** (`workspace0`): MVP testing with real service integrations  
- **Main Enver BDD** (`workspace0`): Production validation and monitoring

This ensures BDD testing matches the appropriate infrastructure and objectives for each deployment environment.

## 🎯 Pattern Overview

The ONDEMANDENV Web Client BDD Pattern implements **dual-layer BDD testing**:

1. **Step Functions BDD**: Infrastructure-native API testing using AWS Step Functions
2. **Playwright BDD**: Browser-based GUI testing using Playwright

Both layers use **identical test data** and validate the **same user journeys** to ensure complete system coverage.

## 🏗️ Architecture Components

### 1. Step Functions BDD Stack
**Purpose**: Validates API contracts and service integrations
**Technology**: AWS Step Functions with HTTP invoke tasks
**Scope**: Server-to-server API validation

```typescript
// services/{service}/lib/{service}-stack-bdd.ts
export class ServiceStackBdd extends Stack {
  constructor(scope: Construct, id: string, props: ServiceStackProps) {
    super(scope, id, props);
    
    // HTTP invoke configuration with EventBridge connection
    const connection = new events.Connection(this, 'BddHttpConnection', {
      connectionName: 'bdd-http-no-auth',
      authorization: events.Authorization.basic('dummy', SecretValue.unsafePlainText('dummy'))
    });
    
    // Validated HTTP invoke helper
    const httpInvoke = (name: string, config: HttpInvokeConfig) => {
      return new sfn.CustomState(this, name, {
        stateJson: {
          Type: 'Task',
          Resource: 'arn:aws:states:::http:invoke',
          Parameters: {
            ApiEndpoint: sfn.JsonPath.format('{}{}', 
              sfn.JsonPath.stringAt(config.baseUrlJsonPath), 
              config.apiPath
            ),
            Method: config.method,
            Authentication: { ConnectionArn: connection.connectionArn },
            Headers: { 'Content-Type': 'application/json' },
            ...(config.bodyJsonPath ? { RequestBody: sfn.JsonPath.objectAt(config.bodyJsonPath) } : {})
          }
        }
      });
    };
  }
}
```

### 2. Playwright BDD Stack
**Purpose**: Validates user experience and browser compatibility
**Technology**: Playwright with TypeScript
**Scope**: End-to-end user journey validation

```typescript
// services/{service}/vite/tests/bdd/{service}-system.spec.ts
import { test, expect } from '@playwright/test';
import { ServicePage } from '../pages/ServicePage';

test.describe('Service BDD End-to-End Tests', () => {
  test('should complete full user journey', async ({ page }) => {
    const servicePage = new ServicePage(page);
    await servicePage.goto();
    await servicePage.completeUserFlow();
    // Validates same journey as Step Functions BDD
  });
});
```

### 3. Centralized Test Data
**Purpose**: Ensures consistency across both BDD layers
**Location**: `services/{service}/tests/test-data/constants.ts`

```typescript
export const PLATFORM_TEST_DATA = {
  // Consistent UUIDs across all systems
  ROOT_ENTITY_ID: '550e8400-e29b-41d4-a716-446655440001',
  CHILD_ENTITY_ID: '550e8400-e29b-41d4-a716-446655440002',
  
  // Authentication tokens
  AUTH_JWT_TOKEN: 'mock_auth_jwt_token_for_testing',
  TEMP_TOKEN: 'mock_temp_token_12345',
  
  // API endpoints (resolved via contracts)
  API_ENDPOINTS: {
    CREATE: '/entity/create',
    READ: '/entity/read',
    UPDATE: '/entity/update'
  }
} as const;
```

### 4. Consuming contract artifacts
Derive HTTP routes from **OpenAPI 3.1** or event channels from **AsyncAPI 2.x** (or both via an ODMD bundle).

#### 4.a Deriving routes from OpenAPI (recommended for multi-path)
If the upstream `schema-url` artifact is an OpenAPI 3.1 document, generate typed route helpers from `paths` and build request URLs by combining the platform-resolved base URL with the documented path templates.

```ts
// routes.ts (generated from OpenAPI operationIds)
export function buildUrl(baseUrl: string, template: string, params: Record<string, string>): string {
  return baseUrl.replace(/\/$/, "") + template.replace(/\{(.*?)\}/g, (_, k) => encodeURIComponent(params[k] ?? ""));
}
export const routes = {
  createEntity: (baseUrl: string) => ({ method: 'POST' as const, url: buildUrl(baseUrl, '/entity/create', {}) }),
  readEntity: (baseUrl: string, p: { id: string }) => ({ method: 'GET' as const, url: buildUrl(baseUrl, '/entity/{id}', p) })
};

// In Step Functions BDD or Playwright
const { method, url } = routes.readEntity(config.serviceBaseUrl, { id: '123' });
```

#### 4.b Consuming AsyncAPI for event BDD (optional)
If the `schema-url` artifact is AsyncAPI (or referenced by a bundle), use `channels` to generate typed producers/consumers for event-driven tests.

```ts
// events.ts (generated from AsyncAPI channels/messages)
export const channels = {
  thingEvents: {
    name: 'thing/events',
    publish: (client: EventBusClient, payload: ThingEvent) => client.publish('thing/events', payload),
    subscribe: (client: QueueClient, handler: (m: ThingEvent) => void) => client.subscribe('thing/events', handler)
  }
};

// In Step Functions BDD: validate publish/consume over derived channel names
``` 
```

## 🔄 Implementation Pattern

### Step 1: Service API Stack
```typescript
// Standard service with CORS-enabled HTTP API
const httpApi = createHttpApiWithCors(this, 'ServiceHttpApi', `${id}-http-api`);
httpApi.addRoutes({
  path: '/service/endpoint',
  methods: [HttpMethod.POST],
  integration: new HttpLambdaIntegration('ServiceIntegration', handler)
});
```

### Step 2: Step Functions BDD Stack
```typescript
// BDD stack that tests the service API
export class ServiceStackBdd extends Stack {
  constructor(scope: Construct, id: string, props: ServiceStackProps) {
    super(scope, id, props);
    
    // Validation before synthesis
    validateBeforeSynth();
    
    // HTTP invoke tasks for each use case
    const uc1Tests = [
      httpInvoke('UC1_ServiceCall', {
        method: 'POST',
        baseUrlJsonPath: '$.endpoints.serviceBaseUrl',
        apiPath: API_ENDPOINTS.SERVICE_ENDPOINT,
        bodyJsonPath: '$.testData.uc1.payload'
      })
    ];
    
    // State machine with test data
    const sm = new sfn.StateMachine(this, 'BddStateMachine', {
      definitionBody: sfn.DefinitionBody.fromChainable(testChain)
    });
  }
}
```

### Step 3: Web Client with Contract Discovery
```typescript
// Web client that uses contract-resolved service endpoints
class ServiceApp {
  private config: ServiceConfig;
  
  async loadConfig() {
    // Loads service endpoints resolved via contracts system
    const res = await fetch('/config.json');
    this.config = await res.json();
  }
  
  async callService(payload: any) {
    // Uses same endpoints as Step Functions BDD
    return await fetch(`${this.config.serviceBaseUrl}/service/endpoint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }
}
```

### Step 4: Playwright BDD Tests
```typescript
// Browser tests that validate the web client
test('should complete service workflow', async ({ page }) => {
  const servicePage = new ServicePage(page);
  await servicePage.goto();
  
  // Uses same test data as Step Functions
  await servicePage.performAction(PLATFORM_TEST_DATA.TEST_PAYLOAD);
  
  // Validates same outcomes
  await servicePage.expectSuccess();
});
```

## 🛡️ Validation and Error Prevention

### Pre-Deployment Validation
```typescript
// Automated validation in BDD stacks
import { validateBeforeSynth, validateTestDataConsistency } from './bdd-validation-helpers';

export class ServiceStackBdd extends Stack {
  constructor(scope: Construct, id: string, props: ServiceStackProps) {
    super(scope, id, props);
    
    // Prevents deployment with invalid configurations
    validateBeforeSynth();
    
    // Ensures test data consistency
    const validation = validateTestDataConsistency(
      stepFunctionsData,
      playwrightData, 
      serviceHandlerData
    );
    
    if (!validation.isValid) {
      throw new Error(`BDD validation failed: ${validation.errors.join(', ')}`);
    }
  }
}
```

### Error Prevention Checklist
- [ ] **Step Functions HTTP Invoke**: Proper `ApiEndpoint` construction with `sfn.JsonPath.format()`
- [ ] **Headers**: Uppercase headers only (`Authorization`, not `authorization`)
- [ ] **EventBridge Connection**: Required for HTTP invoke authentication
- [ ] **Test Data Alignment**: Centralized constants used across all systems
- [ ] **CORS Configuration**: Applied to all service APIs for browser access
- [ ] **API Paths**: Standardized endpoints using `API_ENDPOINTS` constants
- [ ] **Mock Data Consistency**: Web client BDD uses the same master mock dataset (projected per service) so UI flows and API/event assertions share identical IDs/tokens and payload examples.

## 📊 Coverage Matrix

| Layer | Technology | Scope | Validates |
|-------|------------|-------|-----------|
| **Step Functions BDD** | AWS Step Functions | API Contracts | Service integration, data flow, error handling |
| **Playwright BDD** | Playwright + TypeScript | User Experience | GUI functionality, browser compatibility, user journeys |
| **Service Handlers** | Lambda + Zod | Business Logic | Request/response validation, mock data consistency |
| **CORS Configuration** | API Gateway v2 | Cross-Origin Access | Browser-to-API communication |

## 🚀 Deployment Integration

### CDK Stack Organization
```
services/{service}/
├── lib/
│   ├── {service}-stack.ts          # Main service stack
│   ├── {service}-stack-bdd.ts      # Step Functions BDD stack
│   └── bdd-validation-helpers.ts   # Validation utilities
├── vite/                           # Web client (if applicable)
│   ├── tests/
│   │   ├── bdd/                    # Playwright BDD tests
│   │   ├── pages/                  # Page object models
│   │   └── test-data/              # Centralized test constants
│   └── src/                        # Web client implementation
└── handlers/                       # Service Lambda handlers
    └── src/
        ├── schemas/zod.ts          # Request/response schemas
        └── index.ts                # Handler implementations
```

### Web Client BDD State Machine (explicit example)
```typescript
// web-client/infra/web-client-bdd-stack.ts
export class WebClientBddStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps & { enver: any }) {
    super(scope, id, props);

    // Resolve endpoints via contracts
    const endpoints = {
      identityBaseUrl: props.enver.identityApiBaseUrl.getSharedValue(this),
      keyBaseUrl: props.enver.keyApiBaseUrl.getSharedValue(this),
      anonymousBaseUrl: props.enver.anonymousApiBaseUrl.getSharedValue(this),
      chainBaseUrl: props.enver.chainApiBaseUrl.getSharedValue(this)
    };

    // Test data (shared master dataset)
    const testDataParam = JSON.stringify({
      ROOT_IDENTITY_ID: '550e8400-e29b-41d4-a716-446655440001',
      TEMP_TOKEN: 'mock_temp_token_12345'
    });

    // Example HTTP invoke task
    const login = new sfn.CustomState(this, 'Login', {
      stateJson: {
        Type: 'Task',
        Resource: 'arn:aws:states:::http:invoke',
        Parameters: {
          ApiEndpoint: endpoints.identityBaseUrl,
          Method: 'POST',
          Path: '/auth/login',
          Headers: { 'Content-Type': 'application/json' },
          RequestBody: sfn.JsonPath.objectAt('$.payload.login')
        }
      }
    });

    // Chain tasks per UC; assert shapes as needed
    const sm = new sfn.StateMachine(this, 'WebClientBdd', {
      definitionBody: sfn.DefinitionBody.fromChainable(login)
    });

    new OdmdShareOut(this, 'WebClientBddOutputs', {
      value: JSON.stringify({ bddStateMachineArn: sm.stateMachineArn })
    });
  }
}
```

### Contract Integration
```typescript
// Service endpoints resolved via contracts system
const config = {
  serviceBaseUrl: props.enver.serviceApiBaseUrl?.getSharedValue(this) ?? '',
  // Both Step Functions and web client use same resolved URLs
};
```

## 📈 Benefits

### 1. **Comprehensive Coverage**
- **API Level**: Step Functions validate service contracts
- **UI Level**: Playwright validates user experience
- **Integration**: Both layers test same system behavior

### 2. **Data Consistency** 
- **Single Source**: Centralized test data constants
- **Cross-Validation**: Automated alignment checking
- **Error Prevention**: Pre-deployment validation

### 3. **Contract-Driven**
- **Service Discovery**: Automatic endpoint resolution
- **Environment Agnostic**: Works across dev/staging/prod
- **Dependency Management**: Proper service ordering

### 4. **Platform Standardization**
- **Reusable Pattern**: Apply to any ONDEMANDENV service
- **Error Prevention**: Built-in validation helpers
- **CORS Compliance**: Standardized cross-origin configuration

## 🔧 Platform Integration

This pattern integrates with ONDEMANDENV platform components:

- **Contracts System**: Service discovery and dependency management
- **CORS Standards**: Cross-origin access for web clients  
- **Validation Helpers**: Error prevention and consistency checking
- **CDK Patterns**: Standardized infrastructure as code

## 📝 Implementation Checklist

For each service implementing this pattern:

- [ ] **Service Stack**: HTTP API with CORS configuration
- [ ] **Step Functions BDD**: API validation with HTTP invoke tasks
- [ ] **Web Client**: Contract-driven endpoint discovery (if applicable)
- [ ] **Playwright BDD**: Browser-based user journey tests (if applicable)  
- [ ] **Test Data**: Centralized constants shared across all layers
- [ ] **Validation**: Pre-deployment error checking
- [ ] **Documentation**: Service-specific BDD coverage in README

---

**This pattern ensures comprehensive BDD coverage for all ONDEMANDENV services, from infrastructure APIs to user interfaces, with consistent test data and built-in error prevention.** 🧪

## 🔒 Cycle Prevention
- Web client is a consumer of services. Services must not depend on `webClientUrl` in their app stacks to avoid cycles.
- Resolve all upstream service base URLs via `/odmd-share/...` or `getSharedValue(...)` and keep OAS `servers[0].url` empty; compose route templates at runtime using generated helpers.
- Wiring is centralized in the ContractsLib root (`OndemandContracts.wireBuildCouplings()`); enver constructors declare producers/consumers and the root wires via `enver.wireCoupling({...upstreamEnvers})`.
