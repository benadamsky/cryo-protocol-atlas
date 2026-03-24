import {
  type ActiveWedge,
  type ExtractionSnapshot,
  WedgeBenchmarkMatrixSchema,
  type WedgeBenchmarkMatrix,
  type SourceEnrichmentFile
} from "../../shared/src/schema.js";
import {
  authorityWeight,
  meaningfulPhases,
  pickAdjuncts,
  pickAuthorityProfile,
  pickBaseCpaBackbone,
  pickEvidenceStrength,
  pickTranslationalSignal,
  reviewedEnrichmentTitleSet,
  translationalSignalWeight,
  unique
} from "./wedge-helpers.js";

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function evidenceStrengthWeight(value: "strong" | "moderate" | "limited"): number {
  switch (value) {
    case "strong":
      return 1;
    case "moderate":
      return 0.7;
    case "limited":
      return 0.4;
  }
}

function relevantExtractions(snapshot: ExtractionSnapshot, activeWedge: ActiveWedge) {
  const titleSet = new Set(activeWedge.supportingPaperTitles);
  const exactMatches = snapshot.extractions.filter((extraction) => titleSet.has(extraction.paper.title));
  if (exactMatches.length > 0) {
    return exactMatches;
  }

  return snapshot.extractions.filter((extraction) => {
    const familyOverlap = activeWedge.dominantPatterns.protocolFamilies.includes(extraction.protocolFamily);
    const chemicalOverlap = extraction.chemicalMentions.some((chemical) =>
      activeWedge.dominantPatterns.chemicals.includes(chemical.canonicalName)
    );
    const specimenOverlap = extraction.specimenTypes.some((specimen) =>
      activeWedge.dominantPatterns.specimenTypes.includes(specimen)
    );

    return specimenOverlap && (familyOverlap || chemicalOverlap);
  });
}

function confoundFlagsFor(extraction: ExtractionSnapshot["extractions"][number], activeWedge: ActiveWedge): string[] {
  const flags: string[] = [];

  if (extraction.protocolFamily === "unknown") {
    flags.push("unknown-family");
  }
  if (meaningfulPhases(extraction).length <= 1) {
    flags.push("sparse-protocol");
  }
  if (extraction.outcomeMentions.length === 0) {
    flags.push("unlabeled-endpoint");
  }
  if (
    activeWedge.category === "endpoint-upgrade" &&
    !extraction.outcomeMentions.some((outcome) => outcome.outcomeClass === "transplantation")
  ) {
    flags.push("missing-transplant-endpoint");
  }
  if (
    activeWedge.category === "benchmark" &&
    extraction.protocolFamily !== "comparative" &&
    !activeWedge.dominantPatterns.protocolFamilies.includes(extraction.protocolFamily)
  ) {
    flags.push("out-of-benchmark-family");
  }

  return flags;
}

function relevanceScoreFor(
  extraction: ExtractionSnapshot["extractions"][number],
  activeWedge: ActiveWedge,
  confoundFlags: string[],
  reviewedEnrichmentTitles: Set<string>
): number {
  const authorityProfile = pickAuthorityProfile(extraction, reviewedEnrichmentTitles);
  const translationalSignal = pickTranslationalSignal(extraction);
  const evidenceStrength = pickEvidenceStrength(extraction, reviewedEnrichmentTitles);
  const titleMatch = activeWedge.supportingPaperTitles.includes(extraction.paper.title) ? 0.28 : 0.12;
  const familyMatch = activeWedge.dominantPatterns.protocolFamilies.includes(extraction.protocolFamily) ? 0.2 : 0;
  const chemicalMatch = extraction.chemicalMentions.some((chemical) =>
    activeWedge.dominantPatterns.chemicals.includes(chemical.canonicalName)
  )
    ? 0.14
    : 0;
  const specimenMatch = extraction.specimenTypes.some((specimen) =>
    activeWedge.dominantPatterns.specimenTypes.includes(specimen)
  )
    ? 0.08
    : 0;
  const authorityWeightValue = authorityWeight(authorityProfile) * 0.16;
  const translationalWeightValue = translationalSignalWeight(translationalSignal) * 0.08;
  const evidenceWeightValue = evidenceStrengthWeight(evidenceStrength) * 0.08;

  return Number(
    clamp(
      titleMatch +
        familyMatch +
        chemicalMatch +
        specimenMatch +
        authorityWeightValue +
        translationalWeightValue +
        evidenceWeightValue -
        confoundFlags.length * 0.07
    ).toFixed(3)
  );
}

