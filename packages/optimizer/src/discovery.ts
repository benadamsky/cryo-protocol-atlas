import { DiscoveryPaperSchema, type DiscoveryPaper } from "../../shared/src/schema.js";
import { buildOptimizerFeatureVector, explainDiscoveryFeatureVector } from "./features.js";
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

  reasons.push(...explainDiscoveryFeatureVector(features));
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
