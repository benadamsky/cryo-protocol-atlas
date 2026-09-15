import { getDomain } from "../../shared/src/domains/index.js";
import { DomainIdSchema, type CryoPaper, type DomainId, type DomainPaper } from "../../shared/src/schema.js";

export function scorePaperForDomain(paper: CryoPaper, domain: DomainId): DomainPaper | null {
  DomainIdSchema.parse(domain);

  const haystack = `${paper.title} ${paper.abstract ?? ""}`.toLowerCase();
  const { anchorKeywords, supportingKeywords } = getDomain(domain).ingest;
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
