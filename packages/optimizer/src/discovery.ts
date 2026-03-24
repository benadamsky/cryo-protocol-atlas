import { DiscoveryPaperSchema, type DiscoveryPaper } from "../../shared/src/schema.js";
import { buildOptimizerFeatureVector } from "./features.js";
import { optimizerPolicy } from "./policy.js";
import { scoreFeatureVector } from "./score.js";
import { type OptimizerPolicy, type OptimizerRecommendation } from "./schema.js";

export function recommendDiscoveryPaper(
  paperInput: DiscoveryPaper,
  policy: OptimizerPolicy = optimizerPolicy
): {
  score: number;
  recommendation: OptimizerRecommendation;
  featureContributions: Record<string, number>;
  reasons: string[];
} {
  const paper = DiscoveryPaperSchema.parse(paperInput);
  const features = buildOptimizerFeatureVector(
    {
      title: paper.title,
      abstract: paper.abstract,
      doi: paper.doi ?? null,
      journal: paper.journal ?? null,
      publishedYear: paper.publishedYear ?? null,
      matchedKeywords: paper.matchedKeywords,
      discoveryRankingScore: paper.rankingScore,
      discoveryRelevanceScore: paper.relevanceScore,
      authorityScore: paper.authorityScore,
      sourceDiversityScore: paper.sourceDiversityScore,
      sourceCount: paper.sourceCount,
      fullTextAvailability: paper.fullTextAvailability
    },
    policy
  );
  const scored = scoreFeatureVector(features, policy);
  const reasons: string[] = [];

  if (scored.recommendation === "promote") {
    reasons.push(`optimizer score ${scored.score} cleared the promote threshold ${policy.thresholds.promote}`);
  } else if (scored.recommendation === "review") {
    reasons.push(
      `optimizer score ${scored.score} cleared the review threshold ${policy.thresholds.review} but stayed below promote ${policy.thresholds.promote}`
    );
  } else {
    reasons.push(`optimizer score ${scored.score} stayed below the review threshold ${policy.thresholds.review}`);
  }

  if (paper.sourceCount >= 2) {
    reasons.push("candidate appears in multiple discovery sources");
  }
  if (paper.fullTextAvailability === "open-access-full-text") {
    reasons.push("open-access full text is available");
  } else if (paper.fullTextAvailability === "full-text-link") {
    reasons.push("full-text landing page is available");
  }
  if (paper.authorityScore >= 0.5) {
    reasons.push("authority score is high enough to justify direct promotion review");
  } else if (paper.authorityScore >= 0.2) {
    reasons.push("authority score is directionally promising");
  }
  if (paper.relevanceScore >= 8) {
    reasons.push("domain relevance score is high");
  } else if (paper.relevanceScore >= 5) {
    reasons.push("domain relevance score is non-trivial");
  }

  if (paper.sourceDiversityScore >= 0.5) {
    reasons.push("source diversity is strong enough to reduce single-provider bias");
  }
  if (scored.recommendation === "defer" && reasons.length === 1) {
    reasons.push("single-source, low-authority candidate should stay in the discovery backlog");
  }

  return {
    score: scored.score,
    recommendation: scored.recommendation,
    featureContributions: scored.featureContributions,
    reasons
  };
}
