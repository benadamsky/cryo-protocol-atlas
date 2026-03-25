import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  ActiveWedgeSchema,
  DomainIdSchema,
  ExperimentPacketFileSchema,
  SourceEnrichmentFileSchema,
  WedgeBenchmarkMatrixSchema,
  WedgeDecisionContradictionReportSchema,
  WedgeEvidenceGapQueueSchema,
  type DomainId,
  type TranslationalSignal
} from "../../../packages/shared/src/schema";
import {
  getCompareData,
  getDomainData,
  getHistoryData,
  getOptimizerData
} from "./data";
import { DOMAIN_ORDER, getDomainMeta } from "./domain";

const RunHealthLiteSchema = z.object({
  generatedAt: z.string(),
  overallState: z.string(),
  totalPendingSourceEnrichmentCount: z.number(),
  totalNormalizedProtocolCount: z.number(),
  domains: z.array(
    z.object({
      domain: DomainIdSchema,
      latestRunGeneratedAt: z.string(),
      healthState: z.string(),
      stopReason: z.string(),
      reviewedMinimumDepthReady: z.boolean(),
      reviewedOutcomeCoverage: z.number(),
      reviewedStepPhaseCoverage: z.number(),
      normalizedProtocolCount: z.number(),
      pendingSourceEnrichmentCount: z.number(),
      missingOutcomeCount: z.number(),
      missingStepPhaseCount: z.number(),
      bestWedgeTitle: z.string(),
      currentRead: z.string(),
      likelyPainPoint: z.string(),
      alerts: z.array(z.string())
    })
  )
});

type RunHealthLite = z.output<typeof RunHealthLiteSchema>;

type ArtifactSource<T> = {
  data: T;
  relativePath: string;
  absolutePath: string;
  sourceLabel: "worktree" | "primary";
};

export type WedgeClass =
  | "proving ground"
  | "plausible first company wedge"
  | "long-term platform wedge"
  | "watchlist";

export type ConfidenceBand = "high" | "medium" | "low";

export type AuthorityBreakdown = {
  primaryBacked: number;
  primaryIndirect: number;
  manualCurationBacked: number;
  secondaryBacked: number;
  abstractOnly: number;
};

export type ProvenanceFunnel = {
  papersFetched: number;
  papersMatched: number;
  reviewedBenchmarkRows: number;
  reviewedInScopeRows: number;
  activeWedgeRelevantRows: number;
  recommendedExperimentTitle: string | null;
};

export type SupportingPaper = {
  paperId: string;
  title: string;
  href: string | null;
};

export type SourceBreakdown = {
  atlasCorpus: {
    sourceLabel: string;
    papersFetched: number;
    papersMatched: number;
  };
  discoveryGeneratedAt: string | null;
  discoveryQueryDescription: string | null;
  discoveryTotalCandidates: number | null;
  discoveryProviders: Array<{
    kind: string | null;
    source: string;
    fetchedCount: number;
    acceptedCount: number;
    totalHits: number | null;
    truncated: boolean;
    failed: boolean;
    error: string | null;
    query: string | null;
    label: string | null;
  }>;
};

