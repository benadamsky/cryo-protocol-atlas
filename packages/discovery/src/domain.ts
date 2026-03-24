import { DomainIdSchema, type DomainId, type LiveDiscoveryProvider } from "../../shared/src/schema.js";

type DiscoveryDomainConfig = {
  label: string;
  queryDescription: string;
  providerQueries: Record<LiveDiscoveryProvider, string>;
  anchorKeywords: string[];
  supportingKeywords: string[];
};

const DISCOVERY_DOMAIN_CONFIGS: Record<DomainId, DiscoveryDomainConfig> = {
  "ovarian-tissue": {
    label: "ovarian tissue",
    queryDescription: "Cryopreservation and fertility-preservation literature for ovarian tissue, ovarian cortex, follicles, and whole ovary workflows.",
    providerQueries: {
      cryodb: "ovarian tissue cryopreservation",
      openalex: "\"ovarian tissue\" cryopreservation OR vitrification OR freezing follicles ovary",
      crossref: "\"ovarian tissue\" cryopreservation vitrification follicles",
      "europe-pmc": "\"ovarian tissue\" AND (cryopreservation OR vitrification OR freezing)"
    },
    anchorKeywords: [
      "ovary",
      "ovaries",
      "ovarian tissue",
      "ovarian cortex",
      "ovarian cortical",
      "whole ovary",
      "follicle",
      "follicles"
    ],
    supportingKeywords: [
      "cryopreservation",
      "vitrification",
      "freezing",
      "fertility preservation",
      "oocyte",
      "reproductive"
    ]
  },
  islets: {
    label: "islets",
    queryDescription: "Cryopreservation literature for pancreatic islets, islet transplantation, graft function, and post-thaw islet recovery.",
    providerQueries: {
      cryodb: "islet cryopreservation",
      openalex: "\"pancreatic islets\" cryopreservation OR vitrification OR freezing transplantation",
      crossref: "\"pancreatic islets\" cryopreservation vitrification transplantation",
      "europe-pmc": "\"pancreatic islets\" AND (cryopreservation OR vitrification OR freezing)"
    },
    anchorKeywords: [
      "islet",
      "islets",
      "pancreatic islet",
      "pancreatic islets",
      "islet transplantation",
      "islet graft",
      "encapsulated islets"
    ],
    supportingKeywords: [
      "cryopreservation",
      "vitrification",
      "freezing",
      "transplantation",
      "graft",
      "insulin",
      "beta cell"
    ]
  }
};

export function getDiscoveryDomainConfig(domain: DomainId): DiscoveryDomainConfig {
  DomainIdSchema.parse(domain);
  return DISCOVERY_DOMAIN_CONFIGS[domain];
}

export function scoreDiscoveryText(
  title: string,
  abstract: string | null | undefined,
  domain: DomainId
): {
  matchedKeywords: string[];
  relevanceScore: number;
} {
  const config = getDiscoveryDomainConfig(domain);
  const haystack = `${title} ${abstract ?? ""}`.toLowerCase();
  const matchedAnchors = config.anchorKeywords.filter((keyword) => haystack.includes(keyword));
  const matchedSupporting = config.supportingKeywords.filter((keyword) => haystack.includes(keyword));

  const matchedKeywords = Array.from(new Set([...matchedAnchors, ...matchedSupporting]));
  const relevanceScore = matchedAnchors.length * 2 + matchedSupporting.length;

  return { matchedKeywords, relevanceScore };
}

export function shouldKeepDiscoveryCandidate(
  title: string,
  abstract: string | null | undefined,
  domain: DomainId
): boolean {
  const { relevanceScore } = scoreDiscoveryText(title, abstract, domain);
  return relevanceScore > 0;
}
