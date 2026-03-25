import type { DomainWedgeBrief, OpportunityScanEntry } from "./wedges.js";
import type { WedgeBenchmarkMatrix } from "../../shared/src/schema.js";

export type DomainCallPacket = {
  domain: string;
  title: string;
  executiveSummary: string[];
  benchmarkSnapshot: {
    reviewedGatesPassing: boolean;
    reviewedOutcomeCoverage: number;
    reviewedStepPhaseCoverage: number;
    reviewedMinimumDepthReady: boolean;
    normalizedProtocolCount: number;
    protocolsWithNormalizationWarnings: number;
    pendingSourceEnrichments: number;
    reviewedSourceEnrichments: number;
    secondarySourceReviewedCount: number;
    reviewedPrimarySupportedCount: number;
    reviewedSecondarySupportedCount: number;
    reviewedManualOnlyCount: number;
    contradictionCount: number;
  };
  standardOfCareView: {
    dominantProtocolFamily: string;
    dominantChemicals: string[];
    dominantSpecimenTypes: string[];
    dominantTransitions: string[];
    representativeConditions: string[];
    summary: string;
  };
  bestWedge: {
    title: string;
    category: string;
    whyThisWedge: string;
    currentPainPoint: string;
    whyNow: string;
    evidenceSummary: string;
    firstExperiment: string;
  };
  literatureGaps: string[];
  marketBridge: {
    currentStandardPattern: string;
    likelyPainPoint: string;
    whyOptimizationMightMatter: string;
    likelyBuyerOrUser: string;
  };
    wedgeValidation: {
      whatAtlasCanSay: string[];
      missingEvidence: string[];
      unresolvedWatchlist: string[];
      currentRead: string;
    };
  };

function commercialBuyerHint(domain: string): string {
  if (domain === "islets") {
    return "transplant researchers, islet-banking teams, and cell-therapy groups trying to standardize post-thaw recovery";
  }
  return "fertility preservation, ovarian tissue banking, and transplant-adjacent preservation groups";
}

function wedgePainPoint(title: string, fallback: string): string {
  if (/additive-assisted/i.test(title)) {
    return "Adjunct compounds recur in the literature, but they are not benchmarked head-to-head on a fixed base cryomix.";
  }
  if (/matched-species/i.test(title)) {
    return "Vitrification and slow-freezing are still hard to compare because species and endpoint choices move at the same time.";
  }
  if (/endpoint/i.test(title) || /transplantation/i.test(title)) {
    return "Several promising protocols stop at viability or in-vitro function instead of transplantation-grade endpoints.";
  }
  if (/workflow/i.test(title) || /full-text/i.test(title)) {
    return "A small number of relevant papers still have protocol detail that is too thin to compare fairly.";
  }
  return fallback;
}

