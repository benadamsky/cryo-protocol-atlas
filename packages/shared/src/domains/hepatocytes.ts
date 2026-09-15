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

const SPECIMEN_TYPES = ["hepatocytes", "primary hepatocytes"];

/**
 * Hepatocytes are, like islets, a transplant-relevant cell-suspension problem:
 * the literature cares about post-thaw viability, attachment (plating), and
 * metabolic function (albumin, urea, CYP activity) more than morphology.
 */
export const hepatocytes: DomainDefinition<"hepatocytes"> = {
  id: "hepatocytes",
  label: "Hepatocytes",

  ingest: {
    anchorKeywords: [
      "hepatocyte",
      "hepatocytes",
      "primary hepatocytes",
      "human hepatocytes",
      "liver cells",
      "liver cell"
    ],
    supportingKeywords: [
      "liver",
      "hepatic",
      "albumin",
      "urea",
      "cytochrome",
      "cyp",
      "drug metabolism",
      "attachment",
      "plating",
      "transplantation",
      "cell therapy",
      "cryopreservation",
      "vitrification",
      "slow freezing"
    ]
  },

  discovery: {
    queryDescription:
      "Cryopreservation literature for primary hepatocytes and other liver cell suspensions with explicit freezing, vitrification, thaw, viability, or post-thaw attachment signal.",
    cryodbQuery: "hepatocyte cryopreservation",
    liveQueryAnchors: ["hepatocytes", "primary hepatocytes", "human hepatocytes", "liver cells"],
    anchorConcepts: [
      { label: "hepatocytes", phrases: ["hepatocytes", "hepatocyte"] },
      { label: "primary hepatocytes", phrases: ["primary hepatocytes", "primary hepatocyte", "primary human hepatocytes"] },
      { label: "human hepatocytes", phrases: ["human hepatocytes", "human hepatocyte"] },
      { label: "liver cells", phrases: ["liver cells", "liver cell"] }
    ],
    extraRequiredSupportingConcepts: [
      { label: "viability", phrases: ["viability", "viable", "recovery", "post-thaw recovery"] },
      { label: "attachment", phrases: ["attachment", "plating", "plateable", "adherence", "adhesion"] }
    ],
    contextualSupportingConcepts: [
      { label: "transplantation", phrases: ["transplantation", "transplant", "engraftment"] },
      { label: "cell therapy", phrases: ["cell therapy", "cell-based therapy", "bioartificial liver"] },
      { label: "drug metabolism", phrases: ["drug metabolism", "xenobiotic", "metabolic competence"] },
      { label: "albumin", phrases: ["albumin"] },
      { label: "urea", phrases: ["urea", "ureagenesis"] },
      { label: "CYP", phrases: ["cyp", "cytochrome p450", "cyp3a4", "cyp1a2", "cyp2c9"] }
    ],
    blockedTitleConcepts: [
      { label: "review style", phrases: ["systematic review", "meta-analysis", "meta analysis"] },
      {
        label: "whole-organ transplantation",
        phrases: ["liver transplantation", "liver transplant", "liver graft", "liver allograft", "donor liver", "liver donor", "hepatectomy"]
      },
      { label: "broad summary", phrases: ["overview", "state of the art"] }
    ]
  },

  extraction: {
    sourceContextPrefix: "Hepatocyte source context",
    extraChemicalAliases: [
      {
        canonicalName: "University of Wisconsin Solution",
        aliases: ["university of wisconsin solution", "uw solution", "viaspan"]
      },
      { canonicalName: "Fetal Bovine Serum", aliases: ["fetal bovine serum", "fetal calf serum", "fbs", "fcs"] },
      { canonicalName: "ROCK Inhibitor", aliases: ["rock inhibitor", "y-27632", "y27632"] },
      { canonicalName: "CryoStor", aliases: ["cryostor", "cryostor cs10", "cs10"] },
      { canonicalName: "HypoThermosol", aliases: ["hypothermosol"] },
      { canonicalName: "Sericin", aliases: ["sericin"] }
    ],
    specimenPatterns: [
      { label: "primary hepatocytes", pattern: /\bprimary (?:human |rat |mouse |porcine |pig )?hepatocytes?\b/i, weight: 3 },
      { label: "hepatocytes", pattern: /\bhepatocytes?\b/i, weight: 3 },
      { label: "human hepatocytes", pattern: /\bhuman hepatocytes?\b/i, weight: 2 },
      { label: "liver cells", pattern: /\bliver cells?\b/i, weight: 2 },
      { label: "hepatocyte spheroids", pattern: /\bhepatocyte spheroids?\b|\bliver spheroids?\b/i, weight: 2 },
      { label: "hepatocyte-like cells", pattern: /\bhepatocyte-like cells?\b/i, weight: 2 },
      { label: "liver tissue", pattern: /\bliver (?:tissue|slices?)\b/i, weight: 1 }
    ],
    outcomeRules: [
      {
        outcomeClass: "transplantation",
        strength: "strong",
        patterns: [
          /\btransplant(?:ation|ed)?\b/i,
          /\bengraft(?:ment|ed)?\b/i,
          /\bgraft(?:ed|s)?\b/i,
          /\brepopulat(?:ion|ed)\b/i
        ]
      },
      {
        outcomeClass: "function",
        strength: "strong",
        patterns: [
          /\bfunction(?:al|ality)?\b/i,
          /\balbumin (?:secretion|production|synthesis)\b/i,
          /\burea (?:synthesis|production)\b/i,
          /\bcyp\d[a-z]*\d*\b/i,
          /\bcytochrome p450\b/i,
          /\bdrug metabolism\b/i,
          /\bmetabolic (?:activity|competence|capacity)\b/i,
          /\bammonia (?:clearance|detoxification)\b/i
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
          /\battachment\b/i,
          /\bplating efficiency\b/i,
          /\bplateab/i,
          /\btoxicit/i
        ]
      },
      {
        outcomeClass: "morphology",
        strength: "moderate",
        patterns: [/\bmorpholog(?:y|ical)\b/i, /\bhistolog(?:y|ical)\b/i, /\bultrastruct(?:ure|ural)\b/i]
      }
    ],
    outcomeSentenceTerms: /albumin|urea|cyp|cytochrome|attachment|plating|engraft|transplant|ammonia|metaboli/i,
    assessmentPatterns: [/\balbumin\b/i, /\burea\b/i, /\battachment\b/i],
    paperType: {
      extraExperimentalRules: [
        (text) =>
          /\bcryopreserv/i.test(text) &&
          /\bhepatocyte|\bliver cell/i.test(text) &&
          (/\bcomparison\b|\btechnique\b|\bsurvival\b|\brecovery\b|\bfunction\b|\byield\b|\bstorage\b|\battachment\b|\btransplant/i.test(
            text
          ) ||
            /\bmouse\b|\brat\b|\bporcine\b|\bpig\b|\bcanine\b|\bhuman\b/i.test(text)),
        (text) =>
          /\bcryogenic\b|\bfreez(?:ing)?\b|\bfrozen-thawed\b|\bthaw(?:ing)?\b/i.test(text) &&
          /\bhepatocyte|\bliver cell/i.test(text) &&
          /\bporcine\b|\bpig\b|\brat\b|\bmouse\b|\bcanine\b|\bhuman\b/i.test(text)
      ]
    }
  },

  suggestionTemplates: [
    {
      title: "Matched-species hepatocyte vitrification vs slow-freezing benchmark",
      category: "benchmark",
      hypothesis:
        "The hepatocyte corpus leans on slow-freezing, so a matched-species comparison is needed to separate real vitrification gains from endpoint and species confounding.",
      rationale:
        "The hepatocyte slice contains a slow-freezing majority, a smaller vitrification set, and a few comparative papers. A direct benchmark with the same species and the same post-thaw attachment and function readouts is the fastest way to turn that asymmetry into actionable signal.",
      confidence: 0.8,
      select: ({ experimental }) => {
        const slowFreezing = withFamily(experimental, "slow-freezing");
        const vitrification = withFamily(experimental, "vitrification");
        const comparative = withFamily(experimental, "comparative");
        if (slowFreezing.length < 5 || (vitrification.length < 1 && comparative.length < 1)) {
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
      title: "Additive-assisted hepatocyte attachment and function benchmark on a fixed base cryomix",
      category: "benchmark",
      hypothesis:
        "Several hepatocyte papers imply that post-thaw attachment and function gains come from adjuncts added around a standard DMSO-centered mix rather than from new base CPA chemistry.",
      rationale:
        "Trehalose, serum, ROCK inhibitor, antioxidant, and other adjunct-style titles recur in the hepatocyte slice, but they are not benchmarked against one another on the same base protocol. Holding the core cryomix fixed and comparing post-thaw attachment and function would test whether the additive signal is real.",
      confidence: 0.78,
      select: ({ experimental }) => {
        const adjunctTitles = withTitle(
          experimental,
          /trehalose|glucose|hydroxyethyl starch|polyvinyl|pvp|polyethylene glycol|rock inhibitor|y-27632|caspase|antioxidant|glutathione|n-acetylcysteine|melatonin|sericin|serum|university of wisconsin|uw solution|cryostor|encapsulat|alginate/i
        );
        if (adjunctTitles.length < 3) {
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
      title: "Promote hepatocyte function-heavy protocols to transplantation endpoints",
      category: "endpoint-upgrade",
      hypothesis:
        "Several hepatocyte protocols that look promising on attachment or in-vitro metabolic function will reorder once they are compared on engraftment or transplantation outcomes.",
      rationale:
        "The hepatocyte slice labels function more often than transplantation. Converting the strongest in-vitro function protocols into a small engraftment benchmark is likely higher-signal than inventing a new chemistry path immediately.",
      confidence: 0.76,
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
      title: "Full-text protocol resolution for sparse hepatocyte thaw/loading workflows",
      category: "workflow-gap",
      hypothesis:
        "A number of hepatocyte papers look relevant, but their step structure is too thin to compare fairly against the rest of the corpus.",
      rationale:
        "The hepatocyte slice is provisional and abstract-level, and its weak points concentrate in papers where only thawing or one procedural phase is explicit. Full-text resolution there is likely higher signal than another broad extraction pass.",
      confidence: 0.8,
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
      title: "Scale-up benchmark for banked or bulk hepatocyte handling",
      category: "scale-up",
      hypothesis:
        "Scale-up losses in hepatocyte banking may come from handling and thaw workflow variance rather than core cryomix choice alone.",
      rationale:
        "The hepatocyte corpus includes banking, bulk, and large-scale titles, but those papers are scattered across sparse workflow descriptions. A scale-up benchmark focused on loading, storage, thaw, and handling variance would test whether operational workflow dominates the observed attachment losses.",
      confidence: 0.72,
      select: ({ experimental }) => {
        const largeScale = withTitle(experimental, /banking|\bbank\b|large quantities|bulk|large-scale|scale-up|batch/i);
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
    focusQuestion:
      "What is the strongest first cryopreservation wedge in hepatocytes, and what evidence would justify a real entry point?",
    benchmarkNeedsBothFamilies: true,
    genericSpecimenTypes: ["hepatocytes", "primary hepatocytes"],
    likelyBuyers:
      "hepatocyte suppliers, cell-therapy and bioartificial-liver groups, and drug-metabolism labs that depend on plateable post-thaw hepatocytes",
    packetTranslationalRationale: {
      benchmark:
        "Useful if the goal is to justify a first hepatocytes wedge around post-thaw attachment, function, and standardization.",
      default: "Useful if the goal is to turn a plausible hepatocytes wedge into a more decision-ready one."
    },
    commercialWhyNow: {
      benchmark:
        "A cleaner benchmark wedge maps to hepatocyte supply, cell-therapy, and drug-metabolism workflows where post-thaw attachment and function still vary lot to lot.",
      endpoint:
        "Moving from viability-only claims to attachment, function, and engraftment claims is what makes a hepatocyte optimization story commercially credible.",
      scale: "Scale-up matters if the workflow is meant to support banking of plateable hepatocytes rather than single-lab successes.",
      default:
        "This is close enough to real hepatocyte supply and transplant workflows that better protocol evidence could matter commercially, not just academically."
    },
    resolutionPriorityBonus: [
      { specimenType: "primary hepatocytes", bonus: 2 },
      { specimenType: "human hepatocytes", bonus: 1 }
    ],
    commercialSignalBonus: 0
  },

  console: {
    shortLabel: "Hepatocytes",
    strapline: "Cell-suspension cryopreservation for transplant and drug metabolism; benchmark provisional.",
    accent: "#7c6cd6",
    accentSoft: "rgba(124, 108, 214, 0.18)"
  },

  regressionScenarios: []
};
