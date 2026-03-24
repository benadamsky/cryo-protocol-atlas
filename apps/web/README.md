# Web Atlas

`apps/web` now contains the richer internal atlas console for Cryo Protocol Atlas.

Current boundary:

- read-only UI
- file-backed artifact reads
- falls back from the `web-atlas` worktree to the primary checkout artifact tree
- optimized for benchmark inspection, demo readiness, normalization debugging, and run-health visibility

Primary routes in the Next.js console:

- `/`
- `/domains/[domain]`
- `/domains/[domain]/atlas`
- `/domains/[domain]/benchmark`
- `/domains/[domain]/review`
- `/domains/[domain]/debug`

Related repo artifacts:

- `bun run health-report` writes `data/autoresearch/run-health.{json,md}`
- the same command refreshes `apps/web/dashboard-data.json`
- `bun run cycles:all` refreshes the health report automatically after both domain loops complete

The dashboard remains read-only. It is a thin wrapper over repo artifacts rather than a separate backend or control plane.

For the Next.js app:

```bash
cd apps/web
bun install
bun run dev
```

For a quick static preview of the simpler generated dashboard assets:

```bash
python3 -m http.server -d apps/web 4173
```
