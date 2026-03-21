import type {
  Contradiction,
  ExperimentSuggestion,
  ExtractionSnapshot,
  OutcomeClass,
  ProtocolExtraction,
  ProtocolFamily,
  ResearchHypothesis
} from "../../shared/src/schema.js";
import { detectContradictions } from "./contradictions.js";
import { buildResearchHypotheses } from "./hypotheses.js";
import { buildExperimentSuggestions } from "./suggestions.js";

type CountEntry = {
  label: string;
  count: number;
};

export type AtlasHotspot = {
  protocolFamily: ProtocolFamily;
  chemical: string;
  specimenType: string;
  paperCount: number;
  outcomeClasses: OutcomeClass[];
  titles: string[];
};

export type AtlasSummary = {
  domain: string;
  totalPapers: number;
  protocolFamilies: CountEntry[];
  topChemicals: CountEntry[];
  topSpecimenTypes: CountEntry[];
  topOutcomes: CountEntry[];
  topStepPhases: CountEntry[];
  highConfidencePapers: Array<{
    title: string;
    paperType: string;
    protocolFamily: ProtocolFamily;
    extractionConfidence: number;
    species: string[];
    chemicals: string[];
    specimenTypes: string[];
    stepPhases: string[];
  }>;
  uncertaintyHotspots: AtlasHotspot[];
  contradictions: Contradiction[];
  experimentSuggestions: ExperimentSuggestion[];
  researchHypotheses: ResearchHypothesis[];
  qualitySignals: {
    unknownProtocolFamilyCount: number;
    unknownProtocolFamilyRate: number;
    unknownStepPhaseCount: number;
    contradictionCount: number;
    experimentalPaperCount: number;
    methodsPaperCount: number;
    reviewPaperCount: number;
    commentaryPaperCount: number;
  };
};

