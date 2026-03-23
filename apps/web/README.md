# Web Atlas

Next.js scaffold for the internal Cryo Protocol Atlas console.

Current boundary:

- read-only UI
- file-backed artifact reads
- falls back from the `web-atlas` worktree to the primary checkout artifact tree
- optimized for benchmark inspection, demo readiness, and normalization debugging

Primary routes:

- `/`
- `/domains/[domain]`
- `/domains/[domain]/atlas`
- `/domains/[domain]/benchmark`
- `/domains/[domain]/review`
- `/domains/[domain]/debug`

Before running locally, install app dependencies inside this worktree:

```bash
cd apps/web
bun install
bun run dev
```
