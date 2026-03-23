import { z } from "zod";

export const DomainIdSchema = z.enum(["ovarian-tissue", "islets"]);
export type DomainId = z.infer<typeof DomainIdSchema>;

export const ProtocolFamilySchema = z.enum([
  "vitrification",
  "slow-freezing",
  "comparative",
  "unknown"
]);
export type ProtocolFamily = z.infer<typeof ProtocolFamilySchema>;

export const OutcomeClassSchema = z.enum([
  "morphology",
  "viability",
  "function",
  "reproductive",
  "transplantation"
]);
export type OutcomeClass = z.infer<typeof OutcomeClassSchema>;

export const OutcomeStrengthSchema = z.enum(["weak", "moderate", "strong"]);
export type OutcomeStrength = z.infer<typeof OutcomeStrengthSchema>;

export const PaperTypeSchema = z.enum([
  "experimental",
  "review",
  "methods",
  "commentary",
  "unknown"
]);
export type PaperType = z.infer<typeof PaperTypeSchema>;

export const ProtocolPhaseSchema = z.enum([
  "equilibration",
  "loading",
  "cooling",
  "storage",
  "warming",
  "unloading",
  "perfusion",
  "culture",
  "assessment",
  "unknown"
]);
export type ProtocolPhase = z.infer<typeof ProtocolPhaseSchema>;

export const CryoPaperSchema = z.object({
  id: z.string(),
  paper_id: z.string().nullable().optional(),
  doi: z.string().nullable().optional(),
  title: z.string(),
  abstract: z.string().nullable().optional(),
  paper_url: z.string().nullable().optional(),
  journal: z.string().nullable().optional(),
  published_year: z.number().nullable().optional(),
  published_month: z.number().nullable().optional(),
  published_day: z.number().nullable().optional(),
  authors_flat: z.string().nullable().optional()
});
export type CryoPaper = z.infer<typeof CryoPaperSchema>;

export const CryoChemicalSchema = z.object({
  id: z.string(),
  preferred_name: z.string(),
  role: z.string().nullable().optional(),
  synonyms: z.array(z.string()).optional().default([]),
  inchikey: z.string().nullable().optional()
});
export type CryoChemical = z.infer<typeof CryoChemicalSchema>;

export const DomainPaperSchema = z.object({
  domain: DomainIdSchema,
  paper: CryoPaperSchema,
  score: z.number(),
  matchedKeywords: z.array(z.string())
});
export type DomainPaper = z.infer<typeof DomainPaperSchema>;

export const DomainSnapshotSchema = z.object({
  generatedAt: z.string(),
  domain: DomainIdSchema,
  totalFetched: z.number(),
  totalMatched: z.number(),
  papers: z.array(DomainPaperSchema)
});
export type DomainSnapshot = z.infer<typeof DomainSnapshotSchema>;

export const EvidenceSourceTypeSchema = z.enum([
  "title-or-abstract",
  "full-text",
  "methods",
  "results",
  "discussion",
  "manual-note",
  "reviewed-benchmark",
  "derived"
]);
export type EvidenceSourceType = z.infer<typeof EvidenceSourceTypeSchema>;

export const EvidenceAuthorityTierSchema = z.enum([
  "primary-direct",
  "primary-indirect",
  "secondary",
  "manual-curation",
  "derived"
]);
export type EvidenceAuthorityTier = z.infer<typeof EvidenceAuthorityTierSchema>;

export const EvidenceExplicitnessSchema = z.enum(["direct", "indirect", "inferred"]);
export type EvidenceExplicitness = z.infer<typeof EvidenceExplicitnessSchema>;

export const EvidenceSnippetSchema = z.object({
  kind: z.enum([
    "protocol-family",
    "specimen",
    "chemical",
    "temperature",
    "duration",
    "outcome",
    "source-enrichment"
  ]),
  text: z.string(),
  confidence: z.number().min(0).max(1),
  sourceType: EvidenceSourceTypeSchema.default("title-or-abstract"),
  authorityTier: EvidenceAuthorityTierSchema.default("primary-indirect"),
  explicitness: EvidenceExplicitnessSchema.default("indirect"),
  reviewed: z.boolean().default(false)
});
export type EvidenceSnippet = z.infer<typeof EvidenceSnippetSchema>;

