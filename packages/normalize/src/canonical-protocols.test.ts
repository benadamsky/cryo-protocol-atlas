import assert from "node:assert/strict";
import test from "node:test";
import { buildNormalizedProtocolSnapshot } from "./canonical-protocols.js";
import { ExtractionSnapshotSchema } from "../../shared/src/schema.js";

function makeEvidence(text: string, kind: "duration" | "temperature" | "outcome" = "temperature") {
  return {
    kind,
    text,
    confidence: 0.95,
    sourceType: "title-or-abstract" as const,
    authorityTier: "primary-indirect" as const,
    explicitness: "direct" as const,
    reviewed: false
  };
}

function makeSnapshot(protocolSteps: Array<Record<string, unknown>>, overrides?: {
  chemicalConcentrationMentions?: string[];
  chemicalMentions?: Array<{
    canonicalName: string;
    aliasesMatched: string[];
    concentrationMentions?: string[];
  }>;
  title?: string;
}) {
  return ExtractionSnapshotSchema.parse({
    generatedAt: "2026-03-23T00:00:00.000Z",
    domain: "islets",
    totalPapers: 1,
    protocolFamilyCounts: {
      "slow-freezing": 1
    },
    extractions: [
      {
        domain: "islets",
        paper: {
          id: "paper-1",
          title: overrides?.title ?? "Synthetic protocol paper"
        },
        paperType: "experimental",
        protocolFamily: "slow-freezing",
        speciesMentions: ["rat"],
        specimenTypes: ["islets"],
        chemicalMentions:
          overrides?.chemicalMentions?.map((chemical) => ({
            canonicalName: chemical.canonicalName,
            aliasesMatched: chemical.aliasesMatched,
            concentrationMentions: chemical.concentrationMentions ?? overrides?.chemicalConcentrationMentions ?? ["2 M"],
            evidence: [makeEvidence(`${chemical.canonicalName} concentration described explicitly.`, "temperature")]
          })) ?? [
            {
              canonicalName: "Dimethyl Sulfoxide",
              aliasesMatched: ["dmso"],
              concentrationMentions: overrides?.chemicalConcentrationMentions ?? ["2 M"],
              evidence: [makeEvidence("DMSO concentration described explicitly.", "temperature")]
            }
          ],
        protocolSteps,
        temperatureMentions: [],
        durationMentions: [],
        outcomeMentions: [],
        evidenceSnippets: [],
        evidenceAuthority: {
          strongestAuthority: "primary-indirect",
          primaryDirectSnippetCount: 0,
          primaryIndirectSnippetCount: 1,
          secondarySnippetCount: 0,
          manualCurationSnippetCount: 0,
          reviewedSnippetCount: 0,
          directSnippetCount: 1,
          indirectSnippetCount: 0,
          inferredSnippetCount: 0
        },
        extractionConfidence: 0.9
      }
    ]
  });
}

test("normalizes measurements from concentrations, temperatures, durations, and rates", () => {
  const snapshot = makeSnapshot([
    {
      order: 0,
      phase: "loading",
      summary: "Loaded tissue with 2 M DMSO and cooled at 0.25 C/min to -40 C for 5 min.",
      chemicals: ["Dimethyl Sulfoxide"],
      concentrations: ["2 M"],
      temperatures: ["-40 C"],
      durations: ["5 min"],
      evidence: [makeEvidence("Loaded tissue with 2 M DMSO and cooled at 0.25 C/min to -40 C for 5 min.")]
    },
    {
      order: 1,
      phase: "storage",
      summary: "Stored in liquid nitrogen for 1 week.",
      chemicals: [],
      concentrations: [],
      temperatures: ["-196 C"],
      durations: ["1 week"],
      evidence: [makeEvidence("Stored in liquid nitrogen for 1 week.")]
    }
  ]);

  const normalized = buildNormalizedProtocolSnapshot(snapshot);
  const protocol = normalized.protocols[0];
  const loadingStep = protocol.normalizedSteps[0];

  assert.equal(protocol.normalizedChemicals[0]?.normalizedConcentrations[0]?.normalizedText, "2 M");
  assert.equal(loadingStep.temperatures[0]?.normalizedText, "-40 C");
  assert.equal(loadingStep.durations[0]?.normalizedText, "5 min");
  assert.equal(loadingStep.rates[0]?.normalizedText, "0.25 C/min");
});

test("derives transitions from structural workflow steps instead of noisy adjacency", () => {
  const snapshot = makeSnapshot([
    {
      order: 0,
      phase: "loading",
      summary: "Exposed tissue to 1.5 M DMSO for 10 min before freezing.",
      chemicals: ["Dimethyl Sulfoxide"],
      concentrations: ["1.5 M"],
      temperatures: [],
      durations: ["10 min"],
      evidence: [makeEvidence("Exposed tissue to 1.5 M DMSO for 10 min before freezing.")]
    },
    {
      order: 1,
      phase: "assessment",
      summary: "Viability remained high after thawing.",
      chemicals: [],
      concentrations: [],
      temperatures: [],
      durations: [],
      evidence: [makeEvidence("Viability remained high after thawing.", "outcome")]
    },
    {
      order: 2,
      phase: "cooling",
      summary: "Cooled samples at 1 C/min to -40 C.",
      chemicals: [],
      concentrations: [],
      temperatures: ["-40 C"],
      durations: [],
      evidence: [makeEvidence("Cooled samples at 1 C/min to -40 C.")]
    },
    {
      order: 3,
      phase: "storage",
      summary: "Stored in liquid nitrogen for 1 week.",
      chemicals: [],
      concentrations: [],
      temperatures: ["-196 C"],
      durations: ["1 week"],
      evidence: [makeEvidence("Stored in liquid nitrogen for 1 week.")]
    }
  ]);

  const normalized = buildNormalizedProtocolSnapshot(snapshot);
  const [loadingStep, assessmentStep, coolingStep, storageStep] = normalized.protocols[0].normalizedSteps;

  assert.equal(loadingStep.transitionToNextPhase, "cooling");
  assert.equal(assessmentStep.transitionToNextPhase, undefined);
  assert.equal(coolingStep.transitionToNextPhase, "storage");
  assert.equal(storageStep.transitionToNextPhase, undefined);
});