export type DecisionDomainData = {
  domain: DomainId;
  label: string;
  shortLabel: string;
  strapline: string;
  accent: string;
  sourceLabel: "worktree" | "primary";
  updatedAt: string;
  wedgeClass: WedgeClass;
  confidenceBand: ConfidenceBand;
  confidenceScore: number;
  translationalSignal: TranslationalSignal;
  recommendationScore: number;
  title: string;
  thesis: string;
  focusQuestion: string;
  decisionQuestion: string;
  currentVerdict: string;
  oneSentenceRecommendation: string;
  whyInteresting: string;
  standardPattern: string;
  keyOutcomePattern: string;
  mainConfound: string;
  biggestUncertainty: string;
  translationalRationale: string;
  decisionUnlock: string;
  runnerUps: Array<{
    packetId: string;
    title: string;
    category: string;
    whyInteresting: string;
    notFirstReason: string;
  }>;
  topEvidenceGap:
    | (z.output<typeof WedgeEvidenceGapQueueSchema>["queue"][number] & { domain: DomainId })
    | null;
  nextExperiment:
    | (z.output<typeof ExperimentPacketFileSchema>["packets"][number] & { domain: DomainId })
    | null;
  authorityBreakdown: AuthorityBreakdown;
  provenanceFunnel: ProvenanceFunnel;
  topSupportingPapers: SupportingPaper[];
  sourceBreakdown: SourceBreakdown;
  activeWedge: z.output<typeof ActiveWedgeSchema>;
  wedgeMatrix: z.output<typeof WedgeBenchmarkMatrixSchema>;
  evidenceGapQueue: z.output<typeof WedgeEvidenceGapQueueSchema>["queue"];
  experimentPackets: z.output<typeof ExperimentPacketFileSchema>["packets"];
  contradictionReport: z.output<typeof WedgeDecisionContradictionReportSchema>;
  sourceEnrichmentQueue: z.output<typeof SourceEnrichmentFileSchema>["records"];
  runHealth: RunHealthLite["domains"][number];
  domainData: Awaited<ReturnType<typeof getDomainData>>;
};

export type RecommendationPageData = {
  generatedAt: string;
  overallState: string;
  current: DecisionDomainData;
  runnersUp: DecisionDomainData[];
  domains: DecisionDomainData[];
  totalPendingSourceEnrichmentCount: number;
  totalNormalizedProtocolCount: number;
};

export type ExperimentsPageData = {
  generatedAt: string;
  domains: DecisionDomainData[];
  packets: Array<{
    domain: DomainId;
    domainLabel: string;
    wedgeTitle: string;
    wedgeClass: WedgeClass;
    confidenceBand: ConfidenceBand;
    translationalSignal: TranslationalSignal;
    packet: z.output<typeof ExperimentPacketFileSchema>["packets"][number];
  }>;
};

export type EvidencePageData = {
  generatedAt: string;
  overallState: string;
  domains: DecisionDomainData[];
  evidenceGaps: Array<
    z.output<typeof WedgeEvidenceGapQueueSchema>["queue"][number] & {
      domain: DomainId;
      domainLabel: string;
      wedgeTitle: string;
    }
  >;
  sourceEnrichments: Array<
    z.output<typeof SourceEnrichmentFileSchema>["records"][number] & {
      domain: DomainId;
      domainLabel: string;
      wedgeTitle: string;
    }
  >;
  contradictions: Array<
    z.output<typeof WedgeDecisionContradictionReportSchema>["contradictions"][number] & {
      domain: DomainId;
      domainLabel: string;
      wedgeTitle: string;
    }
  >;
};

export type DebugLandingData = {
  domains: DecisionDomainData[];
  compare: Awaited<ReturnType<typeof getCompareData>>;
  history: Awaited<ReturnType<typeof getHistoryData>>;
  optimizer: Awaited<ReturnType<typeof getOptimizerData>>;
};

function uniqueRoots() {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const worktreeRoot = path.resolve(moduleDir, "../../..");
  const roots = [worktreeRoot];
  const parent = path.dirname(worktreeRoot);

  if (path.basename(parent) === ".worktrees") {
    roots.push(path.dirname(parent));
  }

  return Array.from(new Set(roots));
}

function labelForRoot(root: string): "worktree" | "primary" {
  return root === uniqueRoots()[0] ? "worktree" : "primary";
}

async function readJsonArtifact<TSchema extends z.ZodTypeAny>(
  relativePath: string,
  schema: TSchema
): Promise<ArtifactSource<z.output<TSchema>>> {
  const attemptedPaths: string[] = [];

  for (const root of uniqueRoots()) {
    const absolutePath = path.join(root, relativePath);
    attemptedPaths.push(absolutePath);

    try {
      const raw = await readFile(absolutePath, "utf8");
      return {
        data: schema.parse(JSON.parse(raw)),
        relativePath,
        absolutePath,
        sourceLabel: labelForRoot(root)
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        continue;
      }

      if (error instanceof z.ZodError) {
        throw new Error(`Schema validation failed for ${absolutePath}: ${error.message}`);
      }

      throw error;
    }
  }

  throw new Error(`Missing artifact ${relativePath}. Checked: ${attemptedPaths.join(", ")}`);
}

