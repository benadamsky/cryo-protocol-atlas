import {
  AutoresearchProposalFileSchema,
  type AutoresearchProposal,
  type BenchmarkEntry,
  BenchmarkFileSchema,
  type BenchmarkFile,
  type BenchmarkPatch,
  type ExtractionSnapshot,
  type OutcomeClass,
  type ProtocolExtraction,
  type ProtocolOverride,
  type ProtocolPhase,
  type ProposalField,
  type ProtocolOverrideFile
} from "../../shared/src/schema.js";
import { applyProtocolOverrides, mergeProtocolOverrides } from "../../normalize/src/overrides.js";
import { evaluateBenchmark, type BenchmarkEvaluation } from "./evaluation.js";

type CurrentState = {
  baselineExtractionByPaperId: Map<string, ProtocolExtraction>;
  resolvedExtractionByPaperId: Map<string, ProtocolExtraction>;
};

const MIN_AUTOFILL_CONFIDENCE = 0.78;
const MIN_RECOMMENDED_ACCEPT_CONFIDENCE = 0.9;

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
}

function round(value: number): number {
  return Number(value.toFixed(3));
}

function buildProposalId(
  source: "reviewed-benchmark-repair" | "benchmark-depth-autofill",
  paperId: string,
  fields: ProposalField[]
): string {
  return `${source}:${paperId}:${uniqueSorted(fields).join("+")}`;
}

function buildCurrentState(
  extractionSnapshot: ExtractionSnapshot,
  overrideFile: ProtocolOverrideFile | null
): {
  resolvedSnapshot: ExtractionSnapshot;
  currentState: CurrentState;
} {
  const resolvedSnapshot = applyProtocolOverrides(extractionSnapshot, overrideFile);

  return {
    resolvedSnapshot,
    currentState: {
      baselineExtractionByPaperId: new Map(
        extractionSnapshot.extractions.map((extraction) => [extraction.paper.id, extraction])
      ),
      resolvedExtractionByPaperId: new Map(
        resolvedSnapshot.extractions.map((extraction) => [extraction.paper.id, extraction])
      )
    }
  };
}

function compareList(expected: string[] | undefined, actual: string[] | undefined): boolean {
  if (!expected) {
    return true;
  }

  return JSON.stringify(uniqueSorted(expected)) === JSON.stringify(uniqueSorted(actual ?? []));
}

function uniqueOutcomeClasses(extraction: ProtocolExtraction): OutcomeClass[] {
  return uniqueSorted(extraction.outcomeMentions.map((entry) => entry.outcomeClass)) as OutcomeClass[];
}

