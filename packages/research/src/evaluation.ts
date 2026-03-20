import type {
  BenchmarkEntry,
  BenchmarkFile,
  ExtractionSnapshot,
  OutcomeClass,
  PaperType,
  ProtocolExtraction,
  ProtocolFamily,
  ProtocolPhase
} from "../../shared/src/schema.js";

type ConfusionCounts = {
  truePositive: number;
  trueNegative: number;
  falsePositive: number;
  falseNegative: number;
};

type BinaryMetrics = ConfusionCounts & {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
};

type ExactFieldMetrics<T extends string> = {
  field: string;
  labeledCount: number;
  exactMatchCount: number;
  accuracy: number;
  mismatches: Array<{
    paperId: string;
    title: string;
    expected: T;
    actual: T | null;
  }>;
};

type SetFieldMetrics<T extends string> = {
  field: string;
  labeledCount: number;
  exactMatchCount: number;
  averageF1: number;
  averagePrecision: number;
  averageRecall: number;
  mismatches: Array<{
    paperId: string;
    title: string;
    expected: T[];
    actual: T[];
    f1: number;
  }>;
};

export type BenchmarkSubsetMetrics = {
  subset: "all" | "reviewed" | "seeded";
  entryCount: number;
  inclusion: BinaryMetrics;
  exactFields: {
    paperType: ExactFieldMetrics<PaperType>;
    protocolFamily: ExactFieldMetrics<ProtocolFamily>;
  };
  setFields: {
    speciesMentions: SetFieldMetrics<string>;
    specimenTypes: SetFieldMetrics<string>;
    outcomeClasses: SetFieldMetrics<OutcomeClass>;
    stepPhases: SetFieldMetrics<ProtocolPhase>;
  };
  confidence: {
    averageOnExpectedIncluded: number | null;
    averageOnCorrectIncluded: number | null;
    averageOnIncorrectIncluded: number | null;
  };
  unexpectedIncludedPaperIds: string[];
  unexpectedExcludedPaperIds: string[];
};

export type BenchmarkGate = {
  name: string;
  passed: boolean;
  actual: number;
  threshold: number;
  comparator: ">=" | "<=";
  notes: string;
};

export type BenchmarkEvaluation = {
  domain: string;
  generatedAt: string;
  benchmarkDescription: string;
  benchmarkEntryCount: number;
  subsets: {
    all: BenchmarkSubsetMetrics;
    reviewed: BenchmarkSubsetMetrics;
    seeded: BenchmarkSubsetMetrics;
  };
  gates: BenchmarkGate[];
  summary: {
    passesAllGates: boolean;
    reviewedInclusionF1DeltaVsAll: number;
  };
};

function round(value: number): number {
  return Number(value.toFixed(3));
}

function makeBinaryMetrics(counts: ConfusionCounts): BinaryMetrics {
  const total = counts.truePositive + counts.trueNegative + counts.falsePositive + counts.falseNegative;
  const precisionDenominator = counts.truePositive + counts.falsePositive;
  const recallDenominator = counts.truePositive + counts.falseNegative;
  const precision = precisionDenominator === 0 ? 0 : counts.truePositive / precisionDenominator;
  const recall = recallDenominator === 0 ? 0 : counts.truePositive / recallDenominator;
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  return {
    ...counts,
    accuracy: total === 0 ? 0 : round((counts.truePositive + counts.trueNegative) / total),
    precision: round(precision),
    recall: round(recall),
    f1: round(f1)
  };
}

function normalizeStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
}

function setMetrics(expected: string[], actual: string[]) {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  const overlap = actual.filter((value) => expectedSet.has(value)).length;
  const precision = actual.length === 0 ? 0 : overlap / actual.length;
  const recall = expected.length === 0 ? 1 : overlap / expected.length;
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  const exactMatch =
    expected.length === actual.length && expected.every((value, index) => value === actual[index]);

  return {
    exactMatch,
    precision: round(precision),
    recall: round(recall),
    f1: round(f1)
  };
}

function uniqueOutcomeClasses(extraction: ProtocolExtraction): OutcomeClass[] {
  return normalizeStrings(
    extraction.outcomeMentions.map((entry) => entry.outcomeClass)
  ) as OutcomeClass[];
}