function countBy(values: string[]): CountEntry[] {
  const counts = values.reduce<Map<string, number>>((map, value) => {
    map.set(value, (map.get(value) ?? 0) + 1);
    return map;
  }, new Map());

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function strongestOutcomeClasses(extraction: ProtocolExtraction): OutcomeClass[] {
  return Array.from(new Set(extraction.outcomeMentions.map((entry) => entry.outcomeClass)));
}

export function buildAtlasSummary(snapshot: ExtractionSnapshot): AtlasSummary {
  const topChemicals = countBy(
    snapshot.extractions.flatMap((extraction) => extraction.chemicalMentions.map((chemical) => chemical.canonicalName))
  );
  const topSpecimenTypes = countBy(snapshot.extractions.flatMap((extraction) => extraction.specimenTypes));
  const topOutcomes = countBy(
    snapshot.extractions.flatMap((extraction) => strongestOutcomeClasses(extraction))
  );
  const topStepPhases = countBy(
    snapshot.extractions.flatMap((extraction) => extraction.protocolSteps.map((step) => step.phase))
  );
  const protocolFamilies = Object.entries(snapshot.protocolFamilyCounts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const highConfidencePapers = snapshot.extractions
    .slice()
    .sort((a, b) => b.extractionConfidence - a.extractionConfidence)
    .slice(0, 10)
    .map((extraction) => ({
      title: extraction.paper.title,
      paperType: extraction.paperType,
      protocolFamily: extraction.protocolFamily,
      extractionConfidence: extraction.extractionConfidence,
      species: extraction.speciesMentions,
      chemicals: extraction.chemicalMentions.map((chemical) => chemical.canonicalName),
      specimenTypes: extraction.specimenTypes,
      stepPhases: Array.from(new Set(extraction.protocolSteps.map((step) => step.phase)))
    }));

  const hotspotMap = new Map<string, AtlasHotspot>();
  for (const extraction of snapshot.extractions) {
    const specimenTypes = extraction.specimenTypes.length > 0 ? extraction.specimenTypes : ["unspecified"];
    const outcomeClasses = strongestOutcomeClasses(extraction);
    for (const specimenType of specimenTypes) {
      for (const chemical of extraction.chemicalMentions) {
        const key = `${extraction.protocolFamily}::${chemical.canonicalName}::${specimenType}`;
        const existing = hotspotMap.get(key);
        if (!existing) {
          hotspotMap.set(key, {
            protocolFamily: extraction.protocolFamily,
            chemical: chemical.canonicalName,
            specimenType,
            paperCount: 1,
            outcomeClasses,
            titles: [extraction.paper.title]
          });
          continue;
        }

        existing.paperCount += 1;
        existing.outcomeClasses = Array.from(new Set([...existing.outcomeClasses, ...outcomeClasses]));
        existing.titles = Array.from(new Set([...existing.titles, extraction.paper.title]));
      }
    }
  }

  const uncertaintyHotspots = Array.from(hotspotMap.values())
    .filter((entry) => entry.paperCount >= 2 && entry.outcomeClasses.length >= 2)
    .sort((a, b) => b.paperCount - a.paperCount || a.chemical.localeCompare(b.chemical))
    .slice(0, 12);
  const contradictions = detectContradictions(snapshot);
  const experimentSuggestions = buildExperimentSuggestions(snapshot);
  const researchHypotheses = buildResearchHypotheses(snapshot, experimentSuggestions, contradictions);
  const unknownProtocolFamilyCount = snapshot.extractions.filter(
    (extraction) => extraction.protocolFamily === "unknown"
  ).length;
  const unknownStepPhaseCount = snapshot.extractions.reduce(
    (count, extraction) => count + extraction.protocolSteps.filter((step) => step.phase === "unknown").length,
    0
  );
  const experimentalPaperCount = snapshot.extractions.filter(
    (extraction) => extraction.paperType === "experimental"
  ).length;
  const methodsPaperCount = snapshot.extractions.filter(
    (extraction) => extraction.paperType === "methods"
  ).length;
  const reviewPaperCount = snapshot.extractions.filter(
    (extraction) => extraction.paperType === "review"
  ).length;
  const commentaryPaperCount = snapshot.extractions.filter(
    (extraction) => extraction.paperType === "commentary"
  ).length;

  return {
    domain: snapshot.domain,
    totalPapers: snapshot.totalPapers,
    protocolFamilies,
    topChemicals: topChemicals.slice(0, 12),
    topSpecimenTypes: topSpecimenTypes.slice(0, 12),
    topOutcomes: topOutcomes.slice(0, 12),
    topStepPhases: topStepPhases.slice(0, 12),
    highConfidencePapers,
    uncertaintyHotspots,
    contradictions,
    experimentSuggestions,
    researchHypotheses,
    qualitySignals: {
      unknownProtocolFamilyCount,
      unknownProtocolFamilyRate: Number((unknownProtocolFamilyCount / snapshot.totalPapers).toFixed(2)),
      unknownStepPhaseCount,
      contradictionCount: contradictions.length,
      experimentalPaperCount,
      methodsPaperCount,
      reviewPaperCount,
      commentaryPaperCount
    }
  };
}

export function renderAtlasMarkdown(summary: AtlasSummary): string {
  const lines: string[] = [];

  lines.push(`# ${summary.domain} protocol atlas`);
  lines.push("");
  lines.push(`Total papers: ${summary.totalPapers}`);
  lines.push("");
  lines.push("## Quality signals");
  lines.push(`- unknown protocol families: ${summary.qualitySignals.unknownProtocolFamilyCount}`);
  lines.push(`- unknown protocol family rate: ${summary.qualitySignals.unknownProtocolFamilyRate}`);
  lines.push(`- unknown step phases: ${summary.qualitySignals.unknownStepPhaseCount}`);
  lines.push(`- contradiction count: ${summary.qualitySignals.contradictionCount}`);
  lines.push(`- experimental papers: ${summary.qualitySignals.experimentalPaperCount}`);
  lines.push(`- methods papers: ${summary.qualitySignals.methodsPaperCount}`);
  lines.push(`- review papers: ${summary.qualitySignals.reviewPaperCount}`);
  lines.push(`- commentary papers: ${summary.qualitySignals.commentaryPaperCount}`);
  lines.push("");
  lines.push("## Protocol families");
  for (const entry of summary.protocolFamilies) {
    lines.push(`- ${entry.label}: ${entry.count}`);
  }

  lines.push("");
  lines.push("## Top chemicals");
  for (const entry of summary.topChemicals) {
    lines.push(`- ${entry.label}: ${entry.count}`);
  }

  lines.push("");
  lines.push("## Top specimen types");
  for (const entry of summary.topSpecimenTypes) {
    lines.push(`- ${entry.label}: ${entry.count}`);
  }

  lines.push("");
  lines.push("## Top outcome classes");
  for (const entry of summary.topOutcomes) {
    lines.push(`- ${entry.label}: ${entry.count}`);
  }

  lines.push("");
  lines.push("## Top protocol phases");
  for (const entry of summary.topStepPhases) {
    lines.push(`- ${entry.label}: ${entry.count}`);
  }

  lines.push("");
  lines.push("## High-confidence papers");
  for (const paper of summary.highConfidencePapers) {
    lines.push(
      `- ${paper.title} | type=${paper.paperType} | family=${paper.protocolFamily} | confidence=${paper.extractionConfidence} | chemicals=${paper.chemicals.join(", ") || "none"} | specimen=${paper.specimenTypes.join(", ") || "unspecified"} | phases=${paper.stepPhases.join(", ") || "none"}`
    );
    if (paper.species.length > 0) {
      lines.push(`  species=${paper.species.join(", ")}`);
    }
  }

  lines.push("");
  lines.push("## Uncertainty hotspots");
  if (summary.uncertaintyHotspots.length === 0) {
    lines.push("- none detected yet");
  } else {
    for (const hotspot of summary.uncertaintyHotspots) {
      lines.push(
        `- ${hotspot.protocolFamily} + ${hotspot.chemical} + ${hotspot.specimenType} | papers=${hotspot.paperCount} | outcomes=${hotspot.outcomeClasses.join(", ")}`
      );
    }
  }

  lines.push("");
  lines.push("## Contradictions");
  if (summary.contradictions.length === 0) {
    lines.push("- none detected yet");
  } else {
    for (const contradiction of summary.contradictions.slice(0, 10)) {
      lines.push(
        `- ${contradiction.topic} | ${contradiction.paperA.protocolFamily} vs ${contradiction.paperB.protocolFamily} | ${contradiction.reason}`
      );
      lines.push(`  A: ${contradiction.paperA.title}`);
      lines.push(`  B: ${contradiction.paperB.title}`);
    }
  }

  lines.push("");
  lines.push("## Ranked hypotheses");
  if (summary.researchHypotheses.length === 0) {
    lines.push("- none generated yet");
  } else {
    for (const hypothesis of summary.researchHypotheses.slice(0, 5)) {
      lines.push(
        `- ${hypothesis.title} | category=${hypothesis.category} | priority=${hypothesis.scores.priorityScore} | evidence=${hypothesis.scores.evidenceScore} | uncertainty=${hypothesis.scores.uncertaintyScore} | actionability=${hypothesis.scores.actionabilityScore}`
      );
      lines.push(`  claim=${hypothesis.claim}`);
      lines.push(
        `  evidence=papers:${hypothesis.evidence.totalPaperCount}, experimental:${hypothesis.evidence.experimentalPaperCount}, comparative:${hypothesis.evidence.comparativePaperCount}, species:${hypothesis.evidence.distinctSpeciesCount}, strong-outcomes:${hypothesis.evidence.strongOutcomePaperCount}, transplantation:${hypothesis.evidence.transplantationPaperCount}, contradictions:${hypothesis.evidence.contradictionCount}, sparse-protocols:${hypothesis.evidence.sparseProtocolPaperCount}`
      );
      if (hypothesis.blockers.length > 0) {
        lines.push(`  blockers=${hypothesis.blockers.join(" | ")}`);
      }
      lines.push(`  proposed-experiment=${hypothesis.proposedExperiment}`);
    }
  }

  lines.push("");
  lines.push("## Suggested next experiments");
  for (const suggestion of summary.experimentSuggestions) {
    lines.push(`- ${suggestion.title} | category=${suggestion.category} | confidence=${suggestion.confidence}`);
    lines.push(`  hypothesis=${suggestion.hypothesis}`);
    lines.push(`  rationale=${suggestion.rationale}`);
    lines.push(
      `  context=chemicals:${suggestion.supportingContext.chemicals.join(", ") || "none"} | specimen:${suggestion.supportingContext.specimenTypes.join(", ") || "none"} | families:${suggestion.supportingContext.protocolFamilies.join(", ")}`
    );
  }

  lines.push("");
  return lines.join("\n");
}
