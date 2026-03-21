import {
  ExperimentSuggestionSchema,
  type ExperimentSuggestion,
  type ExtractionSnapshot,
  type ProtocolExtraction
} from "../../shared/src/schema.js";

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function namesFor(extractions: ProtocolExtraction[]): string[] {
  return unique(
    extractions.flatMap((extraction) => extraction.chemicalMentions.map((chemical) => chemical.canonicalName))
  );
}

function titlesFor(extractions: ProtocolExtraction[], limit = 6): string[] {
  return unique(extractions.map((extraction) => extraction.paper.title)).slice(0, limit);
}

function ovarianSuggestions(snapshot: ExtractionSnapshot): ExperimentSuggestion[] {
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
          chemicals: namesFor(morphologyHeavy).slice(0, 4),
          specimenTypes: ["ovarian tissue", "follicles"],
          protocolFamilies: unique(morphologyHeavy.map((entry) => entry.protocolFamily)),
          paperTitles: titlesFor(morphologyHeavy)
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
          chemicals: namesFor(wholeOvaryPapers),
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
          chemicals: namesFor(unknownFamilyExperimental).slice(0, 5),
          specimenTypes: unique(unknownFamilyExperimental.flatMap((entry) => entry.specimenTypes)).slice(0, 5),
          protocolFamilies: ["unknown"],
          paperTitles: titlesFor(unknownFamilyExperimental)
        },
        confidence: 0.87
      })
    );
  }

  return suggestions.slice(0, 5);
}

