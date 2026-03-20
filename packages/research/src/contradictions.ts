import {
  ContradictionSchema,
  type Contradiction,
  type ExtractionSnapshot,
  type OutcomeClass,
  type ProtocolExtraction
} from "../../shared/src/schema.js";

function intersection(valuesA: string[], valuesB: string[]): string[] {
  const setB = new Set(valuesB);
  return Array.from(new Set(valuesA.filter((value) => setB.has(value))));
}

function outcomeClasses(extraction: ProtocolExtraction): OutcomeClass[] {
  return Array.from(new Set(extraction.outcomeMentions.map((entry) => entry.outcomeClass)));
}

function experimentalComparable(extraction: ProtocolExtraction): boolean {
  return extraction.paperType === "experimental" || extraction.paperType === "unknown";
}

function contradictionReason(paperA: ProtocolExtraction, paperB: ProtocolExtraction): string | null {
  const sharedChemicals = intersection(
    paperA.chemicalMentions.map((entry) => entry.canonicalName),
    paperB.chemicalMentions.map((entry) => entry.canonicalName)
  );
  const sharedSpecimenTypes = intersection(paperA.specimenTypes, paperB.specimenTypes);
  const sharedSpecies = intersection(paperA.speciesMentions, paperB.speciesMentions);
  const outcomesA = outcomeClasses(paperA);
  const outcomesB = outcomeClasses(paperB);
  const sharedOutcomes = intersection(outcomesA, outcomesB);

  if (!experimentalComparable(paperA) || !experimentalComparable(paperB)) {
    return null;
  }

  if (sharedChemicals.length === 0 || sharedSpecimenTypes.length === 0) {
    return null;
  }

  if (paperA.speciesMentions.length > 0 && paperB.speciesMentions.length > 0 && sharedSpecies.length === 0) {
    return null;
  }

  if (
    paperA.protocolFamily !== paperB.protocolFamily &&
    paperA.protocolFamily !== "unknown" &&
    paperB.protocolFamily !== "unknown" &&
    sharedChemicals.length >= 1
  ) {
    return "Shared specimen/chemical context but different preservation families";
  }

  if (
    sharedOutcomes.length === 0 &&
    outcomesA.length > 0 &&
    outcomesB.length > 0 &&
    paperA.protocolFamily === paperB.protocolFamily
  ) {
    return "Shared specimen/chemical context but different outcome emphasis";
  }

  return null;
}

export function detectContradictions(snapshot: ExtractionSnapshot): Contradiction[] {
  const contradictions: Contradiction[] = [];

  for (let indexA = 0; indexA < snapshot.extractions.length; indexA += 1) {
    for (let indexB = indexA + 1; indexB < snapshot.extractions.length; indexB += 1) {
      const paperA = snapshot.extractions[indexA];
      const paperB = snapshot.extractions[indexB];
      const reason = contradictionReason(paperA, paperB);

      if (!reason) {
        continue;
      }

      const sharedChemicals = intersection(
        paperA.chemicalMentions.map((entry) => entry.canonicalName),
        paperB.chemicalMentions.map((entry) => entry.canonicalName)
      );
      const sharedSpecimenTypes = intersection(paperA.specimenTypes, paperB.specimenTypes);

      contradictions.push(
        ContradictionSchema.parse({
          topic: `${sharedChemicals.join(", ")} in ${sharedSpecimenTypes.join(", ")}`,
          paperA: {
            title: paperA.paper.title,
            protocolFamily: paperA.protocolFamily,
            outcomeClasses: outcomeClasses(paperA)
          },
          paperB: {
            title: paperB.paper.title,
            protocolFamily: paperB.protocolFamily,
            outcomeClasses: outcomeClasses(paperB)
          },
          sharedContext: {
            chemicals: sharedChemicals,
            specimenTypes: sharedSpecimenTypes
          },
          reason,
          confidence: paperA.protocolFamily !== "unknown" && paperB.protocolFamily !== "unknown" ? 0.8 : 0.65
        })
      );
    }
  }

  return contradictions
    .sort((left, right) => right.sharedContext.chemicals.length - left.sharedContext.chemicals.length)
    .slice(0, 20);
}
