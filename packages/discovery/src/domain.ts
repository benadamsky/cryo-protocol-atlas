import { DomainIdSchema, type DomainId, type LiveDiscoveryProvider } from "../../shared/src/schema.js";

type KeywordConcept = {
  label: string;
  patterns: RegExp[];
};

type DiscoveryDomainConfig = {
  label: string;
  queryDescription: string;
  providerQueries: Record<LiveDiscoveryProvider, string>;
  anchorConcepts: KeywordConcept[];
  requiredSupportingConcepts: KeywordConcept[];
  contextualSupportingConcepts: KeywordConcept[];
  minimumTitleRequiredSupportingMatches?: number;
};

const DISCOVERY_SCORING = {
  anchorCoverageWeight: 7,
  requiredSupportingCoverageWeight: 5,
  contextualSupportingCoverageWeight: 2,
  minimumAnchorMatches: 1,
  minimumRequiredSupportingMatches: 1,
  minimumTitleAnchorMatches: 1,
  defaultMinimumTitleRequiredSupportingMatches: 1
} as const;

function wordPattern(value: string): RegExp {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const normalized = escaped.replace(/\s+/g, "\\s+");
  return new RegExp(`\\b${normalized}\\b`, "i");
}

function concept(label: string, phrases: string[]): KeywordConcept {
  return {
    label,
    patterns: phrases.map(wordPattern)
  };
}

const DISCOVERY_DOMAIN_CONFIGS: Record<DomainId, DiscoveryDomainConfig> = {
  "ovarian-tissue": {
    label: "ovarian tissue",
    queryDescription:
      "Cryopreservation literature for ovarian tissue, ovarian cortex, follicles, and whole-ovary workflows with explicit storage, freezing, vitrification, or thaw signal.",
    providerQueries: {
      cryodb: "ovarian tissue cryopreservation",
      openalex:
        "(\"ovarian tissue\" OR \"ovarian cortex\" OR \"whole ovary\" OR \"ovarian follicles\" OR \"primordial follicles\" OR \"preantral follicles\") AND (cryopreservation OR vitrification OR freezing OR thaw OR cryoprotectant)",
      crossref:
        "(\"ovarian tissue\" OR \"ovarian cortex\" OR \"whole ovary\" OR \"ovarian follicles\" OR \"primordial follicles\" OR \"preantral follicles\") AND (cryopreservation OR vitrification OR freezing OR thaw OR cryoprotectant)",
      "europe-pmc":
        "(\"ovarian tissue\" OR \"ovarian cortex\" OR \"whole ovary\" OR \"ovarian follicles\" OR \"primordial follicles\" OR \"preantral follicles\") AND (cryopreservation OR vitrification OR freezing OR thaw OR cryoprotectant)"
    },
    anchorConcepts: [
      concept("ovarian tissue", ["ovarian tissue", "ovarian tissues"]),
      concept("ovarian cortex", ["ovarian cortex", "ovarian cortical"]),
      concept("whole ovary", ["whole ovary", "whole ovaries"]),
      concept("follicles", [
        "ovarian follicle",
        "ovarian follicles",
        "primordial follicle",
        "primordial follicles",
        "preantral follicle",
        "preantral follicles"
      ])
    ],
    requiredSupportingConcepts: [
      concept("cryopreservation", ["cryopreservation", "cryopreserved"]),
      concept("vitrification", ["vitrification", "vitrified"]),
      concept("freezing", ["freezing", "frozen", "slow freezing", "slow cooling"]),
      concept("thaw", ["thaw", "thawed", "post-thaw"]),
      concept("cryoprotectant", ["cryoprotectant", "cryoprotective", "dimethyl sulfoxide", "dmsO", "ethylene glycol"]),
      concept("cryostorage", ["cryostorage", "liquid nitrogen"])
    ],
    contextualSupportingConcepts: [
      concept("fertility preservation", ["fertility preservation"]),
      concept("oocyte", ["oocyte", "oocytes"]),
      concept("transplantation", ["transplantation", "transplant", "autotransplant", "graft"])
    ],
    minimumTitleRequiredSupportingMatches: 2
  },
  islets: {
    label: "islets",
    queryDescription:
      "Cryopreservation literature for pancreatic islets with explicit freezing, vitrification, thaw, cryoprotectant, or post-thaw recovery signal.",
    providerQueries: {
      cryodb: "islet cryopreservation",
      openalex:
        "(\"pancreatic islets\" OR \"pancreatic islet\" OR islets) AND (cryopreservation OR vitrification OR freezing OR thaw OR cryoprotectant)",
      crossref:
        "(\"pancreatic islets\" OR \"pancreatic islet\" OR islets) AND (cryopreservation OR vitrification OR freezing OR thaw OR cryoprotectant)",
      "europe-pmc":
        "(\"pancreatic islets\" OR \"pancreatic islet\" OR islets) AND (cryopreservation OR vitrification OR freezing OR thaw OR cryoprotectant)"
    },
    anchorConcepts: [
      concept("pancreatic islets", ["pancreatic islets", "pancreatic islet"]),
      concept("islets", ["islets", "islet"]),
      concept("encapsulated islets", ["encapsulated islets", "encapsulated islet"])
    ],
    requiredSupportingConcepts: [
      concept("cryopreservation", ["cryopreservation", "cryopreserved"]),
      concept("vitrification", ["vitrification", "vitrified"]),
      concept("freezing", ["freezing", "frozen", "slow freezing", "slow cooling"]),
      concept("thaw", ["thaw", "thawed", "post-thaw"]),
      concept("cryoprotectant", ["cryoprotectant", "cryoprotective", "dmsO", "dimethyl sulfoxide", "freezer bag"]),
      concept("recovery", ["recovery", "viability", "post-thaw recovery"])
    ],
    contextualSupportingConcepts: [
      concept("transplantation", ["transplantation", "transplant"]),
      concept("graft", ["graft", "grafts"]),
      concept("insulin", ["insulin"]),
      concept("beta cell", ["beta cell", "beta cells"])
    ]
  }
};

