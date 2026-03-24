import {
  OptimizerPolicySchema,
  type OptimizerBenchmarkCandidate,
  type OptimizerPolicy,
  type OptimizerRecommendation
} from "./schema.js";

export function scoreCandidate(
  candidate: OptimizerBenchmarkCandidate,
  policyInput: OptimizerPolicy
): {
  score: number;
  recommendation: OptimizerRecommendation;
  featureContributions: Record<string, number>;
} {
  const policy = OptimizerPolicySchema.parse(policyInput);
  const featureContributions: Record<string, number> = {
    bias: policy.weights.bias
  };
  let score = policy.weights.bias;

  const weightedFeatures = [
    "retrievalScore",
    "matchedKeywordCount",
    "titleProtocolHits",
    "titleExperimentalHits",
    "abstractProtocolHits",
    "abstractOutcomeHits",
    "negativeSignalHits",
    "doiPresent",
    "journalPresent",
    "recentYear"
  ] as const;

  for (const key of weightedFeatures) {
    const contribution = Number((candidate.features[key] * policy.weights[key]).toFixed(6));
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
