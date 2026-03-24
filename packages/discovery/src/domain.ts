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
  supportingConcepts: KeywordConcept[];
};

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
      "Cryopreservation and fertility-preservation literature for ovarian tissue, ovarian cortex, follicles, and whole ovary workflows.",
    providerQueries: {
      cryodb: "ovarian tissue cryopreservation",
      openalex: "\"ovarian tissue\" cryopreservation OR vitrification OR freezing follicles ovary",
      crossref: "\"ovarian tissue\" cryopreservation vitrification follicles",
      "europe-pmc": "\"ovarian tissue\" AND (cryopreservation OR vitrification OR freezing)"
    },
    anchorConcepts: [
      concept("ovarian tissue", ["ovarian tissue", "ovarian tissues"]),
      concept("ovarian cortex", ["ovarian cortex", "ovarian cortical"]),
      concept("whole ovary", ["whole ovary", "whole ovaries"]),
      concept("follicles", ["follicle", "follicles"]),
      concept("ovary", ["ovary", "ovaries"])
    ],
    supportingConcepts: [
      concept("cryopreservation", ["cryopreservation", "cryopreserved"]),
      concept("vitrification", ["vitrification", "vitrified"]),
      concept("freezing", ["freezing", "frozen", "slow freezing", "slow cooling"]),
      concept("fertility preservation", ["fertility preservation"]),
      concept("oocyte", ["oocyte", "oocytes"]),
      concept("reproductive", ["reproductive", "transplantation"])
    ]
  },
  islets: {
    label: "islets",
    queryDescription:
      "Cryopreservation literature for pancreatic islets, islet transplantation, graft function, and post-thaw islet recovery.",
    providerQueries: {
      cryodb: "islet cryopreservation",
      openalex: "\"pancreatic islets\" cryopreservation OR vitrification OR freezing transplantation",
      crossref: "\"pancreatic islets\" cryopreservation vitrification transplantation",
      "europe-pmc": "\"pancreatic islets\" AND (cryopreservation OR vitrification OR freezing)"
    },
    anchorConcepts: [
      concept("pancreatic islets", ["pancreatic islets", "pancreatic islet"]),
      concept("islets", ["islets", "islet"]),
      concept("islet transplantation", ["islet transplantation"]),
      concept("islet graft", ["islet graft", "islet grafts"]),
      concept("encapsulated islets", ["encapsulated islets", "encapsulated islet"])
    ],
    supportingConcepts: [
      concept("cryopreservation", ["cryopreservation", "cryopreserved"]),
      concept("vitrification", ["vitrification", "vitrified"]),
      concept("freezing", ["freezing", "frozen", "slow freezing", "slow cooling"]),
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
  anchorMatches: string[];
  supportingMatches: string[];
  relevanceScore: number;
} {
  const config = getDiscoveryDomainConfig(domain);
  const haystack = `${title} ${abstract ?? ""}`.toLowerCase();
  const anchorMatches = matchedConceptLabels(config.anchorConcepts, haystack);
  const supportingMatches = matchedConceptLabels(config.supportingConcepts, haystack);
  const matchedKeywords = Array.from(new Set([...anchorMatches, ...supportingMatches]));

  const anchorCoverage =
    config.anchorConcepts.length === 0 ? 0 : anchorMatches.length / config.anchorConcepts.length;
  const supportingCoverage =
    config.supportingConcepts.length === 0 ? 0 : supportingMatches.length / config.supportingConcepts.length;
  const relevanceScore = Number((anchorCoverage * 7 + supportingCoverage * 5).toFixed(3));

  return { matchedKeywords, anchorMatches, supportingMatches, relevanceScore };
}

export function shouldKeepDiscoveryCandidate(
  title: string,
  abstract: string | null | undefined,
  domain: DomainId
): boolean {
  const { anchorMatches, supportingMatches } = scoreDiscoveryText(title, abstract, domain);
  return anchorMatches.length > 0 && (supportingMatches.length > 0 || anchorMatches.length > 1);
}