export function buildDomainCallPacket(input: {
  brief: DomainWedgeBrief;
  opportunityScanEntry?: OpportunityScanEntry;
  wedgeMatrix?: WedgeBenchmarkMatrix;
}): DomainCallPacket {
  const { brief, opportunityScanEntry, wedgeMatrix } = input;
  const preferredOpportunity =
    brief.opportunityScan.find((entry) => entry.title === brief.activeWedge.title) ?? brief.opportunityScan[0];
  const bestWedge = {
    title: brief.activeWedge.title,
    category: brief.activeWedge.category,
    whyThisWedge: brief.activeWedge.claim,
    currentPainPoint: wedgePainPoint(
      brief.activeWedge.title,
      preferredOpportunity?.painPoint ??
        brief.evidenceGaps[0]?.rationale ??
        "The literature is still too uneven to compare candidate protocols cleanly."
    ),
    whyNow:
      preferredOpportunity?.commercialWhyNow ??
      brief.activeWedge.currentRead,
    evidenceSummary: `scientific=${brief.activeWedge.scientificRelevance} | company=${brief.activeWedge.companyRelevance} | confidence=${brief.activeWedge.evidenceConfidence} | translational=${brief.activeWedge.translationalPotential}`,
    firstExperiment: brief.nextExperiments[0]?.title ?? brief.activeWedge.recommendedNextStep
  };

  const likelyPainPoint =
    opportunityScanEntry?.painPoint ??
    bestWedge.currentPainPoint ??
    "Protocol evidence is still too uneven to support a clean optimization decision.";

  return {
    domain: brief.domain,
    title:
      brief.domain === "islets"
        ? "Islets wedge call packet"
        : `${brief.domain} wedge call packet`,
    executiveSummary: [
      `${brief.domain} is currently anchored on ${brief.standardPattern.dominantProtocolFamily} protocols built around ${brief.standardPattern.dominantChemicals.join(", ")}${brief.standardPattern.dominantTransitions.length > 0 ? `, with a normalized workflow backbone of ${brief.standardPattern.dominantTransitions.join(", ")}` : ""}.`,
      `The atlas is credible enough to use for wedge-finding: reviewed gates ${brief.evidenceQuality.passesAllGates ? "pass" : "do not pass"}, reviewed outcome coverage is ${brief.evidenceQuality.reviewedOutcomeCoverage}, and reviewed step-phase coverage is ${brief.evidenceQuality.reviewedStepPhaseCoverage}.`,
      `The explicit active wedge is "${bestWedge.title}", selected because it gives the clearest decision question and the most reviewable next experiment under the current evidence.`
    ],
    benchmarkSnapshot: {
      reviewedGatesPassing: brief.evidenceQuality.passesAllGates,
      reviewedOutcomeCoverage: brief.evidenceQuality.reviewedOutcomeCoverage,
      reviewedStepPhaseCoverage: brief.evidenceQuality.reviewedStepPhaseCoverage,
      reviewedMinimumDepthReady: brief.evidenceQuality.reviewedMinimumDepthReady,
      normalizedProtocolCount: brief.evidenceQuality.normalizedProtocolCount,
      protocolsWithNormalizationWarnings: brief.evidenceQuality.protocolsWithNormalizationWarnings,
      pendingSourceEnrichments: brief.evidenceQuality.pendingSourceEnrichmentCount,
      reviewedSourceEnrichments: brief.evidenceQuality.reviewedSourceEnrichmentCount,
      secondarySourceReviewedCount: brief.evidenceQuality.secondarySourceReviewedCount,
      reviewedPrimarySupportedCount: brief.evidenceQuality.reviewedPrimarySupportedCount,
      reviewedSecondarySupportedCount: brief.evidenceQuality.reviewedSecondarySupportedCount,
      reviewedManualOnlyCount: brief.evidenceQuality.reviewedManualOnlyCount,
      contradictionCount: brief.contradictions.length
    },
    standardOfCareView: {
      dominantProtocolFamily: brief.standardPattern.dominantProtocolFamily,
      dominantChemicals: brief.standardPattern.dominantChemicals,
      dominantSpecimenTypes: brief.standardPattern.dominantSpecimenTypes,
      dominantTransitions: brief.standardPattern.dominantTransitions,
      representativeConditions: brief.standardPattern.representativeConditions,
      summary: brief.standardPattern.explanation
    },
    bestWedge,
    literatureGaps: [
      likelyPainPoint,
      `${brief.evidenceQuality.missingOutcomeCount} reviewed papers still lack explicit outcome labels.`,
      `${brief.evidenceQuality.pendingSourceEnrichmentCount} source-enrichment records are still pending.`,
      `${brief.evidenceQuality.secondarySourceReviewedCount} reviewed source-enrichment records rely on secondary-source evidence rather than the original abstract/full text.`,
      ...(brief.evidenceGaps[0] ? [`Top wedge evidence gap: ${brief.evidenceGaps[0].title}`] : [])
    ],
    marketBridge: {
      currentStandardPattern:
        brief.standardPattern.dominantTransitions.length > 0
          ? `${brief.standardPattern.dominantProtocolFamily} via ${brief.standardPattern.dominantChemicals.join(", ")} with ${brief.standardPattern.dominantTransitions.join(", ")}`
          : `${brief.standardPattern.dominantProtocolFamily} via ${brief.standardPattern.dominantChemicals.join(", ")}`,
      likelyPainPoint,
      whyOptimizationMightMatter:
        opportunityScanEntry?.whyOptimizationMatters ??
        bestWedge.whyNow ??
        "Commercial value depends on whether protocol optimization improves reproducibility in a way an operator would actually pay for.",
      likelyBuyerOrUser: commercialBuyerHint(brief.domain)
    },
    wedgeValidation: {
      whatAtlasCanSay:
        wedgeMatrix
          ? [
              `Atlas now has ${wedgeMatrix.rows.length} wedge-relevant benchmark rows tied to the active wedge.`,
              `The strongest rows are ${wedgeMatrix.summary.strongestRows.join("; ") || "still sparse"}.`,
              `The dominant backbones are ${wedgeMatrix.summary.dominantBackbones.join("; ") || "still sparse"}.`
            ]
          : [
              "Atlas can separate the dominant protocol family, the top CPA pattern, and the highest-signal protocol wedge."
            ],
      missingEvidence:
        brief.evidenceGaps.length > 0
          ? [
              ...brief.evidenceGaps.slice(0, 3).map(
                (gap) => `${gap.title}: ${gap.missingFields.join(", ")} still need stronger evidence.`
              ),
              `${brief.evidenceQuality.missingOutcomeCount} reviewed in-scope papers still lack explicit outcome labels.`,
              `${brief.evidenceQuality.secondarySourceReviewedCount} reviewed labels currently depend on secondary-source evidence and should be treated as lower-authority than primary-source-backed rows.`
            ]
          : [
              `${brief.evidenceQuality.missingOutcomeCount} reviewed in-scope papers still lack explicit outcome labels.`
            ],
      unresolvedWatchlist:
        brief.contradictions.length > 0
          ? brief.contradictions.map((entry) => `${entry.topic}: ${entry.whyItMatters}`)
          : [],
      currentRead: brief.activeWedge.currentRead
    }
  };
}

