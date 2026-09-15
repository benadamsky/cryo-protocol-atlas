import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseDomainArg } from "../packages/shared/src/domains/index.js";
import {
  AutoresearchProposalFileSchema,
  BenchmarkFileSchema,
  BenchmarkProposalDecisionSchema,
  BenchmarkProposalDecisionFileSchema,
  type OutcomeClass,
  type OutcomeMention,
  type BenchmarkEntry,
  type BenchmarkProposalDecision,
  type DomainId
} from "../packages/shared/src/schema.js";

const domain = parseDomainArg(process.argv[2], "apply-benchmark-review <domain>");

function mergeNotes(existingNotes: string | undefined, proposalId: string): string {
  const patchNote = `Accepted benchmark autofill proposal ${proposalId}.`;
  if (!existingNotes) {
    return patchNote;
  }

  return existingNotes.includes(patchNote) ? existingNotes : `${existingNotes} ${patchNote}`;
}

function buildCanonicalOutcomeMentions(outcomeClasses: OutcomeClass[]): OutcomeMention[] {
  return outcomeClasses.map((outcomeClass) => ({
    outcomeClass,
    strength: "moderate",
    summary: `Reviewed benchmark autofill accepted for outcome class: ${outcomeClass}.`,
    evidence: []
  }));
}

function applyAcceptedProposal(
  entry: BenchmarkEntry,
  proposal: ReturnType<typeof AutoresearchProposalFileSchema.parse>["proposals"][number],
  decision: BenchmarkProposalDecision
): BenchmarkEntry {
  if (!proposal.benchmarkPatch) {
    return entry;
  }

  const acceptedOutcomeClasses =
    decision.acceptedOutcomeClasses ??
    proposal.benchmarkPatch.expectedOutcomeClasses ??
    entry.expectedOutcomeClasses ??
    [];
  const acceptedStepPhases =
    decision.acceptedStepPhases ??
    proposal.benchmarkPatch.expectedStepPhases ??
    entry.expectedStepPhases ??
    [];
  const existingOverridePatch = entry.expectedOverridePatch ?? { paperId: entry.paperId };
  const canonicalOverridePatch = {
    ...existingOverridePatch,
    ...(acceptedOutcomeClasses.length > 0
      ? { outcomeMentions: buildCanonicalOutcomeMentions(acceptedOutcomeClasses) }
      : {}),
    ...(acceptedStepPhases.length > 0
      ? {
          protocolSteps: acceptedStepPhases.map((phase, index) => ({
            order: index,
            phase,
            summary: `Reviewed benchmark autofill accepted for protocol phase: ${phase}.`,
            chemicals: [],
            concentrations: [],
            temperatures: [],
            durations: [],
            evidence: []
          }))
        }
      : {})
  };

  return {
    ...entry,
    expectedOutcomeClasses: acceptedOutcomeClasses.length > 0 ? acceptedOutcomeClasses : entry.expectedOutcomeClasses,
    expectedStepPhases: acceptedStepPhases.length > 0 ? acceptedStepPhases : entry.expectedStepPhases,
    expectedOverridePatch: canonicalOverridePatch,
    notes: mergeNotes(entry.notes, proposal.proposalId)
  };
}