function rowSignalLabel(row: WedgeBenchmarkMatrix["rows"][number]): string {
  if (row.adjuncts.length > 0) {
    return row.adjuncts[0];
  }
  return row.baseCpaBackbone === "unspecified" ? "base protocol only" : `base only (${row.baseCpaBackbone})`;
}

function rowDecisionTake(row: WedgeBenchmarkMatrix["rows"][number]): string {
  if (row.authorityProfile === "primary-backed" && row.translationalSignal === "clinically adjacent") {
    return "best human-relevant evidence in the current wedge";
  }
  if (row.authorityProfile === "primary-backed") {
    return "strongest directly supported signal in the current wedge";
  }
  if (row.translationalSignal === "clinically adjacent") {
    return "human-relevant signal, but still abstract-led";
  }
  return "directionally supportive, but not enough to carry the wedge alone";
}

export function buildWedgeBenchmarkMatrix(input: {
  snapshot: ExtractionSnapshot;
  activeWedge: ActiveWedge;
  sourceEnrichment?: SourceEnrichmentFile;
}): WedgeBenchmarkMatrix {
  const reviewedEnrichmentTitles = reviewedEnrichmentTitleSet(input.sourceEnrichment);
  const rows = relevantExtractions(input.snapshot, input.activeWedge)
    .map((extraction) => {
      const confoundFlags = confoundFlagsFor(extraction, input.activeWedge);
      return {
        paperId: extraction.paper.id,
        title: extraction.paper.title,
        protocolFamily: extraction.protocolFamily,
        baseCpaBackbone: pickBaseCpaBackbone(extraction),
        adjuncts: pickAdjuncts(extraction),
        species: unique(extraction.speciesMentions),
        specimenTypes: unique(extraction.specimenTypes),
        endpointClasses: unique(extraction.outcomeMentions.map((outcome) => outcome.outcomeClass)),
        authorityProfile: pickAuthorityProfile(extraction, reviewedEnrichmentTitles),
        evidenceStrength: pickEvidenceStrength(extraction, reviewedEnrichmentTitles),
        translationalSignal: pickTranslationalSignal(extraction),
        confoundFlags,
        wedgeRelevanceScore: relevanceScoreFor(
          extraction,
          input.activeWedge,
          confoundFlags,
          reviewedEnrichmentTitles
        ),
        whyIncluded: input.activeWedge.supportingPaperTitles.includes(extraction.paper.title)
          ? "Explicitly named in the active wedge support set."
          : "Matches the active wedge context by protocol family, CPA pattern, or specimen."
      };
    })
    .sort((left, right) => right.wedgeRelevanceScore - left.wedgeRelevanceScore || left.title.localeCompare(right.title));

  const dominantBackbones = unique(rows.map((row) => row.baseCpaBackbone).filter((value) => value !== "unspecified")).slice(0, 4);
  const dominantAdjuncts = unique(
    rows.flatMap((row) => row.adjuncts).filter((adjunct) => adjunct !== "Polyethylene Glycol")
  ).slice(0, 6);
  const strongestRows = rows
    .filter((row) => row.evidenceStrength === "strong" || row.authorityProfile === "primary-backed")
    .slice(0, 5)
    .map((row) => `${rowSignalLabel(row)} via ${row.title}`);
  const highestConfoundRows = rows
    .filter((row) => row.confoundFlags.length > 0)
    .slice(0, 5)
    .map((row) => `${rowSignalLabel(row)} via ${row.title} [${row.confoundFlags.join(", ")}]`);
  const humanRelevantCount = rows.filter((row) => row.translationalSignal === "clinically adjacent").length;
  const primaryBackedCount = rows.filter((row) => row.authorityProfile === "primary-backed").length;
  const abstractOnlyCount = rows.filter((row) => row.authorityProfile === "abstract-only").length;

  return WedgeBenchmarkMatrixSchema.parse({
    generatedAt: new Date().toISOString(),
    domain: input.snapshot.domain,
    wedgeId: input.activeWedge.wedgeId,
    wedgeTitle: input.activeWedge.title,
    rows,
    summary: {
      dominantBackbones,
      dominantAdjuncts,
      strongestRows,
      highestConfoundRows,
      currentRead:
        rows.length === 0
          ? "No wedge-relevant rows are available yet."
          : `${rows.length} papers are directly relevant to this wedge. ${primaryBackedCount} are primary-backed, ${humanRelevantCount} are human-relevant, and ${abstractOnlyCount} still rely on abstract-only evidence.`
    }
  });
}

