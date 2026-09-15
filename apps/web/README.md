# Atlas console

`apps/web` is the read-only Next.js console over the artifacts checked in under `data/`. It has no backend and never mutates data; every page reads JSON from the repo at build time through `lib/data.ts` and `lib/decision-data.ts`. Domains come from the registry in `packages/shared/src/domains/`, so a new domain shows up in every tab once its artifacts exist.

## Routes

- `/`: the recommendation for the lead domain (the one whose wedge scores highest today)
- `/domains/[domain]`: the same recommendation view for any domain
- `/domains/[domain]/atlas`: the wedge benchmark matrix
- `/domains/[domain]/benchmark`: benchmark gates, gold-set counts, and the review queue
- `/domains/[domain]/review`: evidence gaps, source-enrichment backlog, and contradictions
- `/wedges`: one row per domain, lead first
- `/experiments`: every experiment packet across domains
- `/evidence`: evidence gaps and contradictions across domains, ordered by impact
- `/discovery` and `/discovery/[domain]`: the discovery lane (candidate papers, promotion queue, packet)
- `/compare`, `/history`, `/optimizer`, `/debug`, `/domains/[domain]/debug`: internal views, only linked when `NODE_ENV !== "production"` (`lib/runtime-flags.ts`)

## Layout

- `app/`: the routes above; `layout.tsx` loads IBM Plex and wraps everything in `Shell`
- `components/atlas-ui.tsx`: the shared primitives (`Shell`, `PageHeader`, `DomainTabs`, `Section`, `Facts`, `Funnel`, `Status`, `Tag`, `Table`, `Defs`, `Packet`, `Crumbs`, `Footnote`, `PaperLink`, `ArtifactList`, `RawJson`)
- `components/primary-nav.tsx`: the top nav; `domain-crumbs.tsx`: per-domain sub-navigation
- `components/recommendation-view.tsx` and `discovery-view.tsx`: the two views shared between the lead-domain route and the per-domain route
- `components/truncated.tsx`: collapses long tables past a limit
- `lib/data.ts`: schema-validated readers for every artifact; `lib/decision-data.ts`: the recommendation model built from them
- `lib/domain.ts`: domain order and console metadata from the registry; `lib/ui-copy.ts`: labels and plain-English copy; `lib/paper-links.ts`: DOI, PMC, and PubMed links; `lib/discovery-queue.ts` and `lib/discovery-tabs.ts`: discovery page helpers
- `app/globals.css`: the one stylesheet

## Run it

```bash
bun install
bun run web          # from the repo root, http://localhost:3000
bun run web:build
bun run web:typecheck
```

Vercel builds from this directory (project root directory `apps/web`); `next.config.mjs` sets `outputFileTracingRoot` to the repo root so `data/` and `packages/` are available at build time.
