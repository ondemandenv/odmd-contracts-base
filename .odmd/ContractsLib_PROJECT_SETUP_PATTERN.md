# ONDEMANDENV Platform: TypeScript ContractsLib Project Setup Pattern

This document defines the **standardized TypeScript project setup** for any `contractsLib` built for the ONDEMANDENV platform. Adhering to this pattern ensures consistency, maintainability, and a clean separation between distributable code and test artifacts.

## 🎯 Core Philosophy: Build vs. Test Separation

The fundamental principle is to maintain two distinct compilation contexts:

1.  **Library Build**: Compiling the clean, production-ready library code for publication as an NPM package.
2.  **Testing**: Compiling and running tests within a development context, including all necessary test files and development dependencies.

This strict separation prevents test-related code and artifacts from being included in the final distributable package, leading to smaller, cleaner packages and more reliable builds.

## 🏗️ Standard Configuration Files

A standard `contractsLib` project MUST include the following configuration files at its root.

### 1. `tsconfig.json` (Primary Build Configuration)

*   **Purpose**: This is the **authoritative** configuration for building the production library.
*   **Scope**: It MUST be configured to **only** include the library's source files. The `include` array should be limited to `["index.ts", "lib/**/*.ts"]`.
*   **Output**: When `tsc` is run with this configuration, it compiles the source into JavaScript and generates type definitions (`.d.ts`) in the `dist/` directory. Test files MUST be excluded.

**Example `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "declaration": true,
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["index.ts", "lib/**/*.ts"],
  "exclude": ["node_modules", "tests"]
}
```

### 2. `tsconfig.test.json` (Test Environment Configuration)

*   **Purpose**: A dedicated configuration used **exclusively** by the test runner (Jest and `ts-jest`).
*   **Inheritance**: It MUST `extend` the primary `tsconfig.json` to inherit base compiler settings.
*   **Scope**: It MUST override the `include` property to encompass all TypeScript files required for testing, typically `["**/*.ts"]`. This ensures that test files in the `tests/` directory are correctly picked up by the test runner.

**Example `tsconfig.test.json`:**
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    // No outDir needed as ts-jest compiles in-memory
    "outDir": "" 
  },
  "include": ["**/*.ts"]
}
```

### 3. `jest.config.js` (Test Runner Configuration)

*   **Purpose**: Configures the Jest test runner.
*   **Critical Link**: It MUST be configured to use `ts-jest` as a transformer and **explicitly point it to use `tsconfig.test.json`**. This is the crucial connection that enables the separate testing environment.

**Example `jest.config.js`:**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json'
    }
  }
};
```

---

## ⚙️ Automated `index.ts` Generation

To simplify maintenance of the library's main entry point (`index.ts`), it is recommended to automate its generation. This ensures that all modules within the `lib/` directory are consistently exported without manual intervention.

### `.scripts/generate-exports.ts`

A script, typically located at `.scripts/generate-exports.ts`, can be used to scan the `lib/` directory and create `export * from '...'` statements for each module.

**Example `.scripts/generate-exports.ts`:**
```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

const libPath = path.join(__dirname, '../lib');
const indexPath = path.join(__dirname, '../index.ts');

// Find all .ts files in the lib directory, excluding tests and d.ts files
const files = glob.sync('**/*.ts', {
  cwd: libPath,
  ignore: ['**/*.d.ts', '**/*.test.ts', '**/__tests__/**']
});

// Generate 'export * from ...' statements
const exportStatements = files
  .map(file => file.replace(/\.ts$/, ''))
  .map(file => file.replace(/\\/g, '/')) // Normalize path for Windows
  .map(file => `export * from './lib/${file}';`)
  .join('\n');

// Overwrite index.ts with the generated exports
fs.writeFileSync(indexPath, exportStatements + '\n');

console.log(`Generated exports in ${indexPath}`);
```

---

## 📦 Standard NPM Scripts

The `package.json` file MUST define the following scripts to manage the build and test lifecycle.

*   `"prebuild"` (Optional, but Recommended)
    *   **Command**: `ts-node .scripts/generate-exports.ts`
    *   **Action**: Automatically generates the main `index.ts` file before the build starts. By using the `prebuild` lifecycle script, `index.ts` is automatically updated every time `npm run build` is executed, ensuring the distributable package is always complete.

