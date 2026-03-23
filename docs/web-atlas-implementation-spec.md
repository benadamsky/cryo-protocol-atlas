# Web Atlas Implementation Spec

## 1. Purpose

Build a lightweight internal web app for Cryo Protocol Atlas that makes current pipeline outputs easier to inspect, demo, and debug without introducing a second source of truth.

The web app is a read-only lens over generated artifacts. It is not the benchmark system, not the review authority, and not the workflow engine.

## 2. Product Boundary

### In scope

- render existing processed and curated artifacts in a more legible UI
- support demo-ready domain overviews for `ovarian-tissue` and `islets`
- support internal debugging of benchmark, normalization, and provenance issues
- read files directly from the repo artifact tree
- deploy easily to Vercel

### Out of scope for v1

- in-browser editing of benchmark decisions
- in-browser editing of source-enrichment review records
- triggering pipeline jobs from the app
- multi-user workflow state
- comments, assignments, approvals, or reviewer identity
- replacing markdown/json artifacts as the source of truth

## 3. Primary Design Principle

Accuracy and provenance are more important than reactivity.

The current repo already has the right truth model:

- scripts generate deterministic artifacts
- schemas validate the artifact shape
- reviewed benchmark entries define quality gates
- source enrichment remains human-reviewed

The web app should preserve that structure. It should visualize current state, not mutate it.

## 4. Recommended Stack

- Next.js
- TypeScript
- App Router
- React Server Components for file-backed reads
- Route Handlers only when useful for structured JSON endpoints
- Tailwind CSS or a similarly low-friction styling layer
- Vercel deployment

## 5. Why Next.js

Next.js is the best fit here because it gives:

- fast setup for a polished internal tool
- easy Vercel deployment
- straightforward server-side file reads
- a clean path from read-only views to future authenticated internal tooling
- optional API routes without committing to a standalone backend

This should not begin as a SPA with heavy client-side state.

## 6. Data Model Boundary

### Source of truth

The app reads from the repo artifact tree:

- `data/processed/<domain>/`
- `data/curated/<domain>/`
- `data/autoresearch/<domain>/`
- `data/benchmarks/<domain>/`

The app should reuse schema parsing from:

- `packages/shared/src/schema.ts`

### Read model

The app should introduce a thin read-adapter layer that:

- reads files from disk
- parses JSON with shared zod schemas
- converts raw snapshots into page-specific view models

This layer is important because it creates a clean seam for future migration to a backend without rewriting page code.

## 7. Repo Layout

Target structure inside `apps/web`:

```text
apps/web/
  app/
    layout.tsx
    page.tsx
    domains/
      [domain]/
        page.tsx
        atlas/
          page.tsx
        benchmark/
          page.tsx
        review/
          page.tsx
        debug/
          page.tsx
  lib/
    fs/
      read-artifact.ts
      domains.ts
    parsers/
      processed.ts
      curated.ts
      autoresearch.ts
    view-models/
      overview.ts
      domain.ts
      atlas.ts
      review.ts
      debug.ts
  components/
    domain/
    benchmark/
    review/
    debug/
    layout/
  styles/
```

## 8. Route Plan

### `/`

Purpose:

- cross-domain overview
- show current maturity and readiness at a glance

Content:

- domain cards for `ovarian-tissue` and `islets`
- readiness snapshot
- benchmark gate status
- latest unattended batch status
- top wedge title per domain

Primary data:

- `data/processed/opportunity-scan.md`
- `data/processed/<domain>/call-packet.json|md`
- `data/autoresearch/<domain>/unattended-batch.json|md`

### `/domains/[domain]`

Purpose:

- single domain executive view

Content:

- call packet summary
- wedge brief highlights
- benchmark credibility metrics
- normalization counts and warnings
- top literature gaps

Primary data:

- `data/processed/<domain>/call-packet.*`
- `data/processed/<domain>/wedge-brief.*`
- `data/processed/<domain>/benchmark-report.*`
- `data/autoresearch/<domain>/unattended-batch.*`

### `/domains/[domain]/atlas`

Purpose:

- structured literature and protocol view

Content:

- protocol families
- dominant chemicals
- specimen types
- outcome classes
- contradictions
- ranked hypotheses
- suggested next experiments

Primary data:

- `data/processed/<domain>/atlas-report.*`
- `data/processed/<domain>/normalized-protocols.json`
- resolved extraction snapshot as needed

### `/domains/[domain]/benchmark`

Purpose:

- explicit benchmark trust surface

Content:

- reviewed vs seeded split
- gate pass/fail table
- field coverage
- depth coverage
- baseline vs resolved deltas
- reviewed depth gaps

Primary data:

- `data/processed/<domain>/benchmark-report.*`
- `data/benchmarks/<domain>/gold-set.json`

### `/domains/[domain]/review`