export function getDiscoveryDomainConfig(domain: DomainId): DiscoveryDomainConfig {
  DomainIdSchema.parse(domain);
  return DISCOVERY_DOMAIN_CONFIGS[domain];
}

function matchedConceptLabels(concepts: KeywordConcept[], haystack: string): string[] {
  return concepts
    .filter((entry) => entry.patterns.some((pattern) => pattern.test(haystack)))
    .map((entry) => entry.label);
}

export function scoreDiscoveryText(
  title: string,
  abstract: string | null | undefined,
  domain: DomainId
): {
  matchedKeywords: string[];
  titleAnchorMatches: string[];
  titleRequiredSupportingMatches: string[];
  titleContextualSupportingMatches: string[];
  anchorMatches: string[];
  requiredSupportingMatches: string[];
  contextualSupportingMatches: string[];
  supportingMatches: string[];
  relevanceScore: number;
} {
  const config = getDiscoveryDomainConfig(domain);
  const titleHaystack = title.toLowerCase();
  const haystack = `${title} ${abstract ?? ""}`.toLowerCase();
  const titleAnchorMatches = matchedConceptLabels(config.anchorConcepts, titleHaystack);
  const titleRequiredSupportingMatches = matchedConceptLabels(config.requiredSupportingConcepts, titleHaystack);
  const titleContextualSupportingMatches = matchedConceptLabels(config.contextualSupportingConcepts, titleHaystack);
  const anchorMatches = matchedConceptLabels(config.anchorConcepts, haystack);
  const requiredSupportingMatches = matchedConceptLabels(config.requiredSupportingConcepts, haystack);
  const contextualSupportingMatches = matchedConceptLabels(config.contextualSupportingConcepts, haystack);
  const supportingMatches = Array.from(new Set([...requiredSupportingMatches, ...contextualSupportingMatches]));
  const matchedKeywords = Array.from(new Set([...anchorMatches, ...supportingMatches]));

  const anchorCoverage =
    config.anchorConcepts.length === 0 ? 0 : anchorMatches.length / config.anchorConcepts.length;
  const requiredSupportingCoverage =
    config.requiredSupportingConcepts.length === 0
      ? 0
      : requiredSupportingMatches.length / config.requiredSupportingConcepts.length;
  const contextualSupportingCoverage =
    config.contextualSupportingConcepts.length === 0
      ? 0
      : contextualSupportingMatches.length / config.contextualSupportingConcepts.length;
  const relevanceScore = Number(
    (
      anchorCoverage * DISCOVERY_SCORING.anchorCoverageWeight +
      requiredSupportingCoverage * DISCOVERY_SCORING.requiredSupportingCoverageWeight +
      contextualSupportingCoverage * DISCOVERY_SCORING.contextualSupportingCoverageWeight
    ).toFixed(3)
  );

  return {
    matchedKeywords,
    titleAnchorMatches,
    titleRequiredSupportingMatches,
    titleContextualSupportingMatches,
    anchorMatches,
    requiredSupportingMatches,
    contextualSupportingMatches,
    supportingMatches,
    relevanceScore
  };
}

export function shouldKeepDiscoveryCandidate(
  title: string,
  abstract: string | null | undefined,
  domain: DomainId
): boolean {
  const config = getDiscoveryDomainConfig(domain);
  const { titleAnchorMatches, titleRequiredSupportingMatches, anchorMatches, requiredSupportingMatches } =
    scoreDiscoveryText(title, abstract, domain);
  return (
    titleAnchorMatches.length >= DISCOVERY_SCORING.minimumTitleAnchorMatches &&
    titleRequiredSupportingMatches.length >=
      (config.minimumTitleRequiredSupportingMatches ?? DISCOVERY_SCORING.defaultMinimumTitleRequiredSupportingMatches) &&
    anchorMatches.length >= DISCOVERY_SCORING.minimumAnchorMatches &&
    requiredSupportingMatches.length >= DISCOVERY_SCORING.minimumRequiredSupportingMatches
  );
}
