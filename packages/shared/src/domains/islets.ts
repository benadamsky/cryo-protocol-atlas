import type { DomainDefinition } from "./types.js";
import {
  chemicalNames,
  families,
  paperTitles,
  sparseProtocolPapers,
  withFamily,
  withOutcome,
  withTitle
} from "./suggestion-helpers.js";

const SPECIMEN_TYPES = ["islets", "pancreatic islets"];

export const islets: DomainDefinition<"islets"> = {
  id: "islets",
  label: "Islets",

  ingest: {
    anchorKeywords: [
      "islet",
      "islets",
      "pancreatic islet",
      "pancreatic islets",
      "islet cell",
      "islet cells",
      "islet transplantation",
      "islet graft",
      "encapsulated islets"
    ],
    supportingKeywords: [
      "pancreatic",
      "beta cell",
      "beta cells",
      "insulin",
      "glucose",
      "diabetes",
      "transplantation",
      "cryopreservation",
      "vitrification",
      "slow freezing"
    ]
  },

  discovery: {
    queryDescription:
      "Cryopreservation literature for pancreatic islets with explicit freezing, vitrification, thaw, cryoprotectant, or post-thaw recovery signal.",
    cryodbQuery: "islet cryopreservation",
    liveQueryAnchors: ["pancreatic islets", "pancreatic islet", "islets"],
    anchorConcepts: [
      { label: "pancreatic islets", phrases: ["pancreatic islets", "pancreatic islet"] },
      { label: "islets", phrases: ["islets", "islet"] },
      { label: "encapsulated islets", phrases: ["encapsulated islets", "encapsulated islet"] }
    ],
    extraRequiredSupportingConcepts: [
      { label: "recovery", phrases: ["recovery", "viability", "post-thaw recovery"] },
      { label: "freezer bag", phrases: ["freezer bag"] }
    ],
    contextualSupportingConcepts: [
      { label: "transplantation", phrases: ["transplantation", "transplant"] },
      { label: "graft", phrases: ["graft", "grafts"] },
      { label: "insulin", phrases: ["insulin"] },
      { label: "beta cell", phrases: ["beta cell", "beta cells"] }
    ]
  },

  extraction: {
    sourceContextPrefix: "Islet source context",
    specimenPatterns: [
      { label: "pancreatic islets", pattern: /\bpancreatic islets?\b/i, weight: 3 },
      { label: "islets", pattern: /\bislets?\b/i, weight: 3 },
      { label: "islet cells", pattern: /\bislet cells?\b/i, weight: 2 },
      { label: "encapsulated islets", pattern: /\bencapsulat(?:ed|ion)(?:\s+\w+){0,2}\s+islets?\b/i, weight: 3 },
      { label: "islet grafts", pattern: /\bislet grafts?\b/i, weight: 2 },
      { label: "beta cells", pattern: /\bbeta cells?\b/i, weight: 1 }
    ],
    outcomeRules: [
      {
        outcomeClass: "transplantation",
        strength: "strong",
        patterns: [
          /\btransplant(?:ation|ed)?\b/i,
          /\bauto-?transplant(?:ation|ed)?\b/i,
          /\bxeno-?graft(?:ed|s)?\b/i,
          /\bauto-?graft(?:ed|s)?\b/i,
          /\bgraft(?:ed|s)?\b/i
        ]
      },
      {
        outcomeClass: "function",
        strength: "strong",
        patterns: [
          /\bfunction(?:al|ality)?\b/i,
          /\binsulin secretion\b/i,
          /\binsulin release\b/i,
          /\bgraft function\b/i,
          /\bglucose(?:-|\s)?stimulated\b/i,
          /\bglucose control\b/i,
          /\bnormoglyc/i,
          /\beuglyc/i
        ]
      },
      {
        outcomeClass: "viability",
        strength: "moderate",
        patterns: [
          /\bviability\b/i,
          /\blive-dead assay\b/i,
          /\bcell survival\b/i,
          /\bsurvival\b/i,
          /\brecovery\b/i,
          /\byield\b/i,
          /\btoxicit/i
        ]
      },
      {
        outcomeClass: "morphology",
        strength: "moderate",
        patterns: [/\bmorpholog(?:y|ical)\b/i, /\bhistolog(?:y|ical)\b/i, /\bultrastruct(?:ure|ural)\b/i]
      }
    ],
    outcomeSentenceTerms: /insulin|glucose|graft|transplant/i,
    assessmentPatterns: [/\binsulin secretion/i],
    paperType: {
      extraExperimentalRules: [
        (text) =>
          /\bcryopreserv/i.test(text) &&
          /\bislet/i.test(text) &&
          (/\bcomparison\b|\btechnique\b|\bsurvival\b|\brecovery\b|\bfunction\b|\byield\b|\bstorage\b|\btransplant/i.test(
            text
          ) ||
            /\bmouse\b|\brat\b|\bporcine\b|\bpig\b|\bcanine\b|\bhuman\b/i.test(text)),
        (text) =>
          /\bcryogenic\b|\bfreez(?:ing)?\b|\bfrozen-thawed\b|\bthaw(?:ing)?\b/i.test(text) &&
          /\bislet/i.test(text) &&
          /\bporcine\b|\bpig\b|\brat\b|\bmouse\b|\bcanine\b|\bhuman\b|\bchick\b/i.test(text)
      ]
    }
  },

  suggestionTemplates: [
    {
      title: "Matched-species islet vitrification vs slow-freezing benchmark",
      category: "benchmark",
      hypothesis:
        "The current islet corpus overweights slow-freezing, so a matched-species comparison is needed to separate real vitrification gains from endpoint and species confounding.",
      rationale:
        "The cleaned islet slice contains many slow-freezing studies, a smaller vitrification set, and a few comparative papers. A direct benchmark with the same species and the same post-thaw function readout is the fastest way to convert that literature asymmetry into actionable signal.",
      confidence: 0.86,
      select: ({ experimental }) => {
        const slowFreezing = withFamily(experimental, "slow-freezing");
        const vitrification = withFamily(experimental, "vitrification");
        const comparative = withFamily(experimental, "comparative");
        if (slowFreezing.length < 8 || (vitrification.length < 2 && comparative.length < 1)) {
          return null;
        }
        return {
          chemicals: chemicalNames([...slowFreezing, ...vitrification]).slice(0, 5),
          specimenTypes: SPECIMEN_TYPES,
          protocolFamilies: families([...slowFreezing, ...vitrification, ...comparative]),
          paperTitles: paperTitles([...comparative, ...vitrification, ...slowFreezing])
        };
      }
    },
    {
      title: "Additive-assisted islet recovery benchmark on a fixed base cryomix",
      category: "benchmark",
      hypothesis:
        "Several islet papers imply that recovery gains may come from adjuncts added around a standard cryomix rather than from entirely new base CPA chemistry.",
      rationale:
        "Trehalose, curcumin, beraprost, and other adjunct-style titles recur in the curated islet slice, but they are not benchmarked against one another on the same base protocol. Holding the core cryomix fixed and comparing post-thaw recovery/function would quickly test whether the additive signal is real.",
      confidence: 0.83,
      select: ({ experimental }) => {
        const adjunctTitles = withTitle(
          experimental,
          /trehalose|curcumin|beraprost|p38 mapk inhibitor|polyvinyl pyrrolidone|polyethylene glycol/i
        );
        if (adjunctTitles.length < 4) {
          return null;
        }
        return {
          chemicals: chemicalNames(adjunctTitles).slice(0, 6),
          specimenTypes: SPECIMEN_TYPES,
          protocolFamilies: families(adjunctTitles),
          paperTitles: paperTitles(adjunctTitles)
        };
      }
    },
    {
      title: "Promote islet function-heavy protocols to transplantation endpoints",
      category: "endpoint-upgrade",
      hypothesis:
        "Several islet protocols that look promising on insulin secretion or in-vitro function will reorder once they are compared on graft or transplantation outcomes.",
      rationale:
        "The curated islet slice now has better function labeling than transplantation coverage. Converting the strongest in-vitro function protocols into a small transplantation benchmark is likely higher-signal than inventing a new chemistry path immediately.",
      confidence: 0.81,
      select: ({ experimental }) => {
        const functionPapers = withOutcome(experimental, ["function"]);
        const transplantationPapers = withOutcome(experimental, ["transplantation"]);
        if (functionPapers.length <= transplantationPapers.length) {
          return null;
        }
        return {
          chemicals: chemicalNames(functionPapers).slice(0, 5),
          specimenTypes: SPECIMEN_TYPES,
          protocolFamilies: families(functionPapers),
          paperTitles: paperTitles(functionPapers)
        };
      }
    },
    {
      title: "Full-text protocol resolution for sparse islet thaw/loading workflows",
      category: "workflow-gap",
      hypothesis:
        "A small number of islet papers still look interesting, but their step structure is too thin to compare fairly against the rest of the corpus.",
      rationale:
        "The benchmarked islet slice is now minimum-depth ready, and the remaining weak points are concentrated in a few papers where only thawing or one procedural phase is explicit. Full-text resolution there is likely higher signal than another broad extraction pass.",
      confidence: 0.84,
      select: ({ experimental }) => {
        const sparse = sparseProtocolPapers(experimental);
        if (sparse.length < 2) {
          return null;
        }
        return {
          chemicals: chemicalNames(sparse).slice(0, 5),
          specimenTypes: SPECIMEN_TYPES,
          protocolFamilies: families(sparse),
          paperTitles: paperTitles(sparse)
        };
      }
    },
    {
      title: "Scale-up benchmark for banked or bulk islet handling",
      category: "scale-up",
      hypothesis:
        "Scale-up losses in islet banking may come from handling and thaw workflow variance rather than core cryomix choice alone.",
      rationale:
        "The islet corpus includes bulk/banking/transport titles, but those papers are scattered across sparse workflow descriptions. A scale-up benchmark focused on loading, storage, thaw, and handling variance would test whether operational workflow dominates the observed recovery losses.",
      confidence: 0.78,
      select: ({ experimental }) => {
        const largeScale = withTitle(experimental, /banking|large quantities|bulk|transported between centers/i);
        if (largeScale.length < 2) {
          return null;
        }
        return {
          chemicals: chemicalNames(largeScale).slice(0, 5),
          specimenTypes: SPECIMEN_TYPES,
          protocolFamilies: families(largeScale),
          paperTitles: paperTitles(largeScale)
        };
      }
    }
  ],

  research: {
    preferredWedgeTitle: /additive-assisted/i,
    focusQuestion:
      "What is the strongest first cryopreservation wedge in islets, and what evidence would justify a real entry point?",
    benchmarkNeedsBothFamilies: true,
    genericSpecimenTypes: ["islets", "pancreatic islets"],
    likelyBuyers: "transplant researchers, islet-banking teams, and cell-therapy groups trying to standardize post-thaw recovery",
    packetTranslationalRationale: {
      benchmark: "Useful if the goal is to justify a first islets wedge around post-thaw recovery and standardization.",
      default: "Useful if the goal is to turn a plausible islets wedge into a more decision-ready one."
    },
    commercialWhyNow: {
      benchmark:
        "A cleaner benchmark wedge maps to transplant and cell-banking workflows where protocol uncertainty still blocks standardization.",
      endpoint:
        "Moving from viability-only claims to transplantation/function claims is what makes an optimization story commercially credible.",
      scale: "Scale-up matters if the workflow is ever meant to support real banking rather than artisanal lab success cases.",
      default:
        "This is close enough to real preservation workflows that better protocol evidence could matter commercially, not just academically."
    },
    resolutionPriorityBonus: [],
    commercialSignalBonus: 0.08
  },

  console: {
    shortLabel: "Islets",
    strapline: "Transplant-adjacent cryomix benchmarking with stronger benchmark depth.",
    accent: "#0ea5a4",
    accentSoft: "rgba(14, 165, 164, 0.18)",
    plainWedgeSummary:
      "Test whether additives around a standard cryomix improve post-thaw recovery more than changing the base CPA chemistry."
  },

  regressionScenarios: [
    {
      id: "reviewed-exclusion-regression",
      description: "Remove a reviewed exclusion so a non-primary methods paper leaks back into the islet atlas.",
      mutation: { kind: "remove-override", paperId: "beb603fe-8522-4842-99a9-fba1195cc973" },
      expectedPaperId: "beb603fe-8522-4842-99a9-fba1195cc973",
      expectedFields: ["excludeFromAtlas"],
      minReviewedInclusionF1Delta: 0.01
    },
    {
      id: "reviewed-family-type-regression",
      description: "Corrupt reviewed family/type labels for a known comparative islet preservation paper.",
      mutation: {
        kind: "replace-override",
        paperId: "f557f75c-4101-43d0-8f0e-66ea6a6f0515",
        patch: { paperType: "unknown", protocolFamily: "unknown" }
      },
      expectedPaperId: "f557f75c-4101-43d0-8f0e-66ea6a6f0515",
      expectedFields: ["paperType", "protocolFamily"],
      minReviewedProtocolFamilyAccuracyDelta: 0.02,
      minReviewedPaperTypeAccuracyDelta: 0.02
    },
    {
      id: "reviewed-specimen-regression",
      description: "Drop reviewed encapsulated-islet context from a graft-function study.",
      mutation: {
        kind: "replace-override",
        paperId: "04d69565-e62e-4dc8-9ba3-a9ae6f5832ff",
        patch: { specimenTypes: ["islets", "pancreatic islets"] }
      },
      expectedPaperId: "04d69565-e62e-4dc8-9ba3-a9ae6f5832ff",
      expectedFields: ["specimenTypes"]
    },
    {
      id: "reviewed-outcome-regression",
      description: "Corrupt reviewed outcome classes for a cryostored encapsulated-islet graft study.",
      mutation: {
        kind: "replace-override",
        paperId: "04d69565-e62e-4dc8-9ba3-a9ae6f5832ff",
        patch: { outcomeMentions: [] }
      },
      expectedPaperId: "04d69565-e62e-4dc8-9ba3-a9ae6f5832ff",
      expectedFields: ["outcomeClasses"],
      minReviewedOutcomeMacroF1Delta: 0.02
    },
    {
      id: "reviewed-step-phase-regression",
      description: "Corrupt reviewed protocol step phases for a vitrification-versus-freezing comparison paper.",
      mutation: {
        kind: "replace-override",
        paperId: "f557f75c-4101-43d0-8f0e-66ea6a6f0515",
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
      expectedPaperId: "f557f75c-4101-43d0-8f0e-66ea6a6f0515",
      expectedFields: ["stepPhases"],
      minReviewedStepPhaseMacroF1Delta: 0.02
    }
  ]
};