function pickSourceLabel(...sources: Array<ArtifactSource<unknown> | { sourceLabel: "worktree" | "primary" } | null>) {
  return sources.find(Boolean)?.sourceLabel ?? "worktree";
}

function sortByDecisionImpact<
  T extends { title: string; decisionImpact: "high" | "medium" | "low"; wedgeRelevanceScore?: number }
>(
  items: T[]
) {
  const rank = { high: 0, medium: 1, low: 2 };
  return [...items].sort(
    (left, right) =>
      rank[left.decisionImpact] - rank[right.decisionImpact] ||
      (right.wedgeRelevanceScore ?? 0) - (left.wedgeRelevanceScore ?? 0) ||
      left.title.localeCompare(right.title)
  );
}

function toTranslationalSignal(value: number): TranslationalSignal {
  if (value >= 0.8) {
    return "clinically adjacent";
  }

  if (value >= 0.6) {
    return "transplant relevant";
  }

  if (value >= 0.4) {
    return "preclinical";
  }

  return "research only";
}

function toConfidenceBand(value: number): ConfidenceBand {
  if (value >= 0.78) {
    return "high";
  }

  if (value >= 0.55) {
    return "medium";
  }

  return "low";
}

function toWedgeClass(
  activeWedge: z.output<typeof ActiveWedgeSchema>,
  runHealthDomain: RunHealthLite["domains"][number]
): WedgeClass {
  const combined = `${activeWedge.currentRead} ${runHealthDomain.currentRead}`.toLowerCase();

  if (combined.includes("watchlist")) {
    return "watchlist";
  }

  if (combined.includes("proving ground")) {
    return "proving ground";
  }

  if (
    activeWedge.companyRelevance >= 0.86 &&
    activeWedge.translationalPotential >= 0.82 &&
    activeWedge.evidenceConfidence >= 0.8
  ) {
    return "long-term platform wedge";
  }

  if (
    combined.includes("company-entry") ||
    combined.includes("entry point") ||
    (activeWedge.companyRelevance >= 0.72 &&
      activeWedge.evidenceConfidence >= 0.68 &&
      runHealthDomain.reviewedOutcomeCoverage >= 0.6 &&
      runHealthDomain.reviewedStepPhaseCoverage >= 0.6)
  ) {
    return "plausible first company wedge";
  }

  if (activeWedge.evidenceConfidence < 0.45) {
    return "watchlist";
  }

  return "proving ground";
}

function toRecommendationScore(
  activeWedge: z.output<typeof ActiveWedgeSchema>,
  runHealthDomain: RunHealthLite["domains"][number],
  highImpactGapCount: number,
  contradictionCount: number
) {
  const base =
    activeWedge.evidenceConfidence * 0.38 +
    activeWedge.companyRelevance * 0.24 +
    activeWedge.scientificRelevance * 0.2 +
    activeWedge.translationalPotential * 0.18;

  const penalties =
    runHealthDomain.pendingSourceEnrichmentCount * 0.01 +
    highImpactGapCount * 0.03 +
    contradictionCount * 0.02;

  return Math.max(0, base - penalties);
}

function summarizeOutcomePattern(rows: z.output<typeof WedgeBenchmarkMatrixSchema>["rows"]) {
  const counts = new Map<string, number>();

  for (const row of rows) {
    for (const endpoint of row.endpointClasses) {
      counts.set(endpoint, (counts.get(endpoint) ?? 0) + 1);
    }
  }

  const ranked = [...counts.entries()].sort((left, right) => right[1] - left[1]);
  const topEndpoints = ranked.slice(0, 3).map(([endpoint]) => endpoint);
  const transplantationCount = rows.filter((row) => row.endpointClasses.includes("transplantation")).length;

  if (topEndpoints.length === 0) {
    return "Outcome pattern is still too sparse to summarize cleanly.";
  }

  return `${topEndpoints.join(", ")} drive most wedge rows; transplantation appears in ${transplantationCount} of ${rows.length} rows.`;
}

