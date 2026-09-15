import { getDomain } from "../../shared/src/domains/index.js";
import {
  ResearchHypothesisSchema,
  type Contradiction,
  type DomainId,
  type ExperimentSuggestion,
  type ExtractionSnapshot,
  type OutcomeClass,
  type ProtocolExtraction,
  type ResearchHypothesis
} from "../../shared/src/schema.js";

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function meaningfulPhases(extraction: ProtocolExtraction): string[] {
  return unique(
    extraction.protocolSteps
      .map((step) => step.phase)
      .filter((phase) => !["unknown", "assessment", "culture"].includes(phase))
  );
}

function strongestOutcomeClasses(extraction: ProtocolExtraction): OutcomeClass[] {
  return unique(extraction.outcomeMentions.map((entry) => entry.outcomeClass)) as OutcomeClass[];
}

function relevantExtractions(
  snapshot: ExtractionSnapshot,
  suggestion: ExperimentSuggestion
): ProtocolExtraction[] {
  const titleSet = new Set(suggestion.supportingContext.paperTitles);

  const exactTitleMatches = snapshot.extractions.filter((extraction) => titleSet.has(extraction.paper.title));
  if (exactTitleMatches.length > 0) {
    return exactTitleMatches;
  }

  return snapshot.extractions.filter((extraction) => {
    const specimenOverlap = extraction.specimenTypes.some((specimen) =>
      suggestion.supportingContext.specimenTypes.includes(specimen)
    );
    const chemicalOverlap = extraction.chemicalMentions.some((chemical) =>
      suggestion.supportingContext.chemicals.includes(chemical.canonicalName)
    );
    const familyOverlap = suggestion.supportingContext.protocolFamilies.includes(extraction.protocolFamily);
    return specimenOverlap && (chemicalOverlap || familyOverlap);
  });
}

function contradictionCountFor(
  relevant: ProtocolExtraction[],
  contradictions: Contradiction[]
): number {
  const titleSet = new Set(relevant.map((extraction) => extraction.paper.title));
  return contradictions.filter(
    (entry) => titleSet.has(entry.paperA.title) || titleSet.has(entry.paperB.title)
  ).length;
}

function blockersFor(
  domain: DomainId,
  suggestion: ExperimentSuggestion,
  relevant: ProtocolExtraction[],
  contradictionCount: number
): string[] {
  const blockers: string[] = [];
  const unknownFamilies = relevant.filter((extraction) => extraction.protocolFamily === "unknown").length;
  const sparseProtocols = relevant.filter((extraction) => meaningfulPhases(extraction).length <= 1).length;
  const strongOutcomeCount = relevant.filter((extraction) =>
    extraction.outcomeMentions.some((entry) => entry.strength === "strong")
  ).length;
  const transplantationCount = relevant.filter((extraction) =>
    extraction.outcomeMentions.some((entry) => entry.outcomeClass === "transplantation")
  ).length;

  if (unknownFamilies > 0) {
    blockers.push(`${unknownFamilies} relevant papers still have unknown preservation family labels`);
  }

  if (sparseProtocols > 0) {
    blockers.push(`${sparseProtocols} relevant papers still have sparse step structure`);
  }

  if (contradictionCount > 0) {
    blockers.push(`${contradictionCount} unresolved contradictions remain in the relevant evidence slice`);
  }

  if (suggestion.category === "endpoint-upgrade" && transplantationCount === 0) {
    blockers.push("No transplantation endpoint is present in the directly supporting slice yet");
  }

  if (suggestion.category === "scale-up" && strongOutcomeCount === 0) {
    blockers.push("Scale-up evidence is still light on strong post-warm outcomes");
  }

  if (getDomain(domain).research.benchmarkNeedsBothFamilies && suggestion.category === "benchmark") {
    const vitrificationCount = relevant.filter((extraction) => extraction.protocolFamily === "vitrification").length;
    const slowFreezingCount = relevant.filter((extraction) => extraction.protocolFamily === "slow-freezing").length;
    if (vitrificationCount === 0 || slowFreezingCount === 0) {
      blockers.push("Benchmark still lacks balanced evidence from both vitrification and slow-freezing");
    }
  }

  return blockers;
}

