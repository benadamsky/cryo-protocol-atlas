import type {
  AtlasSummary,
  AtlasHotspot
} from "./atlas.js";
import type {
  ActiveWedge,
  BenchmarkEntry,
  ExperimentPacketFile,
  ExtractionSnapshot,
  NormalizedProtocolSnapshot,
  SourceEnrichmentFile,
  WedgeBenchmarkMatrix,
  WedgeDecisionContradictionReport,
  WedgeEvidenceGapQueue
} from "../../shared/src/schema.js";

type BenchmarkAnalysis = {
  domain: string;
  resolved: {
    summary: {
      passesAllGates: boolean;
      reviewedOutcomeCoverage: number;
      reviewedStepPhaseCoverage: number;
      reviewedMinimumDepthReady: boolean;
    };
  };
  reviewedDepth: {
    missingOutcomeCount: number;
    missingStepPhaseCount: number;
    missingOutcomeAudit: {
      extractorGapCount: number;
      ambiguousEvidenceCount: number;
      evidenceThinCount: number;
    };
  };
};

export type DomainWedgeBrief = {
  domain: string;
  focusQuestion: string;
  activeWedge: {
    title: string;
    category: string;
    claim: string;
    scientificRelevance: number;
    companyRelevance: number;
    evidenceConfidence: number;
    translationalPotential: number;
    currentRead: string;
    recommendedNextStep: string;
  };
  standardPattern: {
    dominantProtocolFamily: string;
    dominantChemicals: string[];
    dominantSpecimenTypes: string[];
    dominantTransitions: string[];
    representativeConditions: string[];
    explanation: string;
  };
  protocolFamilies: Array<{
    family: string;
    paperCount: number;
    topChemicals: string[];
    topOutcomes: string[];
    topTransitions: string[];
    interpretation: string;
  }>;
  dominantCpaPatterns: Array<{
    family: string;
    chemical: string;
    specimenType: string;
    paperCount: number;
    outcomeClasses: string[];
  }>;
  contradictions: Array<{
    topic: string;
    papers: string[];
    whyItMatters: string;
  }>;
  evidenceQuality: {
    passesAllGates: boolean;
    reviewedOutcomeCoverage: number;
    reviewedStepPhaseCoverage: number;
    reviewedMinimumDepthReady: boolean;
    normalizedProtocolCount: number;
    protocolsWithNormalizationWarnings: number;
    missingOutcomeCount: number;
    missingStepPhaseCount: number;
    pendingSourceEnrichmentCount: number;
    reviewedSourceEnrichmentCount: number;
    secondarySourceReviewedCount: number;
    reviewedPrimarySupportedCount: number;
    reviewedSecondarySupportedCount: number;
    reviewedManualOnlyCount: number;
  };
  evidenceGaps: Array<{
    title: string;
    decisionImpact: string;
    authorityProfile: string;
    translationalSignal: string;
    missingFields: string[];
    rationale: string;
  }>;
  nextExperiments: Array<{
    title: string;
    category: string;
    decisionQuestion: string;
    primaryReadouts: string[];
    comparisonArms: string[];
    whyNow: string;
  }>;
  opportunityScan: Array<{
    title: string;
    whyInteresting: string;
    painPoint: string;
    commercialWhyNow: string;
  }>;
  callout: string;
};

export type OpportunityScanEntry = {
  domain: string;
  readinessScore: number;
  evidenceScore: number;
  commercialScore: number;
  standardPattern: string;
  painPoint: string;
  whyOptimizationMatters: string;
  recommendedNextMove: string;
};

