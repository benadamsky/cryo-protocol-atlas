import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseOverrideFile } from "../packages/normalize/src/overrides.js";
import { runAutoresearchLoop } from "../packages/research/src/autoresearch.js";
import {
  getDomain,
  parseDomainArg,
  type RegressionMutation,
  type RegressionScenario
} from "../packages/shared/src/domains/index.js";
import {
  BenchmarkFileSchema,
  ExtractionSnapshotSchema,
  ProtocolOverrideFileSchema,
  type DomainId,
  type ProtocolOverrideFile
} from "../packages/shared/src/schema.js";

const domain = parseDomainArg(process.argv[2], "regress-autoresearch <domain>");

type Scenario = RegressionScenario;

type ScenarioResult = {
  id: string;
  description: string;
  passed: boolean;
  proposalCount: number;
  proposalFound: boolean;
  matchedFields: string[];
  currentReviewedInclusionF1: number;
  candidateReviewedInclusionF1: number;
  currentReviewedProtocolFamilyAccuracy: number;
  candidateReviewedProtocolFamilyAccuracy: number;
  currentReviewedPaperTypeAccuracy: number;
  candidateReviewedPaperTypeAccuracy: number;
  currentReviewedOutcomeMacroF1: number;
  candidateReviewedOutcomeMacroF1: number;
  currentReviewedStepPhaseMacroF1: number;
  candidateReviewedStepPhaseMacroF1: number;
  autoApplySafe: boolean;
};

function cloneOverrideFile(overrideFile: ProtocolOverrideFile): ProtocolOverrideFile {
  return ProtocolOverrideFileSchema.parse(JSON.parse(JSON.stringify(overrideFile)));
}

function replaceOverride(
  overrideFile: ProtocolOverrideFile,
  paperId: string,
  patch: Record<string, unknown>
): ProtocolOverrideFile {
  return ProtocolOverrideFileSchema.parse({
    ...overrideFile,
    overrides: overrideFile.overrides.map((override) =>
      override.paperId === paperId ? { ...override, ...patch, paperId } : override
    )
  });
}

function removeOverride(overrideFile: ProtocolOverrideFile, paperId: string): ProtocolOverrideFile {
  return ProtocolOverrideFileSchema.parse({
    ...overrideFile,
    overrides: overrideFile.overrides.filter((override) => override.paperId !== paperId)
  });
}

function applyMutation(overrideFile: ProtocolOverrideFile, mutation: RegressionMutation): ProtocolOverrideFile {
  const clone = cloneOverrideFile(overrideFile);
  switch (mutation.kind) {
    case "remove-override":
      return removeOverride(clone, mutation.paperId);
    case "replace-override":
      return replaceOverride(clone, mutation.paperId, mutation.patch);
  }
}

function buildScenarios(selectedDomain: DomainId): Scenario[] {
  return getDomain(selectedDomain).regressionScenarios;
}

function renderMarkdown(results: ScenarioResult[]): string {
  const lines: string[] = [];
  lines.push(`# ${domain} autoresearch regression report`);
  lines.push("");

  for (const result of results) {
    lines.push(`## ${result.id}`);
    lines.push(`- description: ${result.description}`);
    lines.push(`- passed: ${result.passed ? "yes" : "no"}`);
    lines.push(`- proposal count: ${result.proposalCount}`);
    lines.push(`- proposal found: ${result.proposalFound ? "yes" : "no"}`);
    lines.push(`- matched fields: ${result.matchedFields.join(", ") || "none"}`);
    lines.push(
      `- reviewed inclusion F1: ${result.currentReviewedInclusionF1} -> ${result.candidateReviewedInclusionF1}`
    );
    lines.push(
      `- reviewed protocol family accuracy: ${result.currentReviewedProtocolFamilyAccuracy} -> ${result.candidateReviewedProtocolFamilyAccuracy}`
    );
    lines.push(
      `- reviewed paper type accuracy: ${result.currentReviewedPaperTypeAccuracy} -> ${result.candidateReviewedPaperTypeAccuracy}`
    );
    lines.push(
      `- reviewed outcome macro F1: ${result.currentReviewedOutcomeMacroF1} -> ${result.candidateReviewedOutcomeMacroF1}`
    );
    lines.push(
      `- reviewed step phase macro F1: ${result.currentReviewedStepPhaseMacroF1} -> ${result.candidateReviewedStepPhaseMacroF1}`
    );
    lines.push(`- auto-apply safe: ${result.autoApplySafe ? "yes" : "no"}`);
    lines.push("");
  }

  return lines.join("\n");
}

