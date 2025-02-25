# OndemandEnv Contracts Base Library (Abstract)

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![AWS CDK](https://img.shields.io/badge/AWS_CDK-2.178.2-orange.svg)](https://aws.amazon.com/cdk/)

Abstract foundation for defining environment contracts and service dependencies in the OndemandEnv platform. This library provides base interfaces, types, and abstract classes that concrete implementations must extend.

## Purpose

This repository **is not meant for direct use** in production systems. It serves as:

✅ **Abstract Type Definitions** for environment contracts  
✅ **Interface Templates** for SOA/Microservices dependencies  
✅ **Base Classes** for Enver implementations  
✅ **Validation Framework** for contract negotiations

Concrete implementations should extend these abstractions, such as the [odmd-sandbox contracts](https://github.com/ondemandenv/odmd-contracts-sandbox).

## Core Components

### Abstract Types
```typescript
// Example base interface
export abstract class OdmdEnver<T extends OdmdBuild<OdmdEnver<T>>>
    extends Construct implements IOdmdEnver {
    abstract getRevStackNames(): string[];
}

```

### Key Contracts
- `OdmdBuild`: Base class for deployment artifact producers
- `OdmdEnver`: Abstract environment version unit
- `OdmdCrossRefProducer/Consumer`: Dependency management primitives
- `WithVpc/WithRds`: Infrastructure interface templates

## Implementation Requirements

Concrete implementations must:

1. Extend base classes with environment-specific logic
2. Implement all abstract methods
3. Adhere to validation rules from `tests/` suite
4. Maintain type compatibility with base interfaces

Example implementation pattern:
```typescript
// Sandbox implementation extending abstract base
export class SandboxEnver extends OdmdEnver<SandboxBuild> {
    getRevStackNames() {
        return [/* concrete stack names */]
    }
}
```

## Repository Structure

```text
contracts-base/
├── lib/ # Abstract definitions
│ ├── model/ # Base interfaces and types
│ ├── repos/ # Reference implementations
│ └── OdmdContracts.ts # Core abstract classes
├── tests/ # Validation test suite
└── scripts/ # Build utilities
```
## Development Guidance

### For Library Maintainers

```text
npm install
npm run build # Build type definitions
npm test # Run validation suite
```
### For Implementors
1. Install as peer dependency:
```text
   npm install @ondemandenv/contracts-lib-base
```
2. Extend base classes in your implementation:
```import { OdmdBuild, OdmdEnver } from '@ondemandenv/contracts-lib-base';

export class ConcreteEnver extends OdmdEnver<ConcreteBuild> {
// Implement abstract methods
}

```

## Validation Suite

The test suite enforces critical contract rules:
- Dependency acyclicity checks
- AWS resource naming constraints
- Contract version compatibility
- Branch/tag naming rules

Run validation with:

```text
npm test
```


## Versioning & Compatibility

This lib use semantic versioning but need exact version match to work.


## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Sandbox Example**: https://github.com/ondemandenv/odmd-contracts-sandbox  
**Documentation**: https://docs.ondemandenv.dev/contracts-architecture  
**Support**: contracts-support@ondemandenv.dev