function summarizeMainConfound(
  domain: DomainId,
  rows: z.output<typeof WedgeBenchmarkMatrixSchema>["rows"],
  contradictions: z.output<typeof WedgeDecisionContradictionReportSchema>["contradictions"],
  evidenceGaps: z.output<typeof WedgeEvidenceGapQueueSchema>["queue"]
) {
  if (contradictions.length > 0) {
    const contradiction = contradictions[0];
    return `${contradiction.reason}. Likely confound: ${contradiction.likelyConfounds.join(", ") || "unspecified"}.`;
  }

  const confoundedRow = rows.find((row) => row.confoundFlags.length > 0);

  if (confoundedRow) {
    return `${confoundedRow.title} still carries confounds: ${confoundedRow.confoundFlags.join(", ")}.`;
  }

  const morphologyHeavyCount = rows.filter(
    (row) =>
      row.endpointClasses.includes("morphology") &&
      !row.endpointClasses.includes("transplantation") &&
      !row.endpointClasses.includes("function")
  ).length;

  if (domain === "ovarian-tissue" && morphologyHeavyCount >= Math.ceil(rows.length / 2)) {
    return "Most supporting ovarian rows are still morphology-heavy, so protocol-family signal is sharper than endpoint signal.";
  }

  if (evidenceGaps[0]) {
    return evidenceGaps[0].rationale;
  }

  return "No dominant confound is currently stronger than the baseline evidence gaps.";
}

function buildAuthorityBreakdown(rows: z.output<typeof WedgeBenchmarkMatrixSchema>["rows"]): AuthorityBreakdown {
  return rows.reduce<AuthorityBreakdown>(
    (counts, row) => {
      if (row.authorityProfile === "primary-backed") {
        counts.primaryBacked += 1;
      } else if (row.authorityProfile === "manual-curation-backed") {
        counts.manualCurationBacked += 1;
      } else if (row.authorityProfile === "secondary-backed") {
        counts.secondaryBacked += 1;
      } else if (row.authorityProfile === "abstract-only") {
        counts.abstractOnly += 1;
      }

      return counts;
    },
    {
      primaryBacked: 0,
      primaryIndirect: 0,
      manualCurationBacked: 0,
      secondaryBacked: 0,
      abstractOnly: 0
    }
  );
}

function buildProvenanceFunnel(
  domainData: Awaited<ReturnType<typeof getDomainData>>,
  wedgeMatrix: z.output<typeof WedgeBenchmarkMatrixSchema>,
  nextExperimentTitle: string | null
): ProvenanceFunnel {
  const reviewedBenchmarkRows = domainData.benchmarkFile.entries.filter(
    (entry) => entry.reviewStatus === "reviewed"
  ).length;
  const reviewedInScopeRows = domainData.benchmarkFile.entries.filter(
    (entry) => entry.reviewStatus === "reviewed" && entry.expectedInAtlas
  ).length;

  return {
    papersFetched: domainData.domainSnapshot.totalFetched,
    papersMatched: domainData.domainSnapshot.totalMatched,
    reviewedBenchmarkRows,
    reviewedInScopeRows,
    activeWedgeRelevantRows: wedgeMatrix.rows.length,
    recommendedExperimentTitle: nextExperimentTitle
  };
}

function resolvePaperHref(
  domainData: Awaited<ReturnType<typeof getDomainData>>,
  paperId: string
) {
  const enrichmentRecord = domainData.sourceEnrichment.records.find((record) => record.paperId === paperId);
  if (enrichmentRecord?.paperUrl) {
    return enrichmentRecord.paperUrl;
  }

  const snapshotPaper = domainData.domainSnapshot.papers.find((entry) => entry.paper.id === paperId)?.paper;
  if (!snapshotPaper) {
    return null;
  }

  if (snapshotPaper.paper_url) {
    return snapshotPaper.paper_url;
  }

  if (snapshotPaper.doi) {
    return `https://doi.org/${snapshotPaper.doi}`;
  }

  if (snapshotPaper.pmcid) {
    return `https://pmc.ncbi.nlm.nih.gov/articles/${snapshotPaper.pmcid}/`;
  }

  if (snapshotPaper.pmid) {
    return `https://pubmed.ncbi.nlm.nih.gov/${snapshotPaper.pmid}/`;
  }

  return null;
}

