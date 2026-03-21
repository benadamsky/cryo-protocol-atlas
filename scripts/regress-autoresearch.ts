import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseOverrideFile } from "../packages/normalize/src/overrides.js";
import { runAutoresearchLoop } from "../packages/research/src/autoresearch.js";
import {
  BenchmarkFileSchema,
  DomainIdSchema,
  ExtractionSnapshotSchema,
  ProtocolOverrideFileSchema,
  type DomainId,
  type ProtocolOverrideFile,
  type ProposalField
} from "../packages/shared/src/schema.js";

const domain = DomainIdSchema.parse(process.argv[2] ?? "ovarian-tissue");

type Scenario = {
  id: string;
  description: string;
  mutate: (overrideFile: ProtocolOverrideFile) => ProtocolOverrideFile;
  expectedPaperId: string;
  expectedFields: ProposalField[];
  minReviewedInclusionF1Delta?: number;
  minReviewedProtocolFamilyAccuracyDelta?: number;
  minReviewedPaperTypeAccuracyDelta?: number;
  minReviewedOutcomeMacroF1Delta?: number;
  minReviewedStepPhaseMacroF1Delta?: number;
};

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

function buildScenarios(selectedDomain: DomainId): Scenario[] {
  if (selectedDomain === "islets") {
    return [
      {
        id: "reviewed-exclusion-regression",
        description: "Remove a reviewed exclusion so a non-primary methods paper leaks back into the islet atlas.",
      mutate: (overrideFile) => removeOverride(cloneOverrideFile(overrideFile), "beb603fe-8522-4842-99a9-fba1195cc973"),
      expectedPaperId: "beb603fe-8522-4842-99a9-fba1195cc973",
      expectedFields: ["excludeFromAtlas"],
        minReviewedInclusionF1Delta: 0.01
      },
      {
        id: "reviewed-family-type-regression",
        description: "Corrupt reviewed family/type labels for a known comparative islet preservation paper.",
        mutate: (overrideFile) =>
          replaceOverride(cloneOverrideFile(overrideFile), "f557f75c-4101-43d0-8f0e-66ea6a6f0515", {
            paperType: "unknown",
            protocolFamily: "unknown"
          }),
        expectedPaperId: "f557f75c-4101-43d0-8f0e-66ea6a6f0515",
        expectedFields: ["paperType", "protocolFamily"],
        minReviewedProtocolFamilyAccuracyDelta: 0.02,
        minReviewedPaperTypeAccuracyDelta: 0.02
      },
      {
        id: "reviewed-specimen-regression",
        description: "Drop reviewed encapsulated-islet context from a graft-function study.",
        mutate: (overrideFile) =>
          replaceOverride(cloneOverrideFile(overrideFile), "04d69565-e62e-4dc8-9ba3-a9ae6f5832ff", {
            specimenTypes: ["islets", "pancreatic islets"]
          }),
        expectedPaperId: "04d69565-e62e-4dc8-9ba3-a9ae6f5832ff",
        expectedFields: ["specimenTypes"]
      },
      {
        id: "reviewed-outcome-regression",
        description: "Corrupt reviewed outcome classes for a cryostored encapsulated-islet graft study.",
        mutate: (overrideFile) =>
          replaceOverride(cloneOverrideFile(overrideFile), "04d69565-e62e-4dc8-9ba3-a9ae6f5832ff", {
            outcomeMentions: []
          }),
        expectedPaperId: "04d69565-e62e-4dc8-9ba3-a9ae6f5832ff",
        expectedFields: ["outcomeClasses"],
        minReviewedOutcomeMacroF1Delta: 0.05
      },
      {
        id: "reviewed-step-phase-regression",
        description: "Corrupt reviewed protocol step phases for a vitrification-versus-freezing comparison paper.",
        mutate: (overrideFile) =>
          replaceOverride(cloneOverrideFile(overrideFile), "f557f75c-4101-43d0-8f0e-66ea6a6f0515", {
            protocolSteps: [
              {
                order: 0,
                phase: "unknown",
                summary: "Corrupted regression step",
                chemicals: [],
                concentrations: [],
                temperatures: [],
                durations: [],
                evidence: []
              }
            ]
          }),
        expectedPaperId: "f557f75c-4101-43d0-8f0e-66ea6a6f0515",
        expectedFields: ["stepPhases"],
        minReviewedStepPhaseMacroF1Delta: 0.05
      }
    ];
  }

  return [
    {
      id: "reviewed-exclusion-regression",
      description: "Remove a reviewed exclusion so an out-of-slice paper leaks back into the atlas.",
      mutate: (overrideFile) => removeOverride(cloneOverrideFile(overrideFile), "e6aaf317-52fc-441c-bac4-5143fbb9e54c"),
      expectedPaperId: "e6aaf317-52fc-441c-bac4-5143fbb9e54c",
      expectedFields: ["excludeFromAtlas"],
      minReviewedInclusionF1Delta: 0.05
    },
    {
      id: "reviewed-family-type-regression",
      description: "Corrupt reviewed family/type labels for a known vitrification paper.",
      mutate: (overrideFile) =>
        replaceOverride(cloneOverrideFile(overrideFile), "f24fdc26-2071-4ae1-86d6-fa70a17a9574", {
          paperType: "unknown",
          protocolFamily: "unknown"
        }),
      expectedPaperId: "f24fdc26-2071-4ae1-86d6-fa70a17a9574",
      expectedFields: ["paperType", "protocolFamily"],
      minReviewedProtocolFamilyAccuracyDelta: 0.1,
      minReviewedPaperTypeAccuracyDelta: 0.1
    },
    {
      id: "reviewed-specimen-regression",
      description: "Drop reviewed whole-ovary context from a sheep autotransplantation paper.",
      mutate: (overrideFile) =>
        replaceOverride(cloneOverrideFile(overrideFile), "f9a6ac96-9b1f-406a-8e16-bc05e1a6b857", {
          specimenTypes: ["ovarian tissue"]
        }),
      expectedPaperId: "f9a6ac96-9b1f-406a-8e16-bc05e1a6b857",
      expectedFields: ["specimenTypes"]
    },
    {
      id: "reviewed-outcome-regression",
      description: "Corrupt reviewed outcome classes for a human ovarian tissue vitrification paper.",
      mutate: (overrideFile) =>
        replaceOverride(cloneOverrideFile(overrideFile), "f24fdc26-2071-4ae1-86d6-fa70a17a9574", {
          outcomeMentions: []
        }),
      expectedPaperId: "f24fdc26-2071-4ae1-86d6-fa70a17a9574",
      expectedFields: ["outcomeClasses"],
      minReviewedOutcomeMacroF1Delta: 0.3
    },
    {
      id: "reviewed-step-phase-regression",
      description: "Corrupt reviewed protocol step phases for a closed-system vitrification paper.",
      mutate: (overrideFile) =>
        replaceOverride(cloneOverrideFile(overrideFile), "eb7b902b-87b7-4169-8058-8818dfa71c48", {
          protocolSteps: [
            {
              order: 0,
              phase: "unknown",
              summary: "Corrupted regression step",
              chemicals: [],
              concentrations: [],
              temperatures: [],
              durations: [],
              evidence: []
            }
          ]
        }),
      expectedPaperId: "eb7b902b-87b7-4169-8058-8818dfa71c48",
      expectedFields: ["stepPhases"],
      minReviewedStepPhaseMacroF1Delta: 0.2
    }
  ];
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
    const perturbedOverrideFile = scenario.mutate(overrideFile);
    const loopResult = runAutoresearchLoop(extractionSnapshot, benchmark, perturbedOverrideFile);
    const proposal = loopResult.proposalFile.proposals.find((candidate) => candidate.paperId === scenario.expectedPaperId);
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
