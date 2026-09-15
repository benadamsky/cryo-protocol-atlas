import {
  ProtocolOverrideFileSchema,
  type DomainId,
  type ExtractionSnapshot,
  type ProtocolExtraction,
  type ProtocolOverride,
  type ProtocolOverrideFile
} from "../../shared/src/schema.js";

export function parseOverrideFile(input: unknown): ProtocolOverrideFile {
  return ProtocolOverrideFileSchema.parse(input);
}

export function mergeProtocolOverrides(
  domain: DomainId,
  baseOverrideFile: ProtocolOverrideFile | null,
  nextOverrides: ProtocolOverride[]
): ProtocolOverrideFile | null {
  if ((!baseOverrideFile || baseOverrideFile.overrides.length === 0) && nextOverrides.length === 0) {
    return baseOverrideFile;
  }

  const merged = new Map<string, ProtocolOverride>();
  for (const override of baseOverrideFile?.overrides ?? []) {
    merged.set(override.paperId, override);
  }

  for (const override of nextOverrides) {
    const existing = merged.get(override.paperId);
    if (!existing) {
      merged.set(override.paperId, override);
      continue;
    }

    merged.set(override.paperId, {
      ...existing,
      ...override,
      paperId: override.paperId
    });
  }

  return ProtocolOverrideFileSchema.parse({
    generatedAt: new Date().toISOString(),
    domain: baseOverrideFile?.domain ?? domain,
    overrides: Array.from(merged.values()).sort((left, right) => left.paperId.localeCompare(right.paperId))
  });
}

export function applyProtocolOverrides(
  snapshot: ExtractionSnapshot,
  overrideFile: ProtocolOverrideFile | null
): ExtractionSnapshot {
  if (!overrideFile || overrideFile.overrides.length === 0) {
    return snapshot;
  }

  const overrides = new Map(overrideFile.overrides.map((override) => [override.paperId, override]));
  const nextExtractions: ProtocolExtraction[] = [];

  for (const extraction of snapshot.extractions) {
    const override = overrides.get(extraction.paper.id);
    if (!override) {
      nextExtractions.push(extraction);
      continue;
    }

    if (override.excludeFromAtlas) {
      continue;
    }

    nextExtractions.push({
      ...extraction,
      paperType: override.paperType ?? extraction.paperType,
      protocolFamily: override.protocolFamily ?? extraction.protocolFamily,
      speciesMentions: override.speciesMentions ?? extraction.speciesMentions,
      specimenTypes: override.specimenTypes ?? extraction.specimenTypes,
      protocolSteps: override.protocolSteps ?? extraction.protocolSteps,
      outcomeMentions: override.outcomeMentions ?? extraction.outcomeMentions,
      extractionConfidence: override.extractionConfidence ?? extraction.extractionConfidence
    });
  }

  const protocolFamilyCounts = nextExtractions.reduce<Record<string, number>>((counts, extraction) => {
    counts[extraction.protocolFamily] = (counts[extraction.protocolFamily] ?? 0) + 1;
    return counts;
  }, {});

  return {
    ...snapshot,
    totalPapers: nextExtractions.length,
    protocolFamilyCounts,
    extractions: nextExtractions
  };
}
