import { z } from "zod";
import { DomainIdSchema } from "../../shared/src/schema.js";

export const OptimizerRecommendationSchema = z.enum(["promote", "review", "defer"]);
export type OptimizerRecommendation = z.infer<typeof OptimizerRecommendationSchema>;

export const OptimizerPolicySchema = z.object({
  weights: z.object({
    bias: z.number(),
    retrievalScore: z.number(),
    matchedKeywordCount: z.number(),
    titleProtocolHits: z.number(),
    titleExperimentalHits: z.number(),
    abstractProtocolHits: z.number(),
    abstractOutcomeHits: z.number(),
    negativeSignalHits: z.number(),
    doiPresent: z.number(),
    journalPresent: z.number(),
    recentYear: z.number()
  }),
  thresholds: z.object({
    promote: z.number(),
    review: z.number()
  }),
  heuristics: z.object({
    protocolSignals: z.array(z.string()).min(1),
    experimentalSignals: z.array(z.string()).min(1),
    outcomeSignals: z.array(z.string()).min(1),
    negativeSignals: z.array(z.string()).min(1)
  })
});
export type OptimizerPolicy = z.infer<typeof OptimizerPolicySchema>;

export const OptimizerBenchmarkCandidateSchema = z.object({
  domain: DomainIdSchema,
  paperId: z.string(),
  title: z.string(),
  label: z.enum(["promote", "defer"]),
  reviewStatus: z.literal("reviewed"),
  expectedInAtlas: z.boolean(),
  metadata: z.object({
    doi: z.string().nullable(),
    journal: z.string().nullable(),
    publishedYear: z.number().nullable(),
    matchedKeywords: z.array(z.string())
  }),
  features: z.object({
    retrievalScore: z.number(),
    matchedKeywordCount: z.number(),
    titleProtocolHits: z.number(),
    titleExperimentalHits: z.number(),
    abstractProtocolHits: z.number(),
    abstractOutcomeHits: z.number(),
    negativeSignalHits: z.number(),
    doiPresent: z.number(),
    journalPresent: z.number(),
    recentYear: z.number()
  })
});
export type OptimizerBenchmarkCandidate = z.infer<typeof OptimizerBenchmarkCandidateSchema>;

export const OptimizerBenchmarkSchema = z.object({
  generatedAt: z.string(),
  description: z.string(),
  heuristicFingerprint: z.string(),
  domains: z.array(DomainIdSchema),
  candidateCount: z.number().int().nonnegative(),
  positiveCount: z.number().int().nonnegative(),
  negativeCount: z.number().int().nonnegative(),
  candidates: z.array(OptimizerBenchmarkCandidateSchema)
});
export type OptimizerBenchmark = z.infer<typeof OptimizerBenchmarkSchema>;

export const OptimizerScoredCandidateSchema = z.object({
  domain: DomainIdSchema,
  paperId: z.string(),
  title: z.string(),
  label: z.enum(["promote", "defer"]),
  score: z.number(),
  recommendation: OptimizerRecommendationSchema,
  featureContributions: z.record(z.string(), z.number())
});
export type OptimizerScoredCandidate = z.infer<typeof OptimizerScoredCandidateSchema>;

export const OptimizerDomainMetricsSchema = z.object({
  domain: DomainIdSchema,
  candidateCount: z.number().int().nonnegative(),
  positiveCount: z.number().int().nonnegative(),
  negativeCount: z.number().int().nonnegative(),
  promoteCount: z.number().int().nonnegative(),
  reviewCount: z.number().int().nonnegative(),
  deferCount: z.number().int().nonnegative(),
  rankingAccuracy: z.number(),
  promotePrecision: z.number(),
  promoteRecall: z.number(),
  reviewOrPromoteRecall: z.number(),
  deferPrecision: z.number(),
  negativePromoteRate: z.number(),
  objective: z.number()
});
export type OptimizerDomainMetrics = z.infer<typeof OptimizerDomainMetricsSchema>;

export const OptimizerEvaluationSchema = z.object({
  generatedAt: z.string(),
  benchmarkGeneratedAt: z.string(),
  aggregate: z.object({
    candidateCount: z.number().int().nonnegative(),
    positiveCount: z.number().int().nonnegative(),
    negativeCount: z.number().int().nonnegative(),
    promoteCount: z.number().int().nonnegative(),
    reviewCount: z.number().int().nonnegative(),
    deferCount: z.number().int().nonnegative(),
    rankingAccuracy: z.number(),
    promotePrecision: z.number(),
    promoteRecall: z.number(),
    reviewOrPromoteRecall: z.number(),
    deferPrecision: z.number(),
    negativePromoteRate: z.number(),
    objective: z.number()
  }),
  byDomain: z.array(OptimizerDomainMetricsSchema),
  topFalsePromotes: z.array(OptimizerScoredCandidateSchema),
  missedPositives: z.array(OptimizerScoredCandidateSchema)
});
export type OptimizerEvaluation = z.infer<typeof OptimizerEvaluationSchema>;

export const OptimizerMutationSchema = z.object({
  path: z.string(),
  from: z.number(),
  to: z.number(),
  delta: z.number()
});
export type OptimizerMutation = z.infer<typeof OptimizerMutationSchema>;

export const OptimizerLoopAttemptSchema = z.object({
  attempt: z.number().int().positive(),
  mutation: OptimizerMutationSchema,
  objectiveBefore: z.number(),
  objectiveAfter: z.number(),
  accepted: z.boolean(),
  rationale: z.string(),
  metricsAfter: OptimizerEvaluationSchema.shape.aggregate
});
export type OptimizerLoopAttempt = z.infer<typeof OptimizerLoopAttemptSchema>;

export const OptimizerLoopRunSchema = z.object({
  generatedAt: z.string(),
  strategyPath: z.string(),
  strategySummary: z.object({
    domains: z.array(DomainIdSchema),
    maxAttempts: z.number().int().positive(),
    maxAcceptedMutations: z.number().int().positive(),
    minimumScoreDelta: z.number().nonnegative(),
    minimumPromotePrecision: z.number().min(0).max(1),
    minimumPromoteRecall: z.number().min(0).max(1)
  }),
  baselineObjective: z.number(),
  finalObjective: z.number(),
  acceptedMutationCount: z.number().int().nonnegative(),
  attempts: z.array(OptimizerLoopAttemptSchema)
});
export type OptimizerLoopRun = z.infer<typeof OptimizerLoopRunSchema>;

export const OptimizerProgramSchema = z.object({
  domains: z.array(DomainIdSchema),
  maxAttempts: z.number().int().positive(),
  maxAcceptedMutations: z.number().int().positive(),
  minimumScoreDelta: z.number().nonnegative(),
  minimumPromotePrecision: z.number().min(0).max(1),
  minimumPromoteRecall: z.number().min(0).max(1)
});
export type OptimizerProgram = z.infer<typeof OptimizerProgramSchema>;