function actionabilityScoreFor(category: ExperimentSuggestion["category"]): number {
  switch (category) {
    case "workflow-gap":
      return 0.92;
    case "benchmark":
      return 0.84;
    case "endpoint-upgrade":
      return 0.8;
    case "scale-up":
      return 0.72;
  }
}

export function buildResearchHypotheses(
  snapshot: ExtractionSnapshot,
  suggestions: ExperimentSuggestion[],
  contradictions: Contradiction[]
): ResearchHypothesis[] {
  const hypotheses = suggestions.map((suggestion) => {
    const relevant = relevantExtractions(snapshot, suggestion);
    const experimental = relevant.filter((extraction) => extraction.paperType === "experimental");
    const comparative = relevant.filter((extraction) => extraction.protocolFamily === "comparative");
    const distinctSpeciesCount = unique(relevant.flatMap((extraction) => extraction.speciesMentions)).length;
    const strongOutcomePaperCount = relevant.filter((extraction) =>
      extraction.outcomeMentions.some((entry) => entry.strength === "strong")
    ).length;
    const transplantationPaperCount = relevant.filter((extraction) =>
      extraction.outcomeMentions.some((entry) => entry.outcomeClass === "transplantation")
    ).length;
    const sparseProtocolPaperCount = relevant.filter((extraction) => meaningfulPhases(extraction).length <= 1).length;
    const contradictionCount = contradictionCountFor(relevant, contradictions);
    const unknownFamilyCount = relevant.filter((extraction) => extraction.protocolFamily === "unknown").length;

    const evidenceScore = clamp(
      experimental.length / 6 * 0.4 +
        distinctSpeciesCount / 3 * 0.2 +
        strongOutcomePaperCount / 3 * 0.2 +
        Math.min(comparative.length, 1) * 0.1 +
        transplantationPaperCount / 2 * 0.1
    );

    const uncertaintyScore = clamp(
      contradictionCount / 3 * 0.35 +
        (relevant.length > 0 ? unknownFamilyCount / relevant.length : 0) * 0.35 +
        (relevant.length > 0 ? sparseProtocolPaperCount / relevant.length : 0) * 0.3
    );

    const actionabilityScore = actionabilityScoreFor(suggestion.category);
    const priorityScore = clamp(
      evidenceScore * 0.35 + uncertaintyScore * 0.25 + actionabilityScore * 0.4
    );

    const blockers = blockersFor(snapshot.domain, suggestion, relevant, contradictionCount);

    return ResearchHypothesisSchema.parse({
      id: `${snapshot.domain}:${suggestion.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
      domain: snapshot.domain,
      title: suggestion.title,
      category: suggestion.category,
      claim: suggestion.hypothesis,
      proposedExperiment: suggestion.rationale,
      supportingContext: suggestion.supportingContext,
      evidence: {
        totalPaperCount: relevant.length,
        experimentalPaperCount: experimental.length,
        comparativePaperCount: comparative.length,
        distinctSpeciesCount,
        strongOutcomePaperCount,
        transplantationPaperCount,
        contradictionCount,
        sparseProtocolPaperCount
      },
      scores: {
        evidenceScore: Number(evidenceScore.toFixed(3)),
        uncertaintyScore: Number(uncertaintyScore.toFixed(3)),
        actionabilityScore: Number(actionabilityScore.toFixed(3)),
        priorityScore: Number(priorityScore.toFixed(3))
      },
      blockers,
      rationale: suggestion.rationale
    });
  });

  return hypotheses.sort((left, right) => right.scores.priorityScore - left.scores.priorityScore);
}
