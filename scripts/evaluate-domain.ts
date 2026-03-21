import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { applyProtocolOverrides, parseOverrideFile } from "../packages/normalize/src/overrides.js";
import { evaluateBenchmark, renderBenchmarkMarkdown } from "../packages/research/src/evaluation.js";
import {
  type BenchmarkFile,
  BenchmarkFileSchema,
  DomainIdSchema,
  ExtractionSnapshotSchema,
  type DomainId
} from "../packages/shared/src/schema.js";

const domain = DomainIdSchema.parse(process.argv[2] ?? "ovarian-tissue");

type BenchmarkAnalysis = {
  domain: DomainId;
  baseline: ReturnType<typeof evaluateBenchmark>;
  resolved: ReturnType<typeof evaluateBenchmark>;
  reviewedDepth: {
    outcomeCoverageDelta: number;
    stepPhaseCoverageDelta: number;
    missingOutcomeCount: number;
    missingStepPhaseCount: number;
    missingOutcomes: Array<{
      paperId: string;
      title: string;
      protocolFamily?: string;
      paperType?: string;
    }>;
    missingStepPhases: Array<{
      paperId: string;
      title: string;
      protocolFamily?: string;
      paperType?: string;
    }>;
  };
  delta: {
    reviewedInclusionF1: number;
    reviewedProtocolFamilyAccuracy: number;
    reviewedPaperTypeAccuracy: number;
    reviewedSpeciesMacroF1: number;
    reviewedSpecimenMacroF1: number;
    reviewedOutcomeCoverage: number;
    reviewedStepPhaseCoverage: number;
    gatePassCount: number;
  };
};

function buildDelta(analysis: BenchmarkAnalysis["baseline"], resolved: BenchmarkAnalysis["resolved"]) {
  return {
    reviewedInclusionF1: Number(
      (resolved.subsets.reviewed.inclusion.f1 - analysis.subsets.reviewed.inclusion.f1).toFixed(3)
    ),
    reviewedProtocolFamilyAccuracy: Number(
      (
        resolved.subsets.reviewed.exactFields.protocolFamily.accuracy -
        analysis.subsets.reviewed.exactFields.protocolFamily.accuracy
      ).toFixed(3)
    ),
    reviewedPaperTypeAccuracy: Number(
      (
        resolved.subsets.reviewed.exactFields.paperType.accuracy -
        analysis.subsets.reviewed.exactFields.paperType.accuracy
      ).toFixed(3)
    ),
    reviewedSpeciesMacroF1: Number(
      (
        resolved.subsets.reviewed.setFields.speciesMentions.averageF1 -
        analysis.subsets.reviewed.setFields.speciesMentions.averageF1
      ).toFixed(3)
    ),
    reviewedSpecimenMacroF1: Number(
      (
        resolved.subsets.reviewed.setFields.specimenTypes.averageF1 -
        analysis.subsets.reviewed.setFields.specimenTypes.averageF1
      ).toFixed(3)
    ),
    reviewedOutcomeCoverage: Number(
      (
        resolved.subsets.reviewed.coverage.outcomeClasses.coverageRate -
        analysis.subsets.reviewed.coverage.outcomeClasses.coverageRate
      ).toFixed(3)
    ),
    reviewedStepPhaseCoverage: Number(
      (
        resolved.subsets.reviewed.coverage.stepPhases.coverageRate -
        analysis.subsets.reviewed.coverage.stepPhases.coverageRate
      ).toFixed(3)
    ),
    gatePassCount:
      resolved.gates.filter((gate) => gate.passed).length - analysis.gates.filter((gate) => gate.passed).length
  };
}

function buildReviewedDepth(benchmarkFile: BenchmarkFile): BenchmarkAnalysis["reviewedDepth"] {
  const reviewedIncluded = benchmarkFile.entries.filter((entry) => entry.reviewStatus === "reviewed" && entry.expectedInAtlas);
  const missingOutcomes = reviewedIncluded
    .filter((entry) => !entry.expectedOutcomeClasses || entry.expectedOutcomeClasses.length === 0)
    .map((entry) => ({
      paperId: entry.paperId,
      title: entry.title,
      protocolFamily: entry.expectedProtocolFamily,
      paperType: entry.expectedPaperType
    }));
  const missingStepPhases = reviewedIncluded
    .filter((entry) => !entry.expectedStepPhases || entry.expectedStepPhases.length === 0)
    .map((entry) => ({
      paperId: entry.paperId,
      title: entry.title,
      protocolFamily: entry.expectedProtocolFamily,
      paperType: entry.expectedPaperType
    }));

  return {
    outcomeCoverageDelta: 0,
    stepPhaseCoverageDelta: 0,
    missingOutcomeCount: missingOutcomes.length,
    missingStepPhaseCount: missingStepPhases.length,
    missingOutcomes,
    missingStepPhases
  };
}

