# SERVICE_CONTEXT — Placeholder

**You should not be reading this file in a real project.** If you are, your ContractsLib hasn't overridden `serviceContextMD` yet.

## Why this file exists

The base library `@ondemandenv.dev/contracts-lib-base` defines a default value for `OdmdBuild.serviceContextMD`:

```ts
readonly serviceContextMD: string = '.odmd/SERVICE_PHASE_DEVELOPMENT_PATTERN.md'
```

That path points here. It's a deliberate fallback: the platform validates that every build's `serviceContextMD` resolves to a real file on disk (see `odmdValidate()`), so a freshly generated ContractsLib that hasn't written its own docs yet still passes validation and can boot. Without this placeholder, every adopter would hit a validation failure on day one before they'd written a single service doc.

This is a **bootstrap placeholder**, not documentation for your service. Ship it and your service has no docs-in-code; reviewers and LLMs reading your ContractsLib will land here instead of learning about your service.

## What you should do

In your ContractsLib, **override** `serviceContextMD` on every `OdmdBuild` subclass with a path to a real, service-specific Markdown file you author.

```ts
export class OdmdBuildMyService extends OdmdBuild<OdmdEnverMyService> {
  readonly serviceOverviewMD = 'src/lib/repos/my-service/docs/SERVICE_OVERVIEW.md';
  readonly serviceContextMD  = 'src/lib/repos/my-service/docs/SERVICE_CONTEXT.md';
}
```

Your `SERVICE_CONTEXT.md` is the navigation hub for a single service. It should describe that service's build-level, enver-agnostic specs: what it owns, what it never handles, its public contracts, and links to per-enver context documents (`MOCK_ENVER_CONTEXT.md`, `DEV_ENVER_CONTEXT.md`, `MAIN_ENVER_CONTEXT.md`).

## What goes in `SERVICE_CONTEXT.md`

See `.odmd/ENVER_BASED_SERVICE_CONTEXT_PATTERN.md` for:

- The full lifecycle model (PHASES = ENVERS, mock → dev → main).
- Templates for `SERVICE_CONTEXT.md`, `SERVICE_OVERVIEW.md`, and the three `*_ENVER_CONTEXT.md` files.
- Checkpoint criteria and quality gates per phase.
- The docs-in-code contract and how `odmdValidate()` enforces it.

Once your ContractsLib exposes real paths for `serviceOverviewMD`, `serviceContextMD`, and `enverContextMD` on every build and enver, this file becomes unreferenced — which is the whole point.

## For LLMs and generators

If you are generating service documentation and you see a ContractsLib still pointing `serviceContextMD` at this file, that is a signal that **the adopter has not yet authored service-specific contexts**. Your next step is to:

1. Read `ENVER_BASED_SERVICE_CONTEXT_PATTERN.md` for the templates.
2. Ask the user for the service-specific inputs listed in `SYSTEM_SPECIFIC_INPUTS.md`.
3. Generate `SERVICE_OVERVIEW.md`, `SERVICE_CONTEXT.md`, and the three per-enver context files under the service's `docs/` directory.
4. Update the `OdmdBuild` / `OdmdEnver` subclasses in the ContractsLib to point at those new files.

Do not copy the content of this placeholder into the adopter's project. It has no service-specific content.
