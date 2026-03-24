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
  pmid: z.string().nullable().optional(),
  pmcid: z.string().nullable().optional(),
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

export const DiscoverySourceSchema = z.enum([
  "cryodb",
  "pubmed",
  "openalex",
  "crossref",
  "europe-pmc",
  "semantic-scholar",
  "manual",
  "other"
]);
export type DiscoverySource = z.infer<typeof DiscoverySourceSchema>;

export const LiveDiscoveryProviderSchema = z.enum([
  "cryodb",
  "openalex",
  "crossref",
  "europe-pmc"
]);
export type LiveDiscoveryProvider = z.infer<typeof LiveDiscoveryProviderSchema>;

export const FullTextAvailabilitySchema = z.enum([
  "unknown",
  "abstract-only",
  "full-text-link",
  "open-access-full-text"
]);
export type FullTextAvailability = z.infer<typeof FullTextAvailabilitySchema>;

export const DiscoverySourceRecordSchema = z.object({
  source: DiscoverySourceSchema,
  sourceId: z.string(),
  sourceUrl: z.string().nullable().optional(),
  rawQuery: z.string(),
  title: z.string(),
  abstract: z.string().nullable().optional(),
  doi: z.string().nullable().optional(),
  pmid: z.string().nullable().optional(),
  pmcid: z.string().nullable().optional(),
  journal: z.string().nullable().optional(),
  publishedYear: z.number().nullable().optional(),
  authorsFlat: z.string().nullable().optional(),
  citationCount: z.number().int().nonnegative().nullable().optional(),
  fullTextAvailability: FullTextAvailabilitySchema.default("unknown"),
  matchedKeywords: z.array(z.string()),
  relevanceScore: z.number().min(0)
});
export type DiscoverySourceRecord = z.infer<typeof DiscoverySourceRecordSchema>;

export const DiscoveryPaperSchema = z.object({
  domain: DomainIdSchema,
  dedupeKey: z.string(),
  title: z.string(),
  abstract: z.string().nullable().optional(),
  doi: z.string().nullable().optional(),
  pmid: z.string().nullable().optional(),
  pmcid: z.string().nullable().optional(),
  journal: z.string().nullable().optional(),
  publishedYear: z.number().nullable().optional(),
  authorsFlat: z.string().nullable().optional(),
  sourceCount: z.number().int().positive(),
  recordCount: z.number().int().positive(),
  sources: z.array(DiscoverySourceRecordSchema),
  matchedKeywords: z.array(z.string()),
  sourceTypes: z.array(DiscoverySourceSchema),
  fullTextAvailability: FullTextAvailabilitySchema,
  relevanceScore: z.number().min(0),
  authorityScore: z.number().min(0),
  sourceDiversityScore: z.number().min(0),
  rankingScore: z.number().min(0)
});
export type DiscoveryPaper = z.infer<typeof DiscoveryPaperSchema>;

export const LiveDiscoveryProviderSummarySchema = z.object({
  kind: z.literal("live-provider"),
  source: LiveDiscoveryProviderSchema,
  query: z.string(),
  fetchedCount: z.number().int().nonnegative(),
  acceptedCount: z.number().int().nonnegative(),
  failed: z.boolean().default(false),
  error: z.string().nullable().optional(),
  totalHits: z.number().int().nonnegative().nullable().optional(),
  truncated: z.boolean().default(false)
});
export const ImportedDiscoveryProviderSummarySchema = z.object({
  kind: z.literal("import"),
  source: DiscoverySourceSchema,
  label: z.string(),
  fetchedCount: z.number().int().nonnegative(),
  acceptedCount: z.number().int().nonnegative(),
  failed: z.literal(false).default(false),
  error: z.null().optional()
});
export const ManualDiscoveryProviderSummarySchema = z.object({
  kind: z.literal("manual"),
  source: z.literal("manual"),
  label: z.string(),
  fetchedCount: z.number().int().nonnegative(),
  acceptedCount: z.number().int().nonnegative(),
  failed: z.literal(false).default(false),
  error: z.null().optional()
});
export const DiscoveryProviderSummarySchema = z.discriminatedUnion("kind", [
  LiveDiscoveryProviderSummarySchema,
  ImportedDiscoveryProviderSummarySchema,
  ManualDiscoveryProviderSummarySchema
]);
export type DiscoveryProviderSummary = z.infer<typeof DiscoveryProviderSummarySchema>;

