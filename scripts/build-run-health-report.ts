import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { type DomainId } from "../packages/shared/src/schema.js";

const DOMAINS: DomainId[] = ["ovarian-tissue", "islets"];

type CycleStopReason =
  | "converged"
  | "pending-source-enrichment"
  | "pending-benchmark-review"
  | "unsafe-override-proposals"
  | "max-cycles-reached";

type HealthState = "healthy" | "stalled-human-gate" | "needs-attention";

type AutoresearchCycles = {
  generatedAt: string;
  cyclesCompleted: number;
  stopReason: CycleStopReason;
};

type UnattendedBatchSummary = {
  normalizedProtocolCount: number;
  protocolsWithNormalizationWarnings: number;
  pendingBenchmarkProposalCount: number;
  pendingSourceEnrichmentCount: number;
  reviewedSourceEnrichmentCount: number;
  minimumDepthReady: boolean;
};

type BenchmarkSummary = {
  generatedAt: string;
  subsets: {
    reviewed: {
      inclusion: { f1: number };
      exactFields: {
        protocolFamily: { accuracy: number };
        paperType: { accuracy: number };
      };
      coverage: {
        outcomeClasses: { coverageRate: number };
        stepPhases: { coverageRate: number };
      };
    };
  };
  gates: Array<{ passed: boolean }>;
};

type BenchmarkAnalysis = {
  reviewedDepth: {
    missingOutcomeCount: number;
    missingStepPhaseCount: number;
  };
  delta: {
    reviewedInclusionF1: number;
    reviewedProtocolFamilyAccuracy: number;
    reviewedPaperTypeAccuracy: number;
    reviewedOutcomeCoverage: number;
    reviewedStepPhaseCoverage: number;
    gatePassCount: number;
  };
};

type RegressionScenario = {
  passed: boolean;
};

type CallPacket = {
  bestWedge?: { title?: string };
  wedgeValidation?: { currentRead?: string };
  marketBridge?: { likelyPainPoint?: string };
};

type DomainRunHealth = {
  domain: DomainId;
  latestRunGeneratedAt: string;
  healthState: HealthState;
  stopReason: CycleStopReason;
  cyclesCompleted: number;
  passesAllGates: boolean;
  reviewedMinimumDepthReady: boolean;
  reviewedInclusionF1: number;
  reviewedProtocolFamilyAccuracy: number;
  reviewedPaperTypeAccuracy: number;
  reviewedOutcomeCoverage: number;
  reviewedStepPhaseCoverage: number;
  regressionPassedCount: number;
  regressionScenarioCount: number;
  normalizedProtocolCount: number;
  protocolsWithNormalizationWarnings: number;
  pendingBenchmarkProposalCount: number;
  pendingSourceEnrichmentCount: number;
  reviewedSourceEnrichmentCount: number;
  missingOutcomeCount: number;
  missingStepPhaseCount: number;
  reviewedInclusionF1Delta: number;
  reviewedProtocolFamilyAccuracyDelta: number;
  reviewedPaperTypeAccuracyDelta: number;
  reviewedOutcomeCoverageDelta: number;
  reviewedStepPhaseCoverageDelta: number;
  gatePassCountDelta: number;
  bestWedgeTitle: string | null;
  currentRead: string | null;
  likelyPainPoint: string | null;
  alerts: string[];
  artifactPaths: {
    cycleReport: string;
    unattendedBatch: string;
    benchmarkReport: string;
    wedgeBrief: string;
    callPacket: string;
  };
};

type RunHealthReport = {
  generatedAt: string;
  overallState: HealthState;
  availableDomainCount: number;
  missingDomains: DomainId[];
  totalPendingBenchmarkProposalCount: number;
  totalPendingSourceEnrichmentCount: number;
  totalNormalizedProtocolCount: number;
  domains: DomainRunHealth[];
  recommendations: string[];
};

async function readOptionalJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return null;
  }
}

async function readOptionalText(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

function stripGeneratedAt(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripGeneratedAt);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== "generatedAt")
        .map(([key, nestedValue]) => [key, stripGeneratedAt(nestedValue)])
    );
  }
  return value;
}

function hasFailures(summary: BenchmarkSummary, regressions: RegressionScenario[]): boolean {
  return summary.gates.some((gate) => !gate.passed) || regressions.some((scenario) => !scenario.passed);
}

