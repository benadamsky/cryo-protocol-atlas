# Cryo Protocol Atlas

Cryo Protocol Atlas reads cryopreservation papers and turns them into structured protocol evidence, then uses that evidence to pick the one experiment most worth running next. It covers three domains, pancreatic islets, ovarian tissue, and hepatocytes, and stays deliberately conservative about what the literature does and does not support.

![Atlas console, islets recommendation](docs/console.png)

Status: built March 2026. The scheduled research loops are off. This is here to read, not a product.

## Who it is for

Anyone trying to answer, for a cryopreservation domain: what is the best current wedge, how strong is the evidence, where are the contradictions, and what should be tested next. That was a scientist, an operator, and an investor when this was written. It is also a worked example of a benchmark-gated literature pipeline if you want to build one.

## What it currently concludes for islets

<!-- Numbers from data/processed/islets/active-wedge.md, data/processed/islets/wedge-benchmark-matrix.md, data/processed/islets/benchmark-summary.json, and data/processed/islets/domain-snapshot.json as of 2026-09-14. -->

Best current wedge: an additive-assisted islet recovery benchmark on a fixed base cryomix. Several islet papers imply that recovery gains come from adjuncts added around a standard DMSO-centered mix rather than from new base CPA chemistry, but nobody has benchmarked those adjuncts head-to-head on one backbone.

Proposed next test: a fixed-backbone additive benchmark with p38 MAPK inhibitor, trehalose, beraprost sodium, and polyvinyl pyrrolidone on a DMSO-centered base mix, with post-thaw function as the primary readout.

Evidence behind that call:

- 3,157 papers fetched from CryoDB, 53 matched to the islets domain, 46 normalized protocols
- 53 benchmark entries, 49 of them reviewed by the pipeline; all six reviewed gates pass
- 6 papers directly relevant to the wedge: 2 primary-backed, 2 human-relevant, 4 abstract-only
- strongest signals: polyvinyl pyrrolidone (primary-backed, rat) and a p38 MAPK inhibitor (primary-backed, human)
- evidence confidence 0.79, scientific relevance 0.89, translational potential 0.73

The read is that the literature justifies a focused additive benchmark. It does not justify claiming a winning adjunct.

Ovarian tissue is the comparison domain. Its wedge is a head-to-head DMSO-centered benchmark, but reviewed outcome coverage there is 0.43, so treat it as a proposal rather than a call.

Hepatocytes is the newest domain (September 2026) and is provisional. Its corpus is 306 PubMed papers that passed the cryo filter (CryoDB was offline when it was built), none of its benchmark rows are reviewed yet, and the pipeline's first wedge, an additive-assisted attachment and function benchmark on a fixed DMSO-centered mix, carries an evidence confidence of 0.09. It is there to show the registry working end to end, not to be acted on.

## Truth boundary

Atlas is designed to stay conservative.

Nothing in this repository is human-reviewed. "Reviewed" means pipeline-reviewed: a benchmark row counts as reviewed when the pipeline has a curated override for it, and a source-enrichment record counts as reviewed when the scripts and the LLM enrichment step have attached excerpts to it and re-scored the row against the benchmark gates. The gold sets, the reviewed trust rows, and the source-enrichment records are all produced that way.

- Pipeline-reviewed evidence is the basis of wedge truth.
- Seeded and abstract-only evidence can inform prioritization, but should not be overread.
- Discovery outputs are additive and downstream.
- LLM enrichment drafts are triaged before they count as reviewed; auto-triage is off until the drafts clear an F1 of 0.85 against existing reviewed records.
- Recommendation confidence is always scoped to the current reviewed slice, not experimental validation.

Atlas is not a discovery engine, an autonomous science system, a molecule-design platform, a wet-lab automation platform, or a source of validated biological truth beyond the reviewed slice.

## Run it

Requires Bun 1.2 or newer. All generated artifacts are checked in under `data/`, so the web app and every report script work without network access or API keys.

```bash
bun install
bun run web          # Next.js console at http://localhost:3000
bun run web:build    # production build
```

Every pipeline script takes the domain id as its argument (`bun run list-domains` prints them). CryoDB (`cryodb.replit.app`) has been offline since September 2026; `bun run fetch-pubmed <domain>` followed by `bun run ingest <domain> --corpus imports` builds the corpus from PubMed instead, which is how the hepatocytes slice was made.

