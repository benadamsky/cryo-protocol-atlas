import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildAtlasSummary, renderAtlasMarkdown, type AtlasSummary } from "../packages/research/src/atlas.js";
import { applyProtocolOverrides, parseOverrideFile } from "../packages/normalize/src/overrides.js";
import { DomainIdSchema, ExtractionSnapshotSchema, type DomainId } from "../packages/shared/src/schema.js";

const domain = DomainIdSchema.parse(process.argv[2] ?? "ovarian-tissue");

type AtlasAnalysis = {
  domain: DomainId;
  baselineSummary: AtlasSummary;
  resolvedSummary: AtlasSummary;
  overrideImpact: {
    overridesApplied: number;
    excludedPaperCount: number;
    unknownProtocolFamiliesResolved: number;
    unknownProtocolFamilyRateDelta: number;
    unknownStepPhaseDelta: number;
    experimentalPaperDelta: number;
    methodsPaperDelta: number;
    reviewPaperDelta: number;
    commentaryPaperDelta: number;
  };
};

function buildAnalysis(
  selectedDomain: DomainId,
  baselineSummary: AtlasSummary,
  resolvedSummary: AtlasSummary,
  overridesApplied: number,
  excludedPaperCount: number
): AtlasAnalysis {
  return {
    domain: selectedDomain,
    baselineSummary,
    resolvedSummary,
    overrideImpact: {
      overridesApplied,
      excludedPaperCount,
      unknownProtocolFamiliesResolved:
        baselineSummary.qualitySignals.unknownProtocolFamilyCount -
        resolvedSummary.qualitySignals.unknownProtocolFamilyCount,
      unknownProtocolFamilyRateDelta: Number(
        (
          baselineSummary.qualitySignals.unknownProtocolFamilyRate -
          resolvedSummary.qualitySignals.unknownProtocolFamilyRate
        ).toFixed(2)
      ),
      unknownStepPhaseDelta:
        baselineSummary.qualitySignals.unknownStepPhaseCount -
        resolvedSummary.qualitySignals.unknownStepPhaseCount,
      experimentalPaperDelta:
        resolvedSummary.qualitySignals.experimentalPaperCount -
        baselineSummary.qualitySignals.experimentalPaperCount,
      methodsPaperDelta:
        resolvedSummary.qualitySignals.methodsPaperCount - baselineSummary.qualitySignals.methodsPaperCount,
      reviewPaperDelta:
        resolvedSummary.qualitySignals.reviewPaperCount - baselineSummary.qualitySignals.reviewPaperCount,
      commentaryPaperDelta:
        resolvedSummary.qualitySignals.commentaryPaperCount -
        baselineSummary.qualitySignals.commentaryPaperCount
    }
  };
}

function renderAnalysisMarkdown(analysis: AtlasAnalysis): string {
  const lines: string[] = [];
  lines.push(renderAtlasMarkdown(analysis.resolvedSummary).trimEnd());
  lines.push("");
  lines.push("## Override impact");
  lines.push(`- overrides applied: ${analysis.overrideImpact.overridesApplied}`);
  lines.push(`- excluded papers: ${analysis.overrideImpact.excludedPaperCount}`);
  lines.push(
    `- unknown protocol families resolved: ${analysis.overrideImpact.unknownProtocolFamiliesResolved}`
  );
  lines.push(`- unknown protocol family rate delta: ${analysis.overrideImpact.unknownProtocolFamilyRateDelta}`);
  lines.push(`- unknown step phase delta: ${analysis.overrideImpact.unknownStepPhaseDelta}`);
  lines.push(`- experimental paper delta: ${analysis.overrideImpact.experimentalPaperDelta}`);
  lines.push(`- methods paper delta: ${analysis.overrideImpact.methodsPaperDelta}`);
  lines.push(`- review paper delta: ${analysis.overrideImpact.reviewPaperDelta}`);
  lines.push(`- commentary paper delta: ${analysis.overrideImpact.commentaryPaperDelta}`);
  lines.push("");
  lines.push("## Baseline vs resolved quality");
  lines.push(
    `- unknown protocol families: ${analysis.baselineSummary.qualitySignals.unknownProtocolFamilyCount} -> ${analysis.resolvedSummary.qualitySignals.unknownProtocolFamilyCount}`
  );
  lines.push(
    `- unknown step phases: ${analysis.baselineSummary.qualitySignals.unknownStepPhaseCount} -> ${analysis.resolvedSummary.qualitySignals.unknownStepPhaseCount}`
  );
  lines.push(
    `- contradictions: ${analysis.baselineSummary.qualitySignals.contradictionCount} -> ${analysis.resolvedSummary.qualitySignals.contradictionCount}`
  );
  lines.push(
    `- experimental papers: ${analysis.baselineSummary.qualitySignals.experimentalPaperCount} -> ${analysis.resolvedSummary.qualitySignals.experimentalPaperCount}`
  );
  lines.push(
    `- methods papers: ${analysis.baselineSummary.qualitySignals.methodsPaperCount} -> ${analysis.resolvedSummary.qualitySignals.methodsPaperCount}`
  );
  lines.push(
    `- review papers: ${analysis.baselineSummary.qualitySignals.reviewPaperCount} -> ${analysis.resolvedSummary.qualitySignals.reviewPaperCount}`
  );
  lines.push(
    `- commentary papers: ${analysis.baselineSummary.qualitySignals.commentaryPaperCount} -> ${analysis.resolvedSummary.qualitySignals.commentaryPaperCount}`
  );
  lines.push("");
  return lines.join("\n");
}

async function main(selectedDomain: DomainId): Promise<void> {
  const processedDir = join(process.cwd(), "data", "processed", selectedDomain);
  const curatedDir = join(process.cwd(), "data", "curated", selectedDomain);
  const extractionPath = join(processedDir, "extraction-snapshot.json");
  const extractionFile = await readFile(extractionPath, "utf8");
  const extractionSnapshot = ExtractionSnapshotSchema.parse(JSON.parse(extractionFile));
  const baselineSummary = buildAtlasSummary(extractionSnapshot);

  let resolvedSnapshot = extractionSnapshot;
  let overridesApplied = 0;
  let excludedPaperCount = 0;
  try {
    const overrideFile = await readFile(join(curatedDir, "protocol-overrides.json"), "utf8");
    const parsedOverrideFile = parseOverrideFile(JSON.parse(overrideFile));
    overridesApplied = parsedOverrideFile.overrides.length;
    excludedPaperCount = parsedOverrideFile.overrides.filter((override) => override.excludeFromAtlas).length;
    resolvedSnapshot = applyProtocolOverrides(extractionSnapshot, parsedOverrideFile);
  } catch {
    resolvedSnapshot = extractionSnapshot;
  }

  const summary = buildAtlasSummary(resolvedSnapshot);
  const analysis = buildAnalysis(
    selectedDomain,
    baselineSummary,
    summary,
    overridesApplied,
    excludedPaperCount
  );
  const markdown = renderAnalysisMarkdown(analysis);

  await writeFile(join(processedDir, "atlas-summary.json"), JSON.stringify(summary, null, 2), "utf8");
  await writeFile(join(processedDir, "atlas-analysis.json"), JSON.stringify(analysis, null, 2), "utf8");
  await writeFile(
    join(processedDir, "resolved-extraction-snapshot.json"),
    JSON.stringify(resolvedSnapshot, null, 2),
    "utf8"
  );
  await writeFile(join(processedDir, "atlas-report.md"), markdown, "utf8");

  console.log(JSON.stringify(analysis, null, 2));
}

main(domain).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