export const EvidenceAuthoritySummarySchema = z.object({
  strongestAuthority: EvidenceAuthorityTierSchema,
  primaryDirectSnippetCount: z.number().int().nonnegative(),
  primaryIndirectSnippetCount: z.number().int().nonnegative(),
  secondarySnippetCount: z.number().int().nonnegative(),
  manualCurationSnippetCount: z.number().int().nonnegative(),
  reviewedSnippetCount: z.number().int().nonnegative(),
  directSnippetCount: z.number().int().nonnegative(),
  indirectSnippetCount: z.number().int().nonnegative(),
  inferredSnippetCount: z.number().int().nonnegative()
});
export type EvidenceAuthoritySummary = z.infer<typeof EvidenceAuthoritySummarySchema>;

export const ChemicalMentionSchema = z.object({
  canonicalName: z.string(),
  aliasesMatched: z.array(z.string()),
  concentrationMentions: z.array(z.string()),
  evidence: z.array(EvidenceSnippetSchema)
});
export type ChemicalMention = z.infer<typeof ChemicalMentionSchema>;

export const OutcomeMentionSchema = z.object({
  outcomeClass: OutcomeClassSchema,
  strength: OutcomeStrengthSchema,
  summary: z.string(),
  evidence: z.array(EvidenceSnippetSchema)
});
export type OutcomeMention = z.infer<typeof OutcomeMentionSchema>;

export const ProtocolStepSchema = z.object({
  order: z.number().int().nonnegative(),
  phase: ProtocolPhaseSchema,
  summary: z.string(),
  chemicals: z.array(z.string()),
  concentrations: z.array(z.string()),
  temperatures: z.array(z.string()),
  durations: z.array(z.string()),
  evidence: z.array(EvidenceSnippetSchema)
});
export type ProtocolStep = z.infer<typeof ProtocolStepSchema>;

export const ProtocolExtractionSchema = z.object({
  domain: DomainIdSchema,
  paper: CryoPaperSchema,
  paperType: PaperTypeSchema,
  protocolFamily: ProtocolFamilySchema,
  speciesMentions: z.array(z.string()),
  specimenTypes: z.array(z.string()),
  chemicalMentions: z.array(ChemicalMentionSchema),
  protocolSteps: z.array(ProtocolStepSchema),
  temperatureMentions: z.array(z.string()),
  durationMentions: z.array(z.string()),
  outcomeMentions: z.array(OutcomeMentionSchema),
  evidenceSnippets: z.array(EvidenceSnippetSchema),
  evidenceAuthority: EvidenceAuthoritySummarySchema,
  extractionConfidence: z.number().min(0).max(1)
});
export type ProtocolExtraction = z.infer<typeof ProtocolExtractionSchema>;

export const ExtractionSnapshotSchema = z.object({
  generatedAt: z.string(),
  domain: DomainIdSchema,
  totalPapers: z.number(),
  protocolFamilyCounts: z.record(z.string(), z.number()),
  extractions: z.array(ProtocolExtractionSchema)
});
export type ExtractionSnapshot = z.infer<typeof ExtractionSnapshotSchema>;

export const NormalizedMeasurementKindSchema = z.enum([
  "concentration",
  "temperature",
  "duration",
  "cooling-rate",
  "warming-rate"
]);
export type NormalizedMeasurementKind = z.infer<typeof NormalizedMeasurementKindSchema>;

export const NormalizationMethodSchema = z.enum([
  "parsed",
  "canonicalized",
  "copied",
  "unresolved"
]);
export type NormalizationMethod = z.infer<typeof NormalizationMethodSchema>;

export const NormalizedMeasurementSchema = z.object({
  rawText: z.string(),
  kind: NormalizedMeasurementKindSchema,
  value: z.number(),
  unit: z.string(),
  normalizedText: z.string(),
  normalizationMethod: NormalizationMethodSchema,
  confidence: z.number().min(0).max(1)
});
export type NormalizedMeasurement = z.infer<typeof NormalizedMeasurementSchema>;

export const NormalizedChemicalSchema = z.object({
  canonicalName: z.string(),
  aliasesMatched: z.array(z.string()),
  normalizedConcentrations: z.array(NormalizedMeasurementSchema)
});
export type NormalizedChemical = z.infer<typeof NormalizedChemicalSchema>;

export const NormalizedConditionSourceSchema = z.enum(["step", "chemical-mention"]);
export type NormalizedConditionSource = z.infer<typeof NormalizedConditionSourceSchema>;

