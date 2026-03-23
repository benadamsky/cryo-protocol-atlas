import type { ExtractionSnapshot, ProtocolExtraction, SourceEnrichmentFile } from "../../shared/src/schema.js";

export type IsletBenchmarkMatrixRow = {
  title: string;
  protocolFamily: string;
  baseCpaMix: string;
  additive: string;
  species: string;
  endpointClass: string;
  transplantation: "yes" | "no";
  evidenceStrength: "strong" | "moderate" | "limited";
  translationalSignal: "research only" | "preclinical" | "transplant relevant" | "clinically adjacent";
};

export type IsletBenchmarkMatrix = {
  domain: "islets";
  generatedAt: string;
  wedgeFocus: string;
  rows: IsletBenchmarkMatrixRow[];
  summary: {
    basePattern: string;
    additiveSignals: string[];
    strongestTranslationalRows: string[];
    weakOrUnevenRows: string[];
    currentRead: string;
  };
};

const curatedTitles = [
  "Improvement of Human Islet Cryopreservation by a p38 MAPK Inhibitor",
  "Trehalose: A Cryoprotectant That Enhances Recovery and Preserves Function of Human Pancreatic Islets After Long-Term Storage",
  "Beraprost Sodium Improves Islet Yield and Viability in Canine Islet Cryopreservation",
  "Curcumin treatment enhances islet recovery by induction of heat shock response proteins, Hsp70 and heme oxygenase-1, during cryopreservation",
  "Polyvinyl Pyrrolidone: A Novel Cryoprotectant in Islet Cell Cryopreservation",
  "Supplementary cryoprotective effect of carboxylated ε-poly-L-lysine during vitriﬁcation of rat pancreatic islets",
  "Cryopreservation of Human Pancreatic Islets From Non-Heart-Beating Donors Using Hydroxyethyl Starch and Dimethyl Sulfoxide as Cryoprotectants",
  "Vitrification of Mouse Islets of Langerhans: Comparison with a More Conventional Freezing Method",
  "Bulk Cryopreservation of Isolated Islets of Langerhans"
] as const;

const baseChemicalSet = new Set([
  "Dimethyl Sulfoxide",
  "Ethylene Glycol",
  "Glycerol",
  "Propylene Glycol",
  "Sucrose"
]);

function getReviewedEnrichmentTitles(sourceEnrichment?: SourceEnrichmentFile): Set<string> {
  return new Set(
    sourceEnrichment?.records
      .filter((record) => record.status === "reviewed")
      .map((record) => record.title) ?? []
  );
}

function normalizeProtocolFamily(extraction: ProtocolExtraction): string {
  return extraction.protocolFamily === "unknown" ? "slow-freezing/unknown" : extraction.protocolFamily;
}

function pickBaseCpaMix(extraction: ProtocolExtraction): string {
  const base = extraction.chemicalMentions
    .map((chemical) => chemical.canonicalName)
    .filter((chemical) => baseChemicalSet.has(chemical));
  const unique = Array.from(new Set(base));
  return unique.length > 0 ? unique.join(" + ") : "unspecified";
}

function pickAdditive(extraction: ProtocolExtraction): string {
  const additives = extraction.chemicalMentions
    .map((chemical) => chemical.canonicalName)
    .filter((chemical) => !baseChemicalSet.has(chemical));
  const unique = Array.from(new Set(additives));
  return unique.length > 0 ? unique.join(" + ") : "none";
}

function pickEndpointClass(extraction: ProtocolExtraction): string {
  const outcomes = Array.from(new Set(extraction.outcomeMentions.map((outcome) => outcome.outcomeClass)));
  if (outcomes.length === 0) {
    return "unlabeled";
  }
  return outcomes.join(", ");
}

function pickEvidenceStrength(
  extraction: ProtocolExtraction,
  reviewedEnrichmentTitles: Set<string>
): "strong" | "moderate" | "limited" {
  const hasStrong = extraction.outcomeMentions.some((outcome) => outcome.strength === "strong");
  const hasModerate = extraction.outcomeMentions.some((outcome) => outcome.strength === "moderate");
  if (hasStrong && reviewedEnrichmentTitles.has(extraction.paper.title)) {
    return "strong";
  }
  if (hasStrong || hasModerate) {
    return "moderate";
  }
  return "limited";
}

