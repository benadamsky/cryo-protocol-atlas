import {
  AutoresearchProposalFileSchema,
  type AutoresearchProposal,
  type BenchmarkEntry,
  type BenchmarkFile,
  type ExtractionSnapshot,
  type ProtocolExtraction,
  type ProtocolOverride,
  type ProposalField,
  type ProtocolOverrideFile
} from "../../shared/src/schema.js";
import { applyProtocolOverrides, mergeProtocolOverrides } from "../../normalize/src/overrides.js";
import { evaluateBenchmark, type BenchmarkEvaluation } from "./evaluation.js";

type CurrentState = {
  baselineExtractionByPaperId: Map<string, ProtocolExtraction>;
  resolvedExtractionByPaperId: Map<string, ProtocolExtraction>;
};

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
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

function createProposal(entry: BenchmarkEntry, fields: ProposalField[]): AutoresearchProposal {
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
    paperId: entry.paperId,
    title: entry.title,
    benchmarkReviewStatus: entry.reviewStatus,
    action: entry.expectedInAtlas ? "update-override" : "exclude-paper",
    fields,
    override,
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
        proposals.push(createProposal(entry, ["excludeFromAtlas"]));
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
      proposals.push(createProposal(entry, fields));
    }
  }

  return proposals.sort((left, right) => left.title.localeCompare(right.title));
}

export type AutoresearchLoopResult = {
  resolvedSnapshot: ExtractionSnapshot;
  baselineEvaluation: BenchmarkEvaluation;
  currentEvaluation: BenchmarkEvaluation;
  proposalFile: ReturnType<typeof AutoresearchProposalFileSchema.parse>;
  candidateEvaluation: BenchmarkEvaluation;
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
  const proposals = proposalsFromReviewedBenchmark(benchmark, currentState);
  const proposalOverrides = proposals.map((proposal) => proposal.override);
  const mergedOverrideFile = mergeProtocolOverrides(overrideFile, proposalOverrides);
  const candidateSnapshot = applyProtocolOverrides(extractionSnapshot, mergedOverrideFile);
  const candidateEvaluation = evaluateBenchmark(candidateSnapshot, benchmark);
  const autoApplySafe =
    proposals.every((proposal) => proposal.benchmarkReviewStatus === "reviewed") &&
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
    candidateOverrideCount: mergedOverrideFile?.overrides.length ?? 0,
    autoApplySafe
  };
}
