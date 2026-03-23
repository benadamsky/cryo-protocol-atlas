import type {
  AtlasSummary,
  AtlasHotspot
} from "./atlas.js";
import type { BenchmarkEntry, ExtractionSnapshot, SourceEnrichmentFile } from "../../shared/src/schema.js";

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
  standardPattern: {
    dominantProtocolFamily: string;
    dominantChemicals: string[];
    dominantSpecimenTypes: string[];
    explanation: string;
  };
  protocolFamilies: Array<{
    family: string;
    paperCount: number;
    topChemicals: string[];
    topOutcomes: string[];
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
    missingOutcomeCount: number;
    missingStepPhaseCount: number;
    pendingSourceEnrichmentCount: number;
    reviewedSourceEnrichmentCount: number;
    secondarySourceReviewedCount: number;
    reviewedPrimarySupportedCount: number;
    reviewedSecondarySupportedCount: number;
    reviewedManualOnlyCount: number;
  };
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
  benchmarkAnalysis: BenchmarkAnalysis;
  benchmarkEntries: BenchmarkEntry[];
  sourceEnrichment?: SourceEnrichmentFile;
}): DomainWedgeBrief {
  const { snapshot, atlas, benchmarkAnalysis, benchmarkEntries, sourceEnrichment } = input;
  const reviewedInScopeEntries = benchmarkEntries.filter((entry) => entry.reviewStatus === "reviewed" && entry.expectedInAtlas);
  const dominantFamily = atlas.protocolFamilies[0]?.label ?? "unknown";
  const dominantChemicals = atlas.topChemicals.slice(0, 3).map((entry) => entry.label);
  const dominantSpecimens = atlas.topSpecimenTypes.slice(0, 2).map((entry) => entry.label);
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
    topChemicals: topChemicalsForFamily(snapshot, entry.label),
    topOutcomes: topOutcomesForFamily(snapshot, entry.label),
    interpretation: protocolFamilyInterpretation(
      entry.label,
      topChemicalsForFamily(snapshot, entry.label),
      topOutcomesForFamily(snapshot, entry.label),
      entry.count
    )
  }));

  const contradictions = atlas.contradictions.slice(0, 3).map((entry) => ({
    topic: entry.topic,
    papers: [entry.paperA.title, entry.paperB.title],
    whyItMatters: entry.reason
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

  const ambiguousReviewedCount = reviewedInScopeEntries.filter(
    (entry) => !entry.expectedOutcomeClasses || entry.expectedOutcomeClasses.length === 0
  ).length;

  return {
    domain: snapshot.domain,
    focusQuestion:
      snapshot.domain === "islets"
        ? "Where does islet cryopreservation still look operationally generic, and which protocol slice is most likely to yield a commercially meaningful optimization wedge?"
        : "Which ovarian cryopreservation slice is mature enough for protocol optimization, and where do the remaining evidence gaps still block confident decisions?",
    standardPattern: {
      dominantProtocolFamily: dominantFamily,
      dominantChemicals,
      dominantSpecimenTypes: dominantSpecimens,
      explanation: `Current default literature center of gravity is ${dominantFamily}, usually built around ${dominantChemicals.join(", ")} in ${dominantSpecimens.join(", ")} workflows.`
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
      missingOutcomeCount: benchmarkAnalysis.reviewedDepth.missingOutcomeCount,
      missingStepPhaseCount: benchmarkAnalysis.reviewedDepth.missingStepPhaseCount,
      pendingSourceEnrichmentCount,
      reviewedSourceEnrichmentCount,
      secondarySourceReviewedCount,
      reviewedPrimarySupportedCount,
      reviewedSecondarySupportedCount,
      reviewedManualOnlyCount
    },
    opportunityScan,
    callout:
      snapshot.domain === "islets"
        ? `The islet wedge is now structurally ready for opportunity finding: reviewed gates pass, reviewed depth is adequate, ${ambiguousReviewedCount} reviewed in-scope papers still need stronger outcome evidence, and ${secondarySourceReviewedCount} reviewed source-enrichment records still rely on secondary-source support.`
        : `This slice is benchmark-stable enough to support opportunity finding, but the next commercial story still depends on whether fuller-source evidence sharpens the endpoint picture.`
  };
}

export function renderDomainWedgeBriefMarkdown(brief: DomainWedgeBrief): string {
  const lines: string[] = [];
  lines.push(`# ${brief.domain} wedge brief`);
  lines.push("");
  lines.push(`Focus question: ${brief.focusQuestion}`);
  lines.push("");
  lines.push("## Standard pattern");
  lines.push(
    `- dominant family: ${brief.standardPattern.dominantProtocolFamily}`
  );
  lines.push(`- dominant chemicals: ${brief.standardPattern.dominantChemicals.join(", ") || "none"}`);
  lines.push(`- dominant specimen types: ${brief.standardPattern.dominantSpecimenTypes.join(", ") || "none"}`);
  lines.push(`- interpretation: ${brief.standardPattern.explanation}`);
  lines.push("");
  lines.push("## Protocol families");
  for (const family of brief.protocolFamilies) {
    lines.push(
      `- ${family.family}: papers=${family.paperCount} | chemicals=${family.topChemicals.join(", ") || "none"} | outcomes=${family.topOutcomes.join(", ") || "none"}`
    );
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
  lines.push(`- missing reviewed outcomes: ${brief.evidenceQuality.missingOutcomeCount}`);
  lines.push(`- missing reviewed step phases: ${brief.evidenceQuality.missingStepPhaseCount}`);
  lines.push(`- pending source enrichments: ${brief.evidenceQuality.pendingSourceEnrichmentCount}`);
  lines.push(`- reviewed source enrichments: ${brief.evidenceQuality.reviewedSourceEnrichmentCount}`);
  lines.push(`- reviewed secondary-source enrichments: ${brief.evidenceQuality.secondarySourceReviewedCount}`);
  lines.push(`- reviewed primary-supported rows: ${brief.evidenceQuality.reviewedPrimarySupportedCount}`);
  lines.push(`- reviewed secondary-supported rows: ${brief.evidenceQuality.reviewedSecondarySupportedCount}`);
  lines.push(`- reviewed manual-curation-only rows: ${brief.evidenceQuality.reviewedManualOnlyCount}`);
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
          entry.evidenceQuality.reviewedOutcomeCoverage * 0.45 +
          entry.evidenceQuality.reviewedStepPhaseCoverage * 0.35 +
          (entry.evidenceQuality.passesAllGates ? 0.2 : 0)
        ).toFixed(3)
      );
      const evidenceScore = Number(
        (
          (1 - Math.min(1, entry.evidenceQuality.pendingSourceEnrichmentCount / 20)) * 0.4 +
          (1 - Math.min(1, entry.evidenceQuality.missingOutcomeCount / 20)) * 0.4 +
          (1 - Math.min(1, entry.evidenceQuality.missingStepPhaseCount / 10)) * 0.2
        ).toFixed(3)
      );
      const commercialScore = Number(
        (
          (entry.opportunityScan.length > 0 ? 0.45 : 0.25) +
          (entry.standardPattern.dominantProtocolFamily !== "unknown" ? 0.25 : 0.1) +
          (entry.domain === "islets" ? 0.2 : 0.15) +
          (entry.evidenceQuality.reviewedOutcomeCoverage >= 0.5 ? 0.1 : 0.05)
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
          "Optimization matters only if protocol uncertainty blocks real operational use.",
        recommendedNextMove:
          entry.evidenceQuality.pendingSourceEnrichmentCount > 0
            ? "Do reviewed source enrichment on the highest-value DOI-backed evidence gaps."
            : "Pressure-test the top-ranked protocol wedge against a sharper human review."
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