function renderAnalysisMarkdown(analysis: BenchmarkAnalysis): string {
  const lines: string[] = [];
  lines.push(renderBenchmarkMarkdown(analysis.resolved).trimEnd());
  lines.push("");
  lines.push("## Baseline vs resolved");
  lines.push(`- reviewed inclusion F1 delta: ${analysis.delta.reviewedInclusionF1}`);
  lines.push(`- reviewed protocol family accuracy delta: ${analysis.delta.reviewedProtocolFamilyAccuracy}`);
  lines.push(`- reviewed paper type accuracy delta: ${analysis.delta.reviewedPaperTypeAccuracy}`);
  lines.push(`- reviewed species macro F1 delta: ${analysis.delta.reviewedSpeciesMacroF1}`);
  lines.push(`- reviewed specimen macro F1 delta: ${analysis.delta.reviewedSpecimenMacroF1}`);
  lines.push(`- reviewed outcome coverage delta: ${analysis.delta.reviewedOutcomeCoverage}`);
  lines.push(`- reviewed step-phase coverage delta: ${analysis.delta.reviewedStepPhaseCoverage}`);
  lines.push(`- gate pass count delta: ${analysis.delta.gatePassCount}`);
  lines.push("");
  lines.push("## Baseline reviewed subset");
  lines.push(
    `- inclusion: precision=${analysis.baseline.subsets.reviewed.inclusion.precision} recall=${analysis.baseline.subsets.reviewed.inclusion.recall} f1=${analysis.baseline.subsets.reviewed.inclusion.f1}`
  );
  lines.push(
    `- exact: paperType=${analysis.baseline.subsets.reviewed.exactFields.paperType.accuracy} protocolFamily=${analysis.baseline.subsets.reviewed.exactFields.protocolFamily.accuracy}`
  );
  lines.push(
    `- set macro F1: species=${analysis.baseline.subsets.reviewed.setFields.speciesMentions.averageF1} specimen=${analysis.baseline.subsets.reviewed.setFields.specimenTypes.averageF1}`
  );
  lines.push(
    `- coverage: outcomes=${analysis.baseline.subsets.reviewed.coverage.outcomeClasses.coverageRate} stepPhases=${analysis.baseline.subsets.reviewed.coverage.stepPhases.coverageRate}`
  );
  lines.push("");
  lines.push("## Reviewed depth gaps");
  lines.push(`- reviewed entries missing outcome labels: ${analysis.reviewedDepth.missingOutcomeCount}`);
  lines.push(`- reviewed entries missing step-phase labels: ${analysis.reviewedDepth.missingStepPhaseCount}`);
  if (analysis.reviewedDepth.missingOutcomes.length > 0) {
    lines.push("");
    lines.push("### Missing reviewed outcomes");
    for (const entry of analysis.reviewedDepth.missingOutcomes.slice(0, 15)) {
      lines.push(`- ${entry.title} | family=${entry.protocolFamily ?? "n/a"} type=${entry.paperType ?? "n/a"}`);
    }
  }
  if (analysis.reviewedDepth.missingStepPhases.length > 0) {
    lines.push("");
    lines.push("### Missing reviewed step phases");
    for (const entry of analysis.reviewedDepth.missingStepPhases.slice(0, 15)) {
      lines.push(`- ${entry.title} | family=${entry.protocolFamily ?? "n/a"} type=${entry.paperType ?? "n/a"}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

async function main(selectedDomain: DomainId): Promise<void> {
  const processedDir = join(process.cwd(), "data", "processed", selectedDomain);
  const curatedDir = join(process.cwd(), "data", "curated", selectedDomain);
  const benchmarkDir = join(process.cwd(), "data", "benchmarks", selectedDomain);

  const extractionSnapshot = ExtractionSnapshotSchema.parse(
    JSON.parse(await readFile(join(processedDir, "extraction-snapshot.json"), "utf8"))
  );
  const benchmarkFile = BenchmarkFileSchema.parse(
    JSON.parse(await readFile(join(benchmarkDir, "gold-set.json"), "utf8"))
  );

  let resolvedSnapshot = extractionSnapshot;
  try {
    const overrideFile = parseOverrideFile(
      JSON.parse(await readFile(join(curatedDir, "protocol-overrides.json"), "utf8"))
    );
    resolvedSnapshot = applyProtocolOverrides(extractionSnapshot, overrideFile);
  } catch {
    resolvedSnapshot = extractionSnapshot;
  }

  const baseline = evaluateBenchmark(extractionSnapshot, benchmarkFile);
  const resolved = evaluateBenchmark(resolvedSnapshot, benchmarkFile);
  const delta = buildDelta(baseline, resolved);
  const analysis: BenchmarkAnalysis = {
    domain: selectedDomain,
    baseline,
    resolved,
    reviewedDepth: {
      ...buildReviewedDepth(benchmarkFile),
      outcomeCoverageDelta: delta.reviewedOutcomeCoverage,
      stepPhaseCoverageDelta: delta.reviewedStepPhaseCoverage
    },
    delta
  };

  await writeFile(join(processedDir, "benchmark-summary.json"), JSON.stringify(resolved, null, 2), "utf8");
  await writeFile(join(processedDir, "benchmark-analysis.json"), JSON.stringify(analysis, null, 2), "utf8");
  await writeFile(join(processedDir, "benchmark-report.md"), renderAnalysisMarkdown(analysis), "utf8");

  console.log(JSON.stringify(analysis, null, 2));
}

main(domain).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
