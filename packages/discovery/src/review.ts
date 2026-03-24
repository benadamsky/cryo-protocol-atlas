import {
  type DiscoveryPaper,
  type DiscoveryPromotionDecision,
  type DiscoveryPromotionReviewItem,
  type DomainSnapshot
} from "../../shared/src/schema.js";

export function normalizeTitle(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function buildTrackedKeys(domainSnapshot: DomainSnapshot): Set<string> {
  const tracked = new Set<string>();
  for (const paper of domainSnapshot.papers) {
    if (paper.paper.doi) {
      tracked.add(`doi:${paper.paper.doi.toLowerCase()}`);
    }
    if (paper.paper.paper_id) {
      tracked.add(`paper:${paper.paper.paper_id}`);
    }
    tracked.add(`title:${normalizeTitle(paper.paper.title)}`);
  }
  return tracked;
}

export function noveltyBasisForPaper(paper: DiscoveryPaper, trackedKeys: Set<string>): string[] {
  const basis: string[] = [];
  if (paper.doi && !trackedKeys.has(`doi:${paper.doi.toLowerCase()}`)) {
    basis.push("doi-not-in-current-slice");
  }
  if (!trackedKeys.has(`title:${normalizeTitle(paper.title)}`)) {
    basis.push("title-not-in-current-slice");
  }
  if (paper.pmid) {
    basis.push("pmid-available-for-review");
  }
  if (basis.length === 0) {
    basis.push("novelty-requires-manual-confirmation");
  }
  return basis;
}

export function recommendationForPaper(paper: DiscoveryPaper): {
  recommendation: "promote" | "review" | "defer";
  reasons: string[];
} {
  const reasons: string[] = [];
  let score = 0;

  if (paper.sourceTypes.length >= 2) {
    score += 2;
    reasons.push("candidate appears in multiple discovery sources");
  }
  if (paper.fullTextAvailability === "open-access-full-text") {
    score += 2;
    reasons.push("open-access full text is available");
  } else if (paper.fullTextAvailability === "full-text-link") {
    score += 1;
    reasons.push("full-text landing page is available");
  }
  if (paper.authorityScore >= 0.6) {
    score += 2;
    reasons.push("authority score is high enough to justify direct promotion review");
  } else if (paper.authorityScore >= 0.2) {
    score += 1;
    reasons.push("authority score is directionally promising");
  }
  if (paper.relevanceScore >= 8) {
    score += 2;
    reasons.push("domain relevance score is high");
  } else if (paper.relevanceScore >= 4) {
    score += 1;
    reasons.push("domain relevance score is non-trivial");
  }

  if (score >= 5) {
    return { recommendation: "promote", reasons };
  }
  if (score >= 3) {
    return { recommendation: "review", reasons };
  }
  return {
    recommendation: "defer",
    reasons: reasons.length > 0 ? reasons : ["single-source, low-authority candidate should stay in the discovery backlog"]
  };
}

export function promotionRisksForPaper(paper: DiscoveryPaper): string[] {
  const risks: string[] = [];
  if (paper.sourceTypes.length < 2) {
    risks.push("single-source evidence; cross-source confirmation is still missing");
  }
  if (paper.fullTextAvailability !== "open-access-full-text") {
    risks.push("full experimental detail may still require a landing-page or subscription review");
  }
  if ((paper.abstract ?? "").trim().length === 0) {
    risks.push("abstract is missing; domain relevance relies on sparse metadata");
  }
  if (paper.authorityScore < 0.2) {
    risks.push("authority score is still weak; novelty may outrun evidentiary strength");
  }
  return risks;
}

export function reviewChecklistForPaper(paper: DiscoveryPaper): string[] {
  const checklist = [
    "confirm the paper is genuinely outside the current domain slice",
    "verify the protocol and endpoint signal from the full text before promotion",
    "check whether the paper adds a new protocol family, additive, or endpoint signal"
  ];
  if (paper.fullTextAvailability !== "open-access-full-text") {
    checklist.push("locate a full-text path or secondary source before trusting protocol detail");
  }
  if (paper.sourceTypes.length < 2) {
    checklist.push("look for corroborating records from a second literature source");
  }
  return checklist;
}

export function buildPromotionReviewItem(
  paper: DiscoveryPaper,
  decision: DiscoveryPromotionDecision,
  trackedKeys: Set<string>
): DiscoveryPromotionReviewItem {
  return {
    dedupeKey: paper.dedupeKey,
    title: paper.title,
    doi: paper.doi ?? null,
    pmid: paper.pmid ?? null,
    journal: paper.journal ?? null,
    publishedYear: paper.publishedYear ?? null,
    decision: decision.decision,
    recommendation: decision.recommendation,
    rankingScore: paper.rankingScore,
    relevanceScore: paper.relevanceScore,
    authorityScore: paper.authorityScore,
    sourceDiversityScore: paper.sourceDiversityScore,
    sourceCount: paper.sourceCount,
    sourceTypes: paper.sourceTypes,
    fullTextAvailability: paper.fullTextAvailability,
    matchedKeywords: paper.matchedKeywords,
    noveltyBasis: noveltyBasisForPaper(paper, trackedKeys),
    promotionRisks: promotionRisksForPaper(paper),
    reviewChecklist: reviewChecklistForPaper(paper),
    recommendationReasons: decision.recommendationReasons,
    ...(decision.reviewerNotes ? { reviewerNotes: decision.reviewerNotes } : {}),
    sources: paper.sources.map((source) => ({
      source: source.source,
      sourceId: source.sourceId,
      sourceUrl: source.sourceUrl ?? null,
      rawQuery: source.rawQuery,
      fullTextAvailability: source.fullTextAvailability
    }))
  };
}
