# Agent guidance

- Prefer deepening the existing domains over adding new ones. A new domain is one file in `packages/shared/src/domains/` plus a line in `domains/index.ts`. Run the full pipeline for it (`fetch-pubmed`, `ingest`, `extract`, `queue`, `seed-benchmark`, `cycles`, the discovery chain, `agenda`, `health-report`) before it appears in the console.
- Reviewed evidence is the basis of a wedge call. Reviewed means pipeline-reviewed (curated overrides, and source-enrichment records built by the scripts and the LLM enrichment step), never human-reviewed. Say so in any copy you write.
- Optimize for decision impact and experiment quality.
- Keep discovery downstream of the reviewed loop.
- Do not add autonomy features unless they improve a current wedge.