function pickTranslationalSignal(extraction: ProtocolExtraction): IsletBenchmarkMatrixRow["translationalSignal"] {
  const title = extraction.paper.title.toLowerCase();
  const species = new Set(extraction.speciesMentions.map((value) => value.toLowerCase()));
  const hasTransplantation = extraction.outcomeMentions.some((outcome) => outcome.outcomeClass === "transplantation");

  if (species.has("human")) {
    return "clinically adjacent";
  }
  if (hasTransplantation || /transplant|normoglycemic|clinical trial|banking/.test(title)) {
    return "transplant relevant";
  }
  if (extraction.outcomeMentions.length > 0) {
    return "preclinical";
  }
  return "research only";
}

export function buildIsletBenchmarkMatrix(input: {
  snapshot: ExtractionSnapshot;
  sourceEnrichment?: SourceEnrichmentFile;
}): IsletBenchmarkMatrix {
  const { snapshot, sourceEnrichment } = input;
  const reviewedEnrichmentTitles = getReviewedEnrichmentTitles(sourceEnrichment);
  const extractionsByTitle = new Map(snapshot.extractions.map((extraction) => [extraction.paper.title, extraction]));

  const rows = curatedTitles
    .map((title) => extractionsByTitle.get(title))
    .filter((extraction): extraction is ProtocolExtraction => Boolean(extraction))
    .map((extraction) => ({
      title: extraction.paper.title,
      protocolFamily: normalizeProtocolFamily(extraction),
      baseCpaMix: pickBaseCpaMix(extraction),
      additive: pickAdditive(extraction),
      species: Array.from(new Set(extraction.speciesMentions)).join(", ") || "unspecified",
      endpointClass: pickEndpointClass(extraction),
      transplantation: extraction.outcomeMentions.some((outcome) => outcome.outcomeClass === "transplantation")
        ? ("yes" as const)
        : ("no" as const),
      evidenceStrength: pickEvidenceStrength(extraction, reviewedEnrichmentTitles),
      translationalSignal: pickTranslationalSignal(extraction)
    }));

  const additiveSignals = rows
    .filter((row) => row.additive !== "none")
    .map((row) => `${row.title} (${row.additive})`);
  const strongestTranslationalRows = rows
    .filter((row) => row.translationalSignal === "clinically adjacent" || row.translationalSignal === "transplant relevant")
    .map((row) => `${row.title} [${row.translationalSignal}]`);
  const weakOrUnevenRows = rows
    .filter((row) => row.evidenceStrength !== "strong")
    .map((row) => `${row.title} [${row.evidenceStrength}]`);

  return {
    domain: "islets",
    generatedAt: new Date().toISOString(),
    wedgeFocus: "additive-assisted islet recovery benchmark on a fixed base cryomix",
    rows,
    summary: {
      basePattern: "slow-freezing centered on DMSO, with sucrose and ethylene glycol recurring in the broader islet slice",
      additiveSignals,
      strongestTranslationalRows,
      weakOrUnevenRows,
      currentRead:
        "Islets still looks better as a proving ground for Atlas than as a locked-in company wedge, but the additive benchmark story is now evidence-backed enough to test as a plausible commercial entry point."
    }
  };
}

export function renderIsletBenchmarkMatrixMarkdown(matrix: IsletBenchmarkMatrix): string {
  const lines: string[] = [];
  lines.push("# islets benchmark matrix");
  lines.push("");
  lines.push(`Wedge focus: ${matrix.wedgeFocus}`);
  lines.push("");
  lines.push("## Summary");
  lines.push(`- base pattern: ${matrix.summary.basePattern}`);
  lines.push(`- current read: ${matrix.summary.currentRead}`);
  lines.push(`- strongest translational rows: ${matrix.summary.strongestTranslationalRows.join(" | ") || "none"}`);
  lines.push(`- additive signals: ${matrix.summary.additiveSignals.join(" | ") || "none"}`);
  lines.push(`- weak or uneven rows: ${matrix.summary.weakOrUnevenRows.join(" | ") || "none"}`);
  lines.push("");
  lines.push("| paper | protocol family | base CPA mix | additive | species | endpoint class | transplantation | evidence strength | commercial / translational signal |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const row of matrix.rows) {
    lines.push(
      `| ${row.title} | ${row.protocolFamily} | ${row.baseCpaMix} | ${row.additive} | ${row.species} | ${row.endpointClass} | ${row.transplantation} | ${row.evidenceStrength} | ${row.translationalSignal} |`
    );
  }
  lines.push("");
  return lines.join("\n");
}
