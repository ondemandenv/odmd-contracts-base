# ONDEMANDENV Contracts Base Library

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![AWS CDK](https://img.shields.io/badge/AWS_CDK-2.200.1-orange.svg)](https://aws.amazon.com/cdk/)
[![Platform](https://img.shields.io/badge/Platform-ONDEMANDENV-blue)](https://ondemandenv.dev)

**Foundation library for Application-Centric Infrastructure contracts in the ONDEMANDENV platform.**

This library provides the core TypeScript interfaces, base classes, and platform integration components that enable distributed systems to be managed through explicit, code-driven contracts.

## 🎯 Purpose

The `@ondemandenv/contracts-lib-base` library serves as the **foundational layer** for the ONDEMANDENV platform, providing:

- ✅ **Core Type System**: Base interfaces for Envers, Builds, Products, and Consumers
- ✅ **Platform Integration**: AWS CDK constructs for cross-account deployments
- ✅ **Built-in Services**: Standard contracts for networking, authentication, and infrastructure
- ✅ **Validation Framework**: Type safety and architectural constraints
- ✅ **Extension Points**: Abstract classes for organization-specific implementations

> **Note**: This library is **not used directly** in applications. Organizations create their own `contractsLib` repositories that extend these base contracts.

## 🏗️ Architecture Overview

### Core Concepts

#### **Enver (Environment Version)**
A complete, deployable version of an application's bounded context:
```typescript
export abstract class OdmdEnver<T extends OdmdBuild<OdmdEnver<T>>> extends Construct {
    // Represents a versioned, isolated environment instance
    abstract getRevStackNames(): string[];
}
```

#### **Build Definition**
Configuration for how to build and deploy an Enver type:
```typescript
export class OdmdBuild<T extends OdmdEnver<OdmdBuild<T>>> extends Construct {
    // Links Enver types to their source repositories and build processes
}
```

#### **Product/Consumer Pattern**
Explicit dependency management between services:
```typescript
// Products: What an Enver publishes (outputs)
export class OdmdCrossRefProducer<T extends OdmdEnver<any>>

// Consumers: What an Enver requires (inputs)  
export class OdmdCrossRefConsumer<T extends OdmdEnver<any>>
```

## 📦 Core Components

### **Enver Types**

#### `OdmdEnverCdk`
CDK-based infrastructure deployments:
```typescript
export class OdmdEnverCdk extends OdmdEnver<OdmdBuild<OdmdEnverCdk>> {
    // For AWS CDK stacks (infrastructure + applications)
}
```

#### `OdmdEnverEksCluster` 
EKS cluster management:
```typescript
export class OdmdEnverEksCluster extends OdmdEnverCdk {
    // Specialized for Kubernetes cluster provisioning
}
```

#### `OdmdEnverCtnImg`
Container image builds:
```typescript
export class OdmdEnverCtnImg extends OdmdEnver<OdmdBuild<OdmdEnverCtnImg>> {
    // For Docker image building and publishing
}
```

### **Infrastructure Abstractions**

#### **VPC Integration**
```typescript
export interface WithVpc {
    readonly vpcProps: OdmdVpcProps;
    // Standard VPC configuration interface
}
```

#### **RDS Integration**
```typescript
export interface WithRds {
    readonly rdsClusterProps: OdmdRdsClusterProps;
    // Database cluster configuration
}
```

#### **EKS Manifest Management**
```typescript
export class OdmdEksManifest extends Construct {
    // Kubernetes manifest deployment via CDK
}
```

### **Cross-Reference System**

#### **Share References (Platform Integration)**
```typescript
export class OdmdShareOut extends Construct {
    // Publishes Products to the platform's config store (SSM Parameter Store)
}

export class OdmdShareIn extends Construct {
    // Consumes Products from other Envers via config store
}
```

## 🌟 Built-in Platform Services

The library includes contracts for essential platform services:

### **Authentication Service** (`__user-auth`)
- **Purpose**: User authentication for ONDEMANDENV console
- **Integration**: Google OAuth → AWS IAM roles
- **Contract**: `OdmdBuildUserAuth`

### **Networking Service** (`__networking`) 
- **Purpose**: Shared VPC, TGW, and networking infrastructure
- **Cross-account**: Deploys to networking account, consumed by workspaces
- **Contract**: `OdmdBuildNetworking`

### **ContractsLib Service** (`__contracts`)
- **Purpose**: The contractsLib repository deployment itself
- **Self-managing**: ContractsLib manages its own deployment
- **Contract**: `OdmdBuildContractsLib`

### **Default Infrastructure** 
- **VPC/RDS** (`_default-vpc-rds`): Standard database infrastructure
- **EKS** (`_default-kube-eks`): Default Kubernetes clusters
- **Patterns**: Reusable infrastructure templates

## 🚀 Usage Patterns

### **1. Organization ContractsLib Implementation**

Organizations create their own contractsLib that extends this base:

```typescript
// package.json
{
  "dependencies": {
    "@ondemandenv/contracts-lib-base": "0.0.71"
  }
}
```

```typescript
// MyOrgContracts.ts
import { 
  OndemandContracts, 
  OdmdBuild, 
  OdmdEnverCdk,
  Product,
  Consumer 
} from '@ondemandenv/contracts-lib-base';

export class MyOrgContracts extends OndemandContracts<
  MyAccountMappings,
  MyRepoMappings, 
  MyContractsLibBuild
> {
  // Organization-specific service definitions
}
```

### **2. Service Definition Pattern**

```typescript
// Define build configuration
const myServiceBuild = new OdmdBuild<MyServiceEnver>(this, 'MyServiceBuild', {
  githubRepoAlias: 'my-service-repo',
  buildType: 'cdk'
});

// Define environment instances  
const myServiceDev = new MyServiceEnver(this, 'MyServiceDev', {
  build: myServiceBuild,
  targetAccountAlias: 'dev-workspace',
  targetRegion: 'us-west-1',
  
  // What this service publishes
  outputsProduct: new Product(this, 'Outputs'),
  
  // What this service consumes
  databaseConsumer: new Consumer(this, 'Database', rdsEnver.outputsProduct),
  networkingConsumer: new Consumer(this, 'Networking', networkingEnver.outputsProduct)
});
```

### **3. Cross-Account Resource Access**

```typescript
// In your CDK stack implementation
export class MyServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MyServiceStackProps) {
    super(scope, id, props);
    
    // Consume shared networking
    const networkingInputs = new OdmdShareIn(this, 'NetworkingInputs', {
      consumerId: 'NetworkingConsumer' // From contractsLib Consumer definition
    }).jsonValue();
    
    const networkingData = JSON.parse(networkingInputs);
    
    // Use shared VPC
    const vpc = ec2.Vpc.fromVpcAttributes(this, 'SharedVpc', {
      vpcId: networkingData.vpcId,
      availabilityZones: networkingData.availabilityZones,
      privateSubnetIds: networkingData.privateSubnetIds
    });
    
    // Deploy your application
    new ecs.FargateService(this, 'MyService', {
      cluster: new ecs.Cluster(this, 'Cluster', { vpc }),
      // ... service configuration
    });
    
    // Publish your outputs
    new OdmdShareOut(this, 'Outputs', {
      value: JSON.stringify({
        serviceUrl: `https://${loadBalancer.loadBalancerDnsName}`,
        healthCheckEndpoint: '/health'
      })
    });
  }
}
```

## 🔧 Development Workflow

### **For Platform Maintainers**

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run validation tests
npm test

# Generate exports
npm run generate-exports

# Publish new version
npm run pubpub
```

