import type { AtlasSummary } from "./atlas.js";
import { getDomain } from "../../shared/src/domains/index.js";
import {
  type ActiveWedge,
  ActiveWedgeSchema,
  type DomainId,
  type ExtractionSnapshot,
  type ResearchHypothesis,
  type SourceEnrichmentFile
} from "../../shared/src/schema.js";
import {
  pickAdjuncts,
  pickAuthorityProfile,
  pickTranslationalSignal,
  relevantExtractionsForHypothesis,
  reviewedEnrichmentTitleSet,
  unique,
  translationalSignalWeight
} from "./wedge-helpers.js";

type BenchmarkAnalysis = {
  resolved: {
    summary: {
      reviewedOutcomeCoverage: number;
      reviewedStepPhaseCoverage: number;
    };
  };
};

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function wedgeIdFor(domain: string, hypothesis: ResearchHypothesis): string {
  return `${domain}:${hypothesis.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

function focusQuestionFor(domain: DomainId, hypothesis: ResearchHypothesis): string {
  const focusQuestion = getDomain(domain).research.focusQuestion;
  if (focusQuestion) {
    return focusQuestion;
  }
  if (hypothesis.category === "benchmark") {
    return "Which protocol comparison is sharp enough to anchor a first commercial cryopreservation wedge?";
  }
  return "Which cryopreservation slice is most decision-useful now, and what evidence still blocks a committed wedge call?";
}

function decisionQuestionFor(hypothesis: ResearchHypothesis): string {
  if (hypothesis.category === "benchmark") {
    return `Should Atlas prioritize "${hypothesis.title}" as the main head-to-head wedge benchmark?`;
  }
  if (hypothesis.category === "endpoint-upgrade") {
    return `Would stronger endpoint evidence materially reorder the current wedge around "${hypothesis.title}"?`;
  }
  if (hypothesis.category === "scale-up") {
    return `Is the main opportunity in workflow scale-up rather than base chemistry for "${hypothesis.title}"?`;
  }
  return `Is evidence resolution the main blocker before making a wedge call on "${hypothesis.title}"?`;
}

function currentReadFor(input: {
  domain: string;
  title: string;
  evidenceConfidence: number;
  companyRelevance: number;
  pendingSourceEnrichmentCount: number;
}): string {
  if (/additive-assisted/i.test(input.title) && input.evidenceConfidence >= 0.75) {
    return "Best current wedge in islets. The literature is strong enough to justify a focused additive benchmark, but not strong enough to claim a winning adjunct yet.";
  }
  if (input.evidenceConfidence >= 0.78 && input.companyRelevance >= 0.7) {
    return "Best current wedge. The evidence is strong enough for serious scientific and company-entry conversations, with the main uncertainties still explicit.";
  }
  if (input.pendingSourceEnrichmentCount > 0) {
    return "Best current wedge, but still limited by wedge-relevant source enrichment and thin authority support.";
  }
  return "Best current wedge, but still better treated as a proving ground than a committed entry point.";
}

function recommendedNextStepFor(hypothesis: ResearchHypothesis, chemicals: string[]): string {
  if (/additive-assisted/i.test(hypothesis.title)) {
    const candidates = chemicals.filter((chemical) => chemical !== "Dimethyl Sulfoxide").slice(0, 4);
    return `Run a fixed-backbone additive benchmark with ${candidates.join(", ")} on a DMSO-centered base mix, using post-thaw function as the primary readout.`;
  }
  if (/matched-species/i.test(hypothesis.title)) {
    return "Run a same-species, same-readout comparison between vitrification and slow-freezing before making a harder wedge call.";
  }
  return hypothesis.proposedExperiment;
}

function dominantChemicalsFor(
  hypothesis: ResearchHypothesis,
  relevantExtractions: ExtractionSnapshot["extractions"]
): string[] {
  if (/additive-assisted/i.test(hypothesis.title)) {
    const adjunctScores = new Map<string, number>();
    for (const extraction of relevantExtractions) {
      for (const adjunct of pickAdjuncts(extraction)) {
        const humanBonus = extraction.speciesMentions.some((species) => species.toLowerCase() === "human") ? 1 : 0;
        const primaryBonus =
          extraction.evidenceAuthority.primaryDirectSnippetCount > 0 ||
          extraction.evidenceAuthority.primaryIndirectSnippetCount > 0
            ? 1
            : 0;
        const strongOutcomeBonus = extraction.outcomeMentions.some((outcome) => outcome.strength === "strong") ? 1 : 0;
        const functionBonus = extraction.outcomeMentions.some((outcome) => outcome.outcomeClass === "function") ? 0.5 : 0;
        adjunctScores.set(
          adjunct,
          (adjunctScores.get(adjunct) ?? 0) + 1 + humanBonus + primaryBonus + strongOutcomeBonus + functionBonus
        );
      }
    }

    const rankedAdjuncts = Array.from(adjunctScores.entries())
      .filter(([chemical]) => !["Glycerol", "Polyethylene Glycol"].includes(chemical))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([chemical]) => chemical);

    return ["Dimethyl Sulfoxide", ...rankedAdjuncts].slice(0, 6);
  }

  return unique(hypothesis.supportingContext.chemicals).slice(0, 6);
}

function chooseActiveHypothesis(atlas: AtlasSummary): ResearchHypothesis | null {
  const preferredWedgeTitle = getDomain(atlas.domain).research.preferredWedgeTitle;
  const titlePreferred = preferredWedgeTitle
    ? atlas.researchHypotheses.find((hypothesis) => preferredWedgeTitle.test(hypothesis.title))
    : undefined;
  const preferred =
    titlePreferred ??
    atlas.researchHypotheses.find((hypothesis) => hypothesis.category === "benchmark");
  const fallback = atlas.researchHypotheses.find((hypothesis) => hypothesis.category !== "workflow-gap");

  return preferred ?? fallback ?? atlas.researchHypotheses[0] ?? null;
}

export function buildActiveWedge(input: {
  snapshot: ExtractionSnapshot;
  atlas: AtlasSummary;
  benchmarkAnalysis: BenchmarkAnalysis;
  sourceEnrichment?: SourceEnrichmentFile;
}): ActiveWedge | null {
  const hypothesis = chooseActiveHypothesis(input.atlas);
  if (!hypothesis) {
    return null;
  }

  const relevantExtractions = relevantExtractionsForHypothesis(input.snapshot, hypothesis);
  const reviewedEnrichmentTitles = reviewedEnrichmentTitleSet(input.sourceEnrichment);
  const authorityProfiles = relevantExtractions.map((extraction) =>
    pickAuthorityProfile(extraction, reviewedEnrichmentTitles)
  );
  const primarySupportedPaperCount = authorityProfiles.filter((profile) => profile === "primary-backed").length;
  const secondarySupportedPaperCount = authorityProfiles.filter((profile) => profile === "secondary-backed").length;
  const abstractOnlyPaperCount = authorityProfiles.filter((profile) => profile === "abstract-only").length;
  const pendingSourceEnrichmentCount =
    input.sourceEnrichment?.records.filter(
      (record) =>
        (record.status === "pending" || record.status === "in-progress") &&
        hypothesis.supportingContext.paperTitles.includes(record.title)
    ).length ?? 0;
  const reviewedSourceEnrichmentCount =
    input.sourceEnrichment?.records.filter(
      (record) => record.status === "reviewed" && hypothesis.supportingContext.paperTitles.includes(record.title)
    ).length ?? 0;

  const translationalPotential = Number(
    average(relevantExtractions.map((extraction) => translationalSignalWeight(pickTranslationalSignal(extraction)))).toFixed(3)
  );
  const scientificRelevance = Number(
    clamp(hypothesis.scores.evidenceScore * 0.65 + hypothesis.scores.actionabilityScore * 0.35).toFixed(3)
  );
  const companyRelevance = Number(
    clamp(hypothesis.scores.actionabilityScore * 0.5 + translationalPotential * 0.5).toFixed(3)
  );
  const authorityConfidence =
    relevantExtractions.length === 0 ? 0 : (primarySupportedPaperCount + secondarySupportedPaperCount * 0.7) / relevantExtractions.length;
  const evidenceConfidence = Number(
    clamp(
      input.benchmarkAnalysis.resolved.summary.reviewedOutcomeCoverage * 0.25 +
        input.benchmarkAnalysis.resolved.summary.reviewedStepPhaseCoverage * 0.25 +
        authorityConfidence * 0.25 +
        (1 - hypothesis.scores.uncertaintyScore) * 0.25
    ).toFixed(3)
  );

  const activeWedge = ActiveWedgeSchema.parse({
    generatedAt: new Date().toISOString(),
    domain: input.snapshot.domain,
    wedgeId: wedgeIdFor(input.snapshot.domain, hypothesis),
    status: "candidate",
    title: hypothesis.title,
    category: hypothesis.category,
    selectedHypothesisId: hypothesis.id,
    focusQuestion: focusQuestionFor(input.snapshot.domain, hypothesis),
    decisionQuestion: decisionQuestionFor(hypothesis),
    whyThisWedge: hypothesis.claim,
    claim: hypothesis.claim,
    currentRead: currentReadFor({
      domain: input.snapshot.domain,
      title: hypothesis.title,
      evidenceConfidence,
      companyRelevance,
      pendingSourceEnrichmentCount
    }),
    recommendedNextStep: recommendedNextStepFor(
      hypothesis,
      dominantChemicalsFor(hypothesis, relevantExtractions)
    ),
    scientificRelevance,
    companyRelevance,
    evidenceConfidence,
    translationalPotential,
    supportingPaperTitles: hypothesis.supportingContext.paperTitles,
    dominantPatterns: {
      protocolFamilies: hypothesis.supportingContext.protocolFamilies,
      chemicals: dominantChemicalsFor(hypothesis, relevantExtractions),
      specimenTypes: hypothesis.supportingContext.specimenTypes
    },
    keyUncertainties: hypothesis.blockers.slice(0, 5),
    authoritySummary: {
      reviewedOutcomeCoverage: input.benchmarkAnalysis.resolved.summary.reviewedOutcomeCoverage,
      reviewedStepPhaseCoverage: input.benchmarkAnalysis.resolved.summary.reviewedStepPhaseCoverage,
      pendingSourceEnrichmentCount,
      reviewedSourceEnrichmentCount,
      primarySupportedPaperCount,
      secondarySupportedPaperCount,
      abstractOnlyPaperCount
    }
  });

  return activeWedge;
}

export function renderActiveWedgeMarkdown(activeWedge: ActiveWedge): string {
  const lines: string[] = [];
  lines.push(`# ${activeWedge.domain} active wedge`);
  lines.push("");
  lines.push("## Wedge call");
  lines.push(`- best current wedge: ${activeWedge.title}`);
  lines.push(`- category: ${activeWedge.category}`);
  lines.push(`- why it matters: ${activeWedge.whyThisWedge}`);
  lines.push(`- current read: ${activeWedge.currentRead}`);
  lines.push(`- next test: ${activeWedge.recommendedNextStep}`);
  lines.push("");
  lines.push("## Decision frame");
  lines.push(`- focus question: ${activeWedge.focusQuestion}`);
  lines.push(`- decision question: ${activeWedge.decisionQuestion}`);
  lines.push(`- protocol families in scope: ${activeWedge.dominantPatterns.protocolFamilies.join(", ") || "none"}`);
  lines.push(`- main chemicals or candidates: ${activeWedge.dominantPatterns.chemicals.join(", ") || "none"}`);
  lines.push(`- specimen types: ${activeWedge.dominantPatterns.specimenTypes.join(", ") || "none"}`);
  lines.push("");
  lines.push("## Confidence");
  lines.push(`- scientific relevance: ${activeWedge.scientificRelevance}`);
  lines.push(`- company relevance: ${activeWedge.companyRelevance}`);
  lines.push(`- evidence confidence: ${activeWedge.evidenceConfidence}`);
  lines.push(`- translational potential: ${activeWedge.translationalPotential}`);
  lines.push(`- reviewed outcome coverage: ${activeWedge.authoritySummary.reviewedOutcomeCoverage}`);
  lines.push(`- reviewed step-phase coverage: ${activeWedge.authoritySummary.reviewedStepPhaseCoverage}`);
  lines.push(`- primary-backed papers: ${activeWedge.authoritySummary.primarySupportedPaperCount}`);
  lines.push(`- abstract-only papers: ${activeWedge.authoritySummary.abstractOnlyPaperCount}`);
  lines.push("");
  lines.push("## Key uncertainties");
  if (activeWedge.keyUncertainties.length === 0) {
    lines.push("- none surfaced yet");
  } else {
    for (const uncertainty of activeWedge.keyUncertainties) {
      lines.push(`- ${uncertainty}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}
