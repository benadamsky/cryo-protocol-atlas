import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseDomainArg } from "../packages/shared/src/domains/index.js";
import {
  AutoresearchProposalFileSchema,
  BenchmarkProposalDecisionFileSchema,
  BenchmarkProposalDecisionStatusSchema,
  type BenchmarkProposalDecisionFile,
  type DomainId
} from "../packages/shared/src/schema.js";

const domain = parseDomainArg(process.argv[2], "build-benchmark-review-queue <domain>");

async function readOptionalFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

function stripRuntimeTimestamps(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripRuntimeTimestamps);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== "generatedAt" && key !== "sourceProposalGeneratedAt")
        .map(([key, nestedValue]) => [key, stripRuntimeTimestamps(nestedValue)])
    );
  }
  return value;
}

function renderMarkdown(
  domainId: DomainId,
  proposalFile: ReturnType<typeof AutoresearchProposalFileSchema.parse>,
  decisionFile: BenchmarkProposalDecisionFile
): string {
  const decisionsByProposalId = new Map(
    decisionFile.decisions.map((decision) => [decision.proposalId, decision])
  );
  const proposals = proposalFile.proposals
    .filter((proposal) => proposal.target === "benchmark")
    .sort(
      (left, right) =>
        (right.reviewRecommendation?.policyConfidence ?? right.proposalConfidence) -
          (left.reviewRecommendation?.policyConfidence ?? left.proposalConfidence) ||
        right.proposalConfidence - left.proposalConfidence ||
        left.title.localeCompare(right.title)
    );

  const lines: string[] = [];
  lines.push(`# ${domainId} benchmark review queue`);
  lines.push("");
  lines.push(`Source proposal set: ${proposalFile.generatedAt}`);
  lines.push(`Benchmark proposals: ${proposals.length}`);
  lines.push("");

  const statusCounts = new Map<string, number>();
  for (const decision of decisionFile.decisions) {
    statusCounts.set(decision.decision, (statusCounts.get(decision.decision) ?? 0) + 1);
  }

  lines.push("## Decision status");
  for (const status of BenchmarkProposalDecisionStatusSchema.options) {
    lines.push(`- ${status}: ${statusCounts.get(status) ?? 0}`);
  }

  lines.push("");
  const recommendationCounts = new Map<string, number>();
  for (const proposal of proposals) {
    const recommendedDecision = proposal.reviewRecommendation?.recommendedDecision ?? "none";
    recommendationCounts.set(
      recommendedDecision,
      (recommendationCounts.get(recommendedDecision) ?? 0) + 1
    );
  }

  lines.push("## Policy recommendation");
  lines.push(`- accept: ${recommendationCounts.get("accept") ?? 0}`);
  lines.push(`- defer: ${recommendationCounts.get("defer") ?? 0}`);
  lines.push(`- none: ${recommendationCounts.get("none") ?? 0}`);
  lines.push("");
  lines.push("## Proposals");

  if (proposals.length === 0) {
    lines.push("- none");
    lines.push("");
    return lines.join("\n");
  }

  for (const proposal of proposals) {
    const decision = decisionsByProposalId.get(proposal.proposalId);
    lines.push(
      `- [${decision?.decision ?? "pending"}] ${proposal.title} | fields=${proposal.fields.join(", ")} | confidence=${proposal.proposalConfidence}`
    );
    lines.push(`  proposalId=${proposal.proposalId}`);
    if (proposal.reviewRecommendation) {
      lines.push(
        `  recommendation=${proposal.reviewRecommendation.recommendedDecision} | policyConfidence=${proposal.reviewRecommendation.policyConfidence}`
      );
      lines.push(`  recommendationReasons=${proposal.reviewRecommendation.reasons.join(" || ")}`);
    }
    lines.push(`  rationale=${proposal.rationale}`);
    if (proposal.evidenceSummary.length > 0) {
      lines.push(`  evidence=${proposal.evidenceSummary.join(" || ")}`);
    }
    if (proposal.benchmarkPatch?.expectedOutcomeClasses?.length) {
      lines.push(
        `  expectedOutcomeClasses=${proposal.benchmarkPatch.expectedOutcomeClasses.join(", ")}`
      );
    }
    if (proposal.benchmarkPatch?.expectedStepPhases?.length) {
      lines.push(`  expectedStepPhases=${proposal.benchmarkPatch.expectedStepPhases.join(", ")}`);
    }
    if (decision?.reviewerNotes) {
      lines.push(`  reviewerNotes=${decision.reviewerNotes}`);
    }
    if (decision?.acceptedOutcomeClasses?.length) {
      lines.push(`  acceptedOutcomeClasses=${decision.acceptedOutcomeClasses.join(", ")}`);
    }
    if (decision?.acceptedStepPhases?.length) {
      lines.push(`  acceptedStepPhases=${decision.acceptedStepPhases.join(", ")}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

async function main(selectedDomain: DomainId): Promise<void> {
  const loopDir = join(process.cwd(), "data", "autoresearch", selectedDomain);
  const decisionFilePath = join(loopDir, "benchmark-review-decisions.json");
  const queueMarkdownPath = join(loopDir, "benchmark-review-queue.md");
  await mkdir(loopDir, { recursive: true });

  const proposalFile = AutoresearchProposalFileSchema.parse(
    JSON.parse(await readFile(join(loopDir, "proposal-file.json"), "utf8"))
  );

  const benchmarkProposals = proposalFile.proposals.filter((proposal) => proposal.target === "benchmark");

  let existingDecisionFile: BenchmarkProposalDecisionFile | null = null;
  try {
    existingDecisionFile = BenchmarkProposalDecisionFileSchema.parse(JSON.parse(await readFile(decisionFilePath, "utf8")));
  } catch {
    existingDecisionFile = null;
  }

  const existingByProposalId = new Map(
    existingDecisionFile?.decisions.map((decision) => [decision.proposalId, decision]) ?? []
  );

  const nextDecisionFile = BenchmarkProposalDecisionFileSchema.parse({
    generatedAt: new Date().toISOString(),
    domain: selectedDomain,
    sourceProposalGeneratedAt: proposalFile.generatedAt,
    decisionCount: benchmarkProposals.length,
    decisions: benchmarkProposals.map((proposal) => {
      const existing = existingByProposalId.get(proposal.proposalId);
      return {
        proposalId: proposal.proposalId,
        paperId: proposal.paperId,
        title: proposal.title,
        decision: existing?.decision ?? "pending",
        ...(existing?.acceptedOutcomeClasses?.length
          ? { acceptedOutcomeClasses: existing.acceptedOutcomeClasses }
          : {}),
        ...(existing?.acceptedStepPhases?.length
          ? { acceptedStepPhases: existing.acceptedStepPhases }
          : {}),
        ...(existing?.reviewerNotes ? { reviewerNotes: existing.reviewerNotes } : {}),
        ...(existing?.decidedAt ? { decidedAt: existing.decidedAt } : {})
      };
    })
  });

  const previousDecisionFileContent = await readOptionalFile(decisionFilePath);
  const stableDecisionFile: BenchmarkProposalDecisionFile = previousDecisionFileContent
    ? (() => {
        const previous = BenchmarkProposalDecisionFileSchema.parse(JSON.parse(previousDecisionFileContent));
        return JSON.stringify(stripRuntimeTimestamps(previous)) ===
          JSON.stringify(stripRuntimeTimestamps(nextDecisionFile))
          ? previous
          : nextDecisionFile;
      })()
    : nextDecisionFile;
  const nextDecisionFileContent = JSON.stringify(stableDecisionFile, null, 2);
  const previousQueueMarkdownContent = await readOptionalFile(queueMarkdownPath);
  const nextQueueMarkdownContent = renderMarkdown(selectedDomain, proposalFile, stableDecisionFile);

  if (previousDecisionFileContent !== nextDecisionFileContent) {
    await writeFile(decisionFilePath, nextDecisionFileContent, "utf8");
  }
  if (previousQueueMarkdownContent !== nextQueueMarkdownContent) {
    await writeFile(queueMarkdownPath, nextQueueMarkdownContent, "utf8");
  }

  console.log(
    JSON.stringify(
      {
        domain: selectedDomain,
        benchmarkProposalCount: benchmarkProposals.length,
        pendingCount: stableDecisionFile.decisions.filter((decision) => decision.decision === "pending")
          .length
      },
      null,
      2
    )
  );
}

main(domain).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
