import type { AtlasSummary } from "./atlas.js";
import type { DomainWedgeBrief, OpportunityScanEntry } from "./wedges.js";

export type DomainCallPacket = {
  domain: string;
  title: string;
  executiveSummary: string[];
  benchmarkSnapshot: {
    reviewedGatesPassing: boolean;
    reviewedOutcomeCoverage: number;
    reviewedStepPhaseCoverage: number;
    reviewedMinimumDepthReady: boolean;
    pendingSourceEnrichments: number;
    reviewedSourceEnrichments: number;
    contradictionCount: number;
  };
  standardOfCareView: {
    dominantProtocolFamily: string;
    dominantChemicals: string[];
    dominantSpecimenTypes: string[];
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

function chooseBestWedge(brief: DomainWedgeBrief, atlas: AtlasSummary) {
  const preferred = atlas.researchHypotheses.find((hypothesis) => hypothesis.category === "benchmark");
  const fallback = atlas.researchHypotheses.find((hypothesis) => hypothesis.category !== "workflow-gap");
  const selected = preferred ?? fallback ?? atlas.researchHypotheses[0];
  if (!selected) {
    return null;
  }

  const matchingOpportunity =
    brief.opportunityScan.find((entry) => entry.title === selected.title) ?? brief.opportunityScan[0];

  return {
    title: selected.title,
    category: selected.category,
    whyThisWedge: selected.claim,
    currentPainPoint: wedgePainPoint(
      selected.title,
      matchingOpportunity?.painPoint ??
        selected.blockers[0] ??
        "The literature is still too uneven to compare candidate protocols cleanly."
    ),
    whyNow:
      matchingOpportunity?.commercialWhyNow ??
      "This looks close enough to a real operational workflow that better protocol evidence could matter outside the lab.",
    evidenceSummary: `priority=${selected.scores.priorityScore} | evidence=${selected.scores.evidenceScore} | contradictions=${selected.evidence.contradictionCount} | strong outcomes=${selected.evidence.strongOutcomePaperCount} | transplantation=${selected.evidence.transplantationPaperCount}`,
    firstExperiment: selected.proposedExperiment
  };
}

export function buildDomainCallPacket(input: {
  brief: DomainWedgeBrief;
  atlas: AtlasSummary;
  opportunityScanEntry?: OpportunityScanEntry;
}): DomainCallPacket {
  const { brief, atlas, opportunityScanEntry } = input;
  const bestWedge = chooseBestWedge(brief, atlas);

  const likelyPainPoint =
    opportunityScanEntry?.painPoint ??
    bestWedge?.currentPainPoint ??
    "Protocol evidence is still too uneven to support a clean optimization decision.";

  return {
    domain: brief.domain,
    title:
      brief.domain === "islets"
        ? "Islets wedge call packet"
        : `${brief.domain} wedge call packet`,
    executiveSummary: [
      `${brief.domain} is currently anchored on ${brief.standardPattern.dominantProtocolFamily} protocols built around ${brief.standardPattern.dominantChemicals.join(", ")}.`,
      `The atlas is credible enough to use for wedge-finding: reviewed gates ${brief.evidenceQuality.passesAllGates ? "pass" : "do not pass"}, reviewed outcome coverage is ${brief.evidenceQuality.reviewedOutcomeCoverage}, and reviewed step-phase coverage is ${brief.evidenceQuality.reviewedStepPhaseCoverage}.`,
      bestWedge
        ? `The cleanest first wedge is \"${bestWedge.title}\" because it attacks a protocol choice that still looks under-benchmarked rather than inventing a new chemistry story too early.`
        : "The slice is benchmark-stable, but no single wedge stands out strongly enough yet."
    ],
    benchmarkSnapshot: {
      reviewedGatesPassing: brief.evidenceQuality.passesAllGates,
      reviewedOutcomeCoverage: brief.evidenceQuality.reviewedOutcomeCoverage,
      reviewedStepPhaseCoverage: brief.evidenceQuality.reviewedStepPhaseCoverage,
      reviewedMinimumDepthReady: brief.evidenceQuality.reviewedMinimumDepthReady,
      pendingSourceEnrichments: brief.evidenceQuality.pendingSourceEnrichmentCount,
      reviewedSourceEnrichments: brief.evidenceQuality.reviewedSourceEnrichmentCount,
      contradictionCount: brief.contradictions.length
    },
    standardOfCareView: {
      dominantProtocolFamily: brief.standardPattern.dominantProtocolFamily,
      dominantChemicals: brief.standardPattern.dominantChemicals,
      dominantSpecimenTypes: brief.standardPattern.dominantSpecimenTypes,
      summary: brief.standardPattern.explanation
    },
    bestWedge: bestWedge ?? {
      title: "No sharp wedge identified yet",
      category: "unknown",
      whyThisWedge: "The current slice is still better used for evidence cleanup than opportunity finding.",
      currentPainPoint: likelyPainPoint,
      whyNow: "The next gain is better evidence quality, not more autonomy.",
      evidenceSummary: "n/a",
      firstExperiment: "Do reviewed source enrichment on the highest-value DOI-backed evidence gaps."
    },
    literatureGaps: [
      likelyPainPoint,
      `${brief.evidenceQuality.missingOutcomeCount} reviewed papers still lack explicit outcome labels.`,
      `${brief.evidenceQuality.pendingSourceEnrichmentCount} source-enrichment records are still pending.`
    ],
    marketBridge: {
      currentStandardPattern: `${brief.standardPattern.dominantProtocolFamily} via ${brief.standardPattern.dominantChemicals.join(", ")}`,
      likelyPainPoint,
      whyOptimizationMightMatter:
        opportunityScanEntry?.whyOptimizationMatters ??
        bestWedge?.whyNow ??
        "Commercial value depends on whether protocol optimization improves reproducibility in a way an operator would actually pay for.",
      likelyBuyerOrUser: commercialBuyerHint(brief.domain)
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
  lines.push(`- contradictions in top slice: ${packet.benchmarkSnapshot.contradictionCount}`);
  lines.push(`- pending source enrichments: ${packet.benchmarkSnapshot.pendingSourceEnrichments}`);
  lines.push("");
  lines.push("## Standard protocol view");
  lines.push(`- dominant family: ${packet.standardOfCareView.dominantProtocolFamily}`);
  lines.push(`- dominant chemicals: ${packet.standardOfCareView.dominantChemicals.join(", ") || "n/a"}`);
  lines.push(`- dominant specimen types: ${packet.standardOfCareView.dominantSpecimenTypes.join(", ") || "n/a"}`);
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
  return lines.join("\n");
}
