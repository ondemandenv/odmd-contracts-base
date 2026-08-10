# SERVICE ONBOARDING PATTERN — Generic

**Generic ONDEMANDENV pattern.** How to add a brand-new service (an `OdmdBuild*`) to a customer's contracts graph and drive it to a **green mock build** with producers published on SSM. Uses placeholder names (`<Service>`, `<service>`, `<Cust>`, `<org>`); substitute your own. Your project's own docs win on any conflict (see `README.md`).

The platform is **contract-first and event-driven**: you declare + publish the contract, then a trigger chain assembles the deploy target, the GitHub repo wiring, and the CI workflow on its own. Onboarding is four phases.

Related patterns: `ONDEMANDENV_PLATFORM.md` (platform interface), `ENVER_BASED_SERVICE_CONTEXT_PATTERN.md` (PHASES=ENVERS lifecycle), `ContractsLib_PROJECT_SETUP_PATTERN.md` (contracts project setup), `CONTRACTSLIB_RELEASE_PATTERN.md` (publishing the contract change).

---

## Phase 1 — Declare the contract (contracts change FIRST)

Nothing is wired between services outside contracts. In your ContractsLib:

1. **Author the build class** `lib/repos/<service>/OdmdBuild<Service><Cust>.ts`:
   - Extend `OdmdBuild`; set the build id and the GitHub repo (`<org>/<service>-service`).
   - Declare **producers** via `OdmdCrossRefProducer` (outputs other services consume — API URLs, ARNs, stats). A producer carrying an S3 schema artifact uses `children:[{pathPart:'schema-url', s3artifact:true}]` (see the schema pattern).
   - Declare **consumers** via `OdmdCrossRefConsumer` + `wireX()` methods for each upstream dependency.
   - `initializeEnvers()` → one `OdmdEnver*` per phase: `mock`, `dev`, `main` (target account/region per phase; mock is typically workspace0).
   - Add docs-as-code under `docs/` (`SERVICE_OVERVIEW.md`, `SERVICE_CONTEXT.md`, `{MOCK,DEV,MAIN}_ENVER_CONTEXT.md`) and point the build's `serviceOverviewMD`/`serviceContextMD` + each enver's `enverContextMD` at them.
2. **Register + wire** in `lib/OndemandContracts<Cust>.ts`:
   - Add the service to the `GithubRepos` type + `githubRepos` map (`name:'<service>-service'`).
   - Import + instantiate the build in the constructor, and add it to **every** `wireConstellation('mock'|'dev'|'main', {…})` where it participates. Wire its consumers to upstream envers there. **No forward references** — a `mock` enver can't depend on a `dev`-only output (backwards references are fine: a `dev` enver may consume `mock` producers). **One enver per build per constellation** — never wire two consumers in the same closure at different envers of the same upstream build; `odmdValidate()` throws on it. See `ONDEMANDENV_PLATFORM.md` → "Service Constellations".
   - Export the build from `index.ts`.
3. **Add a build test** asserting the new build is present / exposes its docs.
4. **Bump the ContractsLib version** (see `CONTRACTSLIB_RELEASE_PATTERN.md`). Republishing the SAME version updates the SSM sha but NOT the `ver` field — consumers keyed on `ver` will NOT redeploy.
5. Build green → commit → **push** (publishes). Who pushes and with which credentials is customer/org-specific.

CI (the ContractsLib build workflow) then packs the `<contractsLib>-<ver>.tgz`, uploads it to each region's central-artifact S3 bucket, writes the `contractsLibLatest` SSM triplet, **and `npm publish`es to the package registry** (this last part matters for Phase 4).

---

## Phase 2 — The trigger chain assembles the deploy target (automatic — watch it)

The published version is a domino. Nothing to author; verify each hop:

1. `contractsLibLatest` SSM change → triggers the customer-central build on each customer workspace branch (both/all main regions). Trigger message carries `…,<pkg>,<ver>`.
2. customer-central re-synths pp-stacks → publishes a fresh `cdk.out.zip`.
3. Center-account CodePipeline picks up the zip: **Source → Pub**.
4. pp-stacks stood up in workspace0, each carrying `odmdDepRev = <pkg>=<ver>/<sha>` — the authoritative "built from this contract" signal.

