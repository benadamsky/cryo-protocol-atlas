import {
  ExperimentSuggestionSchema,
  type ExperimentSuggestion,
  type ExtractionSnapshot
} from "../../shared/src/schema.js";

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function buildExperimentSuggestions(snapshot: ExtractionSnapshot): ExperimentSuggestion[] {
  const suggestions: ExperimentSuggestion[] = [];

  const ovarianTissuePapers = snapshot.extractions.filter((extraction) =>
    extraction.specimenTypes.includes("ovarian tissue")
  );

  const dmsoTissuePapers = ovarianTissuePapers.filter((extraction) =>
    extraction.chemicalMentions.some((chemical) => chemical.canonicalName === "Dimethyl Sulfoxide")
  );

  const dmsoFamilies = unique(
    dmsoTissuePapers.map((extraction) => extraction.protocolFamily).filter((family) => family !== "unknown")
  );

  if (dmsoTissuePapers.length >= 4) {
    suggestions.push(
      ExperimentSuggestionSchema.parse({
        title: "Head-to-head DMSO-centered ovarian tissue benchmark",
        category: "benchmark",
        hypothesis:
          "A matched-species ovarian tissue benchmark will separate protocol-family effects from paper-to-paper noise in DMSO-centered preservation.",
        rationale:
          "DMSO appears repeatedly in ovarian tissue papers, but the corpus mixes unknown, slow-freezing, and vitrification contexts with morphology-heavy endpoints. A direct benchmark should reduce ambiguity faster than another literature pass.",
        supportingContext: {
          chemicals: ["Dimethyl Sulfoxide"],
          specimenTypes: ["ovarian tissue"],
          protocolFamilies: dmsoFamilies,
          paperTitles: dmsoTissuePapers.slice(0, 6).map((entry) => entry.paper.title)
        },
        confidence: 0.84
      })
    );
  }

  const dmsoEgTissuePapers = ovarianTissuePapers.filter((extraction) => {
    const names = extraction.chemicalMentions.map((chemical) => chemical.canonicalName);
    return names.includes("Dimethyl Sulfoxide") && names.includes("Ethylene Glycol");
  });

  if (dmsoEgTissuePapers.length >= 2) {
    suggestions.push(
      ExperimentSuggestionSchema.parse({
        title: "Same-species DMSO + EG vitrification benchmark",
        category: "benchmark",
        hypothesis:
          "The apparent promise of DMSO + ethylene glycol in ovarian tissue is currently species-confounded and should be tested within one species and one specimen format.",
        rationale:
          "The corpus shows DMSO + EG in ovarian tissue, but the strongest papers are spread across different species. A same-species benchmark would tell us whether the signal is chemistry-driven or model-driven.",
        supportingContext: {
          chemicals: ["Dimethyl Sulfoxide", "Ethylene Glycol"],
          specimenTypes: ["ovarian tissue", "follicles"],
          protocolFamilies: unique(dmsoEgTissuePapers.map((entry) => entry.protocolFamily)),
          paperTitles: dmsoEgTissuePapers.map((entry) => entry.paper.title)
        },
        confidence: 0.79
      })
    );
  }

  const morphologyHeavy = ovarianTissuePapers.filter((extraction) =>
    extraction.outcomeMentions.some((outcome) => outcome.outcomeClass === "morphology")
  );
  const viabilityOrBetter = ovarianTissuePapers.filter((extraction) =>
    extraction.outcomeMentions.some((outcome) =>
      ["viability", "reproductive", "transplantation", "function"].includes(outcome.outcomeClass)
    )
  );

  if (morphologyHeavy.length > viabilityOrBetter.length) {
    suggestions.push(
      ExperimentSuggestionSchema.parse({
        title: "Promote morphology-heavy protocols to viability endpoints",
        category: "endpoint-upgrade",
        hypothesis:
          "Several ovarian tissue protocols that currently look acceptable on morphology alone will reshuffle once they are compared on viability or functional endpoints.",
        rationale:
          "The current corpus is still dominated by morphology outcomes. Running the same preservation conditions with viability-focused readouts is likely higher signal than inventing a new formulation immediately.",
        supportingContext: {
          chemicals: unique(
            morphologyHeavy.flatMap((entry) =>
              entry.chemicalMentions.map((chemical) => chemical.canonicalName)
            )
          ).slice(0, 4),
          specimenTypes: ["ovarian tissue", "follicles"],
          protocolFamilies: unique(morphologyHeavy.map((entry) => entry.protocolFamily)),
          paperTitles: morphologyHeavy.slice(0, 6).map((entry) => entry.paper.title)
        },
        confidence: 0.82
      })
    );
  }

  const wholeOvaryPapers = snapshot.extractions.filter((extraction) =>
    extraction.specimenTypes.includes("whole ovary")
  );
  const wholeOvaryPerfusionPapers = wholeOvaryPapers.filter((extraction) =>
    extraction.protocolSteps.some((step) => step.phase === "perfusion")
  );

  if (wholeOvaryPapers.length > 0 && wholeOvaryPapers.length <= 4) {
    suggestions.push(
      ExperimentSuggestionSchema.parse({
        title: "Whole-ovary perfusion and rewarming workflow benchmark",
        category: "scale-up",
        hypothesis:
          "Whole-ovary success is currently limited more by perfusion/loading workflow quality than by entirely new chemistry.",
        rationale:
          "Whole-ovary papers are sparse but repeatedly mention perfusion, controlled gradients, and rewarming. A workflow benchmark around loading/unloading plus perfusion measurements is a plausible scale-up experiment.",
        supportingContext: {
          chemicals: unique(
            wholeOvaryPapers.flatMap((entry) =>
              entry.chemicalMentions.map((chemical) => chemical.canonicalName)
            )
          ),
          specimenTypes: ["whole ovary"],
          protocolFamilies: unique(wholeOvaryPapers.map((entry) => entry.protocolFamily)),
          paperTitles: wholeOvaryPerfusionPapers.map((entry) => entry.paper.title)
        },
        confidence: 0.76
      })
    );
  }

  const unknownFamilyExperimental = snapshot.extractions.filter(
    (extraction) => extraction.paperType === "experimental" && extraction.protocolFamily === "unknown"
  );

  if (unknownFamilyExperimental.length >= 3) {
    suggestions.push(
      ExperimentSuggestionSchema.parse({
        title: "Manual full-text resolution of unknown experimental protocols",
        category: "workflow-gap",
        hypothesis:
          "Several of the most valuable gaps are not new experiments yet, but missing protocol details that the current abstract-level pass cannot resolve.",
        rationale:
          "Unknown-family experimental papers are bottlenecks because they could materially change the protocol map once full protocol details are extracted. Resolving them is a high-signal precursor to new wet-lab work.",
        supportingContext: {
          chemicals: unique(
            unknownFamilyExperimental.flatMap((entry) =>
              entry.chemicalMentions.map((chemical) => chemical.canonicalName)
            )
          ).slice(0, 5),
          specimenTypes: unique(
            unknownFamilyExperimental.flatMap((entry) => entry.specimenTypes)
          ).slice(0, 5),
          protocolFamilies: ["unknown"],
          paperTitles: unknownFamilyExperimental.slice(0, 6).map((entry) => entry.paper.title)
        },
        confidence: 0.87
      })
    );
  }

  return suggestions.slice(0, 5);
}
