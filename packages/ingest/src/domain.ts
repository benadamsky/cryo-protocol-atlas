import { DomainIdSchema, type CryoPaper, type DomainId, type DomainPaper } from "../../shared/src/schema.js";

const domainKeywords: Record<DomainId, { anchorKeywords: string[]; supportingKeywords: string[] }> = {
  "ovarian-tissue": {
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
    supportingKeywords: [
      "ovarian",
      "oocyte",
      "oocytes",
      "fertility preservation",
      "reproductive tissue",
      "cryopreservation"
    ]
  },
  islets: {
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
  }
};

export function scorePaperForDomain(paper: CryoPaper, domain: DomainId): DomainPaper | null {
  DomainIdSchema.parse(domain);

  const haystack = `${paper.title} ${paper.abstract ?? ""}`.toLowerCase();
  const { anchorKeywords, supportingKeywords } = domainKeywords[domain];
  const matchedAnchors = anchorKeywords.filter((keyword) => haystack.includes(keyword));
  const matchedSupportingKeywords = supportingKeywords.filter((keyword) => haystack.includes(keyword));

  if (matchedAnchors.length === 0) {
    return null;
  }

  return {
    domain,
    paper,
    score: matchedAnchors.length * 2 + matchedSupportingKeywords.length,
    matchedKeywords: [...matchedAnchors, ...matchedSupportingKeywords]
  };
}
