import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { applyProtocolOverrides, parseOverrideFile } from "../packages/normalize/src/overrides.js";
import {
  BenchmarkFileSchema,
  DomainIdSchema,
  ExtractionSnapshotSchema,
  type ExtractionSnapshot,
  type BenchmarkEntry,
  type DomainId,
  type OutcomeClass,
  type ProtocolPhase,
  type ProtocolOverride
} from "../packages/shared/src/schema.js";

const domain = DomainIdSchema.parse(process.argv[2] ?? "ovarian-tissue");

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
}

function uniqueSortedAs<T extends string>(values: T[]): T[] {
  return uniqueSorted(values) as T[];
}

function buildReviewedEntry(
  extractionByPaperId: Map<string, ExtractionSnapshot["extractions"][number]>,
  override: ProtocolOverride
): BenchmarkEntry {
  const extraction = extractionByPaperId.get(override.paperId);
  if (!extraction) {
    throw new Error(`Missing extraction for override paperId=${override.paperId}`);
  }

  return {
    paperId: extraction.paper.id,
    title: extraction.paper.title,
    reviewStatus: "reviewed",
    expectedInAtlas: !override.excludeFromAtlas,
    expectedPaperType: override.excludeFromAtlas ? undefined : override.paperType,
    expectedProtocolFamily: override.excludeFromAtlas ? undefined : override.protocolFamily,
    expectedSpeciesMentions:
      override.excludeFromAtlas || !override.speciesMentions ? undefined : uniqueSortedAs(override.speciesMentions),
    expectedSpecimenTypes:
      override.excludeFromAtlas || !override.specimenTypes ? undefined : uniqueSortedAs(override.specimenTypes),
    expectedOutcomeClasses:
      override.excludeFromAtlas || !override.outcomeMentions
        ? undefined
        : uniqueSortedAs(override.outcomeMentions.map((entry): OutcomeClass => entry.outcomeClass)),
    expectedStepPhases:
      override.excludeFromAtlas || !override.protocolSteps
        ? undefined
        : uniqueSortedAs(override.protocolSteps.map((step): ProtocolPhase => step.phase)),
    expectedOverridePatch: {
      paperId: override.paperId,
      ...(override.excludeFromAtlas ? { excludeFromAtlas: true } : {}),
      ...(override.paperType ? { paperType: override.paperType } : {}),
      ...(override.protocolFamily ? { protocolFamily: override.protocolFamily } : {}),
      ...(override.speciesMentions ? { speciesMentions: uniqueSortedAs(override.speciesMentions) } : {}),
      ...(override.specimenTypes ? { specimenTypes: uniqueSortedAs(override.specimenTypes) } : {}),
      ...(override.protocolSteps ? { protocolSteps: override.protocolSteps } : {}),
      ...(override.outcomeMentions ? { outcomeMentions: override.outcomeMentions } : {}),
      ...(override.extractionConfidence !== undefined
        ? { extractionConfidence: override.extractionConfidence }
        : {})
    },
    notes: override.notes
  };
}

function buildSeededEntry(extraction: ExtractionSnapshot["extractions"][number]): BenchmarkEntry {
  return {
    paperId: extraction.paper.id,
    title: extraction.paper.title,
    reviewStatus: "seeded",
    expectedInAtlas: true,
    expectedPaperType: extraction.paperType,
    expectedProtocolFamily: extraction.protocolFamily,
    expectedSpeciesMentions: uniqueSortedAs(extraction.speciesMentions),
    expectedSpecimenTypes: uniqueSortedAs(extraction.specimenTypes),
    expectedOutcomeClasses: uniqueSortedAs(
      extraction.outcomeMentions.map((entry): OutcomeClass => entry.outcomeClass)
    ),
    expectedStepPhases: uniqueSortedAs(extraction.protocolSteps.map((step): ProtocolPhase => step.phase)),
    notes: "Seeded from the current resolved atlas snapshot; upgrade to reviewed as full-text adjudication expands."
  };
}

async function main(selectedDomain: DomainId): Promise<void> {
  const processedDir = join(process.cwd(), "data", "processed", selectedDomain);
  const curatedDir = join(process.cwd(), "data", "curated", selectedDomain);
  const benchmarkDir = join(process.cwd(), "data", "benchmarks", selectedDomain);

  const extractionSnapshot = ExtractionSnapshotSchema.parse(
    JSON.parse(await readFile(join(processedDir, "extraction-snapshot.json"), "utf8"))
  );
  const overrideFile = parseOverrideFile(
    JSON.parse(await readFile(join(curatedDir, "protocol-overrides.json"), "utf8"))
  );
  const resolvedSnapshot = applyProtocolOverrides(extractionSnapshot, overrideFile);

  const extractionByPaperId = new Map(extractionSnapshot.extractions.map((extraction) => [extraction.paper.id, extraction]));
  const overrideByPaperId = new Map(overrideFile.overrides.map((override) => [override.paperId, override]));

  const entries: BenchmarkEntry[] = [
    ...overrideFile.overrides.map((override) => buildReviewedEntry(extractionByPaperId, override)),
    ...resolvedSnapshot.extractions
      .filter((extraction) => !overrideByPaperId.has(extraction.paper.id))
      .map((extraction) => buildSeededEntry(extraction))
  ].sort((left, right) => left.title.localeCompare(right.title));

  const benchmarkFile = BenchmarkFileSchema.parse({
    generatedAt: new Date().toISOString(),
    domain: selectedDomain,
    description:
      "Seed benchmark for the ovarian-tissue atlas. Reviewed entries come from explicit curation decisions; seeded entries are carried from the resolved atlas and should be upgraded to reviewed over time.",
    entries
  });

  await mkdir(benchmarkDir, { recursive: true });
  await writeFile(join(benchmarkDir, "gold-set.json"), JSON.stringify(benchmarkFile, null, 2), "utf8");

  console.log(
    JSON.stringify(
      {
        domain: selectedDomain,
        entryCount: benchmarkFile.entries.length,
        reviewedCount: benchmarkFile.entries.filter((entry) => entry.reviewStatus === "reviewed").length,
        seededCount: benchmarkFile.entries.filter((entry) => entry.reviewStatus === "seeded").length
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
