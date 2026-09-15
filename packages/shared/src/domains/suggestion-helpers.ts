import type { OutcomeClass, ProtocolExtraction, ProtocolFamily } from "../schema.js";

export function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

export function chemicalNames(extractions: ProtocolExtraction[]): string[] {
  return unique(
    extractions.flatMap((extraction) => extraction.chemicalMentions.map((chemical) => chemical.canonicalName))
  );
}

export function paperTitles(extractions: ProtocolExtraction[], limit = 6): string[] {
  return unique(extractions.map((extraction) => extraction.paper.title)).slice(0, limit);
}

export function families(extractions: ProtocolExtraction[]): ProtocolFamily[] {
  return unique(extractions.map((extraction) => extraction.protocolFamily));
}

export function withSpecimen(extractions: ProtocolExtraction[], specimenType: string): ProtocolExtraction[] {
  return extractions.filter((extraction) => extraction.specimenTypes.includes(specimenType));
}

export function withChemicals(extractions: ProtocolExtraction[], canonicalNames: string[]): ProtocolExtraction[] {
  return extractions.filter((extraction) => {
    const names = extraction.chemicalMentions.map((chemical) => chemical.canonicalName);
    return canonicalNames.every((name) => names.includes(name));
  });
}

export function withFamily(extractions: ProtocolExtraction[], family: ProtocolFamily): ProtocolExtraction[] {
  return extractions.filter((extraction) => extraction.protocolFamily === family);
}

export function withOutcome(extractions: ProtocolExtraction[], outcomeClasses: OutcomeClass[]): ProtocolExtraction[] {
  return extractions.filter((extraction) =>
    extraction.outcomeMentions.some((outcome) => outcomeClasses.includes(outcome.outcomeClass))
  );
}

export function withTitle(extractions: ProtocolExtraction[], pattern: RegExp): ProtocolExtraction[] {
  return extractions.filter((extraction) => pattern.test(extraction.paper.title));
}

export function withPhase(extractions: ProtocolExtraction[], phase: string): ProtocolExtraction[] {
  return extractions.filter((extraction) => extraction.protocolSteps.some((step) => step.phase === phase));
}

/** Papers whose step structure names exactly one non-unknown phase. */
export function sparseProtocolPapers(extractions: ProtocolExtraction[]): ProtocolExtraction[] {
  return extractions.filter((extraction) => {
    const phases = unique(extraction.protocolSteps.map((step) => step.phase).filter((phase) => phase !== "unknown"));
    return phases.length > 0 && phases.length <= 1;
  });
}
