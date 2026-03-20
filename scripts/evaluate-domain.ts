import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { applyProtocolOverrides, parseOverrideFile } from "../packages/normalize/src/overrides.js";
import { evaluateBenchmark, renderBenchmarkMarkdown } from "../packages/research/src/evaluation.js";
import {
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
  delta: {
    reviewedInclusionF1: number;
    reviewedProtocolFamilyAccuracy: number;
    reviewedPaperTypeAccuracy: number;
    reviewedSpeciesMacroF1: number;
    reviewedSpecimenMacroF1: number;
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
    gatePassCount:
      resolved.gates.filter((gate) => gate.passed).length - analysis.gates.filter((gate) => gate.passed).length
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
  const analysis: BenchmarkAnalysis = {
    domain: selectedDomain,
    baseline,
    resolved,
    delta: buildDelta(baseline, resolved)
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
