/**
 * Validation script for LLM enrichment auto-triage.
 *
 * Runs LLM drafting against the reviewed islet enrichment records and
 * compares the drafts to the human-reviewed excerpts. Reports agreement
 * rates per signal category so we can decide which fields (if any) are
 * safe for auto-triage.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... node --import tsx scripts/validate-llm-enrichment.ts islets
 *
 * The script does NOT modify any data files.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseDomainArg } from "../packages/shared/src/domains/index.js";
import {
  ExtractionSnapshotSchema,
  SourceEnrichmentFileSchema,
  type DomainId,
  type SourceEnrichmentRecord
} from "../packages/shared/src/schema.js";
import { draftEnrichments } from "../packages/extract/src/llm-enrichment.js";

const domain = parseDomainArg(process.argv[2], "validate-llm-enrichment <domain>");

// ── Signal extraction helpers ────────────────────────────────────────

type SignalCategory =
  | "protocol-detail"   // methods, CPA concentrations, cooling rates
  | "outcome-function"  // insulin secretion, glucose-stimulated function
  | "outcome-viability" // survival, recovery, viability
  | "outcome-transplant"// transplantation, graft, euglycemia
  | "outcome-morphology"// morphology, histology, ultrastructure
  | "comparison"        // comparison, head-to-head, versus
  | "species-specimen"; // species mentions, specimen types

const SIGNAL_PATTERNS: Record<SignalCategory, RegExp> = {
  "protocol-detail": /(?:freez|cool|warm|thaw|dmso|dimethyl sulfoxide|ethylene glycol|glycerol|cryoprotect|vitrif|equilibrat|loading|perfus|culture|incubat|program|controlled.*rate|step.*wise)/i,
  "outcome-function": /(?:function|insulin.*(?:secret|releas|stimulat)|glucose.stimulat|beta.cell|islet.*function)/i,
  "outcome-viability": /(?:viabil|surviv|recover|yield|intact|membrane.*integr|live.*dead|trypan)/i,
  "outcome-transplant": /(?:transplant|graft|euglycemi|normoglycemi|revers.*diabet|C-peptide|engraft|recipient)/i,
  "outcome-morphology": /(?:morpholog|histolog|ultrastructur|electron.*microscop|tissue.*integr)/i,
  "comparison": /(?:compar|versus|head.to.head|superior|inferior|outperform|relative.*to|contrast)/i,
  "species-specimen": /(?:human|mouse|rat|pig|porc|canine|dog|chick|guinea|primate|islet|pancrea)/i
};

function extractSignals(text: string): Set<SignalCategory> {
  const signals = new Set<SignalCategory>();
  for (const [category, pattern] of Object.entries(SIGNAL_PATTERNS) as Array<[SignalCategory, RegExp]>) {
    if (pattern.test(text)) {
      signals.add(category);
    }
  }
  return signals;
}

function combineExcerptText(excerpts: Array<{ text: string; label: string }>): string {
  return excerpts.map((e) => `${e.label}: ${e.text}`).join(" ");
}

// ── Agreement computation ────────────────────────────────────────────

type PerRecordResult = {
  paperId: string;
  title: string;
  humanSignals: SignalCategory[];
  llmSignals: SignalCategory[];
  matchedSignals: SignalCategory[];
  missedSignals: SignalCategory[];
  hallucinatedSignals: SignalCategory[];
  precision: number;
  recall: number;
  f1: number;
  llmExcerptCount: number;
  humanExcerptCount: number;
  llmConfidence: number;
};

function computeAgreement(
  humanSignals: Set<SignalCategory>,
  llmSignals: Set<SignalCategory>
): { matched: SignalCategory[]; missed: SignalCategory[]; hallucinated: SignalCategory[]; precision: number; recall: number; f1: number } {
  const matched = [...humanSignals].filter((s) => llmSignals.has(s));
  const missed = [...humanSignals].filter((s) => !llmSignals.has(s));
  const hallucinated = [...llmSignals].filter((s) => !humanSignals.has(s));

  const precision = llmSignals.size === 0 ? 0 : matched.length / llmSignals.size;
  const recall = humanSignals.size === 0 ? 1 : matched.length / humanSignals.size;
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  return { matched, missed, hallucinated, precision, recall, f1 };
}

// ── Main ─────────────────────────────────────────────────────────────

async function main(selectedDomain: DomainId): Promise<void> {
  const rootDir = process.cwd();
  const processedDir = join(rootDir, "data", "processed", selectedDomain);
  const curatedDir = join(rootDir, "data", "curated", selectedDomain);

  const enrichment = SourceEnrichmentFileSchema.parse(
    JSON.parse(await readFile(join(curatedDir, "source-enrichment.json"), "utf8"))
  );

  let snapshot;
  try {
    snapshot = ExtractionSnapshotSchema.parse(
      JSON.parse(await readFile(join(processedDir, "resolved-extraction-snapshot.json"), "utf8"))
    );
  } catch {
    snapshot = undefined;
  }

  const extractionByPaperId = new Map(
    snapshot?.extractions.map((e) => [e.paper.id, e]) ?? []
  );

  const reviewedRecords = enrichment.records.filter((r) => r.status === "reviewed" && r.excerpts.length > 0);

  if (reviewedRecords.length === 0) {
    console.log("No reviewed enrichment records with excerpts found. Nothing to validate.");
    return;
  }

  console.log(`\nValidating LLM enrichment against ${reviewedRecords.length} reviewed ${selectedDomain} records...\n`);

  // Run LLM drafting on each reviewed record (as if it were pending)
  const inputs = reviewedRecords.map((record) => ({
    record: { ...record, status: "pending" as const } satisfies SourceEnrichmentRecord,
    extraction: extractionByPaperId.get(record.paperId),
    decisionImpactScore: undefined
  }));

  const results = await draftEnrichments(inputs);
  const resultByPaperId = new Map(results.map((r) => [r.paperId, r]));

  // Compare
  const perRecord: PerRecordResult[] = [];
  const categoryTotals: Record<SignalCategory, { tp: number; fp: number; fn: number }> = {
    "protocol-detail": { tp: 0, fp: 0, fn: 0 },
    "outcome-function": { tp: 0, fp: 0, fn: 0 },
    "outcome-viability": { tp: 0, fp: 0, fn: 0 },
    "outcome-transplant": { tp: 0, fp: 0, fn: 0 },
    "outcome-morphology": { tp: 0, fp: 0, fn: 0 },
    "comparison": { tp: 0, fp: 0, fn: 0 },
    "species-specimen": { tp: 0, fp: 0, fn: 0 }
  };

  for (const record of reviewedRecords) {
    const result = resultByPaperId.get(record.paperId);
    const humanText = combineExcerptText(record.excerpts);
    const humanSignals = extractSignals(humanText);

    let llmSignals: Set<SignalCategory>;
    let llmExcerptCount: number;
    let llmConfidence: number;

    if (result) {
      const llmText = combineExcerptText(result.draft.excerpts);
      llmSignals = extractSignals(llmText);
      llmExcerptCount = result.draft.excerpts.length;
      llmConfidence = result.draft.draftConfidence;
    } else {
      llmSignals = new Set();
      llmExcerptCount = 0;
      llmConfidence = 0;
    }

    const agreement = computeAgreement(humanSignals, llmSignals);

    // Accumulate per-category stats
    for (const category of Object.keys(categoryTotals) as SignalCategory[]) {
      const humanHas = humanSignals.has(category);
      const llmHas = llmSignals.has(category);
      if (humanHas && llmHas) categoryTotals[category].tp += 1;
      if (!humanHas && llmHas) categoryTotals[category].fp += 1;
      if (humanHas && !llmHas) categoryTotals[category].fn += 1;
    }

    perRecord.push({
      paperId: record.paperId,
      title: record.title.slice(0, 70),
      humanSignals: [...humanSignals],
      llmSignals: [...llmSignals],
      matchedSignals: agreement.matched,
      missedSignals: agreement.missed,
      hallucinatedSignals: agreement.hallucinated,
      precision: Number(agreement.precision.toFixed(3)),
      recall: Number(agreement.recall.toFixed(3)),
      f1: Number(agreement.f1.toFixed(3)),
      llmExcerptCount,
      humanExcerptCount: record.excerpts.length,
      llmConfidence
    });
  }

  // ── Per-record results ─────────────────────────────────────────────
  console.log("## Per-record results\n");
  for (const r of perRecord) {
    console.log(`${r.title}`);
    console.log(`  human=${r.humanSignals.join(",")} | llm=${r.llmSignals.join(",")}`);
    console.log(`  matched=${r.matchedSignals.join(",") || "none"} | missed=${r.missedSignals.join(",") || "none"} | hallucinated=${r.hallucinatedSignals.join(",") || "none"}`);
    console.log(`  precision=${r.precision} recall=${r.recall} f1=${r.f1} | excerpts: human=${r.humanExcerptCount} llm=${r.llmExcerptCount} | confidence=${r.llmConfidence}`);
    console.log();
  }

  // ── Per-category agreement ─────────────────────────────────────────
  console.log("## Per-category agreement\n");
  console.log("category                | precision | recall | f1     | tp | fp | fn | clears 0.85?");
  console.log("------------------------|-----------|--------|--------|----|----|----|-----------");

  const categoryResults: Array<{ category: string; precision: number; recall: number; f1: number; clears: boolean }> = [];

  for (const [category, counts] of Object.entries(categoryTotals) as Array<[SignalCategory, { tp: number; fp: number; fn: number }]>) {
    const precision = counts.tp + counts.fp === 0 ? 0 : counts.tp / (counts.tp + counts.fp);
    const recall = counts.tp + counts.fn === 0 ? 0 : counts.tp / (counts.tp + counts.fn);
    const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
    const clears = f1 >= 0.85;

    categoryResults.push({ category, precision, recall, f1, clears });
    console.log(
      `${category.padEnd(24)}| ${precision.toFixed(3).padEnd(10)}| ${recall.toFixed(3).padEnd(7)}| ${f1.toFixed(3).padEnd(7)}| ${String(counts.tp).padEnd(3)}| ${String(counts.fp).padEnd(3)}| ${String(counts.fn).padEnd(3)}| ${clears ? "YES" : "no"}`
    );
  }

  // ── Aggregate ──────────────────────────────────────────────────────
  const llmDraftedCount = results.length;
  const avgPrecision = perRecord.reduce((s, r) => s + r.precision, 0) / perRecord.length;
  const avgRecall = perRecord.reduce((s, r) => s + r.recall, 0) / perRecord.length;
  const avgF1 = perRecord.reduce((s, r) => s + r.f1, 0) / perRecord.length;
  const avgConfidence = perRecord.filter((r) => r.llmConfidence > 0).reduce((s, r) => s + r.llmConfidence, 0) / (llmDraftedCount || 1);
  const clearingCategories = categoryResults.filter((c) => c.clears).map((c) => c.category);

  console.log("\n## Summary\n");
  console.log(`- reviewed records tested: ${reviewedRecords.length}`);
  console.log(`- LLM drafts produced: ${llmDraftedCount}`);
  console.log(`- LLM draft failures: ${reviewedRecords.length - llmDraftedCount}`);
  console.log(`- avg signal precision: ${avgPrecision.toFixed(3)}`);
  console.log(`- avg signal recall: ${avgRecall.toFixed(3)}`);
  console.log(`- avg signal F1: ${avgF1.toFixed(3)}`);
  console.log(`- avg LLM confidence: ${avgConfidence.toFixed(3)}`);
  console.log(`- categories clearing 0.85 F1: ${clearingCategories.length > 0 ? clearingCategories.join(", ") : "NONE"}`);

  console.log("\n## Auto-triage recommendation\n");
  if (clearingCategories.length === 0) {
    console.log("No signal categories cleared the 0.85 F1 threshold.");
    console.log("Auto-triage should remain DISABLED for all fields.");
    console.log("LLM drafts can still be used as review aids (pre-filled for human inspection).");
  } else {
    console.log(`The following categories cleared 0.85 F1: ${clearingCategories.join(", ")}`);
    console.log("Auto-triage COULD be enabled for these narrow categories only,");
    console.log("subject to the constraint that auto-triaged content remains non-authoritative");
    console.log("(llm-triaged status, excluded from reviewed evidence paths).");
  }
}

main(domain).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
