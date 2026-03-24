import {
  OptimizerEvaluationSchema,
  OptimizerScoredCandidateSchema,
  type OptimizerBenchmark,
  type OptimizerDomainMetrics,
  type OptimizerEvaluation,
  type OptimizerPolicy,
  type OptimizerScoredCandidate
} from "./schema.js";
import { scoreCandidate } from "./score.js";

function safeRatio(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }
  return Number((numerator / denominator).toFixed(4));
}

type MetricCounts = {
  candidateCount: number;
  positiveCount: number;
  negativeCount: number;
  promoteCount: number;
  reviewCount: number;
  deferCount: number;
  positivePromoteCount: number;
  positiveReviewOrPromoteCount: number;
  negativePromoteCount: number;
  negativeDeferCount: number;
  pairCount: number;
  pairWins: number;
  pairTies: number;
};

function computeRankingSummary(candidates: OptimizerScoredCandidate[]) {
  const positives = candidates.filter((candidate) => candidate.label === "promote");
  const negatives = candidates.filter((candidate) => candidate.label === "defer");
  if (positives.length === 0 || negatives.length === 0) {
    return {
      pairCount: 0,
      pairWins: 0,
      pairTies: 0
    };
  }

  let pairWins = 0;
  let pairTies = 0;
  for (const positive of positives) {
    for (const negative of negatives) {
      if (positive.score > negative.score) {
        pairWins += 1;
      } else if (positive.score === negative.score) {
        pairTies += 1;
      }
    }
  }

  return {
    pairCount: positives.length * negatives.length,
    pairWins,
    pairTies
  };
}

function computeMetricCounts(candidates: OptimizerScoredCandidate[]): MetricCounts {
  const positives = candidates.filter((candidate) => candidate.label === "promote");
  const negatives = candidates.filter((candidate) => candidate.label === "defer");
  const promoted = candidates.filter((candidate) => candidate.recommendation === "promote");
  const reviewed = candidates.filter((candidate) => candidate.recommendation === "review");
  const deferred = candidates.filter((candidate) => candidate.recommendation === "defer");
  const rankingSummary = computeRankingSummary(candidates);

  return {
    candidateCount: candidates.length,
    positiveCount: positives.length,
    negativeCount: negatives.length,
    promoteCount: promoted.length,
    reviewCount: reviewed.length,
    deferCount: deferred.length,
    positivePromoteCount: promoted.filter((candidate) => candidate.label === "promote").length,
    positiveReviewOrPromoteCount: positives.filter((candidate) => candidate.recommendation !== "defer").length,
    negativePromoteCount: promoted.filter((candidate) => candidate.label === "defer").length,
    negativeDeferCount: deferred.filter((candidate) => candidate.label === "defer").length,
    pairCount: rankingSummary.pairCount,
    pairWins: rankingSummary.pairWins,
    pairTies: rankingSummary.pairTies
  };
}

function computeObjective(metrics: {
  rankingAccuracy: number;
  promotePrecision: number;
  promoteRecall: number;
  reviewOrPromoteRecall: number;
  deferPrecision: number;
}) {
  return Number(
    (
      metrics.rankingAccuracy * 0.4 +
      metrics.promotePrecision * 0.2 +
      metrics.promoteRecall * 0.2 +
      metrics.reviewOrPromoteRecall * 0.15 +
      metrics.deferPrecision * 0.05
    ).toFixed(4)
  );
}

function metricsFromCounts(counts: MetricCounts) {
  const rankingAccuracy =
    counts.pairCount === 0
      ? 0
      : Number(((counts.pairWins + counts.pairTies * 0.5) / counts.pairCount).toFixed(4));
  const promotePrecision = safeRatio(counts.positivePromoteCount, counts.promoteCount);
  const promoteRecall = safeRatio(counts.positivePromoteCount, counts.positiveCount);
  const reviewOrPromoteRecall = safeRatio(counts.positiveReviewOrPromoteCount, counts.positiveCount);
  const deferPrecision = safeRatio(counts.negativeDeferCount, counts.deferCount);
  const negativePromoteRate = safeRatio(counts.negativePromoteCount, counts.negativeCount);

  return {
    rankingAccuracy,
    promotePrecision,
    promoteRecall,
    reviewOrPromoteRecall,
    deferPrecision,
    negativePromoteRate,
    objective: computeObjective({
      rankingAccuracy,
      promotePrecision,
      promoteRecall,
      reviewOrPromoteRecall,
      deferPrecision
    })
  };
}

function buildDomainMetrics(domainCandidates: OptimizerScoredCandidate[]): OptimizerDomainMetrics {
  const counts = computeMetricCounts(domainCandidates);
  const metrics = metricsFromCounts(counts);

  return {
    domain: domainCandidates[0]?.domain ?? "islets",
    candidateCount: counts.candidateCount,
    positiveCount: counts.positiveCount,
    negativeCount: counts.negativeCount,
    promoteCount: counts.promoteCount,
    reviewCount: counts.reviewCount,
    deferCount: counts.deferCount,
    ...metrics
  };
}

