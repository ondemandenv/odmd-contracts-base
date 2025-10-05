# TypeScript Project Setup Guide

This document outlines the structure and philosophy behind this TypeScript project's build and test setup. The primary goal is to maintain a clean separation between building the distributable library and running tests.

## Core Philosophy

We use two distinct TypeScript configurations to manage different environments:

1.  **Library Build**: Compiling the library for publication.
2.  **Testing**: Compiling and running tests in a development environment.

This separation prevents test files from being included in the final distributable package and makes both building and testing more efficient and reliable.
 
---

## Configuration Files

### 1. `tsconfig.json`

*   **Purpose**: This is the primary configuration for building the production-ready library.
*   **Scope**: It is configured to **only** include the library's source files (`index.ts` and `lib/**/*.ts`).
*   **Output**: When `tsc` is run with this configuration (e.g., via `npm run build`), it compiles the source into JavaScript and generates type definitions (`.d.ts`) in the `dist/` directory.

### 2. `tsconfig.test.json`

*   **Purpose**: This is a dedicated configuration used **only** by Jest and `ts-jest` for running tests.
*   **Scope**: It extends `tsconfig.json` but overrides the `include` property to grab all TypeScript files in the project (`**/*.ts`), including the test files located in `tests/`.
*   **Usage**: It allows `ts-jest` to compile tests and the source code they import on-the-fly, in-memory, without needing a separate build step before running tests.

### 3. `jest.config.js`

*   **Purpose**: Configures the Jest test runner.
*   **Key Setting**: It's configured to use `ts-jest` as a transformer and explicitly points it to use our `tsconfig.test.json`. This is the crucial link that connects Jest to our test-specific TypeScript setup.

 ---

## Key NPM Scripts

*   `npm run build`
    *   Runs `tsc --build` using `tsconfig.json`.
    *   Compiles the library source from `lib/` and `index.ts` into the `dist/` directory. Use this to prepare the package for publishing.

*   `npm run test`
    *   Runs `jest` directly.
    *   `ts-jest` automatically handles the in-memory compilation of test files and their dependencies using `tsconfig.test.json`. No pre-compilation is needed.

*   `npm run clean`
    *   Runs `rm -rf dist tsconfig.tsbuildinfo`.
    *   A simple and direct way to remove all build artifacts and caches, ensuring a clean state.