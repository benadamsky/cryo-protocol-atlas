import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseDomainArg } from "../packages/shared/src/domains/index.js";
import {
  AutoresearchProposalFileSchema,
  BenchmarkFileSchema,
  BenchmarkProposalDecisionFileSchema,
  ExtractionSnapshotSchema,
  NormalizedProtocolSnapshotSchema,
  SourceEnrichmentFileSchema,
  type DomainId
} from "../packages/shared/src/schema.js";

const domain = parseDomainArg(process.argv[2], "run-unattended-batch <domain>");
const includeIngest = process.argv.includes("--ingest");

function runStep(script: string, args: string[] = []) {
  execFileSync(process.execPath, ["--import", "tsx", script, ...args], {
    cwd: process.cwd(),
    stdio: "inherit"
  });
}

function readJsonFile<T>(path: string, parser: { parse: (value: unknown) => T }): Promise<T> {
  return readFile(path, "utf8").then((content) => parser.parse(JSON.parse(content)));
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function validateNormalizedCoverage(input: {
  resolvedPaperIds: string[];
  normalizedPaperIds: string[];
  domain: DomainId;
}) {
  const resolvedIds = new Set(input.resolvedPaperIds);
  const normalizedIds = new Set(input.normalizedPaperIds);
  const missingNormalizedIds = input.resolvedPaperIds.filter((paperId) => !normalizedIds.has(paperId));
  const unexpectedNormalizedIds = input.normalizedPaperIds.filter((paperId) => !resolvedIds.has(paperId));

  if (missingNormalizedIds.length === 0 && unexpectedNormalizedIds.length === 0) {
    return;
  }

  throw new Error(
    [
      `Normalized protocol coverage mismatch for ${input.domain}.`,
      `missingNormalizedIds=${missingNormalizedIds.join(", ") || "none"}`,
      `unexpectedNormalizedIds=${unexpectedNormalizedIds.join(", ") || "none"}`
    ].join(" ")
  );
}

function renderMarkdown(summary: {
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
}) {
  const lines: string[] = [];
  lines.push(`# ${summary.domain} unattended batch`);
  lines.push("");
  lines.push(`- ingest included: ${summary.includeIngest ? "yes" : "no"}`);
  lines.push(`- extraction count: ${summary.extractionCount}`);
  lines.push(`- resolved extraction count: ${summary.resolvedExtractionCount}`);
  lines.push(`- normalized protocol count: ${summary.normalizedProtocolCount}`);
  lines.push(`- protocols with normalization warnings: ${summary.protocolsWithNormalizationWarnings}`);
  lines.push(`- reviewed outcome coverage: ${summary.reviewedOutcomeCoverage}`);
  lines.push(`- reviewed step-phase coverage: ${summary.reviewedStepPhaseCoverage}`);
  lines.push(`- reviewed minimum-depth ready: ${summary.minimumDepthReady ? "yes" : "no"}`);
  lines.push(`- loop proposal count: ${summary.loopProposalCount}`);
  lines.push(`- pending benchmark proposals: ${summary.pendingBenchmarkProposalCount}`);
  lines.push(`- pending source enrichment records: ${summary.pendingSourceEnrichmentCount}`);
  lines.push(`- reviewed source enrichment records: ${summary.reviewedSourceEnrichmentCount}`);
  lines.push("");
  if (summary.pendingBenchmarkProposalCount === 0 && summary.pendingSourceEnrichmentCount === 0) {
    lines.push("Batch result: no immediate review work remains.");
  } else if (summary.pendingBenchmarkProposalCount === 0) {
    lines.push("Batch result: benchmark loop is aligned; next work is source enrichment.");
  } else {
    lines.push("Batch result: benchmark review work remains after conservative autopromote.");
  }
  lines.push("");
  return lines.join("\n");
}

async function main(selectedDomain: DomainId): Promise<void> {
  const processedDir = join(process.cwd(), "data", "processed", selectedDomain);
  const loopDir = join(process.cwd(), "data", "autoresearch", selectedDomain);
  const benchmarkDir = join(process.cwd(), "data", "benchmarks", selectedDomain);
  const curatedDir = join(process.cwd(), "data", "curated", selectedDomain);
  const domainSnapshotPath = join(processedDir, "domain-snapshot.json");
  const ingestIncluded = includeIngest || !(await fileExists(domainSnapshotPath));

  runStep("scripts/snapshot-delta-before.ts", [selectedDomain]);

  if (ingestIncluded) {
    runStep("scripts/ingest-domain.ts", [selectedDomain]);
  }

  runStep("scripts/extract-domain.ts", [selectedDomain]);
  runStep("scripts/analyze-domain.ts", [selectedDomain]);
  runStep("scripts/evaluate-domain.ts", [selectedDomain]);
  runStep("scripts/build-source-enrichment-queue.ts", [selectedDomain]);
  runStep("scripts/build-normalized-protocols.ts", [selectedDomain]);
  runStep("scripts/build-active-wedge.ts", [selectedDomain]);
  runStep("scripts/build-wedge-benchmark-matrix.ts", [selectedDomain]);
  runStep("scripts/build-experiment-packets.ts", [selectedDomain]);
  runStep("scripts/build-wedge-contradiction-report.ts", [selectedDomain]);
  runStep("scripts/build-wedge-evidence-gap-queue.ts", [selectedDomain]);
  runStep("scripts/auto-enrich-sources.ts", [selectedDomain]);
  runStep("scripts/build-wedge-brief.ts", [selectedDomain]);
  runStep("scripts/build-call-packet.ts", [selectedDomain]);
  runStep("scripts/run-autoresearch-loop.ts", [selectedDomain]);
  runStep("scripts/build-benchmark-review-queue.ts", [selectedDomain]);
  runStep("scripts/autopromote-benchmark-recommendations.ts", [selectedDomain]);
  runStep("scripts/build-benchmark-review-queue.ts", [selectedDomain]);
  runStep("scripts/regress-autoresearch.ts", [selectedDomain]);
  runStep("scripts/build-run-delta.ts", [selectedDomain]);

  try {
    runStep("scripts/build-opportunity-scan.ts");
  } catch {
    // Cross-domain scan is best-effort; it should not block a single-domain unattended batch.
  }

  const extractionSnapshot = await readJsonFile(
    join(processedDir, "extraction-snapshot.json"),
    ExtractionSnapshotSchema
  );
  const resolvedSnapshot = await readJsonFile(
    join(processedDir, "resolved-extraction-snapshot.json"),
    ExtractionSnapshotSchema
  );
  const normalizedSnapshot = await readJsonFile(
    join(processedDir, "normalized-protocols.json"),
    NormalizedProtocolSnapshotSchema
  );
  const benchmark = await readJsonFile(join(benchmarkDir, "gold-set.json"), BenchmarkFileSchema);
  const proposalFile = await readJsonFile(
    join(loopDir, "proposal-file.json"),
    AutoresearchProposalFileSchema
  );
  const decisionFile = await readJsonFile(
    join(loopDir, "benchmark-review-decisions.json"),
    BenchmarkProposalDecisionFileSchema
  );
  const sourceEnrichment = await readJsonFile(
    join(curatedDir, "source-enrichment.json"),
    SourceEnrichmentFileSchema
  );

  const reviewedSubset = benchmark.entries.filter(
    (entry) => entry.reviewStatus === "reviewed" && entry.expectedInAtlas
  );
  const reviewedOutcomeCoverage =
    reviewedSubset.length === 0
      ? 0
      : Number(
          (
            reviewedSubset.filter((entry) => (entry.expectedOutcomeClasses?.length ?? 0) > 0).length /
            reviewedSubset.length
          ).toFixed(3)
        );
  const reviewedStepPhaseCoverage =
    reviewedSubset.length === 0
      ? 0
      : Number(
          (
            reviewedSubset.filter((entry) => (entry.expectedStepPhases?.length ?? 0) > 0).length /
            reviewedSubset.length
          ).toFixed(3)
        );

  const pendingBenchmarkProposalCount = decisionFile.decisions.filter(
    (decision) => decision.decision === "pending"
  ).length;
  const pendingSourceEnrichmentCount = sourceEnrichment.records.filter(
    (record) => record.status === "pending" || record.status === "in-progress"
  ).length;
  const reviewedSourceEnrichmentCount = sourceEnrichment.records.filter(
    (record) => record.status === "reviewed"
  ).length;
  const minimumDepthReady =
    reviewedOutcomeCoverage >= 0.4 && reviewedStepPhaseCoverage >= 0.4;

  validateNormalizedCoverage({
    domain: selectedDomain,
    resolvedPaperIds: resolvedSnapshot.extractions.map((extraction) => extraction.paper.id),
    normalizedPaperIds: normalizedSnapshot.protocols.map((protocol) => protocol.paperId)
  });

  const summary = {
    domain: selectedDomain,
    includeIngest: ingestIncluded,
    extractionCount: extractionSnapshot.extractions.length,
    resolvedExtractionCount: resolvedSnapshot.extractions.length,
    normalizedProtocolCount: normalizedSnapshot.totalProtocols,
    protocolsWithNormalizationWarnings: normalizedSnapshot.protocols.filter(
      (protocol) => protocol.normalizationWarnings.length > 0
    ).length,
    reviewedOutcomeCoverage,
    reviewedStepPhaseCoverage,
    loopProposalCount: proposalFile.proposalCount,
    pendingBenchmarkProposalCount,
    pendingSourceEnrichmentCount,
    reviewedSourceEnrichmentCount,
    minimumDepthReady
  };

  await mkdir(loopDir, { recursive: true });
  await writeFile(join(loopDir, "unattended-batch.json"), JSON.stringify(summary, null, 2), "utf8");
  await writeFile(join(loopDir, "unattended-batch.md"), renderMarkdown(summary), "utf8");

  console.log(JSON.stringify(summary, null, 2));
}

main(domain).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
