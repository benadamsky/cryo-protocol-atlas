# Cryo Protocol Atlas

Cryo Protocol Atlas is a protocol-intelligence and wedge-validation system for cryopreservation literature.

Its near-term job is not autonomous discovery. Its job is to help a scientist, operator, or investor answer:

- what is the best current cryopreservation wedge?
- how strong is the evidence behind that wedge?
- where are the biggest contradictions or evidence gaps?
- what should be tested next?

Atlas is currently most useful for:

- comparing candidate wedges
- turning fragmented literature into structured protocol evidence
- identifying decision-relevant evidence gaps
- surfacing contradictions and confounds
- generating next-experiment packets
- making the current recommendation and its limits explicit

## Current scope

Atlas is intentionally focused on two domains right now:

- `islets` - current lead proving ground
- `ovarian-tissue` - current runner-up / comparison wedge

The repo is currently optimizing for depth, wedge confidence, and experiment quality in these two domains before expanding to additional domains.

## What Atlas is not yet

Atlas is not yet:

- a discovery engine
- an autonomous science system
- a molecule-design platform
- a wet-lab automation platform
- a source of validated biological truth beyond the current reviewed slice

## Truth boundary

Atlas is designed to stay conservative.

- Reviewed evidence is the basis of wedge truth.
- Seeded and abstract-only evidence can inform prioritization, but should not be overread.
- Discovery outputs are additive and downstream.
- LLM-assisted drafting may help triage or prefill structured artifacts, but it does not automatically become reviewed truth.
- Recommendation confidence is always scoped to the current reviewed slice, not experimental validation.

## Agent guidance

- Prefer improving `islets` and `ovarian-tissue` over adding new domains.
- Keep reviewed evidence as the basis of wedge truth.
- Optimize for decision impact and experiment quality.
- Keep discovery downstream from the trusted atlas loop.
- Avoid broad autonomy features unless they directly improve current wedges.

## Core workflow

For each domain, Atlas currently follows this rough flow:

1. ingest and refresh literature
2. extract protocol evidence into structured artifacts
3. evaluate against benchmarked reviewed truth
4. select the active wedge
5. build wedge matrix, evidence gap queue, contradiction report, and experiment packets
6. run a bounded conservative loop to improve the current slice

The core question is always:

**what is the most defensible wedge right now, what blocks conviction, and what should be tested next?**

## Canonical human-facing artifacts

These are the most important outputs for understanding a domain:

- `active-wedge.{json,md}` - current wedge recommendation
- `wedge-benchmark-matrix.{json,md}` - core evidence matrix for that wedge
- `wedge-evidence-gap-queue.{json,md}` - ranked evidence gaps by decision impact
- `experiment-packets.{json,md}` - concrete next-experiment packets
- `wedge-contradiction-report.{json,md}` - contradictions and confounds
- `wedge-brief.{json,md}` - best domain-level strategy summary
- `call-packet.{json,md}` - one-page external discussion artifact
- `opportunity-scan.{json,md}` - cross-domain comparison

## Current strategy

Atlas is moving toward a bounded research acceleration loop for the current domains.

Near-term priorities are:

- remove hard stalls from pending enrichment
- rank work by decision impact
- improve islets as the lead proving ground
- improve ovarian as a cleaner comparison wedge
- use cautious LLM drafting only for low-risk triage
- track artifact deltas so each run shows whether wedge quality improved

Do not add a third domain yet unless there is a very strong reason.

## Common commands

Most work should start from these entrypoints:

- `bun run run-batch:ovarian`
- `bun run run-batch:islets`
- `bun run cycles:ovarian`
- `bun run cycles:islets`
- `bun run cycles:all`
- `bun run active-wedge:ovarian`
- `bun run active-wedge:islets`
- `bun run matrix:ovarian`
- `bun run matrix:islets`
- `bun run gap-queue:ovarian`
- `bun run gap-queue:islets`
- `bun run experiments:ovarian`
- `bun run experiments:islets`
- `bun run contradictions:ovarian`
- `bun run contradictions:islets`
- `bun run wedge:ovarian`
- `bun run wedge:islets`
- `bun run call:ovarian`
- `bun run call:islets`
- `bun run opportunity-scan`
- `bun run health-report`
- `bun run typecheck`

---

## Full script reference

### Web app

- `bun run web`
- `bun run web:build`
- `bun run web:typecheck`

### Ingest and discovery

- `bun run ingest:ovarian`
- `bun run ingest:islets`
- `bun run discover-imports:ovarian`
- `bun run discover-imports:islets`
- `bun run discover:ovarian`
- `bun run discover:islets`
- `bun run discover-queue:ovarian`
- `bun run discover-queue:islets`
- `bun run discover-packet:ovarian`
- `bun run discover-packet:islets`
- `bun run discover-refresh:ovarian`
- `bun run discover-refresh:islets`
- `bun run discover-refresh:all`
- `bun run validate-discovery-refresh`

