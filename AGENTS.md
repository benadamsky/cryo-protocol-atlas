# Agent guidance

- Prefer deepening the existing domains over adding new ones. A new domain is one file in `packages/shared/src/domains/` plus a line in `domains/index.ts`; run the full pipeline for it (`fetch-pubmed`, `ingest`, `extract`, `queue`, `seed-benchmark`, `cycles`, the discovery chain, `agenda`, `health-report`) before it goes in the console.
- Keep reviewed evidence as the basis of wedge truth. Reviewed means pipeline-reviewed (curated overrides, and source-enrichment records built by the scripts and the LLM enrichment step), never human-reviewed; say so in any copy you write.
- Optimize for decision impact and experiment quality.
- Keep discovery downstream from the trusted atlas loop.
- Avoid broad autonomy features unless they directly improve current wedges.
