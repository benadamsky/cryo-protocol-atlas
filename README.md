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
- `bun run queue:ovarian`
- `bun run queue:islets`
- `bun run seed-benchmark:ovarian`
- `bun run seed-benchmark:islets`
- `bun run evaluate:ovarian`
- `bun run evaluate:islets`
- `bun run loop:ovarian`
- `bun run loop:islets`
- `bun run regress:ovarian`
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
- generates benchmark-backed override proposals only for reviewed mismatches
- scores the candidate proposal set before any apply step
- writes loop artifacts under `data/autoresearch/<domain>/`

This loop is intentionally conservative. It does not rewrite the benchmark, it does not invent new scientific labels, and it should only auto-apply proposals when the reviewed gates are preserved or improved.

`bun run regress:ovarian` runs deliberate perturbation scenarios against the current ovarian benchmark and verifies that the loop proposes the expected reviewed-paper fixes. This is the main proof that the loop can recover from benchmark regressions instead of only reporting no-ops on a clean slice.
