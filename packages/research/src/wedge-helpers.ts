import type {
  EvidenceAuthorityProfile,
  EvidenceStrength,
  ExperimentSuggestion,
  ExtractionSnapshot,
  ProtocolExtraction,
  ResearchHypothesis,
  SourceEnrichmentFile,
  TranslationalSignal
} from "../../shared/src/schema.js";

const BASE_CHEMICALS = new Set([
  "Dimethyl Sulfoxide",
  "Ethylene Glycol",
  "Glycerol",
  "Propylene Glycol",
  "Sucrose"
]);

export function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

export function meaningfulPhases(extraction: ProtocolExtraction): string[] {
  return unique(
    extraction.protocolSteps
      .map((step) => step.phase)
      .filter((phase) => !["unknown", "assessment", "culture"].includes(phase))
  );
}

export function reviewedEnrichmentTitleSet(sourceEnrichment?: SourceEnrichmentFile): Set<string> {
  return new Set(
    sourceEnrichment?.records
      .filter((record) => record.status === "reviewed")
      .map((record) => record.title) ?? []
  );
}

export function relevantExtractionsForSuggestion(
  snapshot: ExtractionSnapshot,
  suggestion: Pick<ExperimentSuggestion, "supportingContext">
): ProtocolExtraction[] {
  const titleSet = new Set(suggestion.supportingContext.paperTitles);
  const exactMatches = snapshot.extractions.filter((extraction) => titleSet.has(extraction.paper.title));

  if (exactMatches.length > 0) {
    return exactMatches;
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

export function relevantExtractionsForHypothesis(
  snapshot: ExtractionSnapshot,
  hypothesis: Pick<ResearchHypothesis, "supportingContext">
): ProtocolExtraction[] {
  return relevantExtractionsForSuggestion(snapshot, hypothesis);
}

export function pickAuthorityProfile(
  extraction: ProtocolExtraction,
  reviewedEnrichmentTitles: Set<string>
): EvidenceAuthorityProfile {
  if (!reviewedEnrichmentTitles.has(extraction.paper.title)) {
    return "abstract-only";
  }

  if (
    extraction.evidenceAuthority.primaryDirectSnippetCount > 0 ||
    extraction.evidenceAuthority.primaryIndirectSnippetCount > 0
  ) {
    return "primary-backed";
  }

  if (extraction.evidenceAuthority.secondarySnippetCount > 0) {
    return "secondary-backed";
  }

  return "manual-curation-backed";
}

export function pickEvidenceStrength(
  extraction: ProtocolExtraction,
  reviewedEnrichmentTitles: Set<string>
): EvidenceStrength {
  const hasStrong = extraction.outcomeMentions.some((outcome) => outcome.strength === "strong");
  const hasModerate = extraction.outcomeMentions.some((outcome) => outcome.strength === "moderate");

  if (hasStrong && reviewedEnrichmentTitles.has(extraction.paper.title)) {
    return "strong";
  }
  if (hasStrong || hasModerate) {
    return "moderate";
  }
  return "limited";
}

export function pickTranslationalSignal(extraction: ProtocolExtraction): TranslationalSignal {
  const title = extraction.paper.title.toLowerCase();
  const species = new Set(extraction.speciesMentions.map((value) => value.toLowerCase()));
  const hasTransplantation = extraction.outcomeMentions.some(
    (outcome) => outcome.outcomeClass === "transplantation"
  );

  if (species.has("human")) {
    return "clinically adjacent";
  }
  if (hasTransplantation || /transplant|normoglycemic|clinical trial|banking/.test(title)) {
    return "transplant relevant";
  }
  if (extraction.outcomeMentions.length > 0) {
    return "preclinical";
  }
  return "research only";
}

export function pickBaseCpaBackbone(extraction: ProtocolExtraction): string {
  const baseChemicals = unique(
    extraction.chemicalMentions
      .map((chemical) => chemical.canonicalName)
      .filter((chemical) => BASE_CHEMICALS.has(chemical))
  );

  return baseChemicals.length > 0 ? baseChemicals.join(" + ") : "unspecified";
}

export function pickAdjuncts(extraction: ProtocolExtraction): string[] {
  const title = extraction.paper.title;
  const inferredAdjuncts: string[] = [];
  if (/p38 mapk inhibitor/i.test(title)) {
    inferredAdjuncts.push("p38 MAPK inhibitor");
  }

  return unique([
    ...inferredAdjuncts,
    extraction.chemicalMentions
      .map((chemical) => chemical.canonicalName)
      .filter((chemical) => !BASE_CHEMICALS.has(chemical))
  ].flat());
}

export function translationalSignalWeight(signal: TranslationalSignal): number {
  switch (signal) {
    case "clinically adjacent":
      return 1;
    case "transplant relevant":
      return 0.85;
    case "preclinical":
      return 0.6;
    case "research only":
      return 0.35;
  }
}

export function authorityWeight(profile: EvidenceAuthorityProfile): number {
  switch (profile) {
    case "primary-backed":
      return 1;
    case "secondary-backed":
      return 0.75;
    case "manual-curation-backed":
      return 0.6;
    case "abstract-only":
      return 0.35;
  }
}
