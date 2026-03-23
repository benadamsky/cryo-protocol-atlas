# Web App

This is a static observer dashboard over the bounded autoresearch system.

- `bun run health-report` writes `data/autoresearch/run-health.{json,md}`.
- The same command also refreshes `apps/web/dashboard-data.json`.
- `bun run cycles:all` refreshes the health report automatically after both domain loops complete.

The dashboard is intentionally read-only. It is a thin wrapper over the existing repo artifacts rather than a separate backend or control plane.

For a local preview:

```bash
python3 -m http.server -d apps/web 4173
```
