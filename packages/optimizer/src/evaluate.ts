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

function computeRankingAccuracy(candidates: OptimizerScoredCandidate[]): number {
  const positives = candidates.filter((candidate) => candidate.label === "promote");
  const negatives = candidates.filter((candidate) => candidate.label === "defer");
  if (positives.length === 0 || negatives.length === 0) {
    return 0;
  }

  let wins = 0;
  let ties = 0;
  for (const positive of positives) {
    for (const negative of negatives) {
      if (positive.score > negative.score) {
        wins += 1;
      } else if (positive.score === negative.score) {
        ties += 1;
      }
    }
  }

  const pairCount = positives.length * negatives.length;
  return Number(((wins + ties * 0.5) / pairCount).toFixed(4));
}

function buildDomainMetrics(domainCandidates: OptimizerScoredCandidate[]): OptimizerDomainMetrics {
  const positives = domainCandidates.filter((candidate) => candidate.label === "promote");
  const negatives = domainCandidates.filter((candidate) => candidate.label === "defer");
  const promoted = domainCandidates.filter((candidate) => candidate.recommendation === "promote");
  const deferred = domainCandidates.filter((candidate) => candidate.recommendation === "defer");
  const nonDeferredPositives = positives.filter((candidate) => candidate.recommendation !== "defer");
  const negativePromotes = promoted.filter((candidate) => candidate.label === "defer");

  const rankingAccuracy = computeRankingAccuracy(domainCandidates);
  const promotePrecision = safeRatio(
    promoted.filter((candidate) => candidate.label === "promote").length,
    promoted.length
  );
  const promoteRecall = safeRatio(
    positives.filter((candidate) => candidate.recommendation === "promote").length,
    positives.length
  );
  const reviewOrPromoteRecall = safeRatio(nonDeferredPositives.length, positives.length);
  const deferPrecision = safeRatio(
    deferred.filter((candidate) => candidate.label === "defer").length,
    deferred.length
  );
  const negativePromoteRate = safeRatio(negativePromotes.length, negatives.length);
  const objective = Number(
    (
      rankingAccuracy * 0.55 +
      promotePrecision * 0.2 +
      reviewOrPromoteRecall * 0.2 +
      deferPrecision * 0.05
    ).toFixed(4)
  );

  return {
    domain: domainCandidates[0]?.domain ?? "islets",
    candidateCount: domainCandidates.length,
    positiveCount: positives.length,
    negativeCount: negatives.length,
    promoteCount: promoted.length,
    reviewCount: domainCandidates.filter((candidate) => candidate.recommendation === "review").length,
    deferCount: deferred.length,
    rankingAccuracy,
    promotePrecision,
    promoteRecall,
    reviewOrPromoteRecall,
    deferPrecision,
    negativePromoteRate,
    objective
  };
}

function aggregateMetrics(byDomain: OptimizerDomainMetrics[]) {
  const candidateCount = byDomain.reduce((sum, metrics) => sum + metrics.candidateCount, 0);
  const positiveCount = byDomain.reduce((sum, metrics) => sum + metrics.positiveCount, 0);
  const negativeCount = byDomain.reduce((sum, metrics) => sum + metrics.negativeCount, 0);
  const promoteCount = byDomain.reduce((sum, metrics) => sum + metrics.promoteCount, 0);
  const reviewCount = byDomain.reduce((sum, metrics) => sum + metrics.reviewCount, 0);
  const deferCount = byDomain.reduce((sum, metrics) => sum + metrics.deferCount, 0);
  const totalWeight = candidateCount || 1;

  const weightedAverage = (selector: (metrics: OptimizerDomainMetrics) => number) =>
    Number(
      (
        byDomain.reduce((sum, metrics) => sum + selector(metrics) * metrics.candidateCount, 0) / totalWeight
      ).toFixed(4)
    );

  return {
    candidateCount,
    positiveCount,
    negativeCount,
    promoteCount,
    reviewCount,
    deferCount,
    rankingAccuracy: weightedAverage((metrics) => metrics.rankingAccuracy),
    promotePrecision: weightedAverage((metrics) => metrics.promotePrecision),
    promoteRecall: weightedAverage((metrics) => metrics.promoteRecall),
    reviewOrPromoteRecall: weightedAverage((metrics) => metrics.reviewOrPromoteRecall),
    deferPrecision: weightedAverage((metrics) => metrics.deferPrecision),
    negativePromoteRate: weightedAverage((metrics) => metrics.negativePromoteRate),
    objective: weightedAverage((metrics) => metrics.objective)
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

  return OptimizerEvaluationSchema.parse({
    generatedAt: new Date().toISOString(),
    benchmarkGeneratedAt: input.benchmark.generatedAt,
    aggregate: aggregateMetrics(byDomain),
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