function assertScenario(result: ScenarioResult, scenario: Scenario): boolean {
  if (!result.proposalFound) {
    return false;
  }

  if (!scenario.expectedFields.every((field) => result.matchedFields.includes(field))) {
    return false;
  }

  if (
    scenario.minReviewedInclusionF1Delta !== undefined &&
    result.candidateReviewedInclusionF1 - result.currentReviewedInclusionF1 < scenario.minReviewedInclusionF1Delta
  ) {
    return false;
  }

  if (
    scenario.minReviewedProtocolFamilyAccuracyDelta !== undefined &&
    result.candidateReviewedProtocolFamilyAccuracy - result.currentReviewedProtocolFamilyAccuracy <
      scenario.minReviewedProtocolFamilyAccuracyDelta
  ) {
    return false;
  }

  if (
    scenario.minReviewedPaperTypeAccuracyDelta !== undefined &&
    result.candidateReviewedPaperTypeAccuracy - result.currentReviewedPaperTypeAccuracy <
      scenario.minReviewedPaperTypeAccuracyDelta
  ) {
    return false;
  }

  if (
    scenario.minReviewedOutcomeMacroF1Delta !== undefined &&
    result.candidateReviewedOutcomeMacroF1 - result.currentReviewedOutcomeMacroF1 <
      scenario.minReviewedOutcomeMacroF1Delta
  ) {
    return false;
  }

  if (
    scenario.minReviewedStepPhaseMacroF1Delta !== undefined &&
    result.candidateReviewedStepPhaseMacroF1 - result.currentReviewedStepPhaseMacroF1 <
      scenario.minReviewedStepPhaseMacroF1Delta
  ) {
    return false;
  }

  return result.autoApplySafe;
}

async function main(selectedDomain: DomainId): Promise<void> {
  const processedDir = join(process.cwd(), "data", "processed", selectedDomain);
  const curatedDir = join(process.cwd(), "data", "curated", selectedDomain);
  const benchmarkDir = join(process.cwd(), "data", "benchmarks", selectedDomain);
  const loopDir = join(process.cwd(), "data", "autoresearch", selectedDomain);

  const extractionSnapshot = ExtractionSnapshotSchema.parse(
    JSON.parse(await readFile(join(processedDir, "extraction-snapshot.json"), "utf8"))
  );
  const benchmark = BenchmarkFileSchema.parse(
    JSON.parse(await readFile(join(benchmarkDir, "gold-set.json"), "utf8"))
  );
  const overrideFile = parseOverrideFile(
    JSON.parse(await readFile(join(curatedDir, "protocol-overrides.json"), "utf8"))
  );

  const results: ScenarioResult[] = buildScenarios(selectedDomain).map((scenario) => {
    const perturbedOverrideFile = applyMutation(overrideFile, scenario.mutation);
    const loopResult = runAutoresearchLoop(extractionSnapshot, benchmark, perturbedOverrideFile);
    const proposal =
      loopResult.proposalFile.proposals.find(
        (candidate) =>
          candidate.paperId === scenario.expectedPaperId &&
          scenario.expectedFields.every((field) => candidate.fields.includes(field))
      ) ??
      loopResult.proposalFile.proposals.find((candidate) => candidate.paperId === scenario.expectedPaperId);
    const matchedFields = proposal ? proposal.fields.slice().sort((a, b) => a.localeCompare(b)) : [];

    const result: ScenarioResult = {
      id: scenario.id,
      description: scenario.description,
      passed: false,
      proposalCount: loopResult.proposalFile.proposalCount,
      proposalFound: Boolean(proposal),
      matchedFields,
      currentReviewedInclusionF1: loopResult.currentEvaluation.subsets.reviewed.inclusion.f1,
      candidateReviewedInclusionF1: loopResult.candidateEvaluation.subsets.reviewed.inclusion.f1,
      currentReviewedProtocolFamilyAccuracy:
        loopResult.currentEvaluation.subsets.reviewed.exactFields.protocolFamily.accuracy,
      candidateReviewedProtocolFamilyAccuracy:
        loopResult.candidateEvaluation.subsets.reviewed.exactFields.protocolFamily.accuracy,
      currentReviewedPaperTypeAccuracy:
        loopResult.currentEvaluation.subsets.reviewed.exactFields.paperType.accuracy,
      candidateReviewedPaperTypeAccuracy:
        loopResult.candidateEvaluation.subsets.reviewed.exactFields.paperType.accuracy,
      currentReviewedOutcomeMacroF1:
        loopResult.currentEvaluation.subsets.reviewed.setFields.outcomeClasses.averageF1,
      candidateReviewedOutcomeMacroF1:
        loopResult.candidateEvaluation.subsets.reviewed.setFields.outcomeClasses.averageF1,
      currentReviewedStepPhaseMacroF1:
        loopResult.currentEvaluation.subsets.reviewed.setFields.stepPhases.averageF1,
      candidateReviewedStepPhaseMacroF1:
        loopResult.candidateEvaluation.subsets.reviewed.setFields.stepPhases.averageF1,
      autoApplySafe: loopResult.autoApplySafe
    };

    result.passed = assertScenario(result, scenario);
    return result;
  });

  await mkdir(loopDir, { recursive: true });
  await writeFile(join(loopDir, "regression-analysis.json"), JSON.stringify(results, null, 2), "utf8");
  await writeFile(join(loopDir, "regression-report.md"), renderMarkdown(results), "utf8");

  const failed = results.filter((result) => !result.passed);
  if (failed.length > 0) {
    console.error(JSON.stringify({ domain: selectedDomain, failedScenarioIds: failed.map((entry) => entry.id) }, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(
    JSON.stringify(
      {
        domain: selectedDomain,
        scenarioCount: results.length,
        passedScenarioIds: results.filter((result) => result.passed).map((result) => result.id)
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