export const DiscoverySnapshotSchema = z.object({
  generatedAt: z.string(),
  domain: DomainIdSchema,
  queryDescription: z.string(),
  totalCandidates: z.number().int().nonnegative(),
  isDegraded: z.boolean().default(false),
  degradationReasons: z.array(z.string()).default([]),
  providerSummaries: z.array(DiscoveryProviderSummarySchema),
  papers: z.array(DiscoveryPaperSchema)
});
export type DiscoverySnapshot = z.infer<typeof DiscoverySnapshotSchema>;

export const ManualDiscoveryRecordSchema = z.object({
  source: z.literal("manual").default("manual"),
  sourceId: z.string(),
  sourceUrl: z.string().nullable().optional(),
  rawQuery: z.string().default("manual-import"),
  title: z.string(),
  abstract: z.string().nullable().optional(),
  doi: z.string().nullable().optional(),
  pmid: z.string().nullable().optional(),
  pmcid: z.string().nullable().optional(),
  journal: z.string().nullable().optional(),
  publishedYear: z.number().nullable().optional(),
  authorsFlat: z.string().nullable().optional(),
  citationCount: z.number().int().nonnegative().nullable().optional(),
  fullTextAvailability: FullTextAvailabilitySchema.default("unknown")
});
export type ManualDiscoveryRecord = z.infer<typeof ManualDiscoveryRecordSchema>;

export const ManualDiscoveryImportFileSchema = z.object({
  generatedAt: z.string(),
  domain: DomainIdSchema,
  records: z.array(ManualDiscoveryRecordSchema)
});
export type ManualDiscoveryImportFile = z.infer<typeof ManualDiscoveryImportFileSchema>;

export const DiscoveryImportSourceSchema = z.enum([
  "pubmed",
  "openalex",
  "crossref",
  "europe-pmc",
  "semantic-scholar",
  "manual",
  "other"
]);
export type DiscoveryImportSource = z.infer<typeof DiscoveryImportSourceSchema>;

export const DiscoveryImportRecordSchema = ManualDiscoveryRecordSchema.extend({
  source: DiscoveryImportSourceSchema.default("other")
});
export type DiscoveryImportRecord = z.infer<typeof DiscoveryImportRecordSchema>;

export const DiscoveryImportFileSchema = z.object({
  generatedAt: z.string(),
  domain: DomainIdSchema,
  source: DiscoveryImportSourceSchema,
  label: z.string().optional(),
  records: z.array(DiscoveryImportRecordSchema)
});
export type DiscoveryImportFile = z.infer<typeof DiscoveryImportFileSchema>;

export const MergedDiscoveryImportFileSchema = z.object({
  generatedAt: z.string(),
  domain: DomainIdSchema,
  isDegraded: z.boolean().default(false),
  degradationReasons: z.array(z.string()).default([]),
  records: z.array(DiscoveryImportRecordSchema)
});
export type MergedDiscoveryImportFile = z.infer<typeof MergedDiscoveryImportFileSchema>;

export const DiscoveryImportSummarySchema = z.object({
  domain: DomainIdSchema,
  importFileCount: z.number().int().nonnegative(),
  importedRecordCount: z.number().int().nonnegative(),
  mergedImportedRecordCount: z.number().int().nonnegative(),
  manualOnlyRecordCount: z.number().int().nonnegative(),
  importedSources: z.array(z.string()),
  sourceBreakdown: z.record(z.number().int().nonnegative()),
  isDegraded: z.boolean().default(false),
  degradationReasons: z.array(z.string()).default([])
});
export type DiscoveryImportSummary = z.infer<typeof DiscoveryImportSummarySchema>;

export const DiscoveryPromotionRecommendationSchema = z.enum([
  "promote",
  "review",
  "defer"
]);
export type DiscoveryPromotionRecommendation = z.infer<typeof DiscoveryPromotionRecommendationSchema>;

export const DiscoveryPromotionDecisionStatusSchema = z.enum([
  "pending",
  "promote",
  "defer",
  "reject"
]);
export type DiscoveryPromotionDecisionStatus = z.infer<typeof DiscoveryPromotionDecisionStatusSchema>;