```bash
bun run ingest islets        # refresh the corpus from CryoDB (network)
bun run extract islets       # heuristic protocol extraction with evidence snippets
bun run evaluate islets      # score against the reviewed benchmark
bun run active-wedge islets  # pick the wedge
bun run matrix islets        # wedge benchmark matrix
bun run gap-queue islets     # ranked evidence gaps
bun run experiments islets   # next-experiment packets
bun run cycles islets        # one bounded, benchmark-gated improvement loop
```

Discovery widens the candidate paper set without touching the reviewed slice:

```bash
bun run discover islets          # query OpenAlex, Crossref, Europe PMC, CryoDB
bun run discover-refresh:all     # full refresh for every domain
bun run validate-discovery-refresh
```

Checks:

```bash
bun run typecheck
bun run test:normalize
bun run test:discovery
bun run test:optimizer
```

Optional environment variables, none needed for the web app or the checked-in artifacts:

- `ANTHROPIC_API_KEY` lets `bun run enrich-sources <domain>` (run inside every batch) draft source-enrichment records with Claude, and `bun run validate-llm-enrichment <domain>` score those drafts against records that already carry excerpts. Without it both steps are skipped.
- `ENABLE_LLM_AUTO_TRIAGE=true` lets those drafts be applied automatically. Off by default and meant to stay off until the drafts clear an F1 of 0.85 on reviewed records.
- `DISCOVERY_LIVE_PROVIDERS` narrows discovery to a comma-separated subset of `cryodb,openalex,crossref,europe-pmc`.
- `ALLOW_ENRICHMENT_PENDING=true` lets a cycle run while source-enrichment records are still pending review.

## How it works

For each domain:

1. ingest and refresh literature
2. extract protocol evidence into structured artifacts
3. evaluate against the pipeline-reviewed benchmark
4. select the active wedge
5. build the wedge matrix, evidence gap queue, contradiction report, and experiment packets
6. run a bounded conservative loop to improve the current slice

The question every step serves is: what is the most defensible wedge right now, what blocks conviction, and what should be tested next?

The main outputs per domain live in `data/processed/<domain>/`:

- `active-wedge.{json,md}`: current wedge recommendation
- `wedge-benchmark-matrix.{json,md}`: evidence matrix for that wedge
- `wedge-evidence-gap-queue.{json,md}`: evidence gaps ranked by decision impact
- `experiment-packets.{json,md}`: concrete next experiments
- `wedge-contradiction-report.{json,md}`: contradictions and confounds
- `wedge-brief.{json,md}`: domain strategy summary
- `call-packet.{json,md}`: one-page discussion artifact

`data/processed/opportunity-scan.{json,md}` compares the domains.

## Layout

- `packages/ingest`: CryoDB client and domain ingest
- `packages/extract`: one heuristic title/abstract extractor parameterized by the domain registry, optional LLM enrichment drafting
- `packages/normalize`: canonical chemical names, unit parsing, step transitions
- `packages/discovery`: broader literature discovery lane, kept downstream of the reviewed slice
- `packages/optimizer`: a narrow hill-climber whose only mutable target is `packages/optimizer/src/policy.ts`
- `packages/shared`: schemas, shared types, and the domain registry (`src/domains/<id>.ts`: one file per domain holding its ingest keywords, discovery config, extraction profile, hypothesis templates, console copy, and regression scenarios; `DomainIdSchema` and every domain loop derive from it)
- `packages/research`, `packages/db`: placeholders
- `scripts/`: every `bun run` entrypoint
- `data/`: benchmarks, curated review records, discovery snapshots, processed artifacts, autoresearch run history
- `apps/web`: read-only Next.js console over `data/`
- `docs/`: MVP boundary, canonical protocol plan, web console spec

## Automation

Two GitHub Actions workflows, `autoresearch-cycles` and `discovery-refresh`, run on `workflow_dispatch` only. They used to run on a schedule and commit to `main`; that produced about 250 bot commits between March and September 2026 with no change to either wedge call, so the schedules are off. Trigger them by hand if you want a refresh.

## License

MIT. See `LICENSE`.
