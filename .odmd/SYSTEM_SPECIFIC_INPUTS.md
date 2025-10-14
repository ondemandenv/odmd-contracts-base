# 📋 System-Specific Inputs & Prerequisites

This document lists all the required inputs to transform the generic ONDEMANDENV platform patterns into a concrete, system-specific set of documentation and contracts. Before the platform can be configured for your project, please provide the following information.

---

### 1. Organization & Naming Conventions

*   **Organization Name**: The name of your company or organization (e.g., `AcmeCorp`). This will be used for package names (`@AcmeCorp/contracts-lib`) and the GitHub owner name.
*   **System/Project Name**: The overall name for your system (e.g., `OdmdProject`). This is used for documentation titles and resource naming prefixes.
*   **Service Names**: A definitive list of all microservices in your system.
    *   Example: `IdentityService`, `KeyService`, `ChainService`.

---

### 2. AWS & GitHub Configuration

*   **AWS Account Structure**: The logical names and corresponding 12-digit AWS Account IDs for each environment.
    *   **Central/Shared Services Account ID**: `e.g., 111111111111`
    *   **Development Workspace Account ID**: `e.g., 222222222222`
    *   **Production Workspace Account ID**: `e.g., 333333333333`
    *   _Add any other accounts as needed._
*   **Hosted Zones & Domains**: The domain name and Route 53 Hosted Zone ID for each environment where services will be exposed.
    *   **Central Domain Name & Zone ID**: `e.g., example.com, Z0123456789ABCDEFGHIJ`
    *   **Development Domain Name & Zone ID**: `e.g., dev.example.com, Z0987654321ZYXWVUTSR`
    *   _Add other environments as needed._
*   **GitHub Configuration**:
    *   **GitHub Organization Name**: The name of your GitHub organization or user that owns the repositories (e.g., `acme-corp-org`).
    *   **GitHub App Installation ID**: The numerical ID for the GitHub App used for platform integration.
    *   **Repository Names**: The specific name for each service's repository.

---

### 3. System Architecture & Service Dependencies

*   **Service Boundaries**: For each service, provide a clear, high-level description of its responsibilities. What business domain does it own? What does it explicitly *not* handle?
*   **Cross-Service Dependencies**: Define the interaction model between services. This is critical for wiring producers and consumers correctly in the `ContractsLib`.
    *   Example:
        *   `KeyService` consumes `IdentityService` to validate user tokens.
        *   `WebClient` consumes `KeyService` and `ChainService`.
        *   `ChainService` consumes events from `KeyService`.

---

### 4. Detailed Design, Use Cases, and Mock Data

This is the most critical input, as it forms the foundation for generating self-contained service contexts, BDD tests, and consistent mock data, as mandated by the platform patterns.

For **each service**, please provide:

*   **Detailed API Design**:
    *   A list of all API endpoints (e.g., `POST /identities`, `GET /keys/{keyId}`).
    *   The complete request and response JSON schemas for each endpoint.
*   **Data Storage Schemas**: The JSON structure of data as it is stored in its primary data store (e.g., an item in DynamoDB or an object in S3).
*   **Event Schemas**: If the service produces or consumes asynchronous events, provide the complete JSON schema for each event payload.
*   **End-to-End Use Cases**: A detailed, step-by-step description of every user journey or system flow. These flows must describe how services interact to achieve a business outcome.
    *   Example Use Case: "User Registration"
        1.  `WebClient` calls `IdentityService` to create an identity.
        2.  `IdentityService` publishes an `IdentityCreated` event.
        3.  `KeyService` consumes the event and generates a new cryptographic key.
*   **Master Mock Data Set**: To ensure testing consistency across the entire system, provide the authoritative set of mock data.
    *   **Shared Constants**: Consistent UUIDs, user IDs, and tokens to be used across all services.
    *   **Use Case Payloads**: Concrete request and response payloads for each step of every use case defined above. This data must be consistent (e.g., the mock response from `IdentityService` in a BDD test should be the expected mock input for `KeyService`).

---

### 5. Implementation-Specific Documentation

*   **Path to Design Documents**: Provide the relative path from the project root to the directory containing your implementation-specific design documents, use cases, and mock data definitions. The generic patterns refer to this as the `_impl/` directory, but your project may use a different convention (e.g., `.odmd-kk/`).