Purpose:

- human review backlog surface

Content:

- source-enrichment queue
- benchmark review decisions
- loop proposal counts
- pending vs reviewed counts

Primary data:

- `data/curated/<domain>/source-enrichment.json`
- `data/autoresearch/<domain>/benchmark-review-decisions.json`
- `data/autoresearch/<domain>/proposal-file.json`

### `/domains/[domain]/debug`

Purpose:

- operator and researcher debugging surface

This page is especially important for ovarian while normalization heuristics are still moving.

Content:

- baseline extraction vs resolved extraction vs normalized protocol
- representative conditions
- normalization warnings
- provenance summary
- paper-level drilldown
- protocol step drilldown

Primary data:

- `data/processed/<domain>/extraction-snapshot.json`
- `data/processed/<domain>/resolved-extraction-snapshot.json`
- `data/processed/<domain>/normalized-protocols.json`

## 9. View Model Requirements

Page code should not parse raw artifact structure inline.

Each page should receive a compact view model such as:

- `OverviewPageModel`
- `DomainSummaryModel`
- `BenchmarkPageModel`
- `ReviewQueueModel`
- `ProtocolDebugModel`

View models should:

- collapse repetitive raw fields
- compute UI-safe summaries once
- preserve links back to raw paper IDs and source records
- expose warnings and missing-data states explicitly

## 10. UI Priorities

### Highest value

- strong domain landing pages for demos
- benchmark page that makes trust visible
- debug page that reveals why ovarian outputs look the way they do

### Lower priority

- raw markdown rendering parity for every artifact
- fancy filtering beyond what current demo/debug use requires
- user accounts
- write actions

## 11. Debugging Features For Ovarian

The current ovarian work suggests the app should help answer:

- which representative conditions came from direct step evidence vs fallback attachment?
- which normalized conditions have weak provenance?
- where do concentration mentions exist without confident chemical attachment?
- which papers contribute the top reported DMSO, sucrose, EG, or PG conditions?

Suggested debug widgets:

- provenance chips: `step`, `chemical-mention`, `fallback`, `warning`
- paper selector
- condition table with confidence and evidence source
- side-by-side baseline/resolved/normalized panels
- normalization warning summary

This page should exist from v1, even if other pages stay simple.

## 12. File Access Strategy

Use server-only reads.

Recommended pattern:

- `lib/fs/read-artifact.ts` exposes safe file readers
- page loaders call read functions in server components
- zod parsing happens before view-model construction
- parsing failures render explicit error states rather than silent omission

Avoid:

- shipping full raw artifact trees to the browser by default
- client-side `fetch` to local files
- bypassing schema parsing

## 13. Deployment Strategy

### Local development

- run the existing pipeline scripts locally
- run the Next app against the current repo artifact tree

### Vercel preview/demo

- prebuild or CI step refreshes artifacts before `next build`
- deployed app serves the generated artifact snapshot included in that build

This keeps deployment simple and avoids introducing runtime infra.

## 14. Backend Decision Rule

Do not add a real backend until the app needs to own mutable workflow state.

A backend becomes justified when one or more of these are needed:

- review decisions created or edited in-browser
- reviewer identity and audit trail
- comments, assignments, approval state
- pipeline job triggering and monitoring
- shared live state across multiple repos or tools

If that happens later, the backend should own workflow metadata first, not replace benchmark artifacts as scientific source of truth.

## 15. Future Expansion Path

### Phase 1

- file-backed Next.js atlas console in this repo
- read-only pages
- demo and debug oriented

### Phase 2

- richer query helpers
- better paper/protocol drilldowns
- optional structured JSON endpoints for the app

### Phase 3

- optional internal auth
- optional backend for workflow state
- optional separation of product app from pipeline repo if release cadence diverges

## 16. Worktree Policy For Web Atlas

Use a dedicated worktree for app work:

- worktree path: `.worktrees/web-atlas`
- branch: `web-atlas`

Rules:

- pipeline and benchmark iteration can continue in the primary checkout
- web app changes should stay isolated in the `web-atlas` worktree
- if UI work later splits into separate streams, add more worktrees rather than mixing concerns in one checkout

## 17. Initial Delivery Scope

The first implementation pass should produce:

1. a functioning Next.js app in `apps/web`
2. an overview page
3. a domain summary page
4. a benchmark page
5. an ovarian debug page
6. file-backed typed loaders using shared schemas

That is enough to prove the architecture and support both demos and active research iteration.

## 18. Exit Criteria For V1

V1 is successful when:

- the app can be deployed to Vercel without extra infrastructure
- `islets` can be demoed cleanly from the UI
- `ovarian-tissue` debugging is easier in the UI than by reading raw artifacts
- no benchmark or review authority has been moved out of the pipeline
- the app remains read-only and low-maintenance