function renderMarkdown(
  domainId: DomainId,
  proposalFile: ReturnType<typeof AutoresearchProposalFileSchema.parse>,
  acceptedProposalIds: string[],
  rejectedProposalIds: string[],
  deferredProposalIds: string[]
): string {
  const lines: string[] = [];
  lines.push(`# ${domainId} benchmark review apply`);
  lines.push("");
  lines.push(`Accepted proposals: ${acceptedProposalIds.length}`);
  lines.push(`Rejected proposals: ${rejectedProposalIds.length}`);
  lines.push(`Deferred proposals: ${deferredProposalIds.length}`);
  lines.push("");

  if (acceptedProposalIds.length > 0) {
    lines.push("## Accepted");
    for (const proposalId of acceptedProposalIds) {
      const proposal = proposalFile.proposals.find((candidate) => candidate.proposalId === proposalId);
      if (!proposal) {
        continue;
      }
      lines.push(
        `- ${proposal.title} | fields=${proposal.fields.join(", ")} | confidence=${proposal.proposalConfidence}`
      );
    }
    lines.push("");
  }

  if (rejectedProposalIds.length > 0) {
    lines.push("## Rejected");
    for (const proposalId of rejectedProposalIds) {
      const proposal = proposalFile.proposals.find((candidate) => candidate.proposalId === proposalId);
      if (!proposal) {
        continue;
      }
      lines.push(`- ${proposal.title} | fields=${proposal.fields.join(", ")}`);
    }
    lines.push("");
  }

  if (deferredProposalIds.length > 0) {
    lines.push("## Deferred");
    for (const proposalId of deferredProposalIds) {
      const proposal = proposalFile.proposals.find((candidate) => candidate.proposalId === proposalId);
      if (!proposal) {
        continue;
      }
      lines.push(`- ${proposal.title} | fields=${proposal.fields.join(", ")}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function main(selectedDomain: DomainId): Promise<void> {
  const benchmarkDir = join(process.cwd(), "data", "benchmarks", selectedDomain);
  const loopDir = join(process.cwd(), "data", "autoresearch", selectedDomain);

  const benchmarkFile = BenchmarkFileSchema.parse(
    JSON.parse(await readFile(join(benchmarkDir, "gold-set.json"), "utf8"))
  );
  const proposalFile = AutoresearchProposalFileSchema.parse(
    JSON.parse(await readFile(join(loopDir, "proposal-file.json"), "utf8"))
  );
  const decisionFile = BenchmarkProposalDecisionFileSchema.parse(
    JSON.parse(await readFile(join(loopDir, "benchmark-review-decisions.json"), "utf8"))
  );

  const proposalById = new Map(
    proposalFile.proposals
      .filter((proposal) => proposal.target === "benchmark")
      .map((proposal) => [proposal.proposalId, proposal])
  );

  const acceptedProposalIds = decisionFile.decisions
    .filter((decision) => decision.decision === "accept")
    .map((decision) => decision.proposalId)
    .filter((proposalId) => proposalById.has(proposalId));
  const rejectedProposalIds = decisionFile.decisions
    .filter((decision) => decision.decision === "reject")
    .map((decision) => decision.proposalId)
    .filter((proposalId) => proposalById.has(proposalId));
  const deferredProposalIds = decisionFile.decisions
    .filter((decision) => decision.decision === "defer" || decision.decision === "pending")
    .map((decision) => decision.proposalId)
    .filter((proposalId) => proposalById.has(proposalId));

  const acceptedSet = new Set(acceptedProposalIds);
  const acceptedDecisionByProposalId = new Map(
    decisionFile.decisions
      .filter((decision) => decision.decision === "accept")
      .map((decision) => [decision.proposalId, BenchmarkProposalDecisionSchema.parse(decision)])
  );
  const nextBenchmark =
    acceptedProposalIds.length === 0
      ? benchmarkFile
      : BenchmarkFileSchema.parse({
          ...benchmarkFile,
          generatedAt: new Date().toISOString(),
          entries: benchmarkFile.entries.map((entry) => {
            const acceptedProposal = proposalFile.proposals.find(
              (proposal) => proposal.paperId === entry.paperId && acceptedSet.has(proposal.proposalId)
            );
            if (!acceptedProposal) {
              return entry;
            }

            const acceptedDecision = acceptedDecisionByProposalId.get(acceptedProposal.proposalId);
            return acceptedDecision
              ? applyAcceptedProposal(entry, acceptedProposal, acceptedDecision)
              : entry;
          })
        });

  await mkdir(loopDir, { recursive: true });
  if (acceptedProposalIds.length > 0) {
    await writeFile(join(benchmarkDir, "gold-set.json"), JSON.stringify(nextBenchmark, null, 2), "utf8");
  }
  await writeFile(
    join(loopDir, "benchmark-review-apply-report.md"),
    renderMarkdown(selectedDomain, proposalFile, acceptedProposalIds, rejectedProposalIds, deferredProposalIds),
    "utf8"
  );

  if (acceptedProposalIds.length > 0) {
    execFileSync(process.execPath, ["--import", "tsx", "scripts/evaluate-domain.ts", selectedDomain], {
      cwd: process.cwd(),
      stdio: "inherit"
    });
    execFileSync(process.execPath, ["--import", "tsx", "scripts/run-autoresearch-loop.ts", selectedDomain], {
      cwd: process.cwd(),
      stdio: "inherit"
    });
  }

  console.log(
    JSON.stringify(
      {
        domain: selectedDomain,
        acceptedProposalCount: acceptedProposalIds.length,
        rejectedProposalCount: rejectedProposalIds.length,
        deferredProposalCount: deferredProposalIds.length,
        applied: acceptedProposalIds.length > 0
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