### **For Organization Implementers**

1. **Install as dependency**:
   ```bash
   npm install @ondemandenv/contracts-lib-base
   ```

2. **Create organization contractsLib**:
   ```typescript
   import { OndemandContracts } from '@ondemandenv/contracts-lib-base';
   
   export class MyOrgContracts extends OndemandContracts<...> {
     // Extend base contracts
   }
   ```

3. **Define services and dependencies**:
   ```typescript
   // Service definitions using base classes
   const service = new MyServiceEnver(this, 'MyService', { ... });
   ```

4. **Deploy via ONDEMANDENV platform**:
   ```bash
   # Platform detects contractsLib changes and orchestrates deployments
   git commit -m "Add new service contracts"
   git push
   ```

## 📋 Validation & Testing

The library includes comprehensive validation:

### **Contract Validation**
- ✅ Dependency cycle detection
- ✅ AWS resource naming constraints  
- ✅ Cross-account permission validation
- ✅ Branch/tag immutability rules

### **Type Safety**
- ✅ TypeScript strict mode
- ✅ Interface compatibility checks
- ✅ Generic type constraints
- ✅ Build-time validation

### **Integration Tests**
```bash
npm test  # Runs full validation suite
```

## 🔄 Versioning & Compatibility

- **Semantic Versioning**: Major.Minor.Patch
- **Exact Version Matching**: Platform requires exact base library versions
- **Breaking Changes**: Major version increments for interface changes
- **Migration Guides**: Provided for major version upgrades