export const DiscoveryPromotionDecisionSchema = z.object({
  dedupeKey: z.string(),
  title: z.string(),
  doi: z.string().nullable().optional(),
  pmid: z.string().nullable().optional(),
  pmcid: z.string().nullable().optional(),
  titleKey: z.string(),
  decision: DiscoveryPromotionDecisionStatusSchema,
  recommendation: DiscoveryPromotionRecommendationSchema,
  recommendationReasons: z.array(z.string()),
  rankingScore: z.number().min(0),
  relevanceScore: z.number().min(0),
  authorityScore: z.number().min(0),
  sourceDiversityScore: z.number().min(0),
  sourceCount: z.number().int().positive(),
  recordCount: z.number().int().positive(),
  sourceTypes: z.array(DiscoverySourceSchema),
  fullTextAvailability: FullTextAvailabilitySchema,
  matchedKeywords: z.array(z.string()),
  staleEvidence: z.boolean().default(false),
  staleReason: z.string().optional(),
  reviewerNotes: z.string().optional(),
  decidedAt: z.string().optional()
});
export type DiscoveryPromotionDecision = z.infer<typeof DiscoveryPromotionDecisionSchema>;

export const DiscoveryPromotionQueueSchema = z.object({
  generatedAt: z.string(),
  domain: DomainIdSchema,
  sourceSnapshotGeneratedAt: z.string(),
  candidateCount: z.number().int().nonnegative(),
  trackedCount: z.number().int().nonnegative(),
  novelCandidateCount: z.number().int().nonnegative(),
  isDegraded: z.boolean().default(false),
  degradationReasons: z.array(z.string()).default([]),
  decisions: z.array(DiscoveryPromotionDecisionSchema)
});
export type DiscoveryPromotionQueue = z.infer<typeof DiscoveryPromotionQueueSchema>;

export const DiscoveryPromotionReviewSourceSchema = z.object({
  source: DiscoverySourceSchema,
  sourceId: z.string(),
  sourceUrl: z.string().nullable().optional(),
  rawQuery: z.string(),
  fullTextAvailability: FullTextAvailabilitySchema
});
export type DiscoveryPromotionReviewSource = z.infer<typeof DiscoveryPromotionReviewSourceSchema>;

export const DiscoveryPromotionReviewItemSchema = z.object({
  dedupeKey: z.string(),
  title: z.string(),
  doi: z.string().nullable().optional(),
  pmid: z.string().nullable().optional(),
  pmcid: z.string().nullable().optional(),
  titleKey: z.string(),
  journal: z.string().nullable().optional(),
  publishedYear: z.number().nullable().optional(),
  decision: DiscoveryPromotionDecisionStatusSchema,
  recommendation: DiscoveryPromotionRecommendationSchema,
  rankingScore: z.number().min(0),
  relevanceScore: z.number().min(0),
  authorityScore: z.number().min(0),
  sourceDiversityScore: z.number().min(0),
  sourceCount: z.number().int().positive(),
  recordCount: z.number().int().positive(),
  sourceTypes: z.array(DiscoverySourceSchema),
  fullTextAvailability: FullTextAvailabilitySchema,
  matchedKeywords: z.array(z.string()),
  noveltyBasis: z.array(z.string()),
  promotionRisks: z.array(z.string()),
  reviewChecklist: z.array(z.string()),
  recommendationReasons: z.array(z.string()),
  staleEvidence: z.boolean().default(false),
  staleReason: z.string().optional(),
  reviewerNotes: z.string().optional(),
  sources: z.array(DiscoveryPromotionReviewSourceSchema)
});
export type DiscoveryPromotionReviewItem = z.infer<typeof DiscoveryPromotionReviewItemSchema>;

export const DiscoveryPromotionReviewPacketSchema = z.object({
  generatedAt: z.string(),
  domain: DomainIdSchema,
  sourceSnapshotGeneratedAt: z.string(),
  queueGeneratedAt: z.string(),
  candidateCount: z.number().int().nonnegative(),
  reviewItemCount: z.number().int().nonnegative(),
  isDegraded: z.boolean().default(false),
  degradationReasons: z.array(z.string()).default([]),
  items: z.array(DiscoveryPromotionReviewItemSchema)
});
export type DiscoveryPromotionReviewPacket = z.infer<typeof DiscoveryPromotionReviewPacketSchema>;

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