function uniqueStepPhases(extraction: ProtocolExtraction): ProtocolPhase[] {
  return uniqueSorted(
    extraction.protocolSteps.map((step) => step.phase).filter((phase) => phase !== "unknown")
  ) as ProtocolPhase[];
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function buildEvidenceSummary(extraction: ProtocolExtraction, fields: ProposalField[]): string[] {
  const lines: string[] = [];

  if (fields.includes("outcomeClasses")) {
    for (const outcome of extraction.outcomeMentions.slice(0, 3)) {
      lines.push(`outcome: ${outcome.outcomeClass} (${outcome.strength}) | ${outcome.summary}`);
    }
  }

  if (fields.includes("stepPhases")) {
    for (const step of extraction.protocolSteps.filter((step) => step.phase !== "unknown").slice(0, 3)) {
      lines.push(`step: ${step.phase} | ${step.summary}`);
    }
  }

  return uniqueSorted(lines).slice(0, 6);
}

function buildDepthProposalConfidence(extraction: ProtocolExtraction, fields: ProposalField[]): number {
  const evidenceScores: number[] = [extraction.extractionConfidence];

  if (fields.includes("outcomeClasses")) {
    for (const mention of extraction.outcomeMentions) {
      for (const evidence of mention.evidence) {
        evidenceScores.push(evidence.confidence);
      }
    }
  }

  if (fields.includes("stepPhases")) {
    for (const step of extraction.protocolSteps) {
      for (const evidence of step.evidence) {
        evidenceScores.push(evidence.confidence);
      }
    }
  }

  return average(evidenceScores);
}

function buildReviewRecommendation(
  extraction: ProtocolExtraction,
  fields: ProposalField[],
  proposalConfidence: number
): NonNullable<AutoresearchProposal["reviewRecommendation"]> {
  const reasons: string[] = [];
  let score = proposalConfidence;

  if (extraction.extractionConfidence >= 0.9) {
    score += 0.03;
    reasons.push("high extraction confidence");
  } else {
    reasons.push("extraction confidence is below high-trust threshold");
  }

  if (fields.length === 1) {
    score += 0.02;
    reasons.push("single-field patch is lower-risk to review");
  } else {
    score -= 0.02;
    reasons.push("multi-field patch should be reviewed more conservatively");
  }

  if (fields.includes("outcomeClasses")) {
    const strongOutcomeMentions = extraction.outcomeMentions.filter(
      (mention) => mention.strength === "moderate" || mention.strength === "strong"
    );
    if (extraction.paperType === "experimental" && strongOutcomeMentions.length > 0) {
      score += 0.03;
      reasons.push("outcome classes come from an experimental paper with non-weak outcome evidence");
    } else {
      score -= 0.05;
      reasons.push("outcome labels are not strongly grounded in experimental abstract evidence");
    }
  }

  if (fields.includes("stepPhases")) {
    const nonUnknownSteps = extraction.protocolSteps.filter((step) => step.phase !== "unknown");
    const uniqueProceduralPhases = uniqueStepPhases(extraction);
    if (uniqueProceduralPhases.length >= 2 && nonUnknownSteps.length >= 2) {
      score += 0.03;
      reasons.push("protocol steps include multiple explicit procedural phases");
    } else {
      score -= 0.05;
      reasons.push("step-phase evidence is sparse and should stay manual-review first");
    }
  }

  const policyConfidence = round(Math.min(1, Math.max(0, score)));
  const recommendedDecision =
    policyConfidence >= MIN_RECOMMENDED_ACCEPT_CONFIDENCE ? "accept" : "defer";

  if (recommendedDecision === "accept") {
    reasons.push("meets conservative accept threshold");
  } else {
    reasons.push("below conservative accept threshold");
  }

  return {
    recommendedDecision,
    policyConfidence,
    reasons: uniqueSorted(reasons)
  };
}

function createOverrideProposal(entry: BenchmarkEntry, fields: ProposalField[]): AutoresearchProposal {
  const override: ProtocolOverride = {
    paperId: entry.paperId
  };

  if (!entry.expectedInAtlas) {
    override.excludeFromAtlas = true;
  } else {
    if (fields.includes("paperType") && entry.expectedPaperType) {
      override.paperType = entry.expectedPaperType;
    }
    if (fields.includes("protocolFamily") && entry.expectedProtocolFamily) {
      override.protocolFamily = entry.expectedProtocolFamily;
    }
    if (fields.includes("speciesMentions") && entry.expectedSpeciesMentions) {
      override.speciesMentions = uniqueSorted(entry.expectedSpeciesMentions);
    }
    if (fields.includes("specimenTypes") && entry.expectedSpecimenTypes) {
      override.specimenTypes = uniqueSorted(entry.expectedSpecimenTypes);
    }
    if (fields.includes("outcomeClasses") && entry.expectedOverridePatch?.outcomeMentions) {
      override.outcomeMentions = entry.expectedOverridePatch.outcomeMentions;
    }
    if (fields.includes("stepPhases") && entry.expectedOverridePatch?.protocolSteps) {
      override.protocolSteps = entry.expectedOverridePatch.protocolSteps;
    }
  }

  return {
    proposalId: buildProposalId("reviewed-benchmark-repair", entry.paperId, fields),
    paperId: entry.paperId,
    title: entry.title,
    benchmarkReviewStatus: entry.reviewStatus,
    source: "reviewed-benchmark-repair",
    target: "override",
    action: entry.expectedInAtlas ? "update-override" : "exclude-paper",
    fields,
    override,
    proposalConfidence: 1,
    evidenceSummary: [],
    rationale: entry.expectedInAtlas
      ? "Resolved output diverges from reviewed benchmark labels for this paper."
      : "Paper is explicitly marked out-of-slice in the reviewed benchmark and should be excluded from the atlas.",
    expectedImpact: [
      entry.expectedInAtlas ? "improve reviewed field accuracy" : "improve reviewed inclusion precision",
      "preserve reviewed benchmark alignment"
    ]
  };
}

function proposalsFromReviewedBenchmark(
  benchmark: BenchmarkFile,
  currentState: CurrentState
): AutoresearchProposal[] {
  const proposals: AutoresearchProposal[] = [];

  for (const entry of benchmark.entries) {
    if (entry.reviewStatus !== "reviewed") {
      continue;
    }

    const resolvedExtraction = currentState.resolvedExtractionByPaperId.get(entry.paperId);
    const baselineExtraction = currentState.baselineExtractionByPaperId.get(entry.paperId);

    if (!entry.expectedInAtlas) {
      if (resolvedExtraction) {
        proposals.push(createOverrideProposal(entry, ["excludeFromAtlas"]));
      }
      continue;
    }

    if (!baselineExtraction) {
      continue;
    }

    const fields: ProposalField[] = [];

    if (!resolvedExtraction) {
      if (entry.expectedPaperType) {
        fields.push("paperType");
      }
      if (entry.expectedProtocolFamily) {
        fields.push("protocolFamily");
      }
      if (entry.expectedSpeciesMentions) {
        fields.push("speciesMentions");
      }
      if (entry.expectedSpecimenTypes) {
        fields.push("specimenTypes");
      }
      if (entry.expectedOutcomeClasses && entry.expectedOverridePatch?.outcomeMentions) {
        fields.push("outcomeClasses");
      }
      if (entry.expectedStepPhases && entry.expectedOverridePatch?.protocolSteps) {
        fields.push("stepPhases");
      }
    } else {
      if (entry.expectedPaperType && resolvedExtraction.paperType !== entry.expectedPaperType) {
        fields.push("paperType");
      }
      if (entry.expectedProtocolFamily && resolvedExtraction.protocolFamily !== entry.expectedProtocolFamily) {
        fields.push("protocolFamily");
      }
      if (!compareList(entry.expectedSpeciesMentions, resolvedExtraction.speciesMentions)) {
        fields.push("speciesMentions");
      }
      if (!compareList(entry.expectedSpecimenTypes, resolvedExtraction.specimenTypes)) {
        fields.push("specimenTypes");
      }
      if (!compareList(entry.expectedOutcomeClasses, uniqueSorted(resolvedExtraction.outcomeMentions.map((entry) => entry.outcomeClass)))) {
        fields.push("outcomeClasses");
      }
      if (!compareList(entry.expectedStepPhases, uniqueSorted(resolvedExtraction.protocolSteps.map((step) => step.phase)))) {
        fields.push("stepPhases");
      }
    }

    if (fields.length > 0) {
      proposals.push(createOverrideProposal(entry, fields));
    }
  }

  return proposals;
}

function createDepthAutofillProposal(
  entry: BenchmarkEntry,
  extraction: ProtocolExtraction,
  fields: ProposalField[]
): AutoresearchProposal {
  const proposalConfidence = buildDepthProposalConfidence(extraction, fields);
  const benchmarkPatch: BenchmarkPatch = {
    paperId: entry.paperId,
    notes: "Autogenerated benchmark depth candidate from the resolved extraction."
  };

  const expectedOverridePatch: ProtocolOverride = {
    paperId: entry.paperId
  };

  if (fields.includes("outcomeClasses")) {
    benchmarkPatch.expectedOutcomeClasses = uniqueOutcomeClasses(extraction);
    expectedOverridePatch.outcomeMentions = extraction.outcomeMentions;
  }

  if (fields.includes("stepPhases")) {
    benchmarkPatch.expectedStepPhases = uniqueStepPhases(extraction);
    expectedOverridePatch.protocolSteps = extraction.protocolSteps.filter((step) => step.phase !== "unknown");
  }

  if (expectedOverridePatch.outcomeMentions || expectedOverridePatch.protocolSteps) {
    benchmarkPatch.expectedOverridePatch = expectedOverridePatch;
  }

  return {
    proposalId: buildProposalId("benchmark-depth-autofill", entry.paperId, fields),
    paperId: entry.paperId,
    title: entry.title,
    benchmarkReviewStatus: entry.reviewStatus,
    source: "benchmark-depth-autofill",
    target: "benchmark",
    action: "update-benchmark",
    fields,
    benchmarkPatch,
    proposalConfidence,
    evidenceSummary: buildEvidenceSummary(extraction, fields),
    rationale:
      "Reviewed in-scope paper is missing benchmark depth labels, but the resolved extraction has explicit protocol/outcome structure that can be promoted for review.",
    expectedImpact: [
      "increase reviewed benchmark depth coverage",
      "create higher-signal review work without changing applied overrides"
    ],
    reviewRecommendation: buildReviewRecommendation(extraction, fields, proposalConfidence)
  };
}

function proposalsFromDepthGaps(
  benchmark: BenchmarkFile,
  currentState: CurrentState
): AutoresearchProposal[] {
  const proposals: AutoresearchProposal[] = [];
  const proceduralPhases = new Set([
    "equilibration",
    "loading",
    "cooling",
    "storage",
    "warming",
    "unloading",
    "perfusion"
  ]);

  for (const entry of benchmark.entries) {
    if (entry.reviewStatus !== "reviewed" || !entry.expectedInAtlas) {
      continue;
    }

    const resolvedExtraction = currentState.resolvedExtractionByPaperId.get(entry.paperId);
    if (!resolvedExtraction) {
      continue;
    }

    if (resolvedExtraction.extractionConfidence < MIN_AUTOFILL_CONFIDENCE) {
      continue;
    }

    const fields: ProposalField[] = [];
    const availableOutcomeClasses = uniqueOutcomeClasses(resolvedExtraction);
    const availableStepPhases = uniqueStepPhases(resolvedExtraction);
    const hasExplicitProcedurePhase = availableStepPhases.some((phase) => proceduralPhases.has(phase));

    if (
      (!entry.expectedOutcomeClasses || entry.expectedOutcomeClasses.length === 0) &&
      resolvedExtraction.paperType === "experimental" &&
      availableOutcomeClasses.length > 0 &&
      resolvedExtraction.outcomeMentions.some((mention) => mention.strength !== "weak")
    ) {
      fields.push("outcomeClasses");
    }

    if (
      (!entry.expectedStepPhases || entry.expectedStepPhases.length === 0) &&
      availableStepPhases.length > 0 &&
      hasExplicitProcedurePhase
    ) {
      fields.push("stepPhases");
    }

    if (fields.length > 0) {
      proposals.push(createDepthAutofillProposal(entry, resolvedExtraction, fields));
    }
  }

  return proposals;
}

function applyBenchmarkPatches(
  benchmark: BenchmarkFile,
  proposals: AutoresearchProposal[]
): BenchmarkFile {
  const patches = new Map(
    proposals
      .filter((proposal) => proposal.target === "benchmark" && proposal.benchmarkPatch)
      .map((proposal) => [proposal.paperId, proposal.benchmarkPatch as BenchmarkPatch])
  );

  if (patches.size === 0) {
    return benchmark;
  }

  return BenchmarkFileSchema.parse({
    ...benchmark,
    generatedAt: new Date().toISOString(),
    entries: benchmark.entries.map((entry) => {
      const patch = patches.get(entry.paperId);
      if (!patch) {
        return entry;
      }

      return {
        ...entry,
        expectedOutcomeClasses: patch.expectedOutcomeClasses ?? entry.expectedOutcomeClasses,
        expectedStepPhases: patch.expectedStepPhases ?? entry.expectedStepPhases,
        expectedOverridePatch:
          patch.expectedOverridePatch || entry.expectedOverridePatch
            ? {
                ...(entry.expectedOverridePatch ?? { paperId: entry.paperId }),
                ...(patch.expectedOverridePatch ?? {})
              }
            : undefined
      };
    })
  });
}

export type AutoresearchLoopResult = {
  resolvedSnapshot: ExtractionSnapshot;
  baselineEvaluation: BenchmarkEvaluation;
  currentEvaluation: BenchmarkEvaluation;
  proposalFile: ReturnType<typeof AutoresearchProposalFileSchema.parse>;
  candidateEvaluation: BenchmarkEvaluation;
  candidateBenchmarkEvaluation: BenchmarkEvaluation;
  candidateOverrideCount: number;
  autoApplySafe: boolean;
};

export function runAutoresearchLoop(
  extractionSnapshot: ExtractionSnapshot,
  benchmark: BenchmarkFile,
  overrideFile: ProtocolOverrideFile | null
): AutoresearchLoopResult {
  const { resolvedSnapshot, currentState } = buildCurrentState(extractionSnapshot, overrideFile);
  const baselineEvaluation = evaluateBenchmark(extractionSnapshot, benchmark);
  const currentEvaluation = evaluateBenchmark(resolvedSnapshot, benchmark);
  const proposals = [...proposalsFromReviewedBenchmark(benchmark, currentState), ...proposalsFromDepthGaps(benchmark, currentState)].sort(
    (left, right) =>
      left.target.localeCompare(right.target) ||
      right.proposalConfidence - left.proposalConfidence ||
      left.title.localeCompare(right.title)
  );
  const proposalOverrides = proposals
    .filter((proposal): proposal is AutoresearchProposal & { override: ProtocolOverride } => proposal.target === "override" && Boolean(proposal.override))
    .map((proposal) => proposal.override);
  const mergedOverrideFile = mergeProtocolOverrides(overrideFile, proposalOverrides);
  const candidateSnapshot = applyProtocolOverrides(extractionSnapshot, mergedOverrideFile);
  const candidateEvaluation = evaluateBenchmark(candidateSnapshot, benchmark);
  const candidateBenchmark = applyBenchmarkPatches(benchmark, proposals);
  const candidateBenchmarkEvaluation = evaluateBenchmark(candidateSnapshot, candidateBenchmark);
  const autoApplySafe =
    proposalOverrides.length > 0 &&
    proposals
      .filter((proposal) => proposal.target === "override")
      .every((proposal) => proposal.benchmarkReviewStatus === "reviewed") &&
    candidateEvaluation.gates.every((gate) => gate.passed) &&
    candidateEvaluation.subsets.reviewed.inclusion.f1 >= currentEvaluation.subsets.reviewed.inclusion.f1 &&
    candidateEvaluation.subsets.reviewed.exactFields.protocolFamily.accuracy >=
      currentEvaluation.subsets.reviewed.exactFields.protocolFamily.accuracy &&
    candidateEvaluation.subsets.reviewed.exactFields.paperType.accuracy >=
      currentEvaluation.subsets.reviewed.exactFields.paperType.accuracy;

  return {
    resolvedSnapshot,
    baselineEvaluation,
    currentEvaluation,
    proposalFile: AutoresearchProposalFileSchema.parse({
      generatedAt: new Date().toISOString(),
      domain: benchmark.domain,
      benchmarkDescription: benchmark.description,
      proposalCount: proposals.length,
      proposals
    }),
    candidateEvaluation,
    candidateBenchmarkEvaluation,
    candidateOverrideCount: mergedOverrideFile?.overrides.length ?? 0,
    autoApplySafe
  };
}