export function evaluateOptimizerPolicy(input: {
  benchmark: OptimizerBenchmark;
  policy: OptimizerPolicy;
}): OptimizerEvaluation {
  const scoredCandidates = input.benchmark.candidates.map((candidate) => {
    const scored = scoreCandidate(candidate, input.policy);
    return OptimizerScoredCandidateSchema.parse({
      domain: candidate.domain,
      paperId: candidate.paperId,
      title: candidate.title,
      label: candidate.label,
      score: scored.score,
      recommendation: scored.recommendation,
      featureContributions: scored.featureContributions
    });
  });

  const byDomain = [...new Set(scoredCandidates.map((candidate) => candidate.domain))]
    .sort()
    .map((domain) => buildDomainMetrics(scoredCandidates.filter((candidate) => candidate.domain === domain)));

  const topFalsePromotes = scoredCandidates
    .filter((candidate) => candidate.label === "defer" && candidate.recommendation === "promote")
    .sort((left, right) => right.score - left.score)
    .slice(0, 10);
  const missedPositives = scoredCandidates
    .filter((candidate) => candidate.label === "promote" && candidate.recommendation === "defer")
    .sort((left, right) => left.score - right.score)
    .slice(0, 10);
  const aggregateCounts = computeMetricCounts(scoredCandidates);

  return OptimizerEvaluationSchema.parse({
    generatedAt: new Date().toISOString(),
    benchmarkGeneratedAt: input.benchmark.generatedAt,
    aggregate: {
      candidateCount: aggregateCounts.candidateCount,
      positiveCount: aggregateCounts.positiveCount,
      negativeCount: aggregateCounts.negativeCount,
      promoteCount: aggregateCounts.promoteCount,
      reviewCount: aggregateCounts.reviewCount,
      deferCount: aggregateCounts.deferCount,
      ...metricsFromCounts(aggregateCounts)
    },
    byDomain,
    topFalsePromotes,
    missedPositives
  });
}

export function renderEvaluationMarkdown(input: {
  benchmark: OptimizerBenchmark;
  evaluation: OptimizerEvaluation;
}): string {
  const lines: string[] = [];
  lines.push("# Optimizer policy evaluation");
  lines.push("");
  lines.push(`- benchmark generated at: ${input.benchmark.generatedAt}`);
  lines.push(`- domains: ${input.benchmark.domains.join(", ")}`);
  lines.push(`- candidates: ${input.evaluation.aggregate.candidateCount}`);
  lines.push(`- positives: ${input.evaluation.aggregate.positiveCount}`);
  lines.push(`- negatives: ${input.evaluation.aggregate.negativeCount}`);
  lines.push(`- recommendations: promote=${input.evaluation.aggregate.promoteCount} review=${input.evaluation.aggregate.reviewCount} defer=${input.evaluation.aggregate.deferCount}`);
  lines.push(`- ranking accuracy: ${input.evaluation.aggregate.rankingAccuracy}`);
  lines.push(`- promote precision: ${input.evaluation.aggregate.promotePrecision}`);
  lines.push(`- promote recall: ${input.evaluation.aggregate.promoteRecall}`);
  lines.push(`- review-or-promote recall: ${input.evaluation.aggregate.reviewOrPromoteRecall}`);
  lines.push(`- defer precision: ${input.evaluation.aggregate.deferPrecision}`);
  lines.push(`- optimizer objective: ${input.evaluation.aggregate.objective}`);
  lines.push("");
  lines.push("## By domain");
  for (const domainMetrics of input.evaluation.byDomain) {
    lines.push(
      `- ${domainMetrics.domain}: objective=${domainMetrics.objective} | ranking=${domainMetrics.rankingAccuracy} | promotePrecision=${domainMetrics.promotePrecision} | reviewOrPromoteRecall=${domainMetrics.reviewOrPromoteRecall}`
    );
  }
  lines.push("");
  lines.push("## Highest-scoring false promotes");
  if (input.evaluation.topFalsePromotes.length === 0) {
    lines.push("- none");
  } else {
    for (const candidate of input.evaluation.topFalsePromotes) {
      lines.push(`- ${candidate.domain} | ${candidate.title} | score=${candidate.score}`);
    }
  }
  lines.push("");
  lines.push("## Missed promotable papers");
  if (input.evaluation.missedPositives.length === 0) {
    lines.push("- none");
  } else {
    for (const candidate of input.evaluation.missedPositives) {
      lines.push(`- ${candidate.domain} | ${candidate.title} | score=${candidate.score}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}