function topSupportingPapers(
  rows: z.output<typeof WedgeBenchmarkMatrixSchema>["rows"],
  domainData: Awaited<ReturnType<typeof getDomainData>>
): SupportingPaper[] {
  const authorityRank = {
    "primary-backed": 0,
    "manual-curation-backed": 1,
    "secondary-backed": 2,
    "abstract-only": 3
  } as const;

  return [...rows]
    .sort(
      (left, right) =>
        right.wedgeRelevanceScore - left.wedgeRelevanceScore ||
        authorityRank[left.authorityProfile] - authorityRank[right.authorityProfile] ||
        left.title.localeCompare(right.title)
    )
    .filter((row, index, all) => all.findIndex((candidate) => candidate.paperId === row.paperId) === index)
    .map((row) => ({
      paperId: row.paperId,
      title: row.title,
      href: resolvePaperHref(domainData, row.paperId)
    }))
    .slice(0, 3);
}

function buildSourceBreakdown(domainData: Awaited<ReturnType<typeof getDomainData>>): SourceBreakdown {
  return {
    atlasCorpus: {
      sourceLabel: "Atlas corpus seed (CryoDB / CryoRepository)",
      papersFetched: domainData.domainSnapshot.totalFetched,
      papersMatched: domainData.domainSnapshot.totalMatched
    },
    discoveryGeneratedAt: domainData.discoverySnapshot?.generatedAt ?? null,
    discoveryQueryDescription: domainData.discoverySnapshot?.queryDescription ?? null,
    discoveryTotalCandidates: domainData.discoverySnapshot?.totalCandidates ?? null,
    discoveryProviders:
      domainData.discoverySnapshot?.providerSummaries.map((provider) => ({
        kind: provider.kind ?? null,
        source: provider.source,
        fetchedCount: provider.fetchedCount,
        acceptedCount: provider.acceptedCount,
        totalHits: provider.totalHits ?? null,
        truncated: provider.truncated ?? false,
        failed: provider.failed ?? false,
        error: provider.error ?? null,
        query: provider.query ?? null,
        label: provider.label ?? null
      })) ?? []
  };
}

function buildRecommendationLine(
  wedgeClass: WedgeClass,
  activeWedge: z.output<typeof ActiveWedgeSchema>,
  nextExperiment: z.output<typeof ExperimentPacketFileSchema>["packets"][number] | null
) {
  if (wedgeClass === "plausible first company wedge") {
    return `${activeWedge.title} is the current lead wedge. Keep it as the decision anchor and pressure-test it with ${nextExperiment?.title ?? "the top experiment packet"}.`;
  }

  if (wedgeClass === "long-term platform wedge") {
    return `${activeWedge.title} is broad enough to carry platform ambition, but it still needs benchmarked proof before Atlas should present it that way.`;
  }

  if (wedgeClass === "watchlist") {
    return `${activeWedge.title} stays on the watchlist until the evidence base supports a cleaner decision.`;
  }

  return `${activeWedge.title} should be used as a proving ground, not a committed company wedge, until the next benchmark materially reduces confounds.`;
}

function buildRunnerUps(packets: z.output<typeof ExperimentPacketFileSchema>["packets"]) {
  return packets.slice(1, 3).map((packet) => ({
    packetId: packet.packetId,
    title: packet.title,
    category: packet.category,
    whyInteresting: packet.claim,
    notFirstReason:
      packet.category === "endpoint-upgrade"
        ? `Useful after the benchmark choice is clearer. ${packet.keyUncertainties[0] ?? "It sharpens confidence more than it sets the entry thesis."}`
        : `Useful follow-on benchmark, but the active wedge answers the current entry question more directly. ${packet.keyUncertainties[0] ?? ""}`.trim()
  }));
}

async function getRunHealth() {
  return readJsonArtifact("data/autoresearch/run-health.json", RunHealthLiteSchema);
}