function buildAlerts(input: {
  summary: BenchmarkSummary;
  batch: UnattendedBatchSummary;
  analysis: BenchmarkAnalysis;
  regressions: RegressionScenario[];
  cycles: AutoresearchCycles;
}): string[] {
  const alerts: string[] = [];

  if (input.summary.gates.some((gate) => !gate.passed)) {
    alerts.push("benchmark gates are failing");
  }
  if (input.regressions.some((scenario) => !scenario.passed)) {
    alerts.push("regression scenarios are failing");
  }
  if (!input.batch.minimumDepthReady) {
    alerts.push("reviewed minimum-depth gate is not ready");
  }
  if (input.batch.pendingBenchmarkProposalCount > 0) {
    alerts.push("pending benchmark review work remains");
  }
  if (input.cycles.stopReason === "unsafe-override-proposals") {
    alerts.push("override proposals exist but are not auto-apply safe");
  }
  if (input.batch.pendingSourceEnrichmentCount > 0) {
    alerts.push("human-gated source enrichment is blocking further autonomous progress");
  }
  if (input.batch.protocolsWithNormalizationWarnings > 0) {
    alerts.push(`${input.batch.protocolsWithNormalizationWarnings} normalized protocols still carry warnings`);
  }
  if (input.analysis.reviewedDepth.missingOutcomeCount > 0) {
    alerts.push(`${input.analysis.reviewedDepth.missingOutcomeCount} reviewed papers still lack outcome labels`);
  }
  if (input.analysis.reviewedDepth.missingStepPhaseCount > 0) {
    alerts.push(`${input.analysis.reviewedDepth.missingStepPhaseCount} reviewed papers still lack step phases`);
  }

  return alerts;
}

function determineHealthState(input: {
  summary: BenchmarkSummary;
  batch: UnattendedBatchSummary;
  regressions: RegressionScenario[];
  cycles: AutoresearchCycles;
}): HealthState {
  if (
    hasFailures(input.summary, input.regressions) ||
    !input.batch.minimumDepthReady ||
    input.batch.pendingBenchmarkProposalCount > 0 ||
    input.cycles.stopReason === "unsafe-override-proposals"
  ) {
    return "needs-attention";
  }

  if (
    input.batch.pendingSourceEnrichmentCount > 0 ||
    input.cycles.stopReason === "pending-source-enrichment"
  ) {
    return "stalled-human-gate";
  }

  return "healthy";
}

function buildRecommendations(domains: DomainRunHealth[]): string[] {
  const needsAttention = domains.filter((domain) => domain.healthState === "needs-attention");
  if (needsAttention.length > 0) {
    return needsAttention.map(
      (domain) => `${domain.domain}: investigate benchmark/regression health before expanding automation`
    );
  }

  const humanGateBlocked = domains.filter((domain) => domain.pendingSourceEnrichmentCount > 0);
  if (humanGateBlocked.length > 0) {
    return humanGateBlocked.map(
      (domain) =>
        `${domain.domain}: next progress depends on clearing ${domain.pendingSourceEnrichmentCount} pending source-enrichment records`
    );
  }

  return ["All available domains are within current automation guardrails."];
}

