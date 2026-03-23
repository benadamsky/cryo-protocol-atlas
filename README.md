# Cryo Protocol Atlas

Cryo Protocol Atlas is an MVP protocol-intelligence layer built on top of CryoRepository.

The first vertical slice focuses on ovarian tissue vitrification literature:

- ingest papers and chemicals from CryoRepository
- filter papers into a narrow domain corpus
- normalize metadata into a stable local snapshot
- extract protocol-family, chemical, temperature, duration, and outcome evidence from titles/abstracts
- derive protocol-step candidates from the literature
- generate a protocol atlas with quality signals and next-experiment suggestions
- create a manual review queue for unresolved papers
- apply curated overrides and measure their impact on atlas quality
- freeze a seed benchmark with reviewed vs seeded labels
- score baseline vs resolved outputs against benchmark gates

The next scaffolded domain is:

- `islets`

## Scripts

- `bun run ingest:ovarian`
- `bun run ingest:islets`
- `bun run extract:ovarian`
- `bun run extract:islets`
- `bun run analyze:ovarian`
- `bun run analyze:islets`
- `bun run wedge:ovarian`
- `bun run wedge:islets`
- `bun run call:ovarian`
- `bun run call:islets`
- `bun run opportunity-scan`
- `bun run agenda`
- `bun run queue:ovarian`
- `bun run queue:islets`
- `bun run seed-benchmark:ovarian`
- `bun run seed-benchmark:islets`
- `bun run evaluate:ovarian`
- `bun run evaluate:islets`
- `bun run normalize:ovarian`
- `bun run normalize:islets`
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
- `bun run enrichment-queue:ovarian`
- `bun run enrichment-queue:islets`
- `bun run regress:ovarian`
- `bun run regress:islets`
- `bun run typecheck`

## Current MVP boundary

The current repo is a protocol-intelligence MVP, not a discovery engine. It establishes:

- workspace structure
- shared schemas
- CryoRepository API client
- domain tagging for ovarian tissue
- raw/processed data snapshots
- heuristic protocol extraction with evidence snippets
- protocol-step candidates
- contradiction review
- next-experiment suggestions
- evidence-scored research hypotheses
- cross-domain research agenda output
- manual override hooks for full-text resolution
- baseline vs resolved atlas impact reporting
- benchmark seeding for benchmarked slices
- reviewed-gate evaluation for inclusion/exclusion and field accuracy
- second-domain scaffold for islet cryopreservation literature

## Benchmarking model

The repo now has a benchmark layer under `data/benchmarks/<domain>/gold-set.json`.

- `reviewed` entries come from explicit curation decisions and are the real gate for future autoresearch loops.
- `seeded` entries are carried from the current resolved atlas snapshot and are useful for regression coverage, but they should be upgraded to reviewed over time.
- `bun run evaluate:<domain>` writes `benchmark-summary.json`, `benchmark-analysis.json`, and `benchmark-report.md` under `data/processed/<domain>/`.

This is still not a discovery engine. It is the evaluation scaffold that lets future autonomous loops optimize toward explicit reviewed targets instead of just making the atlas look cleaner.

`islets` now follows the same path as ovarian tissue: ingest, extract, curate, benchmark, then loop.

## Conservative autoresearch loop

`bun run loop:<domain>` runs the first safe loop:

- compares the current resolved atlas against the frozen reviewed benchmark
- generates benchmark-backed override proposals for reviewed mismatches
- generates review-only benchmark depth proposals when reviewed in-scope papers have explicit outcome/step structure that is still missing from the benchmark
- scores the candidate proposal set before any apply step
- writes loop artifacts under `data/autoresearch/<domain>/`

This loop is intentionally conservative. It does not auto-apply benchmark patches, it does not invent new scientific labels from thin evidence, and it should only auto-apply override proposals when the reviewed gates are preserved or improved.

`bun run regress:<domain>` runs deliberate perturbation scenarios against the current reviewed benchmark and verifies that the loop proposes the expected reviewed-paper fixes. This is the main proof that the loop can recover from benchmark regressions instead of only reporting no-ops on a clean slice.

`bun run review-benchmark:<domain>` materializes a decision file plus markdown queue for benchmark-depth proposals, including conservative `accept` vs `defer` policy recommendations. The decision file also supports partial acceptance via `acceptedOutcomeClasses` and `acceptedStepPhases` when a proposal is directionally right but too broad. `bun run apply-benchmark:<domain>` merges accepted benchmark patches into the gold set and reruns evaluation + loop generation so the next cycle starts from the updated benchmark. `bun run autopromote-benchmark:<domain>` is a stricter autopilot path that auto-accepts only policy-approved benchmark proposals above the autopromote confidence threshold, then runs benchmark apply + override repair convergence automatically.