export const NormalizedConditionSchema = z.object({
  phase: ProtocolPhaseSchema,
  chemical: z.string(),
  measurement: NormalizedMeasurementSchema,
  label: z.string(),
  source: NormalizedConditionSourceSchema,
  confidence: z.number().min(0).max(1)
});
export type NormalizedCondition = z.infer<typeof NormalizedConditionSchema>;

export const NormalizedProtocolStepSchema = z.object({
  order: z.number().int().nonnegative(),
  phase: ProtocolPhaseSchema,
  summary: z.string(),
  chemicals: z.array(z.string()),
  concentrations: z.array(NormalizedMeasurementSchema),
  temperatures: z.array(NormalizedMeasurementSchema),
  durations: z.array(NormalizedMeasurementSchema),
  rates: z.array(NormalizedMeasurementSchema),
  transitionToNextPhase: ProtocolPhaseSchema.optional(),
  evidence: z.array(EvidenceSnippetSchema)
});
export type NormalizedProtocolStep = z.infer<typeof NormalizedProtocolStepSchema>;

export const NormalizedProtocolSchema = z.object({
  domain: DomainIdSchema,
  paperId: z.string(),
  paperTitle: z.string(),
  paperType: PaperTypeSchema,
  protocolFamily: ProtocolFamilySchema,
  speciesMentions: z.array(z.string()),
  specimenTypes: z.array(z.string()),
  normalizedChemicals: z.array(NormalizedChemicalSchema),
  representativeConditions: z.array(NormalizedConditionSchema),
  normalizedSteps: z.array(NormalizedProtocolStepSchema),
  normalizationWarnings: z.array(z.string()),
  normalizationConfidence: z.number().min(0).max(1)
});
export type NormalizedProtocol = z.infer<typeof NormalizedProtocolSchema>;

export const NormalizedProtocolSnapshotSchema = z.object({
  generatedAt: z.string(),
  domain: DomainIdSchema,
  totalProtocols: z.number(),
  protocols: z.array(NormalizedProtocolSchema)
});
export type NormalizedProtocolSnapshot = z.infer<typeof NormalizedProtocolSnapshotSchema>;

export const SourceEnrichmentPrioritySchema = z.enum([
  "extractor-gap",
  "ambiguous-evidence",
  "evidence-thin",
  "step-phase-manual"
]);
export type SourceEnrichmentPriority = z.infer<typeof SourceEnrichmentPrioritySchema>;

export const SourceEnrichmentStatusSchema = z.enum([
  "pending",
  "in-progress",
  "reviewed",
  "rejected"
]);
export type SourceEnrichmentStatus = z.infer<typeof SourceEnrichmentStatusSchema>;

export const SourceEnrichmentExcerptSchema = z.object({
  id: z.string(),
  label: z.string(),
  text: z.string(),
  source: z.enum(["full-text", "methods", "results", "discussion", "manual-note"]),
  confidence: z.number().min(0).max(1).optional(),
  reviewed: z.boolean().default(true)
});
export type SourceEnrichmentExcerpt = z.infer<typeof SourceEnrichmentExcerptSchema>;

export const SourceEnrichmentRecordSchema = z.object({
  paperId: z.string(),
  title: z.string(),
  doi: z.string().nullable().optional(),
  paperUrl: z.string().nullable().optional(),
  priority: SourceEnrichmentPrioritySchema,
  status: SourceEnrichmentStatusSchema,
  rationale: z.string(),
  reviewerNotes: z.string().optional(),
  excerpts: z.array(SourceEnrichmentExcerptSchema).default([])
});
export type SourceEnrichmentRecord = z.infer<typeof SourceEnrichmentRecordSchema>;

export const SourceEnrichmentFileSchema = z.object({
  generatedAt: z.string(),
  domain: DomainIdSchema,
  records: z.array(SourceEnrichmentRecordSchema)
});
export type SourceEnrichmentFile = z.infer<typeof SourceEnrichmentFileSchema>;

export const ContradictionSchema = z.object({
  topic: z.string(),
  paperA: z.object({
    title: z.string(),
    protocolFamily: ProtocolFamilySchema,
    outcomeClasses: z.array(OutcomeClassSchema)
  }),
  paperB: z.object({
    title: z.string(),
    protocolFamily: ProtocolFamilySchema,
    outcomeClasses: z.array(OutcomeClassSchema)
  }),
  sharedContext: z.object({
    chemicals: z.array(z.string()),
    specimenTypes: z.array(z.string())
  }),
  reason: z.string(),
  confidence: z.number().min(0).max(1)
});
export type Contradiction = z.infer<typeof ContradictionSchema>;