export async function getDecisionDomainData(domain: DomainId): Promise<DecisionDomainData> {
  const [
    domainData,
    activeWedgeSource,
    wedgeMatrixSource,
    evidenceGapSource,
    experimentPacketSource,
    contradictionSource,
    runHealthSource
  ] = await Promise.all([
    getDomainData(domain),
    readJsonArtifact(`data/processed/${domain}/active-wedge.json`, ActiveWedgeSchema),
    readJsonArtifact(`data/processed/${domain}/wedge-benchmark-matrix.json`, WedgeBenchmarkMatrixSchema),
    readJsonArtifact(`data/processed/${domain}/wedge-evidence-gap-queue.json`, WedgeEvidenceGapQueueSchema),
    readJsonArtifact(`data/processed/${domain}/experiment-packets.json`, ExperimentPacketFileSchema),
    readJsonArtifact(
      `data/processed/${domain}/wedge-contradiction-report.json`,
      WedgeDecisionContradictionReportSchema
    ),
    getRunHealth()
  ]);
  const runHealthDomain = runHealthSource.data.domains.find((entry) => entry.domain === domain);

  if (!runHealthDomain) {
    throw new Error(`Run health missing domain ${domain}`);
  }

  const meta = getDomainMeta(domain);
  const evidenceGapQueue = sortByDecisionImpact(evidenceGapSource.data.queue);
  const topEvidenceGap = evidenceGapQueue[0] ? { ...evidenceGapQueue[0], domain } : null;
  const nextExperiment = experimentPacketSource.data.packets[0]
    ? { ...experimentPacketSource.data.packets[0], domain }
    : null;
  const wedgeClass = toWedgeClass(activeWedgeSource.data, runHealthDomain);
  const confidenceBand = toConfidenceBand(activeWedgeSource.data.evidenceConfidence);
  const recommendationScore = toRecommendationScore(
    activeWedgeSource.data,
    runHealthDomain,
    evidenceGapQueue.filter((entry) => entry.decisionImpact === "high").length,
    contradictionSource.data.contradictions.length
  );
  const topSupportingPaperList = topSupportingPapers(wedgeMatrixSource.data.rows, domainData);

  return {
    domain,
    label: meta.label,
    shortLabel: meta.shortLabel,
    strapline: meta.strapline,
    accent: meta.accent,
    sourceLabel: pickSourceLabel(
      activeWedgeSource,
      wedgeMatrixSource,
      evidenceGapSource,
      experimentPacketSource,
      contradictionSource,
      domainData
    ),
    updatedAt: activeWedgeSource.data.generatedAt,
    wedgeClass,
    confidenceBand,
    confidenceScore: activeWedgeSource.data.evidenceConfidence,
    translationalSignal: toTranslationalSignal(activeWedgeSource.data.translationalPotential),
    recommendationScore,
    title: activeWedgeSource.data.title,
    thesis: activeWedgeSource.data.claim,
    focusQuestion: activeWedgeSource.data.focusQuestion,
    decisionQuestion: activeWedgeSource.data.decisionQuestion,
    currentVerdict: activeWedgeSource.data.currentRead,
    oneSentenceRecommendation: buildRecommendationLine(
      wedgeClass,
      activeWedgeSource.data,
      nextExperiment
    ),
    whyInteresting: activeWedgeSource.data.whyThisWedge,
    standardPattern: domainData.callPacket.standardOfCareView.summary,
    keyOutcomePattern: summarizeOutcomePattern(wedgeMatrixSource.data.rows),
    mainConfound: summarizeMainConfound(
      domain,
      wedgeMatrixSource.data.rows,
      contradictionSource.data.contradictions,
      evidenceGapQueue
    ),
    biggestUncertainty:
      activeWedgeSource.data.keyUncertainties[0] ??
      topEvidenceGap?.rationale ??
      runHealthDomain.likelyPainPoint,
    translationalRationale:
      experimentPacketSource.data.packets[0]?.translationalRationale ??
      domainData.callPacket.marketBridge.whyOptimizationMightMatter,
    decisionUnlock:
      experimentPacketSource.data.packets[0]?.decisionQuestion ??
      activeWedgeSource.data.decisionQuestion,
    runnerUps: buildRunnerUps(experimentPacketSource.data.packets),
    topEvidenceGap,
    nextExperiment,
    authorityBreakdown: buildAuthorityBreakdown(wedgeMatrixSource.data.rows),
    provenanceFunnel: buildProvenanceFunnel(
      domainData,
      wedgeMatrixSource.data,
      nextExperiment?.title ?? null
    ),
    topSupportingPapers: topSupportingPaperList,
    sourceBreakdown: buildSourceBreakdown(domainData),
    activeWedge: activeWedgeSource.data,
    wedgeMatrix: wedgeMatrixSource.data,
    evidenceGapQueue,
    experimentPackets: experimentPacketSource.data.packets,
    contradictionReport: contradictionSource.data,
    sourceEnrichmentQueue: domainData.sourceEnrichment.records.filter(
      (record) => record.status === "pending" || record.status === "in-progress"
    ),
    runHealth: runHealthDomain,
    domainData
  };
}

