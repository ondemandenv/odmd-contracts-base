# Why Branch-as-Enver — Motivation #1: The Unknown Unknown

> **Generic platform doc.** Applies to any system on ONDEMANDENV. No customer-specific detail.
>
> **What this covers**: *why* ONDEMANDENV models a deployable version as an **enver** (a branch/tag of a bounded context, deployed as a first-class node in a graph) instead of the mainstream **single-version staged-promotion** pipeline. Branch-as-enver is deliberately against the mainstream; this doc gives one of its core first-principles justifications. For *what* envers/constellations are and *how* to wire them, see `ONDEMANDENV_PLATFORM.md` (§"The CI/CD Inversion", §"Service Constellations") and `ENVER_BASED_SERVICE_CONTEXT_PATTERN.md`.
>
> **Companion article** (published, full narrative + a production incident): [Routing Is Atomic. Deployment Is Not.](https://ondemandenv.dev/articles/k8s-staging-mindset-kills-migration/) — read §"When the Bug Is an Unknown Unknown, Only Live Traffic Finds It".

## The mainstream model, and why it feels safe

The mainstream stack — one `main` branch, one tag per component, a staged promotion pipeline (dev → test → stage → prod rings, one version per ring) — optimizes for auditability and reproducibility. Every layer converges to a single version. It answers exactly one question well:

> **"Is this code version safe to promote?"**

For managing *infrastructure* (network policies, mesh control plane, certificate rotation) this is the right model — you want exactly one version running.

## The blind spot: unknown unknowns

A staged pipeline validates by inspection + gates: pod healthy, tests green, bake time elapsed, promote. This catches **known risks** — things you can write an acceptance criterion for.

It cannot catch an **unknown unknown**: a failure mode **whose precondition is manufactured by production traffic itself**, invisible to any inspection of the artifact, the config, or even a live, healthy instance — until that instance has absorbed enough *real* load to cross the precondition.

The companion article documents a standard-shaped case (paraphrased):

- A hardening change (swap a base image for a nonroot/minimal one) rolls through every pre-production ring reporting **healthy at every signal** for weeks — process up, ready, zero restarts, release `Ready`.
- It breaks production silently: a uid mismatch makes a backing store's *background save* fail; the store's "protect against data loss" default then rejects all subsequent **writes**; the capability that depends on those writes fails **open**, silently disabling itself on live traffic.
- The failing code path is **write-volume-gated** — lazy by design, it only runs after enough real writes accumulate. Pre-production rings carry **no real traffic**, so that path was **never executed at all** in any ring — not "ran and passed," never ran.

Key consequences, which are the actual argument:

1. **More testing does not fix it.** You cannot write an acceptance criterion for "the mismatch that only manifests after N dirty keys accumulate under real load." Nobody can enumerate it in advance — that is what *unknown* means.
2. **Ring-by-ring gating does not fix it.** Gating the change exactly like a version bump only postpones the identical, still-undetected exposure by however many days the pre-GA rings run — those rings still carry no real traffic.
3. **The healthy signals are honest and useless.** Every signal the pipeline knows how to check was green, for the entire incident. The pipeline reported truthfully about the unit it models; that unit was never where the failure lived.

## Why this is a *structural* argument, not a tooling complaint

The failure unit was never a container. It was a **cross-cutting capability** — a contract spanning multiple components and their opposite failure-mode defaults (one fails closed, one fails open), scoped to "every request on this slice of traffic." The mainstream object model has:

- no object for that capability,
- no health signal for it,
- and therefore **no rollback primitive** for it.

So the single-version pipeline's blind spot is not "someone configured the gate wrong." It is that the model has **no representation of the thing that actually failed**, and its convergence-to-one-version shape forbids the only validation that could have caught it.

## The only thing that finds an unknown unknown

Feed the change **real production traffic, before full commitment, with an instant way back out** — and make the way-back-out a *routing* decision, not a redeploy:

- Put the new version behind a routing decision; send it a real slice of live traffic (one shard / one tenant / a percentage).
- Watch what happens to the real workload the capability serves.
- If it breaks, **shift the routing weight back** — seconds, no redeploy, no waiting for a bake window.

This requires **two versions of the same thing to run simultaneously and route between them**. That is precisely what a single-version staged pipeline **cannot express** — and precisely what branch-as-enver **does** express.

## How branch-as-enver answers it

ONDEMANDENV makes a **branch/tag of a bounded context** a first-class deployable node (an **enver**), and the producer/consumer graph a first-class routing surface (a **constellation**). This directly supplies what the mainstream stack lacks:

- **The failure unit is the enver (a bounded context), not a container.** An enver is a complete deployable version of a capability — the exact unit whose correctness matters, the one the container-shaped model has no object for.
- **Multiple versions coexist by construction.** Many constellations (e.g. two `main`-rooted revisions) live in the same accounts at once; compatibility is per-edge, proven at `tsc`/`odmdValidate()`. "Run both and compare" is expressible, not smuggled into `if/else` flags.
- **Migration is a per-edge / per-partition routing decision.** Consumers migrate edge by edge; a bad version's blast radius is the slice of traffic routed to it, and rollback is a routing change. This is the blue/green the article argues for, made native.
- **No feature-flag fossilization.** Because version coexistence is modeled in the graph, teams don't simulate branches inside one binary with flags that never get removed (the article's central failure mode).

## Where this sits among branch-as-enver's motivations

The unknown unknown is **one** core motivation — the sharpest first-principles one, because it proves the mainstream model has a blind spot that *no amount of better testing or more rings can close*. Other motivations (per-service blue/green, cheap constellation cloning for feature branches, per-edge compatibility proof, eliminating staging-as-integration-discovery) are documented as platform mechanics in `ONDEMANDENV_PLATFORM.md` §"The CI/CD Inversion". Read them together: this doc is the *why-it's-necessary*; that section is the *what-and-how*.

## One-line takeaway

> A single-version staged pipeline can only ask "is this version safe to promote?" — and it is structurally blind to failures that only exist under real traffic. Branch-as-enver exists so you can instead ask "can I serve this capability from either version and switch instantly?" — the only question that surfaces an unknown unknown.