### Extraction and analysis

- `bun run extract:ovarian`
- `bun run extract:islets`
- `bun run analyze:ovarian`
- `bun run analyze:islets`
- `bun run normalize:ovarian`
- `bun run normalize:islets`

### Wedge outputs

- `bun run active-wedge:ovarian`
- `bun run active-wedge:islets`
- `bun run wedge:ovarian`
- `bun run wedge:islets`
- `bun run matrix:ovarian`
- `bun run matrix:islets`
- `bun run gap-queue:ovarian`
- `bun run gap-queue:islets`
- `bun run experiments:ovarian`
- `bun run experiments:islets`
- `bun run contradictions:ovarian`
- `bun run contradictions:islets`
- `bun run call:ovarian`
- `bun run call:islets`
- `bun run opportunity-scan`
- `bun run agenda`

### Benchmarking and loop control

- `bun run queue:ovarian`
- `bun run queue:islets`
- `bun run seed-benchmark:ovarian`
- `bun run seed-benchmark:islets`
- `bun run evaluate:ovarian`
- `bun run evaluate:islets`
- `bun run loop:ovarian`
- `bun run loop:islets`
- `bun run review-benchmark:ovarian`
- `bun run review-benchmark:islets`
- `bun run apply-benchmark:ovarian`
- `bun run apply-benchmark:islets`
- `bun run autopromote-benchmark:ovarian`
- `bun run autopromote-benchmark:islets`
- `bun run run-batch:ovarian`
- `bun run run-batch:islets`
- `bun run cycles:ovarian`
- `bun run cycles:islets`
- `bun run cycles:all`
- `bun run health-report`

### Enrichment and regression

- `bun run enrichment-queue:ovarian`
- `bun run enrichment-queue:islets`
- `bun run regress:ovarian`
- `bun run regress:islets`

### Optimizer lane

- `bun run optimizer:evaluate`
- `bun run optimizer:loop`
- `bun run test:optimizer`

### Validation

- `bun run test:discovery`
- `bun run test:normalize`
- `bun run typecheck`

---

## Current MVP boundary

The current repo is a protocol-intelligence MVP, not a discovery engine.

It currently establishes:

- workspace structure
- shared schemas
- literature ingest and refresh flow
- raw and processed data snapshots
- benchmarked reviewed-vs-seeded evaluation
- conservative protocol extraction with evidence snippets
- protocol-step candidates
- contradiction review
- wedge selection
- wedge benchmark matrices
- evidence-density queues
- next-experiment packets
- benchmark-backed override hooks
- baseline vs resolved atlas impact reporting
- bounded autoresearch loops
- cross-domain comparison between islets and ovarian tissue

The key value today is not "discover new CPAs autonomously."
The key value today is making wedge choice, evidence limitations, and next-step experiments much more explicit and much easier to reason about.

## Discovery lane

The benchmarked atlas loop remains conservative and slice-stable. A separate discovery lane lives under `data/discovery/<domain>/`.

The purpose of the discovery lane is to widen the candidate evidence frontier without mutating the trusted atlas slice.

### Discovery lane principles

- Discovery outputs are additive.
- They do not directly mutate `data/processed/<domain>/`, benchmarks, or override files.
- Promotion into the trusted atlas slice should remain review-driven.
- Discovery is downstream from protocol intelligence, not a replacement for it.

### Discovery commands

- `bun run discover:<domain>` queries a broader literature surface and merges candidates from multiple sources.
- `bun run discover-imports:<domain>` scans `data/discovery/<domain>/imports/*.json` for normalized external search export files and merges them into `imported-source-records.json`.
- `bun run discover-queue:<domain>` compares candidates against the current domain slice and writes a manual promotion queue for genuinely novel papers.
- `bun run discover-packet:<domain>` turns the current queue into a stricter review packet with explicit novelty basis, source provenance, and review risks.
- `bun run discover-refresh:<domain>` runs import merge + snapshot rebuild + promotion-queue rebuild as one bounded refresh step.
- `bun run validate-discovery-refresh` fails when discovery artifacts are degraded, inconsistent, or when deferred candidates leak into the review packet.

### Current providers

The first discovery providers are:

- `cryodb`
- `openalex`
- `crossref`
- `europe-pmc`

### Discovery file conventions

- `data/discovery/<domain>/manual-source-records.json` is reserved for true manual-only records.
- External search exports should go into `data/discovery/<domain>/imports/`.
- The merged imported feed is written to `data/discovery/<domain>/imported-source-records.json`, preserving per-record provenance.
- Import files should follow `DiscoveryImportFileSchema` in [`packages/shared/src/schema.ts`](./packages/shared/src/schema.ts):
  `{ generatedAt, domain, source, label?, records[] }`

