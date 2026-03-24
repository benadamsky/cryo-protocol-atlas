import {
  OptimizerFeatureVectorSchema,
  OptimizerPolicySchema,
  type OptimizerBenchmarkCandidate,
  type OptimizerFeatureVector,
  type OptimizerPolicy,
  type OptimizerRecommendation
} from "./schema.js";

const WEIGHTED_FEATURE_KEYS = [
  "retrievalScore",
  "matchedKeywordCount",
  "titleProtocolHits",
  "titleExperimentalHits",
  "abstractProtocolHits",
  "abstractOutcomeHits",
  "negativeSignalHits",
  "doiPresent",
  "journalPresent",
  "recentYear",
  "discoveryRankingScore",
  "discoveryRelevanceScore",
  "authorityScore",
  "sourceDiversityScore",
  "multiSourceEvidence",
  "fullTextLink",
  "openAccessFullText"
] as const;

export function scoreFeatureVector(
  featuresInput: OptimizerFeatureVector,
  policyInput: OptimizerPolicy
): {
  score: number;
  recommendation: OptimizerRecommendation;
  featureContributions: Record<string, number>;
} {
  const features = OptimizerFeatureVectorSchema.parse(featuresInput);
  const policy = OptimizerPolicySchema.parse(policyInput);
  const featureContributions: Record<string, number> = {
    bias: policy.weights.bias
  };
  let score = policy.weights.bias;

  for (const key of WEIGHTED_FEATURE_KEYS) {
    const contribution = Number((features[key] * policy.weights[key]).toFixed(6));
    featureContributions[key] = contribution;
    score += contribution;
  }

  const roundedScore = Number(score.toFixed(6));
  let recommendation: OptimizerRecommendation = "defer";
  if (roundedScore >= policy.thresholds.promote) {
    recommendation = "promote";
  } else if (roundedScore >= policy.thresholds.review) {
    recommendation = "review";
  }

  return {
    score: roundedScore,
    recommendation,
    featureContributions
  };
}

export function scoreCandidate(
  candidate: OptimizerBenchmarkCandidate,
  policyInput: OptimizerPolicy
): {
  score: number;
  recommendation: OptimizerRecommendation;
  featureContributions: Record<string, number>;
} {
  return scoreFeatureVector(candidate.features, policyInput);
}