function renderMarkdown(report: RunHealthReport): string {
  const lines: string[] = [];
  lines.push("# Autoresearch health");
  lines.push("");
  lines.push(`- generated at: ${report.generatedAt}`);
  lines.push(`- overall state: ${report.overallState}`);
  lines.push(`- available domains: ${report.availableDomainCount}`);
  lines.push(`- missing domains: ${report.missingDomains.join(", ") || "none"}`);
  lines.push(`- total pending benchmark review: ${report.totalPendingBenchmarkProposalCount}`);
  lines.push(`- total pending source enrichment: ${report.totalPendingSourceEnrichmentCount}`);
  lines.push(`- total normalized protocols: ${report.totalNormalizedProtocolCount}`);
  lines.push("");
  lines.push("## Recommendations");
  for (const recommendation of report.recommendations) {
    lines.push(`- ${recommendation}`);
  }
  lines.push("");
  lines.push("## Domains");

  for (const domain of report.domains) {
    lines.push(`### ${domain.domain}`);
    lines.push(`- state: ${domain.healthState}`);
    lines.push(`- latest run: ${domain.latestRunGeneratedAt}`);
    lines.push(`- stop reason: ${domain.stopReason}`);
    lines.push(`- cycles completed: ${domain.cyclesCompleted}`);
    lines.push(
      `- reviewed quality: inclusionF1=${domain.reviewedInclusionF1} familyAccuracy=${domain.reviewedProtocolFamilyAccuracy} paperTypeAccuracy=${domain.reviewedPaperTypeAccuracy}`
    );
    lines.push(
      `- reviewed depth: outcomes=${domain.reviewedOutcomeCoverage} stepPhases=${domain.reviewedStepPhaseCoverage} minimumDepthReady=${domain.reviewedMinimumDepthReady ? "yes" : "no"}`
    );
    lines.push(
      `- regression health: passed ${domain.regressionPassedCount}/${domain.regressionScenarioCount}`
    );
    lines.push(
      `- backlog: benchmarkReview=${domain.pendingBenchmarkProposalCount} sourceEnrichment=${domain.pendingSourceEnrichmentCount} missingOutcomes=${domain.missingOutcomeCount} missingStepPhases=${domain.missingStepPhaseCount}`
    );
    lines.push(
      `- normalization: protocols=${domain.normalizedProtocolCount} warnings=${domain.protocolsWithNormalizationWarnings}`
    );
    lines.push(
      `- baseline delta: inclusionF1=${domain.reviewedInclusionF1Delta} familyAccuracy=${domain.reviewedProtocolFamilyAccuracyDelta} paperTypeAccuracy=${domain.reviewedPaperTypeAccuracyDelta} outcomeCoverage=${domain.reviewedOutcomeCoverageDelta} stepPhaseCoverage=${domain.reviewedStepPhaseCoverageDelta} gatePassCount=${domain.gatePassCountDelta}`
    );
    if (domain.bestWedgeTitle) {
      lines.push(`- best wedge: ${domain.bestWedgeTitle}`);
    }
    if (domain.likelyPainPoint) {
      lines.push(`- pain point: ${domain.likelyPainPoint}`);
    }
    if (domain.currentRead) {
      lines.push(`- current read: ${domain.currentRead}`);
    }
    if (domain.alerts.length > 0) {
      lines.push(`- alerts: ${domain.alerts.join(" | ")}`);
    }
    lines.push(
      `- artifacts: ${domain.artifactPaths.cycleReport}, ${domain.artifactPaths.unattendedBatch}, ${domain.artifactPaths.benchmarkReport}, ${domain.artifactPaths.wedgeBrief}, ${domain.artifactPaths.callPacket}`
    );
    lines.push("");
  }

  return lines.join("\n");
}

async function buildDomainHealth(domain: DomainId): Promise<DomainRunHealth | null> {
  const cyclePath = join(process.cwd(), "data", "autoresearch", domain, "autoresearch-cycles.json");
  const batchPath = join(process.cwd(), "data", "autoresearch", domain, "unattended-batch.json");
  const benchmarkSummaryPath = join(process.cwd(), "data", "processed", domain, "benchmark-summary.json");
  const benchmarkAnalysisPath = join(process.cwd(), "data", "processed", domain, "benchmark-analysis.json");
  const regressionPath = join(process.cwd(), "data", "autoresearch", domain, "regression-analysis.json");
  const callPacketPath = join(process.cwd(), "data", "processed", domain, "call-packet.json");

  const [cycles, batch, summary, analysis, regressions, callPacket] = await Promise.all([
    readOptionalJson<AutoresearchCycles>(cyclePath),
    readOptionalJson<UnattendedBatchSummary>(batchPath),
    readOptionalJson<BenchmarkSummary>(benchmarkSummaryPath),
    readOptionalJson<BenchmarkAnalysis>(benchmarkAnalysisPath),
    readOptionalJson<RegressionScenario[]>(regressionPath),
    readOptionalJson<CallPacket>(callPacketPath)
  ]);

  if (!cycles || !batch || !summary || !analysis || !regressions) {
    return null;
  }

  const regressionPassedCount = regressions.filter((scenario) => scenario.passed).length;
  const healthState = determineHealthState({ summary, batch, regressions, cycles });
  const alerts = buildAlerts({ summary, batch, analysis, regressions, cycles });

  return {
    domain,
    latestRunGeneratedAt: cycles.generatedAt,
    healthState,
    stopReason: cycles.stopReason,
    cyclesCompleted: cycles.cyclesCompleted,
    passesAllGates: summary.gates.every((gate) => gate.passed),
    reviewedMinimumDepthReady: batch.minimumDepthReady,
    reviewedInclusionF1: summary.subsets.reviewed.inclusion.f1,
    reviewedProtocolFamilyAccuracy: summary.subsets.reviewed.exactFields.protocolFamily.accuracy,
    reviewedPaperTypeAccuracy: summary.subsets.reviewed.exactFields.paperType.accuracy,
    reviewedOutcomeCoverage: summary.subsets.reviewed.coverage.outcomeClasses.coverageRate,
    reviewedStepPhaseCoverage: summary.subsets.reviewed.coverage.stepPhases.coverageRate,
    regressionPassedCount,
    regressionScenarioCount: regressions.length,
    normalizedProtocolCount: batch.normalizedProtocolCount,
    protocolsWithNormalizationWarnings: batch.protocolsWithNormalizationWarnings,
    pendingBenchmarkProposalCount: batch.pendingBenchmarkProposalCount,
    pendingSourceEnrichmentCount: batch.pendingSourceEnrichmentCount,
    reviewedSourceEnrichmentCount: batch.reviewedSourceEnrichmentCount,
    missingOutcomeCount: analysis.reviewedDepth.missingOutcomeCount,
    missingStepPhaseCount: analysis.reviewedDepth.missingStepPhaseCount,
    reviewedInclusionF1Delta: analysis.delta.reviewedInclusionF1,
    reviewedProtocolFamilyAccuracyDelta: analysis.delta.reviewedProtocolFamilyAccuracy,
    reviewedPaperTypeAccuracyDelta: analysis.delta.reviewedPaperTypeAccuracy,
    reviewedOutcomeCoverageDelta: analysis.delta.reviewedOutcomeCoverage,
    reviewedStepPhaseCoverageDelta: analysis.delta.reviewedStepPhaseCoverage,
    gatePassCountDelta: analysis.delta.gatePassCount,
    bestWedgeTitle: callPacket?.bestWedge?.title ?? null,
    currentRead: callPacket?.wedgeValidation?.currentRead ?? null,
    likelyPainPoint: callPacket?.marketBridge?.likelyPainPoint ?? null,
    alerts,
    artifactPaths: {
      cycleReport: `data/autoresearch/${domain}/autoresearch-cycles.md`,
      unattendedBatch: `data/autoresearch/${domain}/unattended-batch.md`,
      benchmarkReport: `data/processed/${domain}/benchmark-report.md`,
      wedgeBrief: `data/processed/${domain}/wedge-brief.md`,
      callPacket: `data/processed/${domain}/call-packet.md`
    }
  };
}

