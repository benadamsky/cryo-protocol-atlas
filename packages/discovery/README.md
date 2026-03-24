# Discovery

This package owns the broader literature-discovery lane.

It is intentionally separate from the benchmarked atlas loop:

- discovery widens the candidate evidence frontier
- the atlas loop remains conservative and benchmark-gated

Current responsibilities:

- domain-specific discovery queries
- hybrid keyword scoring over candidate title/abstract text
- source adapters for broader literature providers
- normalized import merge from `data/discovery/<domain>/imports/*.json`
- deduped discovery snapshots under `data/discovery/<domain>/`
- merged imported records via `data/discovery/<domain>/imported-source-records.json`
- manual-only records via `data/discovery/<domain>/manual-source-records.json`
- promotion queue generation for novel candidates
- review packet generation for high-signal novel candidates
- degraded-run signaling and validation for scheduler safety

Current providers:

- `cryodb`
- `openalex`
- `crossref`
- `europe-pmc`

The first implementation is additive only. It does not promote papers directly into the benchmarked slice.

The scheduler is expected to treat degraded discovery as a failure, not as silent progress. The queue and packet artifacts carry that degraded state forward so downstream automation can stop before opening misleading PRs.
