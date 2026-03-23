import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { mergeProtocolOverrides, parseOverrideFile } from "../packages/normalize/src/overrides.js";
import { runAutoresearchLoop } from "../packages/research/src/autoresearch.js";
import {
  BenchmarkFileSchema,
  DomainIdSchema,
  ExtractionSnapshotSchema,
  type DomainId
} from "../packages/shared/src/schema.js";

const domain = DomainIdSchema.parse(process.argv[2] ?? "ovarian-tissue");
const applyChanges = process.argv.includes("--apply");

async function readOptionalFile(path: string): Promise<string | null> {
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

function renderLoopMarkdown(result: ReturnType<typeof runAutoresearchLoop>): string {
  const overrideProposals = result.proposalFile.proposals.filter((proposal) => proposal.target === "override");
  const benchmarkProposals = result.proposalFile.proposals.filter((proposal) => proposal.target === "benchmark");
  const lines: string[] = [];
  lines.push(`# ${result.proposalFile.domain} autoresearch loop`);
  lines.push("");
  lines.push(`Proposals generated: ${result.proposalFile.proposalCount}`);
  lines.push(`- override proposals: ${overrideProposals.length}`);
  lines.push(`- benchmark proposals: ${benchmarkProposals.length}`);
  lines.push(`Override auto-apply safe: ${result.autoApplySafe ? "yes" : "no"}`);
  lines.push("");
  lines.push("## Benchmark state");
  lines.push(
    `- current reviewed inclusion F1: ${result.currentEvaluation.subsets.reviewed.inclusion.f1}`
  );
  lines.push(
    `- candidate reviewed inclusion F1: ${result.candidateEvaluation.subsets.reviewed.inclusion.f1}`
  );
  lines.push(
    `- current reviewed protocol family accuracy: ${result.currentEvaluation.subsets.reviewed.exactFields.protocolFamily.accuracy}`
  );
  lines.push(
    `- candidate reviewed protocol family accuracy: ${result.candidateEvaluation.subsets.reviewed.exactFields.protocolFamily.accuracy}`
  );
  lines.push(
    `- current reviewed paper type accuracy: ${result.currentEvaluation.subsets.reviewed.exactFields.paperType.accuracy}`
  );
  lines.push(
    `- candidate reviewed paper type accuracy: ${result.candidateEvaluation.subsets.reviewed.exactFields.paperType.accuracy}`
  );
  lines.push(
    `- current reviewed outcome coverage: ${result.currentEvaluation.subsets.reviewed.coverage.outcomeClasses.coverageRate}`
  );
  lines.push(
    `- prospective reviewed outcome coverage: ${result.candidateBenchmarkEvaluation.subsets.reviewed.coverage.outcomeClasses.coverageRate}`
  );
  lines.push(
    `- current reviewed step-phase coverage: ${result.currentEvaluation.subsets.reviewed.coverage.stepPhases.coverageRate}`
  );
  lines.push(
    `- prospective reviewed step-phase coverage: ${result.candidateBenchmarkEvaluation.subsets.reviewed.coverage.stepPhases.coverageRate}`
  );
  lines.push("");
  lines.push("## Proposals");

  if (result.proposalFile.proposals.length === 0) {
    lines.push("- none; current resolved atlas is already aligned with the reviewed benchmark");
  } else {
    for (const proposal of result.proposalFile.proposals) {
      lines.push(
        `- ${proposal.action} | target=${proposal.target} source=${proposal.source} | ${proposal.title} | fields=${proposal.fields.join(", ")} | confidence=${proposal.proposalConfidence}`
      );
      lines.push(`  rationale=${proposal.rationale}`);
      if (proposal.evidenceSummary.length > 0) {
        lines.push(`  evidence=${proposal.evidenceSummary.join(" || ")}`);
      }
      lines.push(`  expectedImpact=${proposal.expectedImpact.join("; ")}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

async function main(selectedDomain: DomainId, shouldApply: boolean): Promise<void> {
  const processedDir = join(process.cwd(), "data", "processed", selectedDomain);
  const benchmarkDir = join(process.cwd(), "data", "benchmarks", selectedDomain);
  const curatedDir = join(process.cwd(), "data", "curated", selectedDomain);
  const loopDir = join(process.cwd(), "data", "autoresearch", selectedDomain);

  const extractionSnapshot = ExtractionSnapshotSchema.parse(
    JSON.parse(await readFile(join(processedDir, "extraction-snapshot.json"), "utf8"))
  );
  const benchmark = BenchmarkFileSchema.parse(
    JSON.parse(await readFile(join(benchmarkDir, "gold-set.json"), "utf8"))
  );

  let overrideFile = null;
  try {
    overrideFile = parseOverrideFile(
      JSON.parse(await readFile(join(curatedDir, "protocol-overrides.json"), "utf8"))
    );
  } catch {
    overrideFile = null;
  }

  const result = runAutoresearchLoop(extractionSnapshot, benchmark, overrideFile);
  const proposalFilePath = join(loopDir, "proposal-file.json");
  const loopAnalysisPath = join(loopDir, "loop-analysis.json");
  const loopReportPath = join(loopDir, "loop-report.md");

  const nextProposalFile = result.proposalFile;
  const nextLoopAnalysis = {
    domain: selectedDomain,
    autoApplySafe: result.autoApplySafe,
    currentEvaluation: result.currentEvaluation,
    candidateEvaluation: result.candidateEvaluation,
    candidateBenchmarkEvaluation: result.candidateBenchmarkEvaluation,
    proposalCount: result.proposalFile.proposalCount,
    overrideProposalCount: result.proposalFile.proposals.filter((proposal) => proposal.target === "override").length,
    benchmarkProposalCount: result.proposalFile.proposals.filter((proposal) => proposal.target === "benchmark").length,
    candidateOverrideCount: result.candidateOverrideCount
  };

  const [previousProposalFileContent, previousLoopAnalysisContent, previousLoopReportContent] = await Promise.all([
    readOptionalFile(proposalFilePath),
    readOptionalFile(loopAnalysisPath),
    readOptionalFile(loopReportPath)
  ]);

  const stableProposalFile = previousProposalFileContent
    ? (() => {
        const previous = JSON.parse(previousProposalFileContent);
        return JSON.stringify(stripGeneratedAt(previous)) === JSON.stringify(stripGeneratedAt(nextProposalFile))
          ? previous
          : nextProposalFile;
      })()
    : nextProposalFile;
  const stableLoopAnalysis = previousLoopAnalysisContent
    ? (() => {
        const previous = JSON.parse(previousLoopAnalysisContent);
        return JSON.stringify(stripGeneratedAt(previous)) === JSON.stringify(stripGeneratedAt(nextLoopAnalysis))
          ? previous
          : nextLoopAnalysis;
      })()
    : nextLoopAnalysis;
  const nextLoopReport = renderLoopMarkdown({
    ...result,
    proposalFile: stableProposalFile
  });

  await mkdir(loopDir, { recursive: true });
  const nextProposalFileContent = JSON.stringify(stableProposalFile, null, 2);
  const nextLoopAnalysisContent = JSON.stringify(stableLoopAnalysis, null, 2);
  if (previousProposalFileContent !== nextProposalFileContent) {
    await writeFile(proposalFilePath, nextProposalFileContent, "utf8");
  }
  if (previousLoopAnalysisContent !== nextLoopAnalysisContent) {
    await writeFile(loopAnalysisPath, nextLoopAnalysisContent, "utf8");
  }
  if (previousLoopReportContent !== nextLoopReport) {
    await writeFile(loopReportPath, nextLoopReport, "utf8");
  }

  if (shouldApply && result.autoApplySafe && result.proposalFile.proposals.length > 0) {
    const nextOverrideFile = mergeProtocolOverrides(
      overrideFile,
      result.proposalFile.proposals
        .map((proposal) => proposal.override)
        .filter((override): override is NonNullable<typeof override> => Boolean(override))
    );
    if (nextOverrideFile) {
      await writeFile(join(curatedDir, "protocol-overrides.json"), JSON.stringify(nextOverrideFile, null, 2), "utf8");
    }
  }

  console.log(
    JSON.stringify(
      {
        domain: selectedDomain,
        proposalCount: result.proposalFile.proposalCount,
        overrideProposalCount: result.proposalFile.proposals.filter((proposal) => proposal.target === "override").length,
        benchmarkProposalCount: result.proposalFile.proposals.filter((proposal) => proposal.target === "benchmark").length,
        autoApplySafe: result.autoApplySafe,
        applied: shouldApply && result.autoApplySafe && result.proposalFile.proposals.length > 0,
        reviewedInclusionF1: result.currentEvaluation.subsets.reviewed.inclusion.f1,
        candidateReviewedInclusionF1: result.candidateEvaluation.subsets.reviewed.inclusion.f1,
        prospectiveReviewedOutcomeCoverage:
          result.candidateBenchmarkEvaluation.subsets.reviewed.coverage.outcomeClasses.coverageRate,
        prospectiveReviewedStepPhaseCoverage:
          result.candidateBenchmarkEvaluation.subsets.reviewed.coverage.stepPhases.coverageRate
      },
      null,
      2
    )
  );
}

main(domain, applyChanges).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