export function renderWedgeBenchmarkMatrixMarkdown(matrix: WedgeBenchmarkMatrix): string {
  const lines: string[] = [];
  lines.push(`# ${matrix.domain} wedge benchmark matrix`);
  lines.push("");
  lines.push(`Wedge: ${matrix.wedgeTitle}`);
  lines.push("");
  lines.push("## Summary");
  lines.push(`- decision read: ${matrix.summary.currentRead}`);
  lines.push(`- dominant base backbones: ${matrix.summary.dominantBackbones.join(" | ") || "none"}`);
  lines.push(`- main candidate adjuncts: ${matrix.summary.dominantAdjuncts.join(" | ") || "none"}`);
  lines.push(`- best-supported signals: ${matrix.summary.strongestRows.join(" | ") || "none"}`);
  lines.push(`- main confounds: ${matrix.summary.highestConfoundRows.join(" | ") || "none"}`);
  lines.push("");
  lines.push("## Candidate signals");
  lines.push("| signal | best paper | evidence read | endpoints | decision take |");
  lines.push("| --- | --- | --- | --- | --- |");
  const groupedRows = Array.from(
    matrix.rows.reduce<Map<string, WedgeBenchmarkMatrix["rows"][number][]>>((map, row) => {
      const key = rowSignalLabel(row);
      map.set(key, [...(map.get(key) ?? []), row]);
      return map;
    }, new Map()).entries()
  )
    .map(([signal, rows]) => {
      const bestRow = rows
        .slice()
        .sort((left, right) => right.wedgeRelevanceScore - left.wedgeRelevanceScore || left.title.localeCompare(right.title))[0];
      return { signal, bestRow };
    })
    .sort((left, right) => right.bestRow.wedgeRelevanceScore - left.bestRow.wedgeRelevanceScore)
    .slice(0, 8);

  for (const { signal, bestRow } of groupedRows) {
    lines.push(
      `| ${signal} | ${bestRow.title} | ${bestRow.evidenceStrength}, ${bestRow.authorityProfile}, ${bestRow.translationalSignal} | ${bestRow.endpointClasses.join(", ") || "unlabeled"} | ${rowDecisionTake(bestRow)} |`
    );
  }
  lines.push("");
  lines.push("## Full row view");
  lines.push("| paper | family | base backbone | adjuncts | species | endpoints | authority | confounds | relevance |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const row of matrix.rows) {
    lines.push(
      `| ${row.title} | ${row.protocolFamily} | ${row.baseCpaBackbone} | ${row.adjuncts.join(", ") || "none"} | ${row.species.join(", ") || "unspecified"} | ${row.endpointClasses.join(", ") || "unlabeled"} | ${row.authorityProfile} | ${row.confoundFlags.join(", ") || "none"} | ${row.wedgeRelevanceScore} |`
    );
  }
  lines.push("");
  return lines.join("\n");
}