export const ContradictionSnapshotSchema = z.object({
  generatedAt: z.string(),
  domain: DomainIdSchema,
  contradictions: z.array(ContradictionSchema)
});
export type ContradictionSnapshot = z.infer<typeof ContradictionSnapshotSchema>;

export const ExperimentSuggestionSchema = z.object({
  title: z.string(),
  category: z.enum(["benchmark", "endpoint-upgrade", "workflow-gap", "scale-up"]),
  hypothesis: z.string(),
  rationale: z.string(),
  supportingContext: z.object({
    chemicals: z.array(z.string()),
    specimenTypes: z.array(z.string()),
    protocolFamilies: z.array(ProtocolFamilySchema),
    paperTitles: z.array(z.string())
  }),
  confidence: z.number().min(0).max(1)
});
export type ExperimentSuggestion = z.infer<typeof ExperimentSuggestionSchema>;

export const ResearchHypothesisSchema = z.object({
  id: z.string(),
  domain: DomainIdSchema,
  title: z.string(),
  category: z.enum(["benchmark", "endpoint-upgrade", "workflow-gap", "scale-up"]),
  claim: z.string(),
  proposedExperiment: z.string(),
  supportingContext: z.object({
    chemicals: z.array(z.string()),
    specimenTypes: z.array(z.string()),
    protocolFamilies: z.array(ProtocolFamilySchema),
    paperTitles: z.array(z.string())
  }),
  evidence: z.object({
    totalPaperCount: z.number().int().nonnegative(),
    experimentalPaperCount: z.number().int().nonnegative(),
    comparativePaperCount: z.number().int().nonnegative(),
    distinctSpeciesCount: z.number().int().nonnegative(),
    strongOutcomePaperCount: z.number().int().nonnegative(),
    transplantationPaperCount: z.number().int().nonnegative(),
    contradictionCount: z.number().int().nonnegative(),
    sparseProtocolPaperCount: z.number().int().nonnegative()
  }),
  scores: z.object({
    evidenceScore: z.number().min(0).max(1),
    uncertaintyScore: z.number().min(0).max(1),
    actionabilityScore: z.number().min(0).max(1),
    priorityScore: z.number().min(0).max(1)
  }),
  blockers: z.array(z.string()),
  rationale: z.string()
});
export type ResearchHypothesis = z.infer<typeof ResearchHypothesisSchema>;

export const ProtocolOverrideSchema = z.object({
  paperId: z.string(),
  excludeFromAtlas: z.boolean().optional(),
  paperType: PaperTypeSchema.optional(),
  protocolFamily: ProtocolFamilySchema.optional(),
  speciesMentions: z.array(z.string()).optional(),
  specimenTypes: z.array(z.string()).optional(),
  protocolSteps: z.array(ProtocolStepSchema).optional(),
  outcomeMentions: z.array(OutcomeMentionSchema).optional(),
  extractionConfidence: z.number().min(0).max(1).optional(),
  notes: z.string().optional()
});
export type ProtocolOverride = z.infer<typeof ProtocolOverrideSchema>;

export const ProtocolOverrideFileSchema = z.object({
  generatedAt: z.string(),
  domain: DomainIdSchema,
  overrides: z.array(ProtocolOverrideSchema)
});
export type ProtocolOverrideFile = z.infer<typeof ProtocolOverrideFileSchema>;

export const BenchmarkReviewStatusSchema = z.enum(["reviewed", "seeded"]);
export type BenchmarkReviewStatus = z.infer<typeof BenchmarkReviewStatusSchema>;

export const BenchmarkEntrySchema = z.object({
  paperId: z.string(),
  title: z.string(),
  reviewStatus: BenchmarkReviewStatusSchema,
  expectedInAtlas: z.boolean(),
  expectedPaperType: PaperTypeSchema.optional(),
  expectedProtocolFamily: ProtocolFamilySchema.optional(),
  expectedSpeciesMentions: z.array(z.string()).optional(),
  expectedSpecimenTypes: z.array(z.string()).optional(),
  expectedOutcomeClasses: z.array(OutcomeClassSchema).optional(),
  expectedStepPhases: z.array(ProtocolPhaseSchema).optional(),
  expectedOverridePatch: ProtocolOverrideSchema.optional(),
  notes: z.string().optional()
});
export type BenchmarkEntry = z.infer<typeof BenchmarkEntrySchema>;

