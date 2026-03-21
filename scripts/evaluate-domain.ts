import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { applyProtocolOverrides, parseOverrideFile } from "../packages/normalize/src/overrides.js";
import { evaluateBenchmark, renderBenchmarkMarkdown } from "../packages/research/src/evaluation.js";
import {
  type BenchmarkFile,
  BenchmarkFileSchema,
  DomainIdSchema,
  ExtractionSnapshotSchema,
  type ProtocolExtraction,
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
    missingOutcomeAudit: {
      extractorGapCount: number;
      ambiguousEvidenceCount: number;
      evidenceThinCount: number;
    };
    missingOutcomes: Array<{
      paperId: string;
      title: string;
      protocolFamily?: string;
      paperType?: string;
      doi?: string | null;
      paperUrl?: string | null;
      evidenceStatus?: "extractor-gap" | "ambiguous-evidence" | "evidence-thin";
      evidenceReason?: string;
    }>;
    missingStepPhases: Array<{
      paperId: string;
      title: string;
      protocolFamily?: string;
      paperType?: string;
      doi?: string | null;
      paperUrl?: string | null;
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
  const emptyAudit = {
    extractorGapCount: 0,
    ambiguousEvidenceCount: 0,
    evidenceThinCount: 0
  };

  const reviewedIncluded = benchmarkFile.entries.filter((entry) => entry.reviewStatus === "reviewed" && entry.expectedInAtlas);
  const missingOutcomes = reviewedIncluded
    .filter((entry) => !entry.expectedOutcomeClasses || entry.expectedOutcomeClasses.length === 0)
    .map((entry) => ({
      paperId: entry.paperId,
      title: entry.title,
      protocolFamily: entry.expectedProtocolFamily,
      paperType: entry.expectedPaperType,
      doi: undefined,
      paperUrl: undefined
    }));
  const missingStepPhases = reviewedIncluded
    .filter((entry) => !entry.expectedStepPhases || entry.expectedStepPhases.length === 0)
    .map((entry) => ({
      paperId: entry.paperId,
      title: entry.title,
      protocolFamily: entry.expectedProtocolFamily,
      paperType: entry.expectedPaperType,
      doi: undefined,
      paperUrl: undefined
    }));

  return {
    outcomeCoverageDelta: 0,
    stepPhaseCoverageDelta: 0,
    missingOutcomeCount: missingOutcomes.length,
    missingStepPhaseCount: missingStepPhases.length,
    missingOutcomeAudit: emptyAudit,
    missingOutcomes,
    missingStepPhases
  };
}

const EXPLICIT_OUTCOME_TEXT_PATTERNS = [
  /\bviability\b/i,
  /\bsurvival\b/i,
  /\brecovery\b/i,
  /\byield\b/i,
  /\bfunction(?:al|ality)?\b/i,
  /\binsulin secretion\b/i,
  /\binsulin release\b/i,
  /\bmorpholog(?:y|ical)\b/i,
  /\bhistolog(?:y|ical)\b/i,
  /\btransplant(?:ation|ed)?\b/i,
  /\bgraft(?:ed|s)?\b/i,
  /\bnormoglyc/i,
  /\beuglyc/i
];

const AMBIGUOUS_RESULT_PATTERNS = [
  /\bsuccess(?:ful|fully)?\b/i,
  /\bimprov(?:e|ed|ement)\b/i,
  /\benhanc(?:e|ed|ement)\b/i,
  /\bpreserv(?:e|ed|ation)\b/i,
  /\bprolong(?:ed|ation)?\b/i,
  /\bprotective effect\b/i,
  /\bnovel cryoprotectant\b/i,
  /\bcomparison\b/i,
  /\bcompare\b/i
];

function classifyMissingOutcomeEvidence(
  extraction: ProtocolExtraction | undefined
): {
  status: "extractor-gap" | "ambiguous-evidence" | "evidence-thin";
  reason: string;
} {
  if (!extraction) {
    return {
      status: "evidence-thin",
      reason: "no resolved extraction available for this reviewed paper"
    };
  }

  if (extraction.outcomeMentions.length > 0) {
    return {
      status: "extractor-gap",
      reason: "resolved extraction already contains outcome evidence but the reviewed benchmark is still unlabeled"
    };
  }

  const combinedText = `${extraction.paper.title}. ${extraction.paper.abstract ?? ""}`;
  if (EXPLICIT_OUTCOME_TEXT_PATTERNS.some((pattern) => pattern.test(combinedText))) {
    return {
      status: "extractor-gap",
      reason: "title/abstract contains explicit outcome language but no outcome class was extracted"
    };
  }

  if (AMBIGUOUS_RESULT_PATTERNS.some((pattern) => pattern.test(combinedText))) {
    return {
      status: "ambiguous-evidence",
      reason: "title/abstract suggests a positive result but does not state a concrete benchmark-safe outcome class"
    };
  }

  return {
    status: "evidence-thin",
    reason: "available title/abstract text is mostly procedural and does not state a concrete outcome"
  };
}

function attachReviewedDepthEvidence(
  benchmarkFile: BenchmarkFile,
  resolvedSnapshot: ReturnType<typeof ExtractionSnapshotSchema.parse>
): BenchmarkAnalysis["reviewedDepth"] {
  const baseline = buildReviewedDepth(benchmarkFile);
  const extractionByPaperId = new Map(
    resolvedSnapshot.extractions.map((extraction) => [extraction.paper.paper_id, extraction])
  );

  const missingOutcomes = baseline.missingOutcomes.map((entry) => {
    const extraction = extractionByPaperId.get(entry.paperId);
    const evidence = classifyMissingOutcomeEvidence(extraction);
    return {
      ...entry,
      doi: extraction?.paper.doi ?? undefined,
      paperUrl: extraction?.paper.paper_url ?? undefined,
      evidenceStatus: evidence.status,
      evidenceReason: evidence.reason
    };
  });
  const missingStepPhases = baseline.missingStepPhases.map((entry) => {
    const extraction = extractionByPaperId.get(entry.paperId);
    return {
      ...entry,
      doi: extraction?.paper.doi ?? undefined,
      paperUrl: extraction?.paper.paper_url ?? undefined
    };
  });

  const missingOutcomeAudit = {
    extractorGapCount: missingOutcomes.filter((entry) => entry.evidenceStatus === "extractor-gap").length,
    ambiguousEvidenceCount: missingOutcomes.filter((entry) => entry.evidenceStatus === "ambiguous-evidence").length,
    evidenceThinCount: missingOutcomes.filter((entry) => entry.evidenceStatus === "evidence-thin").length
  };

  return {
    ...baseline,
    missingOutcomes,
    missingStepPhases,
    missingOutcomeAudit
  };
}

function formatDoiUrl(doi?: string | null): string | null {
  if (!doi) {
    return null;
  }

  const normalized = doi.replace(/^https?:\/\/doi\.org\//i, "").trim();
  return normalized ? `https://doi.org/${normalized}` : null;
}

function renderEvidenceResolutionQueue(analysis: BenchmarkAnalysis): string {
  const lines: string[] = [];
  lines.push(`# ${analysis.domain} evidence resolution queue`);
  lines.push("");
  lines.push(
    `Outcome evidence gaps: extractor-gap=${analysis.reviewedDepth.missingOutcomeAudit.extractorGapCount}, ambiguous-evidence=${analysis.reviewedDepth.missingOutcomeAudit.ambiguousEvidenceCount}, evidence-thin=${analysis.reviewedDepth.missingOutcomeAudit.evidenceThinCount}`
  );
  lines.push(`Step-phase gaps: ${analysis.reviewedDepth.missingStepPhaseCount}`);
  lines.push("");

  const sections: Array<{
    title: string;
    items: typeof analysis.reviewedDepth.missingOutcomes;
    recommendation: string;
  }> = [
    {
      title: "Extractor gaps",
      items: analysis.reviewedDepth.missingOutcomes.filter((entry) => entry.evidenceStatus === "extractor-gap"),
      recommendation: "Tighten outcome extraction or promotion policy; current source likely already contains enough signal."
    },
    {
      title: "Ambiguous evidence",
      items: analysis.reviewedDepth.missingOutcomes.filter((entry) => entry.evidenceStatus === "ambiguous-evidence"),
      recommendation: "Needs manual review or fuller source text before benchmark promotion."
    },
    {
      title: "Evidence-thin",
      items: analysis.reviewedDepth.missingOutcomes.filter((entry) => entry.evidenceStatus === "evidence-thin"),
      recommendation: "Abstract/title appears too procedural; fetch fuller source or leave unlabeled."
    }
  ];

  for (const section of sections) {
    lines.push(`## ${section.title}`);
    lines.push(section.recommendation);
    if (section.items.length === 0) {
      lines.push("- none");
      lines.push("");
      continue;
    }

    for (const entry of section.items) {
      const doiUrl = formatDoiUrl(entry.doi);
      lines.push(
        `- ${entry.title} | family=${entry.protocolFamily ?? "n/a"} type=${entry.paperType ?? "n/a"}`
      );
      if (entry.evidenceReason) {
        lines.push(`  reason=${entry.evidenceReason}`);
      }
      if (doiUrl) {
        lines.push(`  doi=${doiUrl}`);
      } else if (entry.paperUrl) {
        lines.push(`  source=${entry.paperUrl}`);
      }
    }
    lines.push("");
  }

  if (analysis.reviewedDepth.missingStepPhases.length > 0) {
    lines.push("## Step-phase review remains manual");
    for (const entry of analysis.reviewedDepth.missingStepPhases) {
      const doiUrl = formatDoiUrl(entry.doi);
      lines.push(`- ${entry.title} | family=${entry.protocolFamily ?? "n/a"} type=${entry.paperType ?? "n/a"}`);
      if (doiUrl) {
        lines.push(`  doi=${doiUrl}`);
      } else if (entry.paperUrl) {
        lines.push(`  source=${entry.paperUrl}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
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
  lines.push(
    `- missing outcome evidence audit: extractor-gap=${analysis.reviewedDepth.missingOutcomeAudit.extractorGapCount} ambiguous-evidence=${analysis.reviewedDepth.missingOutcomeAudit.ambiguousEvidenceCount} evidence-thin=${analysis.reviewedDepth.missingOutcomeAudit.evidenceThinCount}`
  );
  if (analysis.reviewedDepth.missingOutcomes.length > 0) {
    lines.push("");
    lines.push("### Missing reviewed outcomes");
    for (const entry of analysis.reviewedDepth.missingOutcomes.slice(0, 15)) {
      lines.push(
        `- ${entry.title} | family=${entry.protocolFamily ?? "n/a"} type=${entry.paperType ?? "n/a"} evidence=${entry.evidenceStatus ?? "n/a"}`
      );
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
  const reviewedDepth = attachReviewedDepthEvidence(benchmarkFile, resolvedSnapshot);
  const analysis: BenchmarkAnalysis = {
    domain: selectedDomain,
    baseline,
    resolved,
    reviewedDepth: {
      ...reviewedDepth,
      outcomeCoverageDelta: delta.reviewedOutcomeCoverage,
      stepPhaseCoverageDelta: delta.reviewedStepPhaseCoverage
    },
    delta
  };

  await writeFile(join(processedDir, "benchmark-summary.json"), JSON.stringify(resolved, null, 2), "utf8");
  await writeFile(join(processedDir, "benchmark-analysis.json"), JSON.stringify(analysis, null, 2), "utf8");
  await writeFile(join(processedDir, "benchmark-report.md"), renderAnalysisMarkdown(analysis), "utf8");
  await writeFile(join(processedDir, "benchmark-evidence-queue.md"), renderEvidenceResolutionQueue(analysis), "utf8");

  console.log(JSON.stringify(analysis, null, 2));
}

main(domain).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
