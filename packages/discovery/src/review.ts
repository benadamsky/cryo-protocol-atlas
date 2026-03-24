import {
  type DiscoveryPaper,
  type DiscoveryPromotionDecision,
  type DiscoveryPromotionReviewItem,
  type DomainSnapshot
} from "../../shared/src/schema.js";
import { recommendDiscoveryPaper } from "../../optimizer/src/discovery.js";

export function normalizeTitle(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function titleKey(value: string): string {
  return `title:${normalizeTitle(value)}`;
}

export function identityHintsForPaperLike(input: {
  doi?: string | null;
  pmid?: string | null;
  pmcid?: string | null;
  title: string;
}): string[] {
  const hints: string[] = [];
  if (input.doi) {
    hints.push(`doi:${input.doi.toLowerCase()}`);
  }
  if (input.pmid) {
    hints.push(`pmid:${input.pmid}`);
  }
  if (input.pmcid) {
    hints.push(`pmcid:${input.pmcid}`);
  }
  hints.push(titleKey(input.title));
  return hints;
}

export function buildTrackedKeys(domainSnapshot: DomainSnapshot): Set<string> {
  const tracked = new Set<string>();
  for (const paper of domainSnapshot.papers) {
    for (const hint of identityHintsForPaperLike({
      doi: paper.paper.doi ?? null,
      pmid: paper.paper.pmid ?? null,
      pmcid: paper.paper.pmcid ?? null,
      title: paper.paper.title
    })) {
      tracked.add(hint);
    }
    if (paper.paper.paper_id) {
      tracked.add(`paper:${paper.paper.paper_id}`);
    }
  }
  return tracked;
}

export function paperIsTracked(paper: DiscoveryPaper, trackedKeys: Set<string>): boolean {
  return identityHintsForPaperLike(paper).some((hint) => trackedKeys.has(hint));
}

export function noveltyBasisForPaper(paper: DiscoveryPaper, trackedKeys: Set<string>): string[] {
  const basis: string[] = [];
  if (paper.doi && !trackedKeys.has(`doi:${paper.doi.toLowerCase()}`)) {
    basis.push("doi-not-in-current-slice");
  }
  if (paper.pmid && !trackedKeys.has(`pmid:${paper.pmid}`)) {
    basis.push("pmid-not-in-current-slice");
  }
  if (paper.pmcid && !trackedKeys.has(`pmcid:${paper.pmcid}`)) {
    basis.push("pmcid-not-in-current-slice");
  }
  if (!trackedKeys.has(titleKey(paper.title))) {
    basis.push("title-not-in-current-slice");
  }
  if (paper.pmid) {
    basis.push("pmid-available-for-review");
  }
  if (basis.length === 0) {
    basis.push("novelty-requires-manual-confirmation");
  }
  return Array.from(new Set(basis));
}

export function evidenceFingerprintForPaper(paper: DiscoveryPaper, recommendation: "promote" | "review" | "defer"): string {
  return JSON.stringify({
    recommendation,
    rankingScore: Number(paper.rankingScore.toFixed(3)),
    relevanceScore: Number(paper.relevanceScore.toFixed(3)),
    authorityScore: Number(paper.authorityScore.toFixed(3)),
    sourceDiversityScore: Number(paper.sourceDiversityScore.toFixed(3)),
    sourceTypes: [...paper.sourceTypes].sort(),
    recordCount: paper.recordCount,
    sourceCount: paper.sourceCount,
    fullTextAvailability: paper.fullTextAvailability
  });
}

export function findMatchingExistingDecision(
  existingDecisions: DiscoveryPromotionDecision[],
  paper: DiscoveryPaper
): DiscoveryPromotionDecision | null {
  const paperHints = new Set(identityHintsForPaperLike(paper));
  return (
    existingDecisions.find((decision) => {
      const decisionHints = [
        decision.dedupeKey,
        ...(decision.doi ? [`doi:${decision.doi.toLowerCase()}`] : []),
        ...(decision.pmid ? [`pmid:${decision.pmid}`] : []),
        ...(decision.pmcid ? [`pmcid:${decision.pmcid}`] : []),
        decision.titleKey
      ];
      return decisionHints.some((hint) => paperHints.has(hint));
    }) ?? null
  );
}

export function recommendationForPaper(paper: DiscoveryPaper): {
  recommendation: "promote" | "review" | "defer";
  reasons: string[];
} {
  const result = recommendDiscoveryPaper(paper);
  return {
    recommendation: result.recommendation,
    reasons: result.reasons
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
    pmcid: paper.pmcid ?? null,
    titleKey: titleKey(paper.title),
    journal: paper.journal ?? null,
    publishedYear: paper.publishedYear ?? null,
    decision: decision.decision,
    recommendation: decision.recommendation,
    rankingScore: paper.rankingScore,
    relevanceScore: paper.relevanceScore,
    authorityScore: paper.authorityScore,
    sourceDiversityScore: paper.sourceDiversityScore,
    sourceCount: paper.sourceCount,
    recordCount: paper.recordCount,
    sourceTypes: paper.sourceTypes,
    fullTextAvailability: paper.fullTextAvailability,
    matchedKeywords: paper.matchedKeywords,
    noveltyBasis: noveltyBasisForPaper(paper, trackedKeys),
    promotionRisks: promotionRisksForPaper(paper),
    reviewChecklist: reviewChecklistForPaper(paper),
    recommendationReasons: decision.recommendationReasons,
    staleEvidence: decision.staleEvidence,
    ...(decision.staleReason ? { staleReason: decision.staleReason } : {}),
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
