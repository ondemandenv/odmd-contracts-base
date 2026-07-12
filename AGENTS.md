# @ondemandenv.dev/contracts-lib-base — Agent Rules (Platform Owner)

This is the **platform base library** — the generic ONDEMANDENV grammar every customer contractsLib extends. Working here = the **Platform Owner** role: maintain the platform primitives (code) and the generic pattern docs, both shipped to every customer.

## Context supply chain

- **The platform patterns are IN THIS REPO** — `./.odmd/*.md` (wired into `opencode.json`). You are their author, not a consumer. Key docs:
  - `ONDEMANDENV_PLATFORM.md` — platform interface/architecture.
  - `ENVER_BASED_SERVICE_CONTEXT_PATTERN.md` — PHASES=ENVERS lifecycle (per-service overview/context/enver).
  - `SYSTEM_OVERVIEW_PATTERN.md` — per-customer system overview lives in the `__contracts` build's `docs/`.
  - `ContractsLib_PROJECT_SETUP_PATTERN.md`, `WHY_BRANCH_AS_ENVER_*` (why branch-as-enver), `SERVICE_PHASE_DEVELOPMENT_PATTERN.md` (bootstrap placeholder), `SYSTEM_SPECIFIC_INPUTS.md`.
  - `SERVICE_ONBOARDING_PATTERN.md` — contract-first onboarding of a new service through the trigger chain to a green mock build.
  - `CONTRACTSLIB_RELEASE_PATTERN.md` — releasing a new ContractsLib version (bump→publish→verify→consumer fan-out).
- **Code** — `lib/model/` (core: OdmdBuild/OdmdEnver/cross-refs), `lib/repos/` (built-in platform builds: `__contracts`/`__user-auth`/`__networking`/`_default-*`), `lib/OndemandContracts.ts`.

## What you maintain here (ships to every customer)

- **Platform primitives** (`lib/model/`): a change here affects ALL customer contractsLibs (seed/sbx/kk extend these). Verify against downstream (`tsc`/build) — this is the symlinked canonical (`odmd-sbx/__contractsLib_base` + `odmd-kk/__contractsLib_base` are symlinks to this dir).
- **`.odmd/` pattern docs**: delivered to every customer via npm (their `node_modules/@ondemandenv.dev/contracts-lib-base/.odmd/`). Keep them generic — no customer-specific detail. When you change a primitive, update the matching pattern doc so customer devs don't get a stale platform model.

## Build

```bash
npm run build   # gen-exports + tsc
npm run test    # requires target_rev_ref, CDK_DEFAULT_ACCOUNT/REGION, CDK_CLI_VERSION
```

## Rules

- Generic only. No customer business semantics in `.odmd/` or `lib/`.
- `.odmd/README.md` is authoritative to customers, but seed/`_odmd` implementer docs win on conflict — keep `.odmd/` in sync (never let it go stale vs the implementation).
- Doc-authority + ecosystem topology + roles live in `odmd-seed/contractsLib-seed/.odmd/` (not here — that's ecosystem-specific, this is generic).