### Scheduler

A separate scheduler entrypoint lives at [`.github/workflows/discovery-refresh.yml`](./.github/workflows/discovery-refresh.yml). It refreshes only `data/discovery/` artifacts, validates the refresh, and only opens a PR when the discovery lane is not degraded.

## Benchmarking model

The repo has a benchmark layer under `data/benchmarks/<domain>/gold-set.json`.

- `reviewed` entries come from explicit curation decisions and are the real gate for future autoresearch loops.
- `seeded` entries are carried from the current resolved atlas snapshot and are useful for regression coverage, but they should be upgraded to reviewed over time.

`bun run evaluate:<domain>` writes:

- `benchmark-summary.json`
- `benchmark-analysis.json`
- `benchmark-report.md`

under `data/processed/<domain>/`.

This is not a discovery engine. It is the evaluation scaffold that lets future bounded loops optimize toward explicit reviewed targets instead of just making the atlas look cleaner.

## Conservative autoresearch loop

`bun run loop:<domain>` runs the first safe loop:

- compares the current resolved atlas against the frozen reviewed benchmark
- generates benchmark-backed override proposals for reviewed mismatches
- generates review-only benchmark depth proposals when reviewed in-scope papers have explicit outcome/step structure that is still missing from the benchmark
- scores the candidate proposal set before any apply step
- writes loop artifacts under `data/autoresearch/<domain>/`

This loop is intentionally conservative.

It does not:

- auto-apply benchmark patches broadly
- invent new scientific labels from thin evidence
- treat abstract-only signal as reviewed truth

It should only auto-apply override proposals when reviewed gates are preserved or improved.

### Regression checks

`bun run regress:<domain>` runs deliberate perturbation scenarios against the current reviewed benchmark and verifies that the loop proposes the expected reviewed-paper fixes.

This is the main proof that the loop can recover from benchmark regressions instead of only reporting no-ops on a clean slice.

### Review and apply flow

- `bun run review-benchmark:<domain>` materializes a decision file plus markdown queue for benchmark-depth proposals, including conservative `accept` vs `defer` recommendations.
- The decision file supports partial acceptance via `acceptedOutcomeClasses` and `acceptedStepPhases` when a proposal is directionally right but too broad.
- `bun run apply-benchmark:<domain>` merges accepted benchmark patches into the gold set and reruns evaluation + loop generation.
- `bun run autopromote-benchmark:<domain>` is a stricter autopilot path that auto-accepts only policy-approved benchmark proposals above the autopromote confidence threshold, then runs benchmark apply + override repair convergence automatically.

## Bounded batch and cycle entrypoints

### `run-batch`

`bun run run-batch:<domain>` is the bounded unattended-run entrypoint.

It currently runs:

- extract
- analyze
- evaluate
- wedge brief
- call packet
- enrichment queue
- loop
- benchmark review queue
- conservative autopromote
- regression checks

It writes `data/autoresearch/<domain>/unattended-batch.{json,md}`.

It also refreshes the domain wedge brief and call packet and will best-effort regenerate the cross-domain opportunity scan if both domain briefs exist.

Pass `--ingest` if you explicitly want a fresh corpus refresh before the batch, for example:

```bash
bun run run-batch:islets -- --ingest
```

### `cycles`

`bun run cycles:<domain>` is the bounded outer loop wrapper.

It runs up to 5 unattended batch cycles by default, auto-applies only already-safe override repairs, and stops early with an explicit reason when:

- the benchmark/override state converges
- pending benchmark proposals still require review
- remaining override proposals are not auto-apply safe
- pending source-enrichment work is the only thing left

It writes `data/autoresearch/<domain>/autoresearch-cycles.{json,md}`.

Examples:

```bash
bun run cycles:islets -- --max-cycles 3
bun run cycles:islets -- --ingest
```

### `cycles:all`

`bun run cycles:all` runs the same bounded outer loop sequentially for `ovarian-tissue` and `islets`.

This is the preferred scheduler entrypoint because it avoids cross-domain artifact races and leaves one cycle report per domain.

## Observer and scheduler layer

The repo includes a scheduler entrypoint in [`.github/workflows/autoresearch-cycles.yml`](./.github/workflows/autoresearch-cycles.yml).

It runs on a weekday schedule plus manual dispatch, executes `bun run cycles:all`, publishes the observer-layer health report into the GitHub Actions step summary, and commits only `data/` outputs back to `main` when the run produced a real artifact delta.

`bun run health-report` writes:

- `data/autoresearch/run-health.json`
- `data/autoresearch/run-health.md`

This is the observer-layer artifact for monitoring the autonomous system:
per-domain stop reason, benchmark/regression health, backlog counts, normalization warnings, and the current wedge read.