function isletSuggestions(snapshot: ExtractionSnapshot): ExperimentSuggestion[] {
  const suggestions: ExperimentSuggestion[] = [];
  const experimental = snapshot.extractions.filter((extraction) => extraction.paperType === "experimental");
  const slowFreezing = experimental.filter((extraction) => extraction.protocolFamily === "slow-freezing");
  const vitrification = experimental.filter((extraction) => extraction.protocolFamily === "vitrification");
  const comparative = experimental.filter((extraction) => extraction.protocolFamily === "comparative");
  const functionPapers = experimental.filter((extraction) =>
    extraction.outcomeMentions.some((outcome) => outcome.outcomeClass === "function")
  );
  const transplantationPapers = experimental.filter((extraction) =>
    extraction.outcomeMentions.some((outcome) => outcome.outcomeClass === "transplantation")
  );
  const adjunctTitles = experimental.filter((extraction) =>
    /trehalose|curcumin|beraprost|p38 mapk inhibitor|polyvinyl pyrrolidone|polyethylene glycol/i.test(
      extraction.paper.title
    )
  );
  const sparseProtocolPapers = experimental.filter((extraction) => {
    const nonUnknownPhases = unique(
      extraction.protocolSteps.map((step) => step.phase).filter((phase) => phase !== "unknown")
    );
    return nonUnknownPhases.length > 0 && nonUnknownPhases.length <= 1;
  });

  if (slowFreezing.length >= 8 && (vitrification.length >= 2 || comparative.length >= 1)) {
    suggestions.push(
      ExperimentSuggestionSchema.parse({
        title: "Matched-species islet vitrification vs slow-freezing benchmark",
        category: "benchmark",
        hypothesis:
          "The current islet corpus overweights slow-freezing, so a matched-species comparison is needed to separate real vitrification gains from endpoint and species confounding.",
        rationale:
          "The cleaned islet slice contains many slow-freezing studies, a smaller vitrification set, and a few comparative papers. A direct benchmark with the same species and the same post-thaw function readout is the fastest way to convert that literature asymmetry into actionable signal.",
        supportingContext: {
          chemicals: namesFor([...slowFreezing, ...vitrification]).slice(0, 5),
          specimenTypes: ["islets", "pancreatic islets"],
          protocolFamilies: unique([...slowFreezing, ...vitrification, ...comparative].map((entry) => entry.protocolFamily)),
          paperTitles: titlesFor([...comparative, ...vitrification, ...slowFreezing])
        },
        confidence: 0.86
      })
    );
  }

  if (adjunctTitles.length >= 4) {
    suggestions.push(
      ExperimentSuggestionSchema.parse({
        title: "Additive-assisted islet recovery benchmark on a fixed base cryomix",
        category: "benchmark",
        hypothesis:
          "Several islet papers imply that recovery gains may come from adjuncts added around a standard cryomix rather than from entirely new base CPA chemistry.",
        rationale:
          "Trehalose, curcumin, beraprost, and other adjunct-style titles recur in the curated islet slice, but they are not benchmarked against one another on the same base protocol. Holding the core cryomix fixed and comparing post-thaw recovery/function would quickly test whether the additive signal is real.",
        supportingContext: {
          chemicals: namesFor(adjunctTitles).slice(0, 6),
          specimenTypes: ["islets", "pancreatic islets"],
          protocolFamilies: unique(adjunctTitles.map((entry) => entry.protocolFamily)),
          paperTitles: titlesFor(adjunctTitles)
        },
        confidence: 0.83
      })
    );
  }

  if (functionPapers.length > transplantationPapers.length) {
    suggestions.push(
      ExperimentSuggestionSchema.parse({
        title: "Promote islet function-heavy protocols to transplantation endpoints",
        category: "endpoint-upgrade",
        hypothesis:
          "Several islet protocols that look promising on insulin secretion or in-vitro function will reorder once they are compared on graft or transplantation outcomes.",
        rationale:
          "The curated islet slice now has better function labeling than transplantation coverage. Converting the strongest in-vitro function protocols into a small transplantation benchmark is likely higher-signal than inventing a new chemistry path immediately.",
        supportingContext: {
          chemicals: namesFor(functionPapers).slice(0, 5),
          specimenTypes: ["islets", "pancreatic islets"],
          protocolFamilies: unique(functionPapers.map((entry) => entry.protocolFamily)),
          paperTitles: titlesFor(functionPapers)
        },
        confidence: 0.81
      })
    );
  }

  if (sparseProtocolPapers.length >= 2) {
    suggestions.push(
      ExperimentSuggestionSchema.parse({
        title: "Full-text protocol resolution for sparse islet thaw/loading workflows",
        category: "workflow-gap",
        hypothesis:
          "A small number of islet papers still look interesting, but their step structure is too thin to compare fairly against the rest of the corpus.",
        rationale:
          "The benchmarked islet slice is now minimum-depth ready, and the remaining weak points are concentrated in a few papers where only thawing or one procedural phase is explicit. Full-text resolution there is likely higher signal than another broad extraction pass.",
        supportingContext: {
          chemicals: namesFor(sparseProtocolPapers).slice(0, 5),
          specimenTypes: ["islets", "pancreatic islets"],
          protocolFamilies: unique(sparseProtocolPapers.map((entry) => entry.protocolFamily)),
          paperTitles: titlesFor(sparseProtocolPapers)
        },
        confidence: 0.84
      })
    );
  }

  const largeScalePapers = experimental.filter((extraction) =>
    /banking|large quantities|bulk|transported between centers/i.test(extraction.paper.title)
  );

  if (largeScalePapers.length >= 2) {
    suggestions.push(
      ExperimentSuggestionSchema.parse({
        title: "Scale-up benchmark for banked or bulk islet handling",
        category: "scale-up",
        hypothesis:
          "Scale-up losses in islet banking may come from handling and thaw workflow variance rather than core cryomix choice alone.",
        rationale:
          "The islet corpus includes bulk/banking/transport titles, but those papers are scattered across sparse workflow descriptions. A scale-up benchmark focused on loading, storage, thaw, and handling variance would test whether operational workflow dominates the observed recovery losses.",
        supportingContext: {
          chemicals: namesFor(largeScalePapers).slice(0, 5),
          specimenTypes: ["islets", "pancreatic islets"],
          protocolFamilies: unique(largeScalePapers.map((entry) => entry.protocolFamily)),
          paperTitles: titlesFor(largeScalePapers)
        },
        confidence: 0.78
      })
    );
  }

  return suggestions.slice(0, 5);
}

export function buildExperimentSuggestions(snapshot: ExtractionSnapshot): ExperimentSuggestion[] {
  if (snapshot.domain === "islets") {
    return isletSuggestions(snapshot);
  }

  return ovarianSuggestions(snapshot);
}
