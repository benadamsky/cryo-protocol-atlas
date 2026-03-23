import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  AutoresearchProposalFileSchema,
  BenchmarkProposalDecisionFileSchema,
  DomainIdSchema,
  type AutoresearchProposalFile,
  type BenchmarkProposalDecisionFile,
  type DomainId
} from "../packages/shared/src/schema.js";

type StateSignature = {
  benchmarkHash: string | null;
  overrideHash: string | null;
};

type CycleStopReason =
  | "converged"
  | "pending-source-enrichment"
  | "pending-benchmark-review"
  | "unsafe-override-proposals"
  | "max-cycles-reached";

type UnattendedBatchSummary = {
  domain: DomainId;
  includeIngest: boolean;
  extractionCount: number;
  resolvedExtractionCount: number;
  normalizedProtocolCount: number;
  protocolsWithNormalizationWarnings: number;
  reviewedOutcomeCoverage: number;
  reviewedStepPhaseCoverage: number;
  loopProposalCount: number;
  pendingBenchmarkProposalCount: number;
  pendingSourceEnrichmentCount: number;
  reviewedSourceEnrichmentCount: number;
  minimumDepthReady: boolean;
};

type CycleRecord = {
  cycle: number;
  ingestIncluded: boolean;
  beforeState: StateSignature;
  afterState: StateSignature;
  autonomousStateChanged: boolean;
  actions: string[];
  proposalCount: number;
  overrideProposalCount: number;
  benchmarkProposalCount: number;
  autoApplySafe: boolean;
  pendingBenchmarkProposalCount: number;
  pendingSourceEnrichmentCount: number;
  reviewedOutcomeCoverage: number;
  reviewedStepPhaseCoverage: number;
};

type CycleRunReport = {
  domain: DomainId;
  generatedAt: string;
  maxCycles: number;
  ingestFirstCycle: boolean;
  cyclesCompleted: number;
  stopReason: CycleStopReason;
  cycles: CycleRecord[];
};

type ComparableCycleRunReport = Omit<CycleRunReport, "generatedAt">;

function parseArgs(argv: string[]) {
  const selectedDomain = DomainIdSchema.parse(argv[2] ?? "islets");
  let maxCycles = 5;
  let ingestFirstCycle = argv.includes("--ingest");

  for (let index = 3; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--ingest") {
      ingestFirstCycle = true;
      continue;
    }
    if (arg === "--max-cycles" && argv[index + 1]) {
      maxCycles = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }
    if (arg.startsWith("--max-cycles=")) {
      maxCycles = Number.parseInt(arg.slice("--max-cycles=".length), 10);
    }
  }

  if (!Number.isInteger(maxCycles) || maxCycles < 1) {
    throw new Error(`Invalid --max-cycles value: ${maxCycles}`);
  }

  return {
    domain: selectedDomain,
    maxCycles,
    ingestFirstCycle
  };
}

function runStep(script: string, args: string[] = []) {
  execFileSync(process.execPath, ["--import", "tsx", script, ...args], {
    cwd: process.cwd(),
    stdio: "inherit"
  });
}

async function readOptionalFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function computeStateSignature(selectedDomain: DomainId): Promise<StateSignature> {
  const benchmarkPath = join(process.cwd(), "data", "benchmarks", selectedDomain, "gold-set.json");
  const overridePath = join(process.cwd(), "data", "curated", selectedDomain, "protocol-overrides.json");
  const [benchmarkContent, overrideContent] = await Promise.all([
    readOptionalFile(benchmarkPath),
    readOptionalFile(overridePath)
  ]);

  return {
    benchmarkHash: benchmarkContent ? sha256(benchmarkContent) : null,
    overrideHash: overrideContent ? sha256(overrideContent) : null
  };
}

