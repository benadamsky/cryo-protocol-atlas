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

function renderLoopMarkdown(result: ReturnType<typeof runAutoresearchLoop>): string {
  const lines: string[] = [];
  lines.push(`# ${result.proposalFile.domain} autoresearch loop`);
  lines.push("");
  lines.push(`Proposals generated: ${result.proposalFile.proposalCount}`);
  lines.push(`Auto-apply safe: ${result.autoApplySafe ? "yes" : "no"}`);
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
  lines.push("");
  lines.push("## Proposals");

  if (result.proposalFile.proposals.length === 0) {
    lines.push("- none; current resolved atlas is already aligned with the reviewed benchmark");
  } else {
    for (const proposal of result.proposalFile.proposals) {
      lines.push(
        `- ${proposal.action} | ${proposal.title} | fields=${proposal.fields.join(", ")}`
      );
      lines.push(`  rationale=${proposal.rationale}`);
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

  await mkdir(loopDir, { recursive: true });
  await writeFile(join(loopDir, "proposal-file.json"), JSON.stringify(result.proposalFile, null, 2), "utf8");
  await writeFile(
    join(loopDir, "loop-analysis.json"),
    JSON.stringify(
      {
        domain: selectedDomain,
        autoApplySafe: result.autoApplySafe,
        currentEvaluation: result.currentEvaluation,
        candidateEvaluation: result.candidateEvaluation,
        proposalCount: result.proposalFile.proposalCount,
        candidateOverrideCount: result.candidateOverrideCount
      },
      null,
      2
    ),
    "utf8"
  );
  await writeFile(join(loopDir, "loop-report.md"), renderLoopMarkdown(result), "utf8");

  if (shouldApply && result.autoApplySafe && result.proposalFile.proposals.length > 0) {
    const nextOverrideFile = mergeProtocolOverrides(
      overrideFile,
      result.proposalFile.proposals.map((proposal) => proposal.override)
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
        autoApplySafe: result.autoApplySafe,
        applied: shouldApply && result.autoApplySafe && result.proposalFile.proposals.length > 0,
        reviewedInclusionF1: result.currentEvaluation.subsets.reviewed.inclusion.f1,
        candidateReviewedInclusionF1: result.candidateEvaluation.subsets.reviewed.inclusion.f1
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
