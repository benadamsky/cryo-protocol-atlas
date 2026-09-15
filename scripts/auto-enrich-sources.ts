import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseDomainArg } from "../packages/shared/src/domains/index.js";
import {
  ExtractionSnapshotSchema,
  SourceEnrichmentFileSchema,
  WedgeEvidenceGapQueueSchema,
  type DomainId,
  type SourceEnrichmentFile,
  type WedgeEvidenceGapQueue
} from "../packages/shared/src/schema.js";
import { draftEnrichments } from "../packages/extract/src/llm-enrichment.js";

const domain = parseDomainArg(process.argv[2], "auto-enrich-sources <domain>");

async function maybeReadJson<T>(path: string, parser: { parse: (value: unknown) => T }): Promise<T | undefined> {
  try {
    return parser.parse(JSON.parse(await readFile(path, "utf8")));
  } catch {
    return undefined;
  }
}

async function main(selectedDomain: DomainId): Promise<void> {
  const rootDir = process.cwd();
  const processedDir = join(rootDir, "data", "processed", selectedDomain);
  const curatedDir = join(rootDir, "data", "curated", selectedDomain);
  const enrichmentPath = join(curatedDir, "source-enrichment.json");

  const enrichment = await maybeReadJson(enrichmentPath, SourceEnrichmentFileSchema);
  if (!enrichment) {
    console.log("No source enrichment file found — skipping LLM enrichment.");
    return;
  }

  // Only process pending records (not reviewed, not already llm-triaged)
  const pendingRecords = enrichment.records.filter(
    (record) => record.status === "pending" || record.status === "in-progress"
  );

  if (pendingRecords.length === 0) {
    console.log("No pending enrichment records — skipping LLM enrichment.");
    return;
  }

  const snapshot = await maybeReadJson(
    join(processedDir, "resolved-extraction-snapshot.json"),
    ExtractionSnapshotSchema
  );
  const evidenceGapQueue = await maybeReadJson(
    join(processedDir, "wedge-evidence-gap-queue.json"),
    WedgeEvidenceGapQueueSchema
  );

  const extractionByPaperId = new Map(
    snapshot?.extractions.map((extraction) => [extraction.paper.id, extraction]) ?? []
  );
  const gapScoreByPaperId = new Map(
    (evidenceGapQueue as WedgeEvidenceGapQueue | undefined)?.queue.map((gap) => [gap.paperId, gap.decisionImpactScore]) ?? []
  );

  // Sort pending records by decision impact score (highest first) so most valuable get drafted first
  const sortedPending = [...pendingRecords].sort((a, b) => {
    const scoreA = gapScoreByPaperId.get(a.paperId)?.score ?? 0;
    const scoreB = gapScoreByPaperId.get(b.paperId)?.score ?? 0;
    return scoreB - scoreA;
  });

  const inputs = sortedPending.map((record) => ({
    record,
    extraction: extractionByPaperId.get(record.paperId),
    decisionImpactScore: gapScoreByPaperId.get(record.paperId)
  }));

  console.log(`Drafting LLM enrichment for ${inputs.length} pending records...`);
  const results = await draftEnrichments(inputs);

  if (results.length === 0) {
    console.log("No LLM enrichment drafts produced.");
    return;
  }

  // Apply results to enrichment records
  const resultByPaperId = new Map(results.map((r) => [r.paperId, r]));
  let autoTriagedCount = 0;
  let draftedCount = 0;

  const updatedRecords = enrichment.records.map((record) => {
    const result = resultByPaperId.get(record.paperId);
    if (!result) {
      return record;
    }

    draftedCount += 1;
    const updated = { ...record, llmDraft: result.draft };

    if (result.autoTriageApplied) {
      autoTriagedCount += 1;
      updated.status = "llm-triaged" as const;
    }

    return updated;
  });

  const updatedFile = SourceEnrichmentFileSchema.parse({
    ...enrichment,
    generatedAt: new Date().toISOString(),
    records: updatedRecords
  });

  await writeFile(enrichmentPath, JSON.stringify(updatedFile, null, 2), "utf8");

  console.log(JSON.stringify({
    domain: selectedDomain,
    pendingProcessed: inputs.length,
    draftsProduced: draftedCount,
    autoTriaged: autoTriagedCount,
    decisionChangingPending: results.filter((r) => r.draft.safetyTier === "decision-changing").length,
    reviewRequiredPending: results.filter((r) => r.draft.safetyTier === "review-required").length
  }, null, 2));
}

main(domain).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