export function renderDomainCallPacketMarkdown(packet: DomainCallPacket): string {
  const lines: string[] = [];
  lines.push(`# ${packet.title}`);
  lines.push("");
  lines.push("## Executive summary");
  for (const item of packet.executiveSummary) {
    lines.push(`- ${item}`);
  }
  lines.push("");
  lines.push("## Benchmark snapshot");
  lines.push(`- reviewed gates passing: ${packet.benchmarkSnapshot.reviewedGatesPassing ? "yes" : "no"}`);
  lines.push(`- reviewed outcome coverage: ${packet.benchmarkSnapshot.reviewedOutcomeCoverage}`);
  lines.push(`- reviewed step-phase coverage: ${packet.benchmarkSnapshot.reviewedStepPhaseCoverage}`);
  lines.push(`- reviewed minimum-depth ready: ${packet.benchmarkSnapshot.reviewedMinimumDepthReady ? "yes" : "no"}`);
  lines.push(`- normalized protocols: ${packet.benchmarkSnapshot.normalizedProtocolCount}`);
  lines.push(`- protocols with normalization warnings: ${packet.benchmarkSnapshot.protocolsWithNormalizationWarnings}`);
  lines.push(`- contradictions in top slice: ${packet.benchmarkSnapshot.contradictionCount}`);
  lines.push(`- pending source enrichments: ${packet.benchmarkSnapshot.pendingSourceEnrichments}`);
  lines.push(`- reviewed secondary-source enrichments: ${packet.benchmarkSnapshot.secondarySourceReviewedCount}`);
  lines.push(`- reviewed primary-supported rows: ${packet.benchmarkSnapshot.reviewedPrimarySupportedCount}`);
  lines.push(`- reviewed secondary-supported rows: ${packet.benchmarkSnapshot.reviewedSecondarySupportedCount}`);
  lines.push(`- reviewed manual-curation-only rows: ${packet.benchmarkSnapshot.reviewedManualOnlyCount}`);
  lines.push("");
  lines.push("## Standard protocol view");
  lines.push(`- dominant family: ${packet.standardOfCareView.dominantProtocolFamily}`);
  lines.push(`- dominant chemicals: ${packet.standardOfCareView.dominantChemicals.join(", ") || "n/a"}`);
  lines.push(`- dominant specimen types: ${packet.standardOfCareView.dominantSpecimenTypes.join(", ") || "n/a"}`);
  lines.push(`- normalized transitions: ${packet.standardOfCareView.dominantTransitions.join(", ") || "n/a"}`);
  lines.push(`- representative conditions: ${packet.standardOfCareView.representativeConditions.join(", ") || "n/a"}`);
  lines.push(`- summary: ${packet.standardOfCareView.summary}`);
  lines.push("");
  lines.push("## Best first wedge");
  lines.push(`- title: ${packet.bestWedge.title}`);
  lines.push(`- category: ${packet.bestWedge.category}`);
  lines.push(`- why this wedge: ${packet.bestWedge.whyThisWedge}`);
  lines.push(`- current pain point: ${packet.bestWedge.currentPainPoint}`);
  lines.push(`- why now: ${packet.bestWedge.whyNow}`);
  lines.push(`- evidence summary: ${packet.bestWedge.evidenceSummary}`);
  lines.push(`- first experiment: ${packet.bestWedge.firstExperiment}`);
  lines.push("");
  lines.push("## Literature gaps");
  for (const gap of packet.literatureGaps) {
    lines.push(`- ${gap}`);
  }
  lines.push("");
  lines.push("## Market bridge");
  lines.push(`- current standard pattern: ${packet.marketBridge.currentStandardPattern}`);
  lines.push(`- likely pain point: ${packet.marketBridge.likelyPainPoint}`);
  lines.push(`- why optimization might matter: ${packet.marketBridge.whyOptimizationMightMatter}`);
  lines.push(`- likely buyer or user: ${packet.marketBridge.likelyBuyerOrUser}`);
  lines.push("");
  lines.push("## Wedge validation");
  for (const line of packet.wedgeValidation.whatAtlasCanSay) {
    lines.push(`- ${line}`);
  }
  lines.push("");
  lines.push("## Missing evidence");
  for (const line of packet.wedgeValidation.missingEvidence) {
    lines.push(`- ${line}`);
  }
  lines.push("");
  if (packet.wedgeValidation.unresolvedWatchlist.length > 0) {
    lines.push("## Unresolved translational watchlist");
    for (const line of packet.wedgeValidation.unresolvedWatchlist) {
      lines.push(`- ${line}`);
    }
    lines.push("");
  }
  lines.push("## Current read");
  lines.push(`- ${packet.wedgeValidation.currentRead}`);
  lines.push("");
  return lines.join("\n");
}