The bounded cycle runner refreshes it automatically, and the GitHub Actions workflow publishes the markdown version as the run summary.

## Web UI

`apps/web/` is a lightweight wrapper over the same observer and wedge artifacts.

The web app is intended to present:

- current recommendation
- wedge comparison
- evidence gaps
- experiment packets
- current limits
- downstream discovery framing

without introducing a mutable backend.

For a local preview:

```bash
python3 -m http.server -d apps/web 4173
```

## Optimizer lane

The repo also has a narrow optimizer lane under `packages/optimizer/`.

This is separate from the trusted atlas loop.

### Optimizer principles

- The only mutable optimization target is `packages/optimizer/src/policy.ts`.
- The optimizer does not mutate benchmark gold sets, source enrichment, overrides, or atlas outputs.
- The deterministic optimizer benchmark is still a proxy benchmark.
- Discovery review decisions have not yet replaced it as the optimizer gold set.

### Optimizer commands

- `bun run optimizer:evaluate` builds a cheap deterministic benchmark from reviewed gold-set labels joined against the current matched corpus, then writes runtime artifacts under `data/optimizer/`.
- `bun run optimizer:loop` reads `packages/optimizer/program.md`, hill-climbs one bounded numeric mutation at a time, and keeps only objective-improving policy edits that preserve precision and recall guardrails.

## Human-facing outputs

### Active wedge

`bun run active-wedge:<domain>` writes `data/processed/<domain>/active-wedge.{json,md}`.

This is the explicit reviewed wedge selection artifact with lightweight scoring for:

- scientific relevance
- company relevance
- evidence confidence
- translational potential

### Benchmark matrix

`bun run matrix:<domain>` writes `data/processed/<domain>/wedge-benchmark-matrix.{json,md}`.

This is the decision matrix for the active wedge:
protocol family, CPA backbone, adjuncts, endpoints, authority profile, translational signal, confounds, and wedge relevance.

### Evidence gap queue

`bun run gap-queue:<domain>` writes `data/processed/<domain>/wedge-evidence-gap-queue.{json,md}`.

This is the wedge-scoped evidence-density queue, ranked by decision impact rather than raw backlog.

### Experiment packets

`bun run experiments:<domain>` writes `data/processed/<domain>/experiment-packets.{json,md}`.

These are the decision-useful next-experiment packets for the active wedge.

### Contradiction report

`bun run contradictions:<domain>` writes `data/processed/<domain>/wedge-contradiction-report.{json,md}`.

This is the wedge-specific contradiction view, focused on decision impact rather than generic conflict logging.

### Wedge brief

`bun run wedge:<domain>` writes `data/processed/<domain>/wedge-brief.{json,md}`.

This is the current best artifact for a domain-specific conversation:
standard protocol pattern, protocol families, dominant CPA clusters, contradictions, evidence quality, and top opportunity framing.

### Call packet

`bun run call:<domain>` writes `data/processed/<domain>/call-packet.{json,md}`.

This is the one-page discussion artifact:
standard protocol pattern, benchmark credibility, one sharp wedge, and a lightweight market bridge.

### Opportunity scan

`bun run opportunity-scan` writes `data/processed/opportunity-scan.{json,md}`.

This is a lightweight cross-domain comparison meant to answer a product/company question rather than a literature question:
which wedge looks sharpest right now, what the standard pattern is, where the pain point lives, and why optimization might matter commercially.

The main presentation artifacts for a single wedge are:

- `data/processed/<domain>/active-wedge.md`
- `data/processed/<domain>/wedge-benchmark-matrix.md`
- `data/processed/<domain>/wedge-evidence-gap-queue.md`
- `data/processed/<domain>/experiment-packets.md`
- `data/processed/<domain>/call-packet.md`

## Source enrichment

The remaining depth gaps are often evidence-limited rather than extractor-limited. Atlas treats fuller-source snippets as a curated input rather than an autonomous fetch step.

- `bun run enrichment-queue:<domain>` builds `data/curated/<domain>/source-enrichment.json` plus a markdown queue from the current benchmark evidence audit.
- Only `reviewed` source-enrichment records are consumed during extraction.
- Reviewed excerpts are appended to the source text seen by the extractor and logged as `source-enrichment` evidence snippets.

This keeps the loop conservative:
richer evidence can improve extraction, but the system does not pretend that abstract-only papers contain more signal than they actually do.

## Canonical protocol layer

Atlas includes a derived canonical protocol artifact built from the resolved post-override extraction snapshot.

- `bun run normalize:<domain>` writes `data/processed/<domain>/normalized-protocols.json` plus `normalized-protocol-report.md`.
- The normalized artifact is additive. It does not replace extraction or benchmark logic.
- The first pass is intentionally conservative: canonical chemical names, normalized measurement parsing, and step-to-step transition hints.