Verify read-only (per your ecosystem's account/region map + read-only role): customer-central runs green (one wave per region), the CodePipeline reaches Pub, and the new service's `BUILD` pp-stack shows `odmdDepRev == <ver>/<sha>`.

---

## Phase 3 — Scaffold the CDK app, create the repo, bootstrap the workflow

In `services/<service>/`:

1. **Scaffold the CDK app** (copy an existing service as a template):
   - `bin/cdk.ts` — instantiate the `OndemandContracts<Cust>`; `getTargetEnver()`; `enver.getRevStackNames()`; construct the stack; call `render()`.
   - `lib/<service>-stack.ts` — **mock phase publishes `OdmdShareOut` stubs** for every producer (placeholder URLs/ARNs); dev/main `throw new Error('… not yet implemented')` until real infra is built. Mock stays cheap (Phase 0 = contract verification, no real spend).
   - `cdk.json`, `tsconfig.json`, `README.md` (point readers at `node_modules/<pkg>/.odmd-<cust>` + `contracts-lib-base/.odmd`).
   - **`package.json` dependency versions — MATCH the ContractsLib, don't copy an old service:**
     - `aws-cdk-lib` = the EXACT version the ContractsLib declares (check `node_modules/<pkg>/package.json`). Mismatch → a nested `aws-cdk-lib` inside the tgz → TS error `Types have separate declarations of a private property 'loadContext'`.
     - `constructs` = a version satisfying that cdk-lib's peer. Copying an older service's constructs version → CI `npm install` fails `ERESOLVE`.
     - the ContractsLib package = the bare published version (`"<ver>"`), resolved from the registry. **Do NOT commit a `file:*.tgz` reference** — works locally but CI resolves from the registry (a `file:` ref in the lock file → `ENOENT` in CI).
   - **Do NOT commit `package-lock.json`.** The build action runs `npm install` (not `npm ci`); let CI regenerate the lock against the registry. A locally-generated lock hardcodes a `file:` or wrong registry URL → `ENOENT` / `E409 checksum mismatch`. Add `package-lock.json` + `.npmrc` to `.gitignore`.
2. **Verify mock synth locally** before pushing, with the required CDK env vars (`ODMD_build_id`, `ODMD_rev_ref=b..mock`, `CDK_DEFAULT_ACCOUNT/REGION`, `CDK_CLI_VERSION`): `npx cdk ls` should list the mock enver stack.
3. **git init → three branches** (`mock`, `dev`, `main`) at ONE commit (branch-as-enver single-path).
4. **Create the repo + push.** The repo MUST exist before the pp-stack's workflow-commit runs. The pp-stack has a `Custom::CdkGithubWF` resource that commits the CI workflow YAML into the repo. If the repo didn't exist when the pp-stack deployed in Phase 2, that resource is `CREATE_FAILED` (404) and the stack is `UPDATE_FAILED`. Fix: create the repo + push, then **re-dispatch customer-central** so CFN retries → `UPDATE_COMPLETE`, YAML committed.
5. **Push each enver branch's content separately** — GitHub sends ONE push event per `git push` invocation; a batched `git push origin mock dev main` may only fire the webhook for the last ref. The EventBridge trigger rule keys on `mock`/`dev` push SSM paths, so push `mock` (and `dev`) explicitly to fire the workflow-dispatch chain (`main` alone won't trigger a mock build).

Verify: the service repo's `.github/workflows` now contains the generated YAML.

---

## Phase 4 — First green build (the dependency gauntlet)

Once the workflow YAML is committed, a push to `mock` (via webhook → EventBridge → the ssm-trigger Lambda) fires `workflow_dispatch`. The build must resolve the ContractsLib package `@<ver>` cleanly. If Phase 3's package.json rules were followed, it's green first try. Failure modes (all at `npm install`):

- `ERESOLVE … constructs` → constructs version doesn't satisfy the cdk-lib peer. Bump constructs.
- `ENOENT … *.tgz` → lock file has a `file:` ref to a tgz not in the repo. Remove the lock file.
- `E409 checksum mismatch` → a hand-patched registry URL is wrong. Remove the lock file; let CI regenerate.

**Green =** `cdk deploy` stands up the mock enver in workspace0 and `OdmdShareOut` writes the producers to SSM (verify the producers appear under the service's `b..mock` share path). Phase 0 complete: contract wired, mock build green, producers published — the service is a live enver. dev/main real infra follows separately.

---

## Cross-cutting notes

- **Contracts change first, always.** Wiring lives only in the ContractsLib; service repos define stacks/runtime only.
- **Order of operations that avoids most pain:** create the `<org>/<service>-service` repo + push branches BEFORE (or concurrently with) the Phase-1 contract push, so the pp-stack's workflow-commit finds the repo on first deploy and Phase 3 step 4's re-dispatch is unnecessary.
- **The trigger chain is event-driven and converges over 1–N re-runs.** A consumer that reports "an upstream hasn't published — re-run after it's green" is an ordering condition, not a bug.
- **Credentials / tokens / account IDs are ecosystem-specific** — this generic pattern deliberately omits them. Consult your customer's own operational docs for who pushes, which token, and the account/region map.
