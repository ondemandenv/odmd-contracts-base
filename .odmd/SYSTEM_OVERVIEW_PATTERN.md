# System-Level Overview Pattern — The `__contracts` Build's Docs

> **Generic platform doc.** Applies to any system on ONDEMANDENV. No customer-specific detail.
>
> **What this covers**: where the **per-customer system big-picture** belongs in docs-in-code, why it's the `__contracts` build's `docs/`, and how it flows to every service owner. Complements `ENVER_BASED_SERVICE_CONTEXT_PATTERN.md` (which covers **per-service** overview/context/enver).

## The gap this closes

Docs-in-code has three per-service documents (`serviceOverviewMD`, `serviceContextMD`, `enverContextMD`) — each scoped to **one** bounded context. A service owner opening their repo sees their own service's docs, but nothing that says *what the whole customer system looks like and where this service sits in it*.

That system-level big picture — the architecture-wide view, cross-service use-case flows, the data/interface map — is a real output, authored by the **Customer Owner** (the contractsLib owner) from domain knowledge, and it is **for every service owner**. It needs a home in the same delivery channel (npm dependency descent) so it lands in each service repo's `node_modules/` alongside the per-service docs.

## Where it belongs: the `__contracts` build's `docs/`

Every contractsLib has a mandatory `__contracts` build (`OdmdBuildContractsLib`) — the meta-build that represents the contractsLib itself. Its `SERVICE_CONTEXT.md` typically says something like *"ContractsLib has one enver describing all envers."* That is exactly the scope of the system overview: **the whole graph, not one node.**

So the per-customer system big-picture is the `__contracts` build's docs-in-code:

```
<contractsLib>/lib/repos/_contracts/docs/
├── SERVICE_OVERVIEW.md   # system-level: what the whole customer system is, its bounded contexts, how they relate
├── SERVICE_CONTEXT.md    # system-level nav hub; links to the design set below
├── <system design docs>  # architecture diagram, use-case flows, data-store interfaces, key technical choices
└── {MOCK,DEV,MAIN}_ENVER_CONTEXT.md  # usually thin — contractsLib has one canonical enver
```

**Why here, not a top-level `.odmd-<customer>/` dir:**
- **In-`dist`, one delivery mechanism.** The build step copies `lib/repos/**/docs/**` into `dist/lib/repos/` (`cpx`), so `_contracts/docs` ships inside `dist` exactly like every per-service `docs/`. A separate top-level dir requires its own `files[]` entry and lives *outside* the `dist/lib/repos/*/docs/` tree — inconsistent and harder to reference.
- **Uniform reference path.** Consumers (and `opencode.json`) reference it with the same relative shape as any service's docs: `node_modules/@<org>/<contractsLib>/dist/lib/repos/_contracts/docs/`. No special-case path.
- **Semantically correct owner.** `__contracts` is the build whose scope *is* the whole system; its docs being the system overview is the natural fit, not an afterthought.

## Who produces it, who reads it

- **Produced by** the Customer Owner (contractsLib owner), from domain knowledge — the same role that authors every service's overview/context/enver and wires the contract graph.
- **Read by** every service owner (human or agent): opening any service repo, the system overview is in `node_modules/.../repos/_contracts/docs/`, giving them the big-picture background — where their service fits, which cross-service flows it participates in — that per-service docs alone don't convey.

## Reference it from `opencode.json`, not just on-demand

Because it lands in `node_modules` in the uniform `dist/lib/repos/_contracts/docs/` location, a service repo's `opencode.json` should wire it into `instructions` (relative path glob) so agents get the system big-picture as always-on context, alongside platform grammar and the service's own docs-in-code. It is background every service owner needs, not a lazy-load nicety.

## Anti-pattern

Do **not** park the system design in a top-level `.odmd-<customer>/_design/` dir shipped via a separate `files[]` entry. It works (it does get packaged) but it's outside the `dist` docs-in-code tree, needs a bespoke reference path, and fragments "where do the docs live" into two schemes. Fold it into `_contracts/docs/`.
