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

export const EvidenceSnippetSchema = z.object({
  kind: z.enum([
    "protocol-family",
    "specimen",
    "chemical",
    "temperature",
    "duration",
    "outcome"
  ]),
  text: z.string(),
  confidence: z.number().min(0).max(1)
});
export type EvidenceSnippet = z.infer<typeof EvidenceSnippetSchema>;

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

export const ProposalActionSchema = z.enum(["create-override", "update-override", "exclude-paper"]);
export type ProposalAction = z.infer<typeof ProposalActionSchema>;

export const AutoresearchProposalSchema = z.object({
  paperId: z.string(),
  title: z.string(),
  benchmarkReviewStatus: BenchmarkReviewStatusSchema,
  action: ProposalActionSchema,
  fields: z.array(ProposalFieldSchema),
  override: ProtocolOverrideSchema,
  rationale: z.string(),
  expectedImpact: z.array(z.string())
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