*   `"build"`
    *   **Command**: `tsc --build` (or simply `tsc`)
    *   **Action**: Runs the TypeScript compiler using the primary `tsconfig.json`. This compiles the library source from `lib/` and `index.ts` into the `dist/` directory, preparing the package for publishing.

*   `"test"`
    *   **Command**: `jest`
    *   **Action**: Runs the Jest test runner. `ts-jest` automatically handles the in-memory compilation of test files and their imported dependencies using the configuration specified in `tsconfig.test.json`. No separate, pre-compilation build step is required to run tests.

*   `"clean"`
    *   **Command**: `rm -rf dist tsconfig.tsbuildinfo`
    *   **Action**: Provides a simple and direct way to remove all build artifacts and caches, ensuring a clean state for a fresh build.

## ✅ Benefits of this Pattern

- **Clean Distributables**: Guarantees that no test code is ever published.
- **Automated Exports**: `index.ts` is always up-to-date, reducing manual effort and errors.
- **Efficiency**: `npm run test` is fast as it doesn't require a full disk-based build first.
- **Reliability**: Separate configurations prevent conflicts between build and test environments.
- **Clarity**: The purpose of each configuration file and script is clear and unambiguous.
- **Consistency**: Provides a standardized, platform-aligned structure for all TypeScript-based `contractsLib` projects.

---

## 🏛️ Critical Implementation Patterns

Due to the complex, circular-generic types inherent in the `@ondemandenv.dev/contracts-lib-base` framework, the following implementation patterns are **mandatory** to ensure the TypeScript compiler can correctly resolve all types.

### 1. `Build` Class Structure

Every service `Build` class (e.g., `IdentityServiceBuild`) **must** include a specific getter for the `contracts` property. This getter retrieves the `scope` from the construct node and casts it to the project's specific `OndemandContracts` implementation.

**Example:**
```typescript
// In <ServiceName>Build.ts
import { OndemandContractsAnonymId } from './OndemandContractsAnonymId';

export class MyServiceBuild extends OdmdBuild<MyServiceEnver> {
  // ... other properties

  get contracts(): OndemandContractsAnonymId {
    return this.node.scope as OndemandContractsAnonymId;
  }
}
```

### 2. `Enver` Class Structure

Every service `Enver` class (e.g., `IdentityServiceEnver`) requires two key modifications to resolve the circular generic dependency between the `Build` and `Enver` classes:

1.  **Explicit `owner` Property:** It must declare a `readonly owner` property that is explicitly typed to its corresponding `Build` class (e.g., `readonly owner: MyServiceBuild;`).
2.  **Specific Constructor:** The constructor must accept the specific `Build` type for its `owner` parameter and pass it directly to the `super()` call.
3.  **Producer Instantiation:** All `OdmdCrossRefProducer` instances must be declared as properties but instantiated *inside* the constructor, after the `super()` call.

**Example:**
```typescript
// In <ServiceName>Enver.ts

export class MyServiceEnver extends OdmdEnverCdk {
  // 1. Explicitly typed owner property
  public readonly owner: MyServiceBuild;

  // Declare producer property
  public readonly myApiBaseUrl: OdmdCrossRefProducer<MyServiceEnver>;

  constructor(
    owner: MyServiceBuild, // 2. Use the specific Build type
    account: string,
    region: string,
    rev: SRC_Rev_REF,
  ) {
    super(owner, account, region, rev);
    this.owner = owner;

    // 3. Instantiate producer in the constructor
    this.myApiBaseUrl = new OdmdCrossRefProducer(this, 'myApiBaseUrl');
  }
  // ... other methods
}
```

### 3. Main Contracts Class (`OndemandContracts<...>`)

The main contracts class orchestrates the builds and their wiring.

- **Build Instantiation:** All service builds are instantiated in the `initializeBuilds()` method, which is called by the base class constructor.
- **Dependency Wiring:** A helper method like `wireConstellation` should be used to connect the producers and consumers for each environment (`mock`, `dev`, `main`).

### 4. Contracts Library Build (`OdmdBuildContractsLib<...>`)

The build class for the contracts library itself is special. Its constructor's `super()` call takes two arguments: the `scope` and a string literal for the `buildId`.

**Example:**
```typescript
// In OdmdBuildContractsAnonymId.ts
constructor(scope: OndemandContractsAnonymId) {
  // The second argument is a string literal buildId
  super(scope, 'contracts-lib');
}
```
