import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  AutoresearchProposalFileSchema,
  BenchmarkProposalDecisionFileSchema,
  DomainIdSchema,
  type DomainId
} from "../packages/shared/src/schema.js";

const domain = DomainIdSchema.parse(process.argv[2] ?? "ovarian-tissue");
const MIN_AUTOPROMOTE_POLICY_CONFIDENCE = 0.9;

async function main(selectedDomain: DomainId): Promise<void> {
  const loopDir = join(process.cwd(), "data", "autoresearch", selectedDomain);
  const proposalFile = AutoresearchProposalFileSchema.parse(
    JSON.parse(await readFile(join(loopDir, "proposal-file.json"), "utf8"))
  );
  const decisionFile = BenchmarkProposalDecisionFileSchema.parse(
    JSON.parse(await readFile(join(loopDir, "benchmark-review-decisions.json"), "utf8"))
  );

  const proposalById = new Map(proposalFile.proposals.map((proposal) => [proposal.proposalId, proposal]));

  const autoAcceptedProposalIds: string[] = [];
  const nextDecisionFile = BenchmarkProposalDecisionFileSchema.parse({
    ...decisionFile,
    generatedAt: new Date().toISOString(),
    decisions: decisionFile.decisions.map((decision) => {
      if (decision.decision !== "pending") {
        return decision;
      }

      const proposal = proposalById.get(decision.proposalId);
      if (
        !proposal ||
        proposal.target !== "benchmark" ||
        proposal.reviewRecommendation?.recommendedDecision !== "accept" ||
        proposal.reviewRecommendation.policyConfidence < MIN_AUTOPROMOTE_POLICY_CONFIDENCE
      ) {
        return decision;
      }

      autoAcceptedProposalIds.push(proposal.proposalId);
      return {
        ...decision,
        decision: "accept",
        reviewerNotes: `Auto-accepted by conservative policy at confidence ${proposal.reviewRecommendation.policyConfidence}.`,
        decidedAt: new Date().toISOString()
      };
    })
  });

  await writeFile(
    join(loopDir, "benchmark-review-decisions.json"),
    JSON.stringify(nextDecisionFile, null, 2),
    "utf8"
  );

  if (autoAcceptedProposalIds.length > 0) {
    execFileSync(process.execPath, ["--import", "tsx", "scripts/apply-benchmark-review.ts", selectedDomain], {
      cwd: process.cwd(),
      stdio: "inherit"
    });
    execFileSync(
      process.execPath,
      ["--import", "tsx", "scripts/run-autoresearch-loop.ts", selectedDomain, "--apply"],
      {
        cwd: process.cwd(),
        stdio: "inherit"
      }
    );
    execFileSync(process.execPath, ["--import", "tsx", "scripts/run-autoresearch-loop.ts", selectedDomain], {
      cwd: process.cwd(),
      stdio: "inherit"
    });
    execFileSync(
      process.execPath,
      ["--import", "tsx", "scripts/build-benchmark-review-queue.ts", selectedDomain],
      {
        cwd: process.cwd(),
        stdio: "inherit"
      }
    );
  }

  console.log(
    JSON.stringify(
      {
        domain: selectedDomain,
        autoAcceptedProposalCount: autoAcceptedProposalIds.length,
        autoAcceptedProposalIds
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