async function main(): Promise<void> {
  const domainReports = await Promise.all(DOMAINS.map((domain) => buildDomainHealth(domain)));
  const domains = domainReports.filter((domain): domain is DomainRunHealth => Boolean(domain));
  const missingDomains = DOMAINS.filter(
    (domain) => !domains.some((domainReport) => domainReport.domain === domain)
  );

  const overallState: HealthState = domains.some((domain) => domain.healthState === "needs-attention")
    ? "needs-attention"
    : domains.some((domain) => domain.healthState === "stalled-human-gate")
      ? "stalled-human-gate"
      : "healthy";

  const report: RunHealthReport = {
    generatedAt: new Date().toISOString(),
    overallState,
    availableDomainCount: domains.length,
    missingDomains,
    totalPendingBenchmarkProposalCount: domains.reduce(
      (sum, domain) => sum + domain.pendingBenchmarkProposalCount,
      0
    ),
    totalPendingSourceEnrichmentCount: domains.reduce(
      (sum, domain) => sum + domain.pendingSourceEnrichmentCount,
      0
    ),
    totalNormalizedProtocolCount: domains.reduce((sum, domain) => sum + domain.normalizedProtocolCount, 0),
    domains,
    recommendations: buildRecommendations(domains)
  };

  const outputDir = join(process.cwd(), "data", "autoresearch");
  const jsonPath = join(outputDir, "run-health.json");
  const markdownPath = join(outputDir, "run-health.md");
  const dashboardDataPath = join(process.cwd(), "apps", "web", "dashboard-data.json");
  const previousReport = await readOptionalJson<RunHealthReport>(jsonPath);
  const stableReport =
    previousReport &&
    JSON.stringify(stripGeneratedAt(previousReport)) === JSON.stringify(stripGeneratedAt(report))
      ? previousReport
      : report;

  await mkdir(outputDir, { recursive: true });
  await mkdir(join(process.cwd(), "apps", "web"), { recursive: true });
  const nextJson = JSON.stringify(stableReport, null, 2);
  const nextMarkdown = renderMarkdown(stableReport);
  const [previousJson, previousMarkdown, previousDashboardJson] = await Promise.all([
    readOptionalText(jsonPath),
    readOptionalText(markdownPath),
    readOptionalText(dashboardDataPath)
  ]);

  if (previousJson !== nextJson) {
    await writeFile(jsonPath, nextJson, "utf8");
  }
  if (previousMarkdown !== nextMarkdown) {
    await writeFile(markdownPath, nextMarkdown, "utf8");
  }
  if (previousDashboardJson !== nextJson) {
    await writeFile(dashboardDataPath, nextJson, "utf8");
  }

  console.log(JSON.stringify(stableReport, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