test("suppresses backward workflow transitions and emits warnings for unparseable measurements", () => {
  const snapshot = makeSnapshot(
    [
      {
        order: 0,
        phase: "storage",
        summary: "Stored samples in liquid nitrogen.",
        chemicals: [],
        concentrations: ["roughly high"],
        temperatures: [],
        durations: [],
        evidence: [makeEvidence("Stored samples in liquid nitrogen.")]
      },
      {
        order: 1,
        phase: "cooling",
        summary: "Supercooled to -7 C before storage.",
        chemicals: [],
        concentrations: [],
        temperatures: ["-7 C"],
        durations: ["overnight"],
        evidence: [makeEvidence("Supercooled to -7 C before storage.")]
      }
    ],
    {
      chemicalConcentrationMentions: ["roughly high"],
      title: "Synthetic noisy protocol paper"
    }
  );

  const normalized = buildNormalizedProtocolSnapshot(snapshot);
  const protocol = normalized.protocols[0];

  assert.equal(protocol.normalizedSteps[0]?.transitionToNextPhase, undefined);
  assert.ok(protocol.normalizationWarnings.some((warning) => warning.includes('chemical concentration "roughly high"')));
  assert.ok(protocol.normalizationWarnings.some((warning) => warning.includes('step concentration "roughly high"')));
  assert.ok(protocol.normalizationWarnings.some((warning) => warning.includes('duration "overnight"')));
});

test("prefers step-linked representative conditions when structural concentrations are available", () => {
  const snapshot = makeSnapshot(
    [
      {
        order: 0,
        phase: "loading",
        summary: "Loaded tissue with 2 M DMSO for 10 min before freezing.",
        chemicals: ["Dimethyl Sulfoxide"],
        concentrations: ["2 M"],
        temperatures: [],
        durations: ["10 min"],
        evidence: [makeEvidence("Loaded tissue with 2 M DMSO for 10 min before freezing.")]
      }
    ],
    {
      chemicalConcentrationMentions: ["1.5 M"]
    }
  );

  const normalized = buildNormalizedProtocolSnapshot(snapshot);
  const protocol = normalized.protocols[0];

  assert.deepEqual(
    protocol.representativeConditions.map((condition) => ({
      phase: condition.phase,
      label: condition.label,
      source: condition.source
    })),
    [
      {
        phase: "loading",
        label: "Dimethyl Sulfoxide 2 M",
        source: "step"
      }
    ]
  );
});

test("falls back to protocol-level representative conditions when step-linked conditions are absent", () => {
  const snapshot = makeSnapshot(
    [
      {
        order: 0,
        phase: "cooling",
        summary: "Cryopreserved samples by slow freezing.",
        chemicals: ["Dimethyl Sulfoxide"],
        concentrations: [],
        temperatures: [],
        durations: [],
        evidence: [makeEvidence("Cryopreserved samples by slow freezing.")]
      }
    ],
    {
      chemicalConcentrationMentions: ["1.5 M"]
    }
  );

  const normalized = buildNormalizedProtocolSnapshot(snapshot);
  const protocol = normalized.protocols[0];

  assert.deepEqual(
    protocol.representativeConditions.map((condition) => ({
      phase: condition.phase,
      label: condition.label,
      source: condition.source
    })),
    [
      {
        phase: "unknown",
        label: "Dimethyl Sulfoxide 1.5 M",
        source: "chemical-mention"
      }
    ]
  );
});

test("attaches a shared concentration to multiple chemicals when each is explicitly linked in the step text", () => {
  const snapshot = makeSnapshot(
    [
      {
        order: 0,
        phase: "loading",
        summary: "Perfused tissue with Me2SO 1.5 M and EG 1.5 M before vitrification.",
        chemicals: ["Dimethyl Sulfoxide", "Ethylene Glycol"],
        concentrations: ["1.5 M"],
        temperatures: [],
        durations: [],
        evidence: [makeEvidence("Perfused tissue with Me2SO 1.5 M and EG 1.5 M before vitrification.")]
      }
    ],
    {
      chemicalMentions: [
        {
          canonicalName: "Dimethyl Sulfoxide",
          aliasesMatched: ["dmso", "Me2SO"],
          concentrationMentions: ["1.5 M"]
        },
        {
          canonicalName: "Ethylene Glycol",
          aliasesMatched: ["EG"],
          concentrationMentions: ["1.5 M"]
        }
      ]
    }
  );

  const normalized = buildNormalizedProtocolSnapshot(snapshot);
  const protocol = normalized.protocols[0];

  assert.deepEqual(
    protocol.representativeConditions.map((condition) => ({
      phase: condition.phase,
      label: condition.label,
      source: condition.source
    })),
    [
      {
        phase: "loading",
        label: "Dimethyl Sulfoxide 1.5 M",
        source: "step"
      },
      {
        phase: "loading",
        label: "Ethylene Glycol 1.5 M",
        source: "step"
      }
    ]
  );
});