function topChemicalsForFamily(snapshot: ExtractionSnapshot, family: string): string[] {
  const counts = new Map<string, number>();
  for (const extraction of snapshot.extractions) {
    if (extraction.protocolFamily !== family) {
      continue;
    }
    for (const chemical of extraction.chemicalMentions) {
      counts.set(chemical.canonicalName, (counts.get(chemical.canonicalName) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .filter(([, count], index, entries) => {
      const hasRepeatedConditions = entries.some((entry) => entry[1] > 1);
      return hasRepeatedConditions ? count > 1 : true;
    })
    .slice(0, 3)
    .map(([label]) => label);
}

function topNormalizedChemicalsForFamily(
  normalizedSnapshot: NormalizedProtocolSnapshot | undefined,
  family: string
): string[] {
  if (!normalizedSnapshot) {
    return [];
  }

  const counts = new Map<string, number>();
  for (const protocol of normalizedSnapshot.protocols) {
    if (protocol.protocolFamily !== family) {
      continue;
    }

    const seen = new Set<string>();
    for (const chemical of protocol.normalizedChemicals) {
      if (seen.has(chemical.canonicalName)) {
        continue;
      }
      seen.add(chemical.canonicalName);
      counts.set(chemical.canonicalName, (counts.get(chemical.canonicalName) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([label]) => label);
}

function topOutcomesForFamily(snapshot: ExtractionSnapshot, family: string): string[] {
  const counts = new Map<string, number>();
  for (const extraction of snapshot.extractions) {
    if (extraction.protocolFamily !== family) {
      continue;
    }
    for (const outcome of extraction.outcomeMentions) {
      counts.set(outcome.outcomeClass, (counts.get(outcome.outcomeClass) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([label]) => label);
}

function topTransitionsForFamily(
  normalizedSnapshot: NormalizedProtocolSnapshot | undefined,
  family: string
): string[] {
  if (!normalizedSnapshot) {
    return [];
  }

  const counts = new Map<string, number>();
  for (const protocol of normalizedSnapshot.protocols) {
    if (protocol.protocolFamily !== family) {
      continue;
    }

    const seen = new Set<string>();
    for (const step of protocol.normalizedSteps) {
      if (!step.transitionToNextPhase) {
        continue;
      }
      const label = `${step.phase} -> ${step.transitionToNextPhase}`;
      if (seen.has(label)) {
        continue;
      }
      seen.add(label);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }

  const ranked = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .filter(([, count]) => count >= 2);

  return ranked.slice(0, 3).map(([label]) => label);
}

function topRepresentativeConditions(
  normalizedSnapshot: NormalizedProtocolSnapshot | undefined,
  family: string,
  preferredChemicals: string[]
): string[] {
  if (!normalizedSnapshot) {
    return [];
  }

  const preferred = new Set(preferredChemicals);
  const counts = new Map<string, { count: number; stepCount: number; phaseWeight: number }>();
  for (const protocol of normalizedSnapshot.protocols) {
    if (protocol.protocolFamily !== family) {
      continue;
    }

    const candidates = protocol.representativeConditions.filter(
      (condition) => preferred.size === 0 || preferred.has(condition.chemical)
    );
    const repeatedStructuralConditions = new Set(
      candidates.filter((condition) => condition.source === "step").map((condition) => condition.label)
    );
    const conditionsToCount =
      repeatedStructuralConditions.size > 0
        ? candidates.filter((condition) => condition.source === "step")
        : candidates;

    const seen = new Set<string>();
    for (const condition of conditionsToCount) {
      if (seen.has(condition.label)) {
        continue;
      }
      seen.add(condition.label);
      const current = counts.get(condition.label) ?? { count: 0, stepCount: 0, phaseWeight: 0 };
      const phaseWeight =
        condition.phase === "equilibration" || condition.phase === "loading" || condition.phase === "perfusion"
          ? 3
          : condition.phase === "cooling" || condition.phase === "warming" || condition.phase === "unloading"
            ? 2
            : 1;
      counts.set(condition.label, {
        count: current.count + 1,
        stepCount: current.stepCount + (condition.source === "step" ? 1 : 0),
        phaseWeight: Math.max(current.phaseWeight, phaseWeight)
      });
    }
  }

  const ranked = Array.from(counts.entries())
    .sort(
      (a, b) =>
        b[1].count - a[1].count ||
        b[1].stepCount - a[1].stepCount ||
        b[1].phaseWeight - a[1].phaseWeight ||
        a[0].localeCompare(b[0])
    )
    .filter(([, stats]) => stats.count >= 2);

  return ranked.slice(0, 3).map(([label]) => label);
}

function protocolFamilyInterpretation(
  family: string,
  topChemicals: string[],
  topOutcomes: string[],
  paperCount: number
): string {
  if (family === "slow-freezing") {
    return `Most common preserved workflow in-slice, centered on ${topChemicals.join(", ") || "legacy CPA defaults"}. Outcome emphasis is ${topOutcomes.join(", ") || "still sparse"}, suggesting this is the baseline to beat rather than the frontier.`;
  }
  if (family === "vitrification") {
    return `Smaller but sharper cluster, often tied to ${topChemicals.join(", ") || "multi-CPA mixes"}. This is the likely optimization frontier if post-warm outcomes can be made more comparable.`;
  }
  if (family === "comparative") {
    return `Direct comparison slice is small (${paperCount} papers) but high-value because it anchors head-to-head decisions instead of isolated protocol claims.`;
  }
  return "Family labeling is still diffuse here, which is a sign of either broad legacy literature or evidence that remains too abstract-level to classify safely.";
}

function hotspotPainPoint(hotspot: AtlasHotspot): string {
  if (hotspot.protocolFamily === "unknown") {
    return `Literature using ${hotspot.chemical} in ${hotspot.specimenType} still looks generic and under-normalized.`;
  }
  if (hotspot.outcomeClasses.includes("viability") && !hotspot.outcomeClasses.includes("transplantation")) {
    return `Most of this cluster stops at viability/function instead of transplantation-grade outcomes.`;
  }
  if (hotspot.protocolFamily === "slow-freezing") {
    return "This looks like a legacy default cluster that may still be serviceable but under-optimized.";
  }
  return "Protocol family is clearer than the post-warm endpoint story.";
}

function opportunityCommercialWhyNow(domain: string, title: string): string {
  if (domain === "islets") {
    if (/benchmark/i.test(title)) {
      return "A cleaner benchmark wedge maps to transplant and cell-banking workflows where protocol uncertainty still blocks standardization.";
    }
    if (/endpoint/i.test(title)) {
      return "Moving from viability-only claims to transplantation/function claims is what makes an optimization story commercially credible.";
    }
    if (/scale/i.test(title)) {
      return "Scale-up matters if the workflow is ever meant to support real banking rather than artisanal lab success cases.";
    }
    return "This is close enough to real preservation workflows that better protocol evidence could matter commercially, not just academically.";
  }
  return "Commercial relevance depends on whether better protocol evidence can bridge into organ banking, fertility, or transplant-adjacent workflows.";
}

function opportunityPainPoint(title: string, fallback: string): string {
  if (/additive-assisted/i.test(title)) {
    return "Adjunct compounds recur in the literature, but they are not benchmarked head-to-head on a fixed base cryomix.";
  }
  if (/matched-species/i.test(title)) {
    return "Vitrification and slow-freezing remain confounded by species and endpoint differences.";
  }
  if (/endpoint/i.test(title) || /transplantation/i.test(title)) {
    return "Promising protocols are still over-indexed on viability or in-vitro function rather than transplantation-grade outcomes.";
  }
  if (/workflow|full-text/i.test(title)) {
    return "A small number of promising papers still lack enough procedural detail to compare fairly.";
  }
  return fallback;
}

export function buildDomainWedgeBrief(input: {
  snapshot: ExtractionSnapshot;
  atlas: AtlasSummary;
  activeWedge: ActiveWedge;
  benchmarkAnalysis: BenchmarkAnalysis;
  benchmarkEntries: BenchmarkEntry[];
  wedgeBenchmarkMatrix: WedgeBenchmarkMatrix;
  evidenceGapQueue: WedgeEvidenceGapQueue;
  experimentPackets: ExperimentPacketFile;
  contradictionReport: WedgeDecisionContradictionReport;
  sourceEnrichment?: SourceEnrichmentFile;
  normalizedProtocols?: NormalizedProtocolSnapshot;
}): DomainWedgeBrief {
  const {
    snapshot,
    atlas,
    activeWedge,
    benchmarkAnalysis,
    benchmarkEntries,
    wedgeBenchmarkMatrix,
    evidenceGapQueue,
    experimentPackets,
    contradictionReport,
    sourceEnrichment,
    normalizedProtocols
  } = input;
  const reviewedInScopeEntries = benchmarkEntries.filter((entry) => entry.reviewStatus === "reviewed" && entry.expectedInAtlas);
  const dominantFamily = atlas.protocolFamilies[0]?.label ?? "unknown";
  const dominantChemicals =
    topNormalizedChemicalsForFamily(normalizedProtocols, dominantFamily).length > 0
      ? topNormalizedChemicalsForFamily(normalizedProtocols, dominantFamily)
      : atlas.topChemicals.slice(0, 3).map((entry) => entry.label);
  const dominantSpecimens = atlas.topSpecimenTypes.slice(0, 2).map((entry) => entry.label);
  const dominantTransitions = topTransitionsForFamily(normalizedProtocols, dominantFamily);
  const representativeConditions = topRepresentativeConditions(
    normalizedProtocols,
    dominantFamily,
    dominantChemicals
  );
  const normalizedProtocolCount = normalizedProtocols?.totalProtocols ?? 0;
  const protocolsWithNormalizationWarnings =
    normalizedProtocols?.protocols.filter((protocol) => protocol.normalizationWarnings.length > 0).length ?? 0;
  const pendingSourceEnrichmentCount =
    sourceEnrichment?.records.filter((record) => record.status === "pending" || record.status === "in-progress").length ?? 0;
  const reviewedSourceEnrichmentCount =
    sourceEnrichment?.records.filter((record) => record.status === "reviewed").length ?? 0;
  const secondarySourceReviewedCount =
    sourceEnrichment?.records.filter(
      (record) =>
        record.status === "reviewed" &&
        /secondary-source|secondary rather than the original|secondary review/i.test(record.reviewerNotes ?? "")
    ).length ?? 0;
  const extractionByPaperId = new Map(snapshot.extractions.map((extraction) => [extraction.paper.id, extraction]));
  const reviewedExtractions = reviewedInScopeEntries
    .map((entry) => extractionByPaperId.get(entry.paperId))
    .filter((extraction): extraction is ExtractionSnapshot["extractions"][number] => Boolean(extraction));
  const reviewedPrimarySupportedCount = reviewedExtractions.filter(
    (extraction) =>
      extraction.evidenceAuthority.primaryDirectSnippetCount > 0 ||
      extraction.evidenceAuthority.primaryIndirectSnippetCount > 0
  ).length;
  const reviewedSecondarySupportedCount = reviewedExtractions.filter(
    (extraction) => extraction.evidenceAuthority.secondarySnippetCount > 0
  ).length;
  const reviewedManualOnlyCount = reviewedExtractions.filter(
    (extraction) =>
      extraction.evidenceAuthority.manualCurationSnippetCount > 0 &&
      extraction.evidenceAuthority.primaryDirectSnippetCount === 0 &&
      extraction.evidenceAuthority.primaryIndirectSnippetCount === 0 &&
      extraction.evidenceAuthority.secondarySnippetCount === 0
  ).length;

  const protocolFamilies = atlas.protocolFamilies.slice(0, 4).map((entry) => ({
    family: entry.label,
    paperCount: entry.count,
    topChemicals:
      topNormalizedChemicalsForFamily(normalizedProtocols, entry.label).length > 0
        ? topNormalizedChemicalsForFamily(normalizedProtocols, entry.label)
        : topChemicalsForFamily(snapshot, entry.label),
    topOutcomes: topOutcomesForFamily(snapshot, entry.label),
    topTransitions: topTransitionsForFamily(normalizedProtocols, entry.label),
    interpretation: protocolFamilyInterpretation(
      entry.label,
      topNormalizedChemicalsForFamily(normalizedProtocols, entry.label).length > 0
        ? topNormalizedChemicalsForFamily(normalizedProtocols, entry.label)
        : topChemicalsForFamily(snapshot, entry.label),
      topOutcomesForFamily(snapshot, entry.label),
      entry.count
    )
  }));

  const contradictions = contradictionReport.contradictions.slice(0, 4).map((entry) => ({
    topic: entry.topic,
    papers: [entry.paperA, entry.paperB],
    whyItMatters: `${entry.reason}. Likely confounds: ${entry.likelyConfounds.join(", ")}.`
  }));

  const opportunityScan = atlas.researchHypotheses.slice(0, 4).map((hypothesis) => ({
    title: hypothesis.title,
    whyInteresting: `${hypothesis.claim} Evidence papers=${hypothesis.evidence.totalPaperCount}, strong outcomes=${hypothesis.evidence.strongOutcomePaperCount}, contradictions=${hypothesis.evidence.contradictionCount}.`,
    painPoint: opportunityPainPoint(
      hypothesis.title,
      hypothesis.blockers[0] ??
        "Literature looks directionally promising but still underspecified for a clean protocol decision."
    ),
    commercialWhyNow: opportunityCommercialWhyNow(snapshot.domain, hypothesis.title)
  }));

  return {
    domain: snapshot.domain,
    focusQuestion: activeWedge.focusQuestion,
    activeWedge: {
      title: activeWedge.title,
      category: activeWedge.category,
      claim: activeWedge.claim,
      scientificRelevance: activeWedge.scientificRelevance,
      companyRelevance: activeWedge.companyRelevance,
      evidenceConfidence: activeWedge.evidenceConfidence,
      translationalPotential: activeWedge.translationalPotential,
      currentRead: activeWedge.currentRead,
      recommendedNextStep: activeWedge.recommendedNextStep
    },
    standardPattern: {
      dominantProtocolFamily: dominantFamily,
      dominantChemicals,
      dominantSpecimenTypes: dominantSpecimens,
      dominantTransitions,
      representativeConditions,
      explanation:
        dominantTransitions.length > 0 || representativeConditions.length > 0
          ? `Current default literature center of gravity is ${dominantFamily}, usually built around ${dominantChemicals.join(", ")} in ${dominantSpecimens.join(", ")} workflows. Normalized workflow signal is ${dominantTransitions.join(", ") || "still sparse"}, with repeated condition mentions such as ${representativeConditions.join(", ") || "still sparse"}.`
          : `Current default literature center of gravity is ${dominantFamily}, usually built around ${dominantChemicals.join(", ")} in ${dominantSpecimens.join(", ")} workflows.`
    },
    protocolFamilies,
    dominantCpaPatterns: atlas.uncertaintyHotspots.slice(0, 6).map((entry) => ({
      family: entry.protocolFamily,
      chemical: entry.chemical,
      specimenType: entry.specimenType,
      paperCount: entry.paperCount,
      outcomeClasses: entry.outcomeClasses
    })),
    contradictions,
    evidenceQuality: {
      passesAllGates: benchmarkAnalysis.resolved.summary.passesAllGates,
      reviewedOutcomeCoverage: benchmarkAnalysis.resolved.summary.reviewedOutcomeCoverage,
      reviewedStepPhaseCoverage: benchmarkAnalysis.resolved.summary.reviewedStepPhaseCoverage,
      reviewedMinimumDepthReady: benchmarkAnalysis.resolved.summary.reviewedMinimumDepthReady,
      normalizedProtocolCount,
      protocolsWithNormalizationWarnings,
      missingOutcomeCount: benchmarkAnalysis.reviewedDepth.missingOutcomeCount,
      missingStepPhaseCount: benchmarkAnalysis.reviewedDepth.missingStepPhaseCount,
      pendingSourceEnrichmentCount,
      reviewedSourceEnrichmentCount,
      secondarySourceReviewedCount,
      reviewedPrimarySupportedCount,
      reviewedSecondarySupportedCount,
      reviewedManualOnlyCount
    },
    evidenceGaps: evidenceGapQueue.queue.slice(0, 5).map((record) => ({
      title: record.title,
      decisionImpact: record.decisionImpact,
      authorityProfile: record.authorityProfile,
      translationalSignal: record.translationalSignal,
      missingFields: record.missingFields,
      rationale: record.rationale
    })),
    nextExperiments: experimentPackets.packets.slice(0, 3).map((packet) => ({
      title: packet.title,
      category: packet.category,
      decisionQuestion: packet.decisionQuestion,
      primaryReadouts: packet.primaryReadouts,
      comparisonArms: packet.comparisonArms,
      whyNow: packet.whyNow
    })),
    opportunityScan,
    callout:
      `${activeWedge.title} is the explicit active wedge. Matrix rows=${wedgeBenchmarkMatrix.rows.length}, top decision-useful evidence gaps=${evidenceGapQueue.queue.filter((entry) => entry.decisionImpact === "high").length}, and next experiments are already packetized for review.`
  };
}

export function renderDomainWedgeBriefMarkdown(brief: DomainWedgeBrief): string {
  const lines: string[] = [];
  lines.push(`# ${brief.domain} wedge brief`);
  lines.push("");
  lines.push(`Focus question: ${brief.focusQuestion}`);
  lines.push("");
  lines.push("## Active wedge");
  lines.push(`- title: ${brief.activeWedge.title}`);
  lines.push(`- category: ${brief.activeWedge.category}`);
  lines.push(`- scientific relevance: ${brief.activeWedge.scientificRelevance}`);
  lines.push(`- company relevance: ${brief.activeWedge.companyRelevance}`);
  lines.push(`- evidence confidence: ${brief.activeWedge.evidenceConfidence}`);
  lines.push(`- translational potential: ${brief.activeWedge.translationalPotential}`);
  lines.push(`- current read: ${brief.activeWedge.currentRead}`);
  lines.push(`- recommended next step: ${brief.activeWedge.recommendedNextStep}`);
  lines.push("");
  lines.push("## Standard pattern");
  lines.push(
    `- dominant family: ${brief.standardPattern.dominantProtocolFamily}`
  );
  lines.push(`- dominant chemicals: ${brief.standardPattern.dominantChemicals.join(", ") || "none"}`);
  lines.push(`- dominant specimen types: ${brief.standardPattern.dominantSpecimenTypes.join(", ") || "none"}`);
  lines.push(`- normalized transitions: ${brief.standardPattern.dominantTransitions.join(", ") || "none"}`);
  lines.push(`- representative conditions: ${brief.standardPattern.representativeConditions.join(", ") || "none"}`);
  lines.push(`- interpretation: ${brief.standardPattern.explanation}`);
  lines.push("");
  lines.push("## Protocol families");
  for (const family of brief.protocolFamilies) {
    lines.push(
      `- ${family.family}: papers=${family.paperCount} | chemicals=${family.topChemicals.join(", ") || "none"} | outcomes=${family.topOutcomes.join(", ") || "none"}`
    );
    if (family.topTransitions.length > 0) {
      lines.push(`  normalized transitions=${family.topTransitions.join(", ")}`);
    }
    lines.push(`  ${family.interpretation}`);
  }
  lines.push("");
  lines.push("## Dominant CPA patterns");
  for (const pattern of brief.dominantCpaPatterns) {
    lines.push(
      `- ${pattern.family} + ${pattern.chemical} + ${pattern.specimenType} | papers=${pattern.paperCount} | outcomes=${pattern.outcomeClasses.join(", ")}`
    );
  }
  lines.push("");
  lines.push("## Contradictions");
  if (brief.contradictions.length === 0) {
    lines.push("- none currently surfaced");
  } else {
    for (const contradiction of brief.contradictions) {
      lines.push(`- ${contradiction.topic}`);
      lines.push(`  papers=${contradiction.papers.join(" vs ")}`);
      lines.push(`  why it matters=${contradiction.whyItMatters}`);
    }
  }
  lines.push("");
  lines.push("## Evidence quality");
  lines.push(`- reviewed gates passing: ${brief.evidenceQuality.passesAllGates ? "yes" : "no"}`);
  lines.push(`- reviewed outcome coverage: ${brief.evidenceQuality.reviewedOutcomeCoverage}`);
  lines.push(`- reviewed step-phase coverage: ${brief.evidenceQuality.reviewedStepPhaseCoverage}`);
  lines.push(`- reviewed minimum-depth ready: ${brief.evidenceQuality.reviewedMinimumDepthReady ? "yes" : "no"}`);
  lines.push(`- normalized protocols: ${brief.evidenceQuality.normalizedProtocolCount}`);
  lines.push(`- protocols with normalization warnings: ${brief.evidenceQuality.protocolsWithNormalizationWarnings}`);
  lines.push(`- missing reviewed outcomes: ${brief.evidenceQuality.missingOutcomeCount}`);
  lines.push(`- missing reviewed step phases: ${brief.evidenceQuality.missingStepPhaseCount}`);
  lines.push(`- pending source enrichments: ${brief.evidenceQuality.pendingSourceEnrichmentCount}`);
  lines.push(`- reviewed source enrichments: ${brief.evidenceQuality.reviewedSourceEnrichmentCount}`);
  lines.push(`- reviewed secondary-source enrichments: ${brief.evidenceQuality.secondarySourceReviewedCount}`);
  lines.push(`- reviewed primary-supported rows: ${brief.evidenceQuality.reviewedPrimarySupportedCount}`);
  lines.push(`- reviewed secondary-supported rows: ${brief.evidenceQuality.reviewedSecondarySupportedCount}`);
  lines.push(`- reviewed manual-curation-only rows: ${brief.evidenceQuality.reviewedManualOnlyCount}`);
  lines.push("");
  lines.push("## Evidence gaps");
  if (brief.evidenceGaps.length === 0) {
    lines.push("- none currently prioritized");
  } else {
    for (const gap of brief.evidenceGaps) {
      lines.push(
        `- ${gap.title} | impact=${gap.decisionImpact} | authority=${gap.authorityProfile} | translational=${gap.translationalSignal}`
      );
      lines.push(`  missing fields=${gap.missingFields.join(", ")}`);
      lines.push(`  rationale=${gap.rationale}`);
    }
  }
  lines.push("");
  lines.push("## Next experiments");
  if (brief.nextExperiments.length === 0) {
    lines.push("- none packetized yet");
  } else {
    for (const experiment of brief.nextExperiments) {
      lines.push(`- ${experiment.title} | category=${experiment.category}`);
      lines.push(`  decision question=${experiment.decisionQuestion}`);
      lines.push(`  primary readouts=${experiment.primaryReadouts.join(", ")}`);
      lines.push(`  comparison arms=${experiment.comparisonArms.join(" | ")}`);
      lines.push(`  why now=${experiment.whyNow}`);
    }
  }
  lines.push("");
  lines.push("## Opportunity scan");
  for (const opportunity of brief.opportunityScan) {
    lines.push(`- ${opportunity.title}`);
    lines.push(`  why interesting=${opportunity.whyInteresting}`);
    lines.push(`  pain point=${opportunity.painPoint}`);
    lines.push(`  commercial why now=${opportunity.commercialWhyNow}`);
  }
  lines.push("");
  lines.push("## Callout");
  lines.push(`- ${brief.callout}`);
  lines.push("");
  return lines.join("\n");
}

export function buildOpportunityScan(entries: DomainWedgeBrief[]): OpportunityScanEntry[] {
  return entries
    .map((entry) => {
      const preferredOpportunity =
        entry.opportunityScan.find((opportunity) => !/full-text|workflow/i.test(opportunity.title)) ??
        entry.opportunityScan[0];
      const readinessScore = Number(
        (
          entry.activeWedge.evidenceConfidence * 0.4 +
          entry.evidenceQuality.reviewedOutcomeCoverage * 0.25 +
          entry.evidenceQuality.reviewedStepPhaseCoverage * 0.2 +
          (entry.evidenceQuality.passesAllGates ? 0.15 : 0)
        ).toFixed(3)
      );
      const evidenceScore = Number(
        (
          entry.activeWedge.evidenceConfidence * 0.5 +
          (1 - Math.min(1, entry.evidenceQuality.pendingSourceEnrichmentCount / 20)) * 0.3 +
          (1 - Math.min(1, entry.evidenceQuality.missingOutcomeCount / 20)) * 0.2
        ).toFixed(3)
      );
      const commercialScore = Number(
        Math.min(
          1,
          entry.activeWedge.companyRelevance * 0.45 +
            entry.activeWedge.translationalPotential * 0.25 +
            (entry.standardPattern.dominantProtocolFamily !== "unknown" ? 0.2 : 0.08) +
            (entry.evidenceQuality.reviewedOutcomeCoverage >= 0.5 ? 0.1 : 0.04)
        ).toFixed(3)
      );
      return {
        domain: entry.domain,
        readinessScore,
        evidenceScore,
        commercialScore,
        standardPattern: `${entry.standardPattern.dominantProtocolFamily} via ${entry.standardPattern.dominantChemicals.join(", ") || "n/a"}`,
        painPoint:
          preferredOpportunity?.painPoint ??
          `Still bottlenecked by ${entry.evidenceQuality.pendingSourceEnrichmentCount} pending source-enrichment records.`,
        whyOptimizationMatters:
          preferredOpportunity?.commercialWhyNow ??
          "Optimization matters only if protocol intelligence sharpens a real wedge and gives a credible next experiment.",
        recommendedNextMove:
          entry.nextExperiments[0]?.title
            ? `Pressure-test "${entry.nextExperiments[0].title}" as the next wedge-defining experiment.`
            : entry.evidenceQuality.pendingSourceEnrichmentCount > 0
              ? "Do reviewed source enrichment on the highest-value DOI-backed evidence gaps."
              : "Pressure-test the active wedge against a sharper human review."
      };
    })
    .sort((left, right) => right.readinessScore - left.readinessScore || right.evidenceScore - left.evidenceScore);
}

export function renderOpportunityScanMarkdown(entries: OpportunityScanEntry[]): string {
  const lines: string[] = [];
  lines.push("# wedge opportunity scan");
  lines.push("");
  for (const entry of entries) {
    lines.push(`## ${entry.domain}`);
    lines.push(`- readiness score: ${entry.readinessScore}`);
    lines.push(`- evidence score: ${entry.evidenceScore}`);
    lines.push(`- commercial score: ${entry.commercialScore}`);
    lines.push(`- standard pattern: ${entry.standardPattern}`);
    lines.push(`- pain point: ${entry.painPoint}`);
    lines.push(`- why optimization matters: ${entry.whyOptimizationMatters}`);
    lines.push(`- recommended next move: ${entry.recommendedNextMove}`);
    lines.push("");
  }
  return lines.join("\n");
}
