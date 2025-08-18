# ONDEMANDENV Contracts Base Library

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![AWS CDK](https://img.shields.io/badge/AWS_CDK-2.200.1-orange.svg)](https://aws.amazon.com/cdk/)
[![Platform](https://img.shields.io/badge/Platform-ONDEMANDENV-blue)](https://ondemandenv.dev)

**Foundation library for Application-Centric Infrastructure contracts in the ONDEMANDENV platform.**

This library provides the core TypeScript interfaces, base classes, and platform integration components that enable distributed systems to be managed through explicit, code-driven contracts. It is the foundational layer for the ONDEMANDENV platform, transforming distributed systems complexity through **Application-Centric Infrastructure** and **Contract-First Development**.

> **Note**: This library is **not used directly** in applications. Organizations create their own `contractsLib` repositories that extend these base contracts.

## 📖 The `.odmd` Directory: The Platform's Documentation

**The primary and most up-to-date documentation for the ONDEMANDENV platform is located in the `.odmd` directory in this repository.**

This documentation provides a comprehensive guide to the platform's architecture, core concepts, and development workflows. It is intended to be the single source of truth for developers (both human and AI) who are building `contractsLib` implementations. Before you start, please familiarize yourself with the documents in the `.odmd` directory.

## 🚀 Core Principles

The ONDEMANDENV platform is built on a set of core principles that guide its architecture and development workflow:

*   **Contract-First Development:** Services define their interfaces and schemas first, before implementation. This ensures that service interactions are well-defined and reliable.
*   **Application-Centric Infrastructure:** Infrastructure is defined and managed as part of the application, not as a separate concern. This allows for greater consistency and automation.
*   **Phased Development:** Services are developed in phases, with clear checkpoints and validation at each stage. This ensures a systematic and reliable development process.
*   **Enver as Code:** Complete, deployable envers are defined as code, allowing for dynamic creation and cloning of envers for development and testing.

## 🏁 From-Scratch Quickstart

Follow this sequence to bring a new bounded context onto the platform with contract-first discipline:

1.  **ContractsLib (organization repo):**
    *   Define accounts/workspaces and GitHub repo mappings.
    *   Create one build per service and initialize its Envers (`dev`/`main`/`mock` at minimum).
    *   For each service Enver, define a base URL producer and attach a child schema artifact producer.
    *   Wire cross-service dependencies once all builds exist.

2.  **Service Scaffolds (one repo per service):**
    *   Use the CDK app pattern to initialize ContractsLib and get the target Enver.
    *   Create minimal infrastructure (e.g., HTTP API + Lambda handler).
    *   Publish the base URL via `OdmdShareOut`.
    *   Generate the service schema JSON and publish it as a schema artifact.

3.  **Web Client (optional):**
    *   Create an S3/CloudFront site that reads a runtime `config.json` with upstream endpoints.
    *   Publish the `webClientUrl` via `OdmdShareOut`.

4.  **BDD inside the Enver:**
    *   Create a dedicated BDD stack with a Step Functions state machine for API-level BDD.
    *   Optionally, use a Playwright runner for browser-level BDD.

## 🏗️ Architecture Overview

### Core Concepts

*   **Enver:** A complete, deployable version of an application's bounded context. Each Enver provides a full Software Development Lifecycle context with infrastructure, dependencies, and deployment automation.
*   **Build Definition:** Links an Enver type to a source repository and a build process.
*   **Product/Consumer Pattern:** A cross-reference system for explicit dependency management between services, using `OdmdCrossRefProducer` and `OdmdCrossRefConsumer`.

## 📦 Core Components

This library provides a set of core components for building and managing services on the ONDEMANDENV platform.

### Enver Types

*   `OdmdEnverCdk`: For CDK-based infrastructure deployments.
*   `OdmdEnverEksCluster`: For EKS cluster management.
*   `OdmdEnverCtnImg`: For container image builds.

### Infrastructure Abstractions

*   `WithVpc`: Standard VPC configuration interface.
*   `WithRds`: Database cluster configuration.
*   `OdmdEksManifest`: Kubernetes manifest deployment via CDK.

### Cross-Reference System

*   `OdmdShareOut`: Publishes Products to the platform's config store (SSM Parameter Store).
*   `OdmdShareIn`: Consumes Products from other Envers via the config store.

## 🌟 Built-in Platform Services

The library includes contracts for essential platform services:

*   `__user-auth`: User authentication service.
*   `__networking`: Shared VPC, TGW, and networking infrastructure.
*   `__contracts`: The contractsLib repository deployment itself.
*   `_default-vpc-rds`: Standard database infrastructure templates.
*   `_default-kube-eks`: Default Kubernetes cluster templates.

## 🔧 Development Workflow

### Phased Development: PHASES = ENVERS

A revolutionary insight of the ONDEMANDENV platform is that **different development phases are actually different Envers**:

*   **Phase 0 (Contract Verification):** `mock` enver
*   **Phase 1 (MVP Development):** `dev` enver
*   **Phase 2+ (Production):** `main` enver

This creates perfect phase-enver alignment with appropriate infrastructure, security, and objectives for each stage.

### BDD Checkpoint: Two-Layer Contract Verification

The platform supports two layers of BDD testing to validate inter-service contracts:

*   **API BDD via Step Functions:** An in-enver, infrastructure-native way to validate service contracts using a Step Functions state machine.
*   **Playwright BDD:** An in-enver solution for running browser-based BDD tests against your web client.

### Dynamic Cloning for Development

The platform allows you to create isolated, temporary envers for feature development using git-based commands:

*   **Create:** `odmd: create@baseEnver` in a commit message.
*   **Delete:** `odmd: delete` in a commit message.

### AI-Assisted, Doc-Driven Development

A key pattern in the ONDEMANDENV platform is the ability to generate service context from high-level, domain-specific architecture documents. This process is designed to be interactive between developers and an LLM, allowing for a "Doc-Driven Development" workflow.

*   **Input:** The process starts with user-provided architecture documents. These are not just code, but readable documents that can include Markdown files, Mermaid diagrams for visualizing architecture, and example data structures.
*   **Process:** The generation of the service context is a complexity-decomposing process that is specific to the system being built. The LLM assists in interpreting the architecture documents and generating the necessary code and configuration.
*   **Interaction:** This is an interactive and iterative process. The developer provides the initial documents, the LLM generates the context, and then the developer can refine the documents or the generated code in a collaborative loop.

This approach allows developers to focus on the business domain and system architecture, while leveraging the power of LLMs to automate the creation of the boilerplate and service context.

## 📂 Repository Structure

```
contracts-base/
├── lib/
│   ├── model/                    # Core type definitions
│   ├── repos/                   # Built-in platform services
│   ├── OndemandContracts.ts     # Main contracts base class
│   └── OdmdContractsCentralView.ts # Platform view interface
├── tests/                       # Validation test suite
├── scripts/                     # Build and utility scripts
├── package.json                 # Dependencies and scripts
└── README.md                    # This documentation
```

## 🤝 Contributing

### Platform Development

*   **Issues**: Report bugs or feature requests.
*   **Pull Requests**: Follow TypeScript and testing standards.
*   **Architecture**: Maintain backward compatibility.

### Organization Usage

*   **Support**: contracts-support@ondemandenv.dev
*   **Examples**: Reference sandbox implementation.
*   **Documentation**: Platform documentation site.

## 📚 Resources

*   **🌐 Platform Website**: [ondemandenv.dev](https://ondemandenv.dev)
*   **📖 Documentation**: [ONDEMANDENV Documentation](https://ondemandenv.dev/documentation.html)
*   **🏗️ Architecture Guide**: [Core Concepts](https://ondemandenv.dev/concepts.html)
*   **🎯 Use Cases**: [Patterns & Examples](https://ondemandenv.dev/patterns.html)
*   **📝 Sandbox Example**: [odmd-contracts-sandbox](https://github.com/ondemandenv/odmd-contracts-sandbox)
*   **🧪 Live Console**: [web.auth.ondemandenv.link](https://web.auth.ondemandenv.link/?region=us-west-1)

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**🚀 ONDEMANDENV**: *Taming Distributed System Complexity with Semantic Modeling that Projects to Code*