function uniqueStepPhases(extraction: ProtocolExtraction): ProtocolPhase[] {
  return normalizeStrings(extraction.protocolSteps.map((step) => step.phase)) as ProtocolPhase[];
}

function evaluateExactField<T extends string>(
  entries: BenchmarkEntry[],
  byPaperId: Map<string, ProtocolExtraction>,
  field: string,
  getExpected: (entry: BenchmarkEntry) => T | undefined,
  getActual: (extraction: ProtocolExtraction) => T
): ExactFieldMetrics<T> {
  const mismatches: ExactFieldMetrics<T>["mismatches"] = [];
  let labeledCount = 0;
  let exactMatchCount = 0;

  for (const entry of entries) {
    if (!entry.expectedInAtlas) {
      continue;
    }

    const expected = getExpected(entry);
    if (expected === undefined) {
      continue;
    }

    labeledCount += 1;
    const extraction = byPaperId.get(entry.paperId);
    const actual = extraction ? getActual(extraction) : null;
    const matched = actual === expected;

    if (matched) {
      exactMatchCount += 1;
      continue;
    }

    mismatches.push({
      paperId: entry.paperId,
      title: entry.title,
      expected,
      actual
    });
  }

  return {
    field,
    labeledCount,
    exactMatchCount,
    accuracy: labeledCount === 0 ? 0 : round(exactMatchCount / labeledCount),
    mismatches: mismatches.slice(0, 20)
  };
}

function evaluateSetField<T extends string>(
  entries: BenchmarkEntry[],
  byPaperId: Map<string, ProtocolExtraction>,
  field: string,
  getExpected: (entry: BenchmarkEntry) => T[] | undefined,
  getActual: (extraction: ProtocolExtraction) => T[]
): SetFieldMetrics<T> {
  const mismatches: SetFieldMetrics<T>["mismatches"] = [];
  let labeledCount = 0;
  let exactMatchCount = 0;
  let precisionSum = 0;
  let recallSum = 0;
  let f1Sum = 0;

  for (const entry of entries) {
    if (!entry.expectedInAtlas) {
      continue;
    }

    const expected = getExpected(entry);
    if (!expected) {
      continue;
    }

    labeledCount += 1;
    const normalizedExpected = normalizeStrings(expected) as T[];
    const extraction = byPaperId.get(entry.paperId);
    const actual = extraction ? (normalizeStrings(getActual(extraction)) as T[]) : ([] as T[]);
    const metrics = setMetrics(normalizedExpected, actual);

    precisionSum += metrics.precision;
    recallSum += metrics.recall;
    f1Sum += metrics.f1;

    if (metrics.exactMatch) {
      exactMatchCount += 1;
      continue;
    }

    mismatches.push({
      paperId: entry.paperId,
      title: entry.title,
      expected: normalizedExpected,
      actual,
      f1: metrics.f1
    });
  }

  return {
    field,
    labeledCount,
    exactMatchCount,
    averageF1: labeledCount === 0 ? 0 : round(f1Sum / labeledCount),
    averagePrecision: labeledCount === 0 ? 0 : round(precisionSum / labeledCount),
    averageRecall: labeledCount === 0 ? 0 : round(recallSum / labeledCount),
    mismatches: mismatches.sort((a, b) => a.f1 - b.f1 || a.title.localeCompare(b.title)).slice(0, 20)
  };
}