function stateChanged(left: StateSignature, right: StateSignature): boolean {
  return left.benchmarkHash !== right.benchmarkHash || left.overrideHash !== right.overrideHash;
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

async function readOptionalJson<T>(path: string): Promise<T | null> {
  const content = await readOptionalFile(path);
  return content ? (JSON.parse(content) as T) : null;
}

async function readCycleArtifacts(selectedDomain: DomainId): Promise<{
  summary: UnattendedBatchSummary;
  proposalFile: AutoresearchProposalFile;
  decisionFile: BenchmarkProposalDecisionFile;
  autoApplySafe: boolean;
}> {
  const loopDir = join(process.cwd(), "data", "autoresearch", selectedDomain);
  const summary = await readJson<UnattendedBatchSummary>(join(loopDir, "unattended-batch.json"));
  const proposalFile = AutoresearchProposalFileSchema.parse(
    await readJson<unknown>(join(loopDir, "proposal-file.json"))
  );
  const decisionFile = BenchmarkProposalDecisionFileSchema.parse(
    await readJson<unknown>(join(loopDir, "benchmark-review-decisions.json"))
  );
  const loopAnalysis = await readJson<{ autoApplySafe: boolean }>(join(loopDir, "loop-analysis.json"));

  return {
    summary,
    proposalFile,
    decisionFile,
    autoApplySafe: loopAnalysis.autoApplySafe
  };
}

function countProposals(proposalFile: AutoresearchProposalFile) {
  return {
    proposalCount: proposalFile.proposalCount,
    overrideProposalCount: proposalFile.proposals.filter((proposal) => proposal.target === "override").length,
    benchmarkProposalCount: proposalFile.proposals.filter((proposal) => proposal.target === "benchmark").length
  };
}

function renderMarkdown(report: CycleRunReport): string {
  const lines: string[] = [];
  lines.push(`# ${report.domain} autoresearch cycles`);
  lines.push("");
  lines.push(`- generated at: ${report.generatedAt}`);
  lines.push(`- max cycles: ${report.maxCycles}`);
  lines.push(`- ingest first cycle: ${report.ingestFirstCycle ? "yes" : "no"}`);
  lines.push(`- cycles completed: ${report.cyclesCompleted}`);
  lines.push(`- stop reason: ${report.stopReason}`);
  lines.push("");
  lines.push("## Cycles");

  for (const cycle of report.cycles) {
    lines.push(`- cycle ${cycle.cycle}`);
    lines.push(`  ingest included=${cycle.ingestIncluded ? "yes" : "no"}`);
    lines.push(`  autonomous state changed=${cycle.autonomousStateChanged ? "yes" : "no"}`);
    lines.push(`  actions=${cycle.actions.join(", ") || "none"}`);
    lines.push(`  proposals=${cycle.proposalCount} | override=${cycle.overrideProposalCount} | benchmark=${cycle.benchmarkProposalCount}`);
    lines.push(
      `  pending benchmark review=${cycle.pendingBenchmarkProposalCount} | pending source enrichment=${cycle.pendingSourceEnrichmentCount}`
    );
    lines.push(
      `  reviewed outcome coverage=${cycle.reviewedOutcomeCoverage} | reviewed step-phase coverage=${cycle.reviewedStepPhaseCoverage}`
    );
  }

  lines.push("");
  return lines.join("\n");
}

function comparableReport(report: CycleRunReport): ComparableCycleRunReport {
  return {
    domain: report.domain,
    maxCycles: report.maxCycles,
    ingestFirstCycle: report.ingestFirstCycle,
    cyclesCompleted: report.cyclesCompleted,
    stopReason: report.stopReason,
    cycles: report.cycles
  };
}

async function applySafeOverrideRepairs(selectedDomain: DomainId): Promise<string[]> {
  runStep("scripts/run-autoresearch-loop.ts", [selectedDomain, "--apply"]);
  runStep("scripts/run-autoresearch-loop.ts", [selectedDomain]);
  runStep("scripts/build-benchmark-review-queue.ts", [selectedDomain]);
  return ["applied-safe-override-proposals", "refreshed-loop-artifacts"];
}

function determineStopReason(input: {
  cycle: number;
  maxCycles: number;
  autonomousStateChanged: boolean;
  pendingBenchmarkProposalCount: number;
  pendingSourceEnrichmentCount: number;
  overrideProposalCount: number;
  autoApplySafe: boolean;
}): CycleStopReason | null {
  if (input.autonomousStateChanged) {
    return input.cycle >= input.maxCycles ? "max-cycles-reached" : null;
  }
  if (input.pendingBenchmarkProposalCount > 0) {
    return "pending-benchmark-review";
  }
  if (input.overrideProposalCount > 0 && !input.autoApplySafe) {
    return "unsafe-override-proposals";
  }
  if (input.pendingSourceEnrichmentCount > 0) {
    return "pending-source-enrichment";
  }
  return "converged";
}

async function main(): Promise<void> {
  const { domain, maxCycles, ingestFirstCycle } = parseArgs(process.argv);
  const loopDir = join(process.cwd(), "data", "autoresearch", domain);
  const reportJsonPath = join(loopDir, "autoresearch-cycles.json");
  const reportMarkdownPath = join(loopDir, "autoresearch-cycles.md");
  const cycles: CycleRecord[] = [];
  let stopReason: CycleStopReason = "max-cycles-reached";

  for (let cycle = 1; cycle <= maxCycles; cycle += 1) {
    const beforeState = await computeStateSignature(domain);
    const ingestIncluded = ingestFirstCycle && cycle === 1;
    runStep("scripts/run-unattended-batch.ts", ingestIncluded ? [domain, "--ingest"] : [domain]);

    let { summary, proposalFile, decisionFile, autoApplySafe } = await readCycleArtifacts(domain);
    const actions: string[] = [];
    const proposalCounts = countProposals(proposalFile);

    if (proposalCounts.overrideProposalCount > 0 && autoApplySafe) {
      actions.push(...(await applySafeOverrideRepairs(domain)));
      ({ summary, proposalFile, decisionFile, autoApplySafe } = await readCycleArtifacts(domain));
    }

    const afterState = await computeStateSignature(domain);
    const autonomousStateChanged = stateChanged(beforeState, afterState);
    const refreshedProposalCounts = countProposals(proposalFile);
    const pendingBenchmarkProposalCount = decisionFile.decisions.filter(
      (decision) => decision.decision === "pending"
    ).length;

    cycles.push({
      cycle,
      ingestIncluded,
      beforeState,
      afterState,
      autonomousStateChanged,
      actions,
      proposalCount: refreshedProposalCounts.proposalCount,
      overrideProposalCount: refreshedProposalCounts.overrideProposalCount,
      benchmarkProposalCount: refreshedProposalCounts.benchmarkProposalCount,
      autoApplySafe,
      pendingBenchmarkProposalCount,
      pendingSourceEnrichmentCount: summary.pendingSourceEnrichmentCount,
      reviewedOutcomeCoverage: summary.reviewedOutcomeCoverage,
      reviewedStepPhaseCoverage: summary.reviewedStepPhaseCoverage
    });

    const nextStopReason = determineStopReason({
      cycle,
      maxCycles,
      autonomousStateChanged,
      pendingBenchmarkProposalCount,
      pendingSourceEnrichmentCount: summary.pendingSourceEnrichmentCount,
      overrideProposalCount: refreshedProposalCounts.overrideProposalCount,
      autoApplySafe
    });

    if (nextStopReason) {
      stopReason = nextStopReason;
      break;
    }
  }

  const report: CycleRunReport = {
    domain,
    generatedAt: new Date().toISOString(),
    maxCycles,
    ingestFirstCycle,
    cyclesCompleted: cycles.length,
    stopReason,
    cycles
  };

  const previousReport = await readOptionalJson<CycleRunReport>(reportJsonPath);
  if (previousReport) {
    const previousComparable = JSON.stringify(comparableReport(previousReport));
    const nextComparable = JSON.stringify(comparableReport(report));
    if (previousComparable === nextComparable) {
      report.generatedAt = previousReport.generatedAt;
    }
  }

  await mkdir(loopDir, { recursive: true });
  const nextReportJson = JSON.stringify(report, null, 2);
  const nextReportMarkdown = renderMarkdown(report);
  const [previousReportJson, previousReportMarkdown] = await Promise.all([
    readOptionalFile(reportJsonPath),
    readOptionalFile(reportMarkdownPath)
  ]);

  if (previousReportJson !== nextReportJson) {
    await writeFile(reportJsonPath, nextReportJson, "utf8");
  }
  if (previousReportMarkdown !== nextReportMarkdown) {
    await writeFile(reportMarkdownPath, nextReportMarkdown, "utf8");
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