export const BenchmarkFileSchema = z.object({
  generatedAt: z.string(),
  domain: DomainIdSchema,
  description: z.string(),
  entries: z.array(BenchmarkEntrySchema)
});
export type BenchmarkFile = z.infer<typeof BenchmarkFileSchema>;

export const ProposalFieldSchema = z.enum([
  "excludeFromAtlas",
  "paperType",
  "protocolFamily",
  "speciesMentions",
  "specimenTypes",
  "outcomeClasses",
  "stepPhases"
]);
export type ProposalField = z.infer<typeof ProposalFieldSchema>;

export const ProposalActionSchema = z.enum([
  "create-override",
  "update-override",
  "exclude-paper",
  "update-benchmark"
]);
export type ProposalAction = z.infer<typeof ProposalActionSchema>;

export const ProposalTargetSchema = z.enum(["override", "benchmark"]);
export type ProposalTarget = z.infer<typeof ProposalTargetSchema>;

export const ProposalSourceSchema = z.enum([
  "reviewed-benchmark-repair",
  "benchmark-depth-autofill"
]);
export type ProposalSource = z.infer<typeof ProposalSourceSchema>;

export const BenchmarkPatchSchema = z.object({
  paperId: z.string(),
  expectedOutcomeClasses: z.array(OutcomeClassSchema).optional(),
  expectedStepPhases: z.array(ProtocolPhaseSchema).optional(),
  expectedOverridePatch: ProtocolOverrideSchema.optional(),
  notes: z.string().optional()
});
export type BenchmarkPatch = z.infer<typeof BenchmarkPatchSchema>;

export const AutoresearchProposalSchema = z.object({
  proposalId: z.string(),
  paperId: z.string(),
  title: z.string(),
  benchmarkReviewStatus: BenchmarkReviewStatusSchema,
  source: ProposalSourceSchema,
  target: ProposalTargetSchema,
  action: ProposalActionSchema,
  fields: z.array(ProposalFieldSchema),
  override: ProtocolOverrideSchema.optional(),
  benchmarkPatch: BenchmarkPatchSchema.optional(),
  proposalConfidence: z.number().min(0).max(1),
  evidenceSummary: z.array(z.string()),
  rationale: z.string(),
  expectedImpact: z.array(z.string()),
  reviewRecommendation: z
    .object({
      recommendedDecision: z.enum(["accept", "defer"]),
      policyConfidence: z.number().min(0).max(1),
      reasons: z.array(z.string())
    })
    .optional()
});
export type AutoresearchProposal = z.infer<typeof AutoresearchProposalSchema>;

export const AutoresearchProposalFileSchema = z.object({
  generatedAt: z.string(),
  domain: DomainIdSchema,
  benchmarkDescription: z.string(),
  proposalCount: z.number().int().nonnegative(),
  proposals: z.array(AutoresearchProposalSchema)
});
export type AutoresearchProposalFile = z.infer<typeof AutoresearchProposalFileSchema>;

export const BenchmarkProposalDecisionStatusSchema = z.enum(["pending", "accept", "reject", "defer"]);
export type BenchmarkProposalDecisionStatus = z.infer<typeof BenchmarkProposalDecisionStatusSchema>;

export const BenchmarkProposalDecisionSchema = z.object({
  proposalId: z.string(),
  paperId: z.string(),
  title: z.string(),
  decision: BenchmarkProposalDecisionStatusSchema,
  acceptedOutcomeClasses: z.array(OutcomeClassSchema).optional(),
  acceptedStepPhases: z.array(ProtocolPhaseSchema).optional(),
  reviewerNotes: z.string().optional(),
  decidedAt: z.string().optional()
});
export type BenchmarkProposalDecision = z.infer<typeof BenchmarkProposalDecisionSchema>;

export const BenchmarkProposalDecisionFileSchema = z.object({
  generatedAt: z.string(),
  domain: DomainIdSchema,
  sourceProposalGeneratedAt: z.string(),
  decisionCount: z.number().int().nonnegative(),
  decisions: z.array(BenchmarkProposalDecisionSchema)
});
export type BenchmarkProposalDecisionFile = z.infer<typeof BenchmarkProposalDecisionFileSchema>;