## 📂 Repository Structure

```
contracts-base/
├── lib/
│   ├── model/                    # Core type definitions
│   │   ├── odmd-enver.ts        # Base Enver interface
│   │   ├── odmd-build.ts        # Build configuration
│   │   ├── odmd-cross-refs.ts   # Product/Consumer system
│   │   ├── odmd-share-refs.ts   # Platform integration
│   │   ├── odmd-enver-cdk.ts    # CDK-based Envers
│   │   ├── odmd-enver-eks-cluster.ts # EKS cluster Envers
│   │   ├── odmd-enver-ctn-img.ts # Container image Envers
│   │   ├── odmd-vpc.ts          # VPC abstractions
│   │   ├── odmd-rds-cluster.ts  # RDS abstractions
│   │   ├── odmd-eks-manifest.ts # Kubernetes manifest management
│   │   └── odmd-aspect.ts       # CDK aspects
│   ├── repos/                   # Built-in platform services
│   │   ├── __user-auth/         # Authentication service contracts
│   │   ├── __networking/        # Networking service contracts
│   │   ├── __contracts/         # ContractsLib self-management
│   │   ├── _default-vpc-rds/    # Default VPC/RDS templates
│   │   └── _default-kube-eks/   # Default EKS templates
│   ├── OndemandContracts.ts     # Main contracts base class
│   └── OdmdContractsCentralView.ts # Platform view interface
├── tests/                       # Validation test suite
├── scripts/                     # Build and utility scripts
├── package.json                 # Dependencies and scripts
└── README.md                    # This documentation
```

## 🌐 Platform Integration

### **Config Store Integration**
- **OdmdShareOut**: Publishes to AWS SSM Parameter Store
- **OdmdShareIn**: Consumes from parameter store
- **Versioning**: Automatic Product version tracking
- **Events**: EventBridge notifications on Product changes

### **GitHub Integration**
- **Workflow Generation**: Auto-generates GitHub Actions for each Enver
- **Branch Tracking**: Links Envers to Git branches/tags
- **Clone Commands**: `odmd: create@baseEnver` and `odmd: delete`

### **AWS Multi-Account**
- **Cross-Account Roles**: Automatic IAM role assumption
- **Resource Isolation**: Unique naming per Enver instance  
- **Security**: Least-privilege access patterns

## 🤝 Contributing

### **Platform Development**
- **Issues**: Report bugs or feature requests
- **Pull Requests**: Follow TypeScript and testing standards
- **Architecture**: Maintain backward compatibility

### **Organization Usage**
- **Support**: contracts-support@ondemandenv.dev
- **Examples**: Reference sandbox implementation
- **Documentation**: Platform documentation site

## 📚 Resources

- **🌐 Platform Website**: [ondemandenv.dev](https://ondemandenv.dev)
- **📖 Documentation**: [ONDEMANDENV Documentation](https://ondemandenv.dev/documentation.html)
- **🏗️ Architecture Guide**: [Core Concepts](https://ondemandenv.dev/concepts.html)
- **🎯 Use Cases**: [Patterns & Examples](https://ondemandenv.dev/patterns.html)
- **📝 Sandbox Example**: [odmd-contracts-sandbox](https://github.com/ondemandenv/odmd-contracts-sandbox)
- **🧪 Live Console**: [web.auth.ondemandenv.link](https://web.auth.ondemandenv.link/?region=us-west-1)

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**🚀 ONDEMANDENV**: *Taming Distributed System Complexity Through Application-Centric Infrastructure*
