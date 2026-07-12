# CONTRACTSLIB RELEASE PATTERN — Generic

**Generic ONDEMANDENV pattern.** How to release a new version of a customer ContractsLib and get the change to propagate all the way to dependent envers. Uses placeholders (`<pkg>`, `<ver>`, `<org>`, `<main-region>`); substitute your own. Your project's own docs win on any conflict (see `README.md`).

Publishing a ContractsLib is a **chain**, not a single push: bump the version → build → push the contracts repo → CI packs the tgz + writes the `contractsLibLatest` SSM triplet + `npm publish`es → verify the triplet propagated → bump the dep in consumer services. Getting any step out of order produces silent no-op releases or `ETARGET` failures.

Related patterns: `ONDEMANDENV_PLATFORM.md` (why publish happens in one region, "publish once copy to N regions"), `SERVICE_ONBOARDING_PATTERN.md` (adding a new build to the graph), `ContractsLib_PROJECT_SETUP_PATTERN.md`.

---

## The invariant: version MUST change on every meaningful release

Republishing the **same** version number updates the `contractsLibLatest` SSM **sha** but NOT the `ver` field of the `(sha, pkg, ver)` triplet. Consumers keyed on `ver` will NOT redeploy — a silent no-op release. **Bump `package.json` version on every meaningful contracts change.** Never republish the same version.

---

## Release procedure

### Step 0 — Preflight
- Fetch; confirm you're on the repo's **publishing branch** (the default branch — publish happens there; other enver branches, if any, exist only so downstream envers in those regions resolve `contractsLibLatest` from their local SSM).
- Inspect the working tree — the version bump is committed together with the actual contract change; stop if the tree is dirty with unrelated files.
- **Base-lib check:** if the change requires a newer `@ondemandenv.dev/contracts-lib-base`, that base is a **separate prerequisite release** that must land first — flag it, don't fold it in.

### Step 1 — Bump the version
Set an explicit new semver (or patch+1). Enforce the invariant above.

### Step 2 — Build + verify locally
Run the repo's build (typically `tsc --build` + docs copy). Must be green before pushing — CI runs the same. Optionally `npm pack --dry-run` to confirm the tgz shape and version.

### Step 3 — Commit
Stage `package.json` + the actual contract change (+ regenerated `dist` if the repo commits `dist` — check per repo, don't assume). One commit for the logical change.

### Step 4 — Push (this is what publishes)
Push the publishing branch. **Push triggers CI.** Who pushes and with which credentials is ecosystem-specific. If the ContractsLib is branch-as-enver (multiple region branches), fast-forward all enver branches to the new tip (single-path discipline — one shared tip SHA, never N divergent commits) before/as you push.

CI (the ContractsLib build workflow) then:
1. packs `<pkg>-<ver>.tgz`,
2. uploads it to **each region's** central-artifact S3 bucket (publish-once-copy-to-N-regions),
3. writes the `contractsLibLatest` SSM triplet `(sha, pkg, ver)`,
4. `npm publish`es to the package registry.

### Step 5 — Watch CI to green
Watch the ContractsLib workflow run to success. **But "success" ≠ registry fully propagated** — see the race in Step 7.

### Step 6 — Verify the SSM triplet propagated (mandatory)
Do NOT trust the git push or even the CI "success" as proof the triplet moved. Read the center account's SSM in the main region (read-only creds) for the `contractsLibLatest` parameter under the contractsLib path and confirm the returned `(pkg, ver)` matches what you just published. This is the authoritative "did the release land" signal.

### Step 7 — Consumer fan-out (bump the dep in services)
Consumers keyed on the new `ver` only redeploy once they reference it. Per dependent service that must move now:
1. Bump the ContractsLib dep to the new version (bare `<ver>` from the registry — not a `file:*.tgz` ref).
2. Apply the bump once and fast-forward the enver branches (shared-tip single-path) — never N divergent commits.
3. Push.

**Publish/consume race:** a service pushed seconds after the contracts CI reports success can still fail `ETARGET: No matching version` — the registry hadn't propagated. Expected; re-run the service CI once the publish settles.

**Ordering:** always push contracts FIRST (Steps 4–6 fully green) BEFORE pushing services that reference the new version, else `ETARGET`.

---

## Cross-cutting notes

- **ContractsLib publishes in only ONE region** (the main region). `npm publish` is inherently single-writer; the other region branches exist purely for artifact distribution (each region gets its own tgz copy + local `contractsLibLatest` SSM producer so downstream envers resolve without cross-region reads). See `ONDEMANDENV_PLATFORM.md`.
- **CI "success" is not proof of registry/SSM propagation** — Step 6 verification is mandatory before Step 7.
- **A base-lib (`contracts-lib-base`) bump is a separate prerequisite release** — flag and land it first; don't bundle.
- **The deploy is event-driven:** publishing the new triplet triggers dependent envers to re-run on their next trigger; convergence takes 1–N workflow runs.
- **Credentials / tokens / account IDs / the per-region map are ecosystem-specific** — this generic pattern omits them deliberately. Consult your customer's own operational docs.
