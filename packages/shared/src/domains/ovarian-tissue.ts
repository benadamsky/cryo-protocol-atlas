import type { DomainDefinition } from "./types.js";
import {
  chemicalNames,
  families,
  paperTitles,
  unique,
  withChemicals,
  withOutcome,
  withPhase,
  withSpecimen
} from "./suggestion-helpers.js";

export const ovarianTissue: DomainDefinition<"ovarian-tissue"> = {
  id: "ovarian-tissue",
  label: "Ovarian tissue",

  ingest: {
    anchorKeywords: [
      "ovary",
      "ovaries",
      "ovarian tissue",
      "ovarian cortex",
      "ovarian cortical",
      "cortical pieces",
      "cortical strips",
      "whole ovary",
      "follicle",
      "follicles"
    ],
    supportingKeywords: ["ovarian", "oocyte", "oocytes", "fertility preservation", "reproductive tissue", "cryopreservation"]
  },

  discovery: {
    queryDescription:
      "Cryopreservation literature for ovarian tissue, ovarian cortex, follicles, and whole-ovary workflows with explicit storage, freezing, vitrification, or thaw signal.",
    cryodbQuery: "ovarian tissue cryopreservation",
    liveQueryAnchors: [
      "ovarian tissue",
      "ovarian cortex",
      "whole ovary",
      "ovarian follicles",
      "primordial follicles",
      "preantral follicles"
    ],
    anchorConcepts: [
      { label: "ovarian tissue", phrases: ["ovarian tissue", "ovarian tissues"] },
      { label: "ovarian cortex", phrases: ["ovarian cortex", "ovarian cortical"] },
      { label: "whole ovary", phrases: ["whole ovary", "whole ovaries"] },
      {
        label: "follicles",
        phrases: [
          "ovarian follicle",
          "ovarian follicles",
          "primordial follicle",
          "primordial follicles",
          "preantral follicle",
          "preantral follicles"
        ]
      }
    ],
    extraRequiredSupportingConcepts: [{ label: "cryostorage", phrases: ["cryostorage", "liquid nitrogen"] }],
    contextualSupportingConcepts: [
      { label: "fertility preservation", phrases: ["fertility preservation"] },
      { label: "oocyte", phrases: ["oocyte", "oocytes"] },
      { label: "transplantation", phrases: ["transplantation", "transplant", "autotransplant", "graft"] }
    ],
    titleMethodConcepts: [
      { label: "protocol", phrases: ["protocol", "procedure", "workflow", "method"] },
      { label: "comparison", phrases: ["comparison", "compare", "versus", "vs"] },
      { label: "culture", phrases: ["culture", "cultured", "in vitro growth", "ivg"] },
      {
        label: "cryoprotectant handling",
        phrases: ["cryoprotectant", "cryoprotective agent", "cryoprotective agents", "permeation", "equilibration", "warming"]
      },
      { label: "freezing method", phrases: ["slow freezing", "slow cooling", "vitrification", "vitrified"] }
    ],
    blockedTitleConcepts: [
      { label: "review style", phrases: ["systematic review", "meta-analysis", "meta analysis"] },
      { label: "clinical outcome", phrases: ["live birth", "pregnancy", "pregnancies", "woman", "women", "children following"] },
      { label: "broad summary", phrases: ["overview", "state of the art"] }
    ],
    minimumTitleRequiredSupportingMatches: 2,
    minimumTitleMethodMatches: 1
  },

  extraction: {
    sourceContextPrefix: "Ovarian source context",
    extraChemicalAliases: [{ canonicalName: "Ringer-Acetate", aliases: ["ringer-acetate", "ringer acetate"] }],
    specimenPatterns: [
      { label: "whole ovary", pattern: /\bwhole ovary\b/i, weight: 3 },
      { label: "ovarian tissue", pattern: /\bovarian tissue\b/i, weight: 3 },
      { label: "ovarian cortex", pattern: /\bovarian cortical?(?: pieces?| strips?| blocks?)?\b/i, weight: 3 },
      { label: "follicles", pattern: /\bfollicles?\b/i, weight: 2 },
      { label: "oocytes", pattern: /\boocytes?\b/i, weight: 1 },
      { label: "embryos", pattern: /\bembryos?\b/i, weight: 1 }
    ],
    outcomeRules: [
      {
        outcomeClass: "reproductive",
        strength: "strong",
        patterns: [/\blive births?\b/i, /\bpregnancy\b/i, /\bfertilizable oocytes?\b/i]
      },
      {
        outcomeClass: "transplantation",
        strength: "strong",
        patterns: [/\btransplant(?:ation|ed)?\b/i, /\bauto-?transplantation\b/i, /\borthotopic(?:ally)?\b/i]
      },
      {
        outcomeClass: "function",
        strength: "moderate",
        patterns: [/\bhormone function\b/i, /\bhormones? (?:were )?restored\b/i, /\bcyclic ovarian activity\b/i]
      },
      {
        outcomeClass: "viability",
        strength: "moderate",
        patterns: [/\bviability\b/i, /\blive-dead assay\b/i, /\bmortality rates?\b/i]
      },
      {
        outcomeClass: "morphology",
        strength: "weak",
        patterns: [/\bmorpholog(?:y|ical)\b/i, /\bultrastruct(?:ure|ural)\b/i, /\bhistolog(?:y|ical)\b/i]
      }
    ],
    outcomeSentenceTerms: /pregnancy|live births?|hormone|follicle|oocyte/i,
    paperType: {
      extraReviewPatterns: [/\bfuture potential\b/, /\bthis paper selectively reviews\b/, /\bthis review summarizes\b/],
      extraMethodsPatterns: [/\bdifferential scanning calorimetry\b/],
      extraExperimentalAbstractPatterns: [/\bresult\(s\)\b/i, /\bmethods\b/i]
    }
  },

  suggestionTemplates: [
    {
      title: "Head-to-head DMSO-centered ovarian tissue benchmark",
      category: "benchmark",
      hypothesis:
        "A matched-species ovarian tissue benchmark will separate protocol-family effects from paper-to-paper noise in DMSO-centered preservation.",
      rationale:
        "DMSO appears repeatedly in ovarian tissue papers, but the corpus mixes unknown, slow-freezing, and vitrification contexts with morphology-heavy endpoints. A direct benchmark should reduce ambiguity faster than another literature pass.",
      confidence: 0.84,
      select: ({ extractions }) => {
        const dmsoTissuePapers = withChemicals(withSpecimen(extractions, "ovarian tissue"), ["Dimethyl Sulfoxide"]);
        if (dmsoTissuePapers.length < 4) {
          return null;
        }
        return {
          chemicals: ["Dimethyl Sulfoxide"],
          specimenTypes: ["ovarian tissue"],
          protocolFamilies: families(dmsoTissuePapers).filter((family) => family !== "unknown"),
          paperTitles: dmsoTissuePapers.slice(0, 6).map((entry) => entry.paper.title)
        };
      }
    },
    {
      title: "Same-species DMSO + EG vitrification benchmark",
      category: "benchmark",
      hypothesis:
        "The apparent promise of DMSO + ethylene glycol in ovarian tissue is currently species-confounded and should be tested within one species and one specimen format.",
      rationale:
        "The corpus shows DMSO + EG in ovarian tissue, but the strongest papers are spread across different species. A same-species benchmark would tell us whether the signal is chemistry-driven or model-driven.",
      confidence: 0.79,
      select: ({ extractions }) => {
        const dmsoEgTissuePapers = withChemicals(withSpecimen(extractions, "ovarian tissue"), [
          "Dimethyl Sulfoxide",
          "Ethylene Glycol"
        ]);
        if (dmsoEgTissuePapers.length < 2) {
          return null;
        }
        return {
          chemicals: ["Dimethyl Sulfoxide", "Ethylene Glycol"],
          specimenTypes: ["ovarian tissue", "follicles"],
          protocolFamilies: families(dmsoEgTissuePapers),
          paperTitles: dmsoEgTissuePapers.map((entry) => entry.paper.title)
        };
      }
    },
    {
      title: "Promote morphology-heavy protocols to viability endpoints",
      category: "endpoint-upgrade",
      hypothesis:
        "Several ovarian tissue protocols that currently look acceptable on morphology alone will reshuffle once they are compared on viability or functional endpoints.",
      rationale:
        "The current corpus is still dominated by morphology outcomes. Running the same preservation conditions with viability-focused readouts is likely higher signal than inventing a new formulation immediately.",
      confidence: 0.82,
      select: ({ extractions }) => {
        const ovarianTissuePapers = withSpecimen(extractions, "ovarian tissue");
        const morphologyHeavy = withOutcome(ovarianTissuePapers, ["morphology"]);
        const viabilityOrBetter = withOutcome(ovarianTissuePapers, ["viability", "reproductive", "transplantation", "function"]);
        if (morphologyHeavy.length <= viabilityOrBetter.length) {
          return null;
        }
        return {
          chemicals: chemicalNames(morphologyHeavy).slice(0, 4),
          specimenTypes: ["ovarian tissue", "follicles"],
          protocolFamilies: families(morphologyHeavy),
          paperTitles: paperTitles(morphologyHeavy)
        };
      }
    },
    {
      title: "Whole-ovary perfusion and rewarming workflow benchmark",
      category: "scale-up",
      hypothesis:
        "Whole-ovary success is currently limited more by perfusion/loading workflow quality than by entirely new chemistry.",
      rationale:
        "Whole-ovary papers are sparse but repeatedly mention perfusion, controlled gradients, and rewarming. A workflow benchmark around loading/unloading plus perfusion measurements is a plausible scale-up experiment.",
      confidence: 0.76,
      select: ({ extractions }) => {
        const wholeOvaryPapers = withSpecimen(extractions, "whole ovary");
        if (wholeOvaryPapers.length === 0 || wholeOvaryPapers.length > 4) {
          return null;
        }
        return {
          chemicals: chemicalNames(wholeOvaryPapers),
          specimenTypes: ["whole ovary"],
          protocolFamilies: families(wholeOvaryPapers),
          paperTitles: withPhase(wholeOvaryPapers, "perfusion").map((entry) => entry.paper.title)
        };
      }
    },
    {
      title: "Manual full-text resolution of unknown experimental protocols",
      category: "workflow-gap",
      hypothesis:
        "Several of the most valuable gaps are not new experiments yet, but missing protocol details that the current abstract-level pass cannot resolve.",
      rationale:
        "Unknown-family experimental papers are bottlenecks because they could materially change the protocol map once full protocol details are extracted. Resolving them is a high-signal precursor to new wet-lab work.",
      confidence: 0.87,
      select: ({ extractions }) => {
        const unknownFamilyExperimental = extractions.filter(
          (extraction) => extraction.paperType === "experimental" && extraction.protocolFamily === "unknown"
        );
        if (unknownFamilyExperimental.length < 3) {
          return null;
        }
        return {
          chemicals: chemicalNames(unknownFamilyExperimental).slice(0, 5),
          specimenTypes: unique(unknownFamilyExperimental.flatMap((entry) => entry.specimenTypes)).slice(0, 5),
          protocolFamilies: ["unknown"],
          paperTitles: paperTitles(unknownFamilyExperimental)
        };
      }
    }
  ],

  research: {
    benchmarkNeedsBothFamilies: false,
    genericSpecimenTypes: ["ovarian tissue", "follicles"],
    likelyBuyers: "fertility preservation, ovarian tissue banking, and transplant-adjacent preservation groups",
    packetTranslationalRationale: {
      benchmark:
        "This packet is useful if Atlas is being used to justify a wedge in fertility preservation, ovarian tissue banking, or transplant-adjacent preservation workflows.",
      default:
        "This packet is useful if Atlas is being used to justify a wedge in fertility preservation, ovarian tissue banking, or transplant-adjacent preservation workflows."
    },
    commercialWhyNow: {
      default:
        "Commercial relevance depends on whether better protocol evidence can bridge into organ banking, fertility, or transplant-adjacent workflows."
    },
    resolutionPriorityBonus: [
      { specimenType: "ovarian tissue", bonus: 2 },
      { specimenType: "whole ovary", bonus: 1 }
    ],
    commercialSignalBonus: 0
  },

  console: {
    shortLabel: "Ovarian",
    strapline: "Fertility-preservation tissue workflows; benchmark depth still thin.",
    accent: "#e36b4a",
    accentSoft: "rgba(227, 107, 74, 0.18)",
    plainWedgeSummary:
      "Run a head-to-head DMSO-centered benchmark in one species before treating ovarian tissue as a company wedge."
  },

  regressionScenarios: [
    {
      id: "reviewed-exclusion-regression",
      description: "Remove a reviewed exclusion so an out-of-slice paper leaks back into the atlas.",
      mutation: { kind: "remove-override", paperId: "e6aaf317-52fc-441c-bac4-5143fbb9e54c" },
      expectedPaperId: "e6aaf317-52fc-441c-bac4-5143fbb9e54c",
      expectedFields: ["excludeFromAtlas"],
      minReviewedInclusionF1Delta: 0.05
    },
    {
      id: "reviewed-family-type-regression",
      description: "Corrupt reviewed family/type labels for a known vitrification paper.",
      mutation: {
        kind: "replace-override",
        paperId: "f24fdc26-2071-4ae1-86d6-fa70a17a9574",
        patch: { paperType: "unknown", protocolFamily: "unknown" }
      },
      expectedPaperId: "f24fdc26-2071-4ae1-86d6-fa70a17a9574",
      expectedFields: ["paperType", "protocolFamily"],
      minReviewedProtocolFamilyAccuracyDelta: 0.1,
      minReviewedPaperTypeAccuracyDelta: 0.1
    },
    {
      id: "reviewed-specimen-regression",
      description: "Drop reviewed whole-ovary context from a sheep autotransplantation paper.",
      mutation: {
        kind: "replace-override",
        paperId: "f9a6ac96-9b1f-406a-8e16-bc05e1a6b857",
        patch: { specimenTypes: ["ovarian tissue"] }
      },
      expectedPaperId: "f9a6ac96-9b1f-406a-8e16-bc05e1a6b857",
      expectedFields: ["specimenTypes"]
    },
    {
      id: "reviewed-outcome-regression",
      description: "Corrupt reviewed outcome classes for a human ovarian tissue vitrification paper.",
      mutation: {
        kind: "replace-override",
        paperId: "f24fdc26-2071-4ae1-86d6-fa70a17a9574",
        patch: { outcomeMentions: [] }
      },
      expectedPaperId: "f24fdc26-2071-4ae1-86d6-fa70a17a9574",
      expectedFields: ["outcomeClasses"],
      minReviewedOutcomeMacroF1Delta: 0.3
    },
    {
      id: "reviewed-step-phase-regression",
      description: "Corrupt reviewed protocol step phases for a closed-system vitrification paper.",
      mutation: {
        kind: "replace-override",
        paperId: "eb7b902b-87b7-4169-8058-8818dfa71c48",
        patch: {
          protocolSteps: [
            {
              order: 0,
              phase: "unknown",
              summary: "Corrupted regression step",
              chemicals: [],
              concentrations: [],
              temperatures: [],
              durations: [],
              evidence: []
            }
          ]
        }
      },
      expectedPaperId: "eb7b902b-87b7-4169-8058-8818dfa71c48",
      expectedFields: ["stepPhases"],
      minReviewedStepPhaseMacroF1Delta: 0.2
    }
  ]
};