export async function getDecisionDomainsData() {
  const domains = await Promise.all(DOMAIN_ORDER.map((domain) => getDecisionDomainData(domain)));
  return domains.sort((left, right) => right.recommendationScore - left.recommendationScore);
}

export async function getRecommendationPageData(): Promise<RecommendationPageData> {
  const [domains, runHealth] = await Promise.all([getDecisionDomainsData(), getRunHealth()]);

  return {
    generatedAt: runHealth.data.generatedAt,
    overallState: runHealth.data.overallState,
    current: domains[0],
    runnersUp: domains.slice(1),
    domains,
    totalPendingSourceEnrichmentCount: runHealth.data.totalPendingSourceEnrichmentCount,
    totalNormalizedProtocolCount: runHealth.data.totalNormalizedProtocolCount
  };
}

export async function getExperimentsPageData(): Promise<ExperimentsPageData> {
  const [domains, runHealth] = await Promise.all([getDecisionDomainsData(), getRunHealth()]);
  const packets = domains
    .flatMap((domain) =>
      domain.experimentPackets.map((packet) => ({
        domain: domain.domain,
        domainLabel: domain.label,
        wedgeTitle: domain.title,
        wedgeClass: domain.wedgeClass,
        confidenceBand: domain.confidenceBand,
        translationalSignal: domain.translationalSignal,
        packet
      }))
    )
    .sort((left, right) => right.packet.priorityScore - left.packet.priorityScore);

  return {
    generatedAt: runHealth.data.generatedAt,
    domains,
    packets
  };
}

export async function getEvidencePageData(): Promise<EvidencePageData> {
  const [domains, runHealth] = await Promise.all([getDecisionDomainsData(), getRunHealth()]);

  return {
    generatedAt: runHealth.data.generatedAt,
    overallState: runHealth.data.overallState,
    domains,
    evidenceGaps: domains
      .flatMap((domain) =>
        domain.evidenceGapQueue.map((gap) => ({
          ...gap,
          domain: domain.domain,
          domainLabel: domain.label,
          wedgeTitle: domain.title
        }))
      )
      .sort((left, right) => {
        const rank = { high: 0, medium: 1, low: 2 };
        return (
          rank[left.decisionImpact] - rank[right.decisionImpact] ||
          right.wedgeRelevanceScore - left.wedgeRelevanceScore
        );
      }),
    sourceEnrichments: domains.flatMap((domain) =>
      domain.sourceEnrichmentQueue.map((record) => ({
        ...record,
        domain: domain.domain,
        domainLabel: domain.label,
        wedgeTitle: domain.title
      }))
    ),
    contradictions: domains.flatMap((domain) =>
      domain.contradictionReport.contradictions.map((contradiction) => ({
        ...contradiction,
        domain: domain.domain,
        domainLabel: domain.label,
        wedgeTitle: domain.title
      }))
    )
  };
}

export async function getDebugLandingData(): Promise<DebugLandingData> {
  const [domains, compare, history, optimizer] = await Promise.all([
    getDecisionDomainsData(),
    getCompareData(),
    getHistoryData(),
    getOptimizerData()
  ]);

  return {
    domains,
    compare,
    history,
    optimizer
  };
}