function average(values: number[]): number | null {
  return values.length === 0 ? null : round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function evaluateSubset(
  subset: "all" | "reviewed" | "seeded",
  entries: BenchmarkEntry[],
  snapshot: ExtractionSnapshot
): BenchmarkSubsetMetrics {
  const byPaperId = new Map(snapshot.extractions.map((extraction) => [extraction.paper.id, extraction]));
  const confusion: ConfusionCounts = {
    truePositive: 0,
    trueNegative: 0,
    falsePositive: 0,
    falseNegative: 0
  };
  const unexpectedIncludedPaperIds: string[] = [];
  const unexpectedExcludedPaperIds: string[] = [];
  const expectedIncludedConfidences: number[] = [];
  const correctIncludedConfidences: number[] = [];
  const incorrectIncludedConfidences: number[] = [];

  for (const entry of entries) {
    const predicted = byPaperId.get(entry.paperId);
    const predictedInAtlas = Boolean(predicted);

    if (entry.expectedInAtlas && predictedInAtlas) {
      confusion.truePositive += 1;
      expectedIncludedConfidences.push(predicted!.extractionConfidence);
      correctIncludedConfidences.push(predicted!.extractionConfidence);
      continue;
    }

    if (!entry.expectedInAtlas && !predictedInAtlas) {
      confusion.trueNegative += 1;
      continue;
    }

    if (!entry.expectedInAtlas && predictedInAtlas) {
      confusion.falsePositive += 1;
      unexpectedIncludedPaperIds.push(entry.paperId);
      incorrectIncludedConfidences.push(predicted!.extractionConfidence);
      continue;
    }

    confusion.falseNegative += 1;
    unexpectedExcludedPaperIds.push(entry.paperId);
  }

  return {
    subset,
    entryCount: entries.length,
    inclusion: makeBinaryMetrics(confusion),
    exactFields: {
      paperType: evaluateExactField(entries, byPaperId, "paperType", (entry) => entry.expectedPaperType, (extraction) => extraction.paperType),
      protocolFamily: evaluateExactField(
        entries,
        byPaperId,
        "protocolFamily",
        (entry) => entry.expectedProtocolFamily,
        (extraction) => extraction.protocolFamily
      )
    },
    setFields: {
      speciesMentions: evaluateSetField(
        entries,
        byPaperId,
        "speciesMentions",
        (entry) => entry.expectedSpeciesMentions,
        (extraction) => extraction.speciesMentions
      ),
      specimenTypes: evaluateSetField(
        entries,
        byPaperId,
        "specimenTypes",
        (entry) => entry.expectedSpecimenTypes,
        (extraction) => extraction.specimenTypes
      ),
      outcomeClasses: evaluateSetField(
        entries,
        byPaperId,
        "outcomeClasses",
        (entry) => entry.expectedOutcomeClasses,
        (extraction) => uniqueOutcomeClasses(extraction)
      ),
      stepPhases: evaluateSetField(
        entries,
        byPaperId,
        "stepPhases",
        (entry) => entry.expectedStepPhases,
        (extraction) => uniqueStepPhases(extraction)
      )
    },
    confidence: {
      averageOnExpectedIncluded: average(expectedIncludedConfidences),
      averageOnCorrectIncluded: average(correctIncludedConfidences),
      averageOnIncorrectIncluded: average(incorrectIncludedConfidences)
    },
    unexpectedIncludedPaperIds,
    unexpectedExcludedPaperIds
  };
}

function buildGates(reviewed: BenchmarkSubsetMetrics): BenchmarkGate[] {
  return [
    {
      name: "reviewed inclusion F1",
      passed: reviewed.inclusion.f1 >= 0.9,
      actual: reviewed.inclusion.f1,
      threshold: 0.9,
      comparator: ">=",
      notes: "Guard against gaming the corpus by excluding reviewed in-scope papers."
    },
    {
      name: "reviewed inclusion precision",
      passed: reviewed.inclusion.precision >= 0.9,
      actual: reviewed.inclusion.precision,
      threshold: 0.9,
      comparator: ">=",
      notes: "Guard against keeping clearly excluded reviewed papers in the atlas."
    },
    {
      name: "reviewed protocol family accuracy",
      passed: reviewed.exactFields.protocolFamily.accuracy >= 0.85,
      actual: reviewed.exactFields.protocolFamily.accuracy,
      threshold: 0.85,
      comparator: ">=",
      notes: "Reviewed family labels should stay stable before autonomous updates are trusted."
    },
    {
      name: "reviewed paper type accuracy",
      passed: reviewed.exactFields.paperType.accuracy >= 0.85,
      actual: reviewed.exactFields.paperType.accuracy,
      threshold: 0.85,
      comparator: ">=",
      notes: "Paper-type drift is a common failure mode when extraction gets too eager."
    },
    {
      name: "reviewed specimen macro F1",
      passed: reviewed.setFields.specimenTypes.averageF1 >= 0.75,
      actual: reviewed.setFields.specimenTypes.averageF1,
      threshold: 0.75,
      comparator: ">=",
      notes: "Specimen context must remain anchored to the ovarian-tissue slice."
    },
    {
      name: "reviewed species macro F1",
      passed: reviewed.setFields.speciesMentions.averageF1 >= 0.75,
      actual: reviewed.setFields.speciesMentions.averageF1,
      threshold: 0.75,
      comparator: ">=",
      notes: "Species leakage is another easy way for the system to look cleaner than it is."
    }
  ];
}

export function evaluateBenchmark(snapshot: ExtractionSnapshot, benchmark: BenchmarkFile): BenchmarkEvaluation {
  const reviewedEntries = benchmark.entries.filter((entry) => entry.reviewStatus === "reviewed");
  const seededEntries = benchmark.entries.filter((entry) => entry.reviewStatus === "seeded");
  const allMetrics = evaluateSubset("all", benchmark.entries, snapshot);
  const reviewedMetrics = evaluateSubset("reviewed", reviewedEntries, snapshot);
  const seededMetrics = evaluateSubset("seeded", seededEntries, snapshot);
  const gates = buildGates(reviewedMetrics);

  return {
    domain: benchmark.domain,
    generatedAt: new Date().toISOString(),
    benchmarkDescription: benchmark.description,
    benchmarkEntryCount: benchmark.entries.length,
    subsets: {
      all: allMetrics,
      reviewed: reviewedMetrics,
      seeded: seededMetrics
    },
    gates,
    summary: {
      passesAllGates: gates.every((gate) => gate.passed),
      reviewedInclusionF1DeltaVsAll: round(reviewedMetrics.inclusion.f1 - allMetrics.inclusion.f1)
    }
  };
}

export function renderBenchmarkMarkdown(evaluation: BenchmarkEvaluation): string {
  const lines: string[] = [];
  lines.push(`# ${evaluation.domain} benchmark evaluation`);
  lines.push("");
  lines.push(evaluation.benchmarkDescription);
  lines.push("");
  lines.push(`Benchmark entries: ${evaluation.benchmarkEntryCount}`);
  lines.push(`All gates passed: ${evaluation.summary.passesAllGates ? "yes" : "no"}`);
  lines.push("");

  for (const subset of [evaluation.subsets.all, evaluation.subsets.reviewed, evaluation.subsets.seeded]) {
    lines.push(`## ${subset.subset} subset`);
    lines.push(`- entries: ${subset.entryCount}`);
    lines.push(
      `- inclusion: accuracy=${subset.inclusion.accuracy} precision=${subset.inclusion.precision} recall=${subset.inclusion.recall} f1=${subset.inclusion.f1}`
    );
    lines.push(
      `- exact accuracy: paperType=${subset.exactFields.paperType.accuracy} protocolFamily=${subset.exactFields.protocolFamily.accuracy}`
    );
    lines.push(
      `- set macro F1: species=${subset.setFields.speciesMentions.averageF1} specimen=${subset.setFields.specimenTypes.averageF1} outcomes=${subset.setFields.outcomeClasses.averageF1} stepPhases=${subset.setFields.stepPhases.averageF1}`
    );
    lines.push(
      `- confidence: expectedIncluded=${subset.confidence.averageOnExpectedIncluded ?? "n/a"} correctIncluded=${subset.confidence.averageOnCorrectIncluded ?? "n/a"} incorrectIncluded=${subset.confidence.averageOnIncorrectIncluded ?? "n/a"}`
    );
    if (subset.unexpectedIncludedPaperIds.length > 0) {
      lines.push(`- unexpected included paper ids: ${subset.unexpectedIncludedPaperIds.join(", ")}`);
    }
    if (subset.unexpectedExcludedPaperIds.length > 0) {
      lines.push(`- unexpected excluded paper ids: ${subset.unexpectedExcludedPaperIds.join(", ")}`);
    }
    lines.push("");
  }

  lines.push("## Gates");
  for (const gate of evaluation.gates) {
    lines.push(
      `- ${gate.name}: ${gate.passed ? "pass" : "fail"} (actual=${gate.actual} ${gate.comparator} threshold=${gate.threshold})`
    );
    lines.push(`  ${gate.notes}`);
  }
  lines.push("");

  return lines.join("\n");
}