`bun run run-batch:<domain>` is the bounded unattended-run entrypoint. It runs extract -> analyze -> evaluate -> wedge brief -> call packet -> enrichment queue -> loop -> benchmark review queue -> conservative autopromote -> regression checks, then writes `data/autoresearch/<domain>/unattended-batch.{json,md}`. It also refreshes the domain wedge brief and call packet and will best-effort regenerate the cross-domain opportunity scan if both domain briefs exist. Pass `--ingest` if you explicitly want a fresh CryoDB ingest before the batch, for example `bun run run-batch:islets -- --ingest`.

`bun run cycles:<domain>` is the bounded outer loop wrapper. It runs up to 5 unattended batch cycles by default, auto-applies only already-safe override repairs, and stops early with an explicit reason when:

- the benchmark/override state converges
- pending benchmark proposals still require review
- remaining override proposals are not auto-apply safe
- pending source-enrichment work is the only thing left

It writes `data/autoresearch/<domain>/autoresearch-cycles.{json,md}`. Pass `-- --max-cycles 3` to shorten the run or `-- --ingest` to include ingest on the first cycle only.

`bun run cycles:all` runs the same bounded outer loop sequentially for `ovarian-tissue` and `islets`. This is the preferred entrypoint for a scheduler because it avoids cross-domain artifact races and leaves one cycle report per domain.

The repo also includes a scheduler entrypoint in [`.github/workflows/autoresearch-cycles.yml`](./.github/workflows/autoresearch-cycles.yml). It runs on weekday schedule plus manual dispatch, executes `bun run cycles:all`, publishes the observer-layer health report into the GitHub Actions step summary, and commits only `data/` outputs back to `main` when the run produced a real artifact delta.

`bun run health-report` writes `data/autoresearch/run-health.{json,md}`. This is the observer-layer artifact for monitoring the autonomous system: per-domain stop reason, benchmark/regression health, backlog counts, normalization warnings, and the current wedge read. The bounded cycle runner refreshes it automatically, and the GitHub Actions workflow publishes the markdown version as the run summary.

`apps/web/` is a lightweight static wrapper over that same observer artifact. `apps/web/dashboard-data.json` is generated from `run-health.json`, so a static host can show the current system state without adding a backend. For a local preview, run `python3 -m http.server -d apps/web 4173`.

## Human-facing outputs

`bun run wedge:<domain>` writes a call-ready wedge brief under `data/processed/<domain>/wedge-brief.{json,md}`. This is the current best artifact for a domain-specific conversation: standard protocol pattern, protocol families, dominant CPA clusters, contradictions, evidence quality, and top opportunity framing.

`bun run call:<domain>` writes `data/processed/<domain>/call-packet.{json,md}`. This is the one-page call artifact: standard protocol pattern, benchmark credibility, one sharp wedge, and a lightweight market bridge.

`bun run opportunity-scan` writes `data/processed/opportunity-scan.{json,md}`. This is a lightweight cross-domain comparison meant to answer a product/company question rather than a literature question: which wedge looks sharpest right now, what the standard pattern is, where the pain point lives, and why optimization might matter commercially.

The main presentation artifacts for a single wedge are:

- `data/processed/<domain>/atlas-report.md`
- `data/processed/<domain>/benchmark-report.md`
- `data/processed/<domain>/call-packet.md`

## Source enrichment

The remaining depth gaps are often evidence-limited rather than extractor-limited. The repo now treats fuller-source snippets as a curated input rather than an autonomous fetch step.

- `bun run enrichment-queue:<domain>` builds `data/curated/<domain>/source-enrichment.json` plus a markdown queue from the current benchmark evidence audit.
- Only `reviewed` source-enrichment records are consumed during extraction.
- Reviewed excerpts are appended to the source text seen by the extractor and logged as `source-enrichment` evidence snippets.
- This keeps the loop conservative: richer evidence can improve extraction, but the system does not pretend that abstract-only papers contain more signal than they actually do.

## Canonical protocol layer

Phase 1 now includes a derived canonical protocol artifact built from the resolved post-override extraction snapshot.

- `bun run normalize:<domain>` writes `data/processed/<domain>/normalized-protocols.json` plus `normalized-protocol-report.md`.
- The normalized artifact is additive. It does not replace extraction or benchmark logic.
- The first pass is intentionally conservative: canonical chemical names, normalized measurement parsing, and step-to-step transition hints.
