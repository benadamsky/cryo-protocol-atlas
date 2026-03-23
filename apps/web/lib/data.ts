import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  AutoresearchProposalFileSchema,
  BenchmarkFileSchema,
  BenchmarkProposalDecisionFileSchema,
  DomainIdSchema,
  ExtractionSnapshotSchema,
  NormalizedProtocolSnapshotSchema,
  SourceEnrichmentFileSchema,
  type DomainId
} from "../../../packages/shared/src/schema";
import { DOMAIN_ORDER, getDomainMeta } from "./domain";

const CountEntrySchema = z.object({
  label: z.string(),
  count: z.number()
});

const HighConfidencePaperSchema = z.object({
  title: z.string(),
  paperType: z.string(),
  protocolFamily: z.string(),
  extractionConfidence: z.number(),
  species: z.array(z.string()),
  chemicals: z.array(z.string()),
  specimenTypes: z.array(z.string()),
  stepPhases: z.array(z.string())
});

const UncertaintyHotspotSchema = z.object({
  protocolFamily: z.string(),
  chemical: z.string(),
  specimenType: z.string(),
  paperCount: z.number(),
  outcomeClasses: z.array(z.string()),
  titles: z.array(z.string()).optional().default([])
});

const AtlasSummarySchema = z.object({
  domain: DomainIdSchema,
  totalPapers: z.number(),
  protocolFamilies: z.array(CountEntrySchema),
  topChemicals: z.array(CountEntrySchema),
  topSpecimenTypes: z.array(CountEntrySchema),
  topOutcomes: z.array(CountEntrySchema),
  topStepPhases: z.array(CountEntrySchema),
  highConfidencePapers: z.array(HighConfidencePaperSchema),
  uncertaintyHotspots: z.array(UncertaintyHotspotSchema).optional().default([]),
  qualitySignals: z
    .object({
      unknownProtocolFamilyCount: z.number(),
      unknownProtocolFamilyRate: z.number(),
      unknownStepPhaseCount: z.number(),
      contradictionCount: z.number(),
      experimentalPaperCount: z.number(),
      methodsPaperCount: z.number(),
      reviewPaperCount: z.number(),
      commentaryPaperCount: z.number()
    })
    .optional()
});

const OpportunityEntrySchema = z.object({
  domain: DomainIdSchema,
  readinessScore: z.number(),
  evidenceScore: z.number(),
  commercialScore: z.number(),
  standardPattern: z.string(),
  painPoint: z.string(),
  whyOptimizationMatters: z.string(),
  recommendedNextMove: z.string()
});

const OpportunityScanSchema = z.array(OpportunityEntrySchema);

const CallPacketSchema = z.object({
  domain: DomainIdSchema,
  title: z.string(),
  executiveSummary: z.array(z.string()),
  benchmarkSnapshot: z.object({
    reviewedGatesPassing: z.boolean(),
    reviewedOutcomeCoverage: z.number(),
    reviewedStepPhaseCoverage: z.number(),
    reviewedMinimumDepthReady: z.boolean(),
    normalizedProtocolCount: z.number(),
    protocolsWithNormalizationWarnings: z.number(),
    pendingSourceEnrichments: z.number(),
    reviewedSourceEnrichments: z.number(),
    secondarySourceReviewedCount: z.number(),
    reviewedPrimarySupportedCount: z.number(),
    reviewedSecondarySupportedCount: z.number(),
    reviewedManualOnlyCount: z.number(),
    contradictionCount: z.number()
  }),
  standardOfCareView: z.object({
    dominantProtocolFamily: z.string(),
    dominantChemicals: z.array(z.string()),
    dominantSpecimenTypes: z.array(z.string()),
    dominantTransitions: z.array(z.string()),
    representativeConditions: z.array(z.string()),
    summary: z.string()
  }),
  bestWedge: z.object({
    title: z.string(),
    category: z.string(),
    whyThisWedge: z.string(),
    currentPainPoint: z.string(),
    whyNow: z.string(),
    evidenceSummary: z.string(),
    firstExperiment: z.string()
  }),
  literatureGaps: z.array(z.string()),
  marketBridge: z.object({
    currentStandardPattern: z.string(),
    likelyPainPoint: z.string(),
    whyOptimizationMightMatter: z.string(),
    likelyBuyerOrUser: z.string()
  }),
  wedgeValidation: z.object({
    whatAtlasCanSay: z.array(z.string()),
    missingEvidence: z.array(z.string()),
    unresolvedWatchlist: z.array(z.string()),
    currentRead: z.string()
  })
});

const WedgeBriefSchema = z.object({
  domain: DomainIdSchema,
  focusQuestion: z.string(),
  standardPattern: z.object({
    dominantProtocolFamily: z.string(),
    dominantChemicals: z.array(z.string()),
    dominantSpecimenTypes: z.array(z.string()),
    dominantTransitions: z.array(z.string()),
    representativeConditions: z.array(z.string()),
    explanation: z.string()
  }),
  protocolFamilies: z.array(
    z.object({
      family: z.string(),
      paperCount: z.number(),
      topChemicals: z.array(z.string()),
      topOutcomes: z.array(z.string()),
      topTransitions: z.array(z.string()),
      interpretation: z.string()
    })
  ),
  dominantCpaPatterns: z.array(
    z.object({
      family: z.string(),
      chemical: z.string(),
      specimenType: z.string(),
      paperCount: z.number(),
      outcomeClasses: z.array(z.string())
    })
  ),
  contradictions: z.array(z.any()),
  evidenceQuality: z.object({
    passesAllGates: z.boolean(),
    reviewedOutcomeCoverage: z.number(),
    reviewedStepPhaseCoverage: z.number(),
    reviewedMinimumDepthReady: z.boolean(),
    normalizedProtocolCount: z.number(),
    protocolsWithNormalizationWarnings: z.number(),
    missingOutcomeCount: z.number(),
    missingStepPhaseCount: z.number(),
    pendingSourceEnrichmentCount: z.number(),
    reviewedSourceEnrichmentCount: z.number(),
    secondarySourceReviewedCount: z.number(),
    reviewedPrimarySupportedCount: z.number(),
    reviewedSecondarySupportedCount: z.number(),
    reviewedManualOnlyCount: z.number()
  }),
  opportunityScan: z.array(
    z.object({
      title: z.string(),
      whyInteresting: z.string(),
      painPoint: z.string(),
      commercialWhyNow: z.string()
    })
  ),
  callout: z.string()
});

const InclusionMetricsSchema = z.object({
  truePositive: z.number(),
  trueNegative: z.number(),
  falsePositive: z.number(),
  falseNegative: z.number(),
  accuracy: z.number(),
  precision: z.number(),
  recall: z.number(),
  f1: z.number()
});

const ExactFieldSchema = z
  .object({
    field: z.string(),
    labeledCount: z.number(),
    exactMatchCount: z.number(),
    accuracy: z.number(),
    mismatches: z.array(z.any()).optional().default([])
  })
  .passthrough();

const SetFieldSchema = z
  .object({
    field: z.string(),
    labeledCount: z.number(),
    exactMatchCount: z.number(),
    averageF1: z.number(),
    averagePrecision: z.number(),
    averageRecall: z.number(),
    mismatches: z.array(z.any())
  })
  .passthrough();

const CoverageFieldSchema = z.object({
  field: z.string(),
  eligibleCount: z.number(),
  labeledCount: z.number(),
  coverageRate: z.number()
});

const BenchmarkSubsetSchema = z.object({
  subset: z.string(),
  entryCount: z.number(),
  expectedIncludedCount: z.number(),
  inclusion: InclusionMetricsSchema,
  exactFields: z.record(z.string(), ExactFieldSchema),
  setFields: z.record(z.string(), SetFieldSchema),
  coverage: z.record(z.string(), CoverageFieldSchema),
  confidence: z.object({
    averageOnExpectedIncluded: z.number().nullable(),
    averageOnCorrectIncluded: z.number().nullable(),
    averageOnIncorrectIncluded: z.number().nullable()
  })
});

const BenchmarkSummarySchema = z.object({
  domain: DomainIdSchema,
  generatedAt: z.string(),
  benchmarkDescription: z.string(),
  benchmarkEntryCount: z.number(),
  subsets: z.record(z.string(), BenchmarkSubsetSchema),
  gates: z.array(
    z.object({
      name: z.string(),
      passed: z.boolean(),
      actual: z.number(),
      threshold: z.number(),
      comparator: z.string(),
      notes: z.string()
    })
  ),
  summary: z.object({
    passesAllGates: z.boolean(),
    reviewedInclusionF1DeltaVsAll: z.number(),
    reviewedOutcomeCoverage: z.number(),
    reviewedStepPhaseCoverage: z.number(),
    reviewedMinimumDepthReady: z.boolean()
  })
});

const ReviewedDepthSchema = z.object({
  outcomeCoverageDelta: z.number(),
  stepPhaseCoverageDelta: z.number(),
  missingOutcomeCount: z.number(),
  missingStepPhaseCount: z.number(),
  missingOutcomeAudit: z.object({
    extractorGapCount: z.number(),
    ambiguousEvidenceCount: z.number(),
    evidenceThinCount: z.number()
  }),
  missingOutcomes: z.array(
    z.object({
      paperId: z.string(),
      title: z.string(),
      protocolFamily: z.string(),
      paperType: z.string(),
      evidenceStatus: z.string(),
      evidenceReason: z.string()
    })
  ),
  missingStepPhases: z.array(
    z.object({
      paperId: z.string(),
      title: z.string(),
      protocolFamily: z.string(),
      paperType: z.string()
    })
  )
});

const BenchmarkAnalysisSchema = z.object({
  domain: DomainIdSchema,
  baseline: BenchmarkSummarySchema,
  resolved: BenchmarkSummarySchema,
  reviewedDepth: ReviewedDepthSchema
});

const AtlasAnalysisSchema = z.object({
  domain: DomainIdSchema,
  baselineSummary: AtlasSummarySchema,
  resolvedSummary: AtlasSummarySchema,
  overrideImpact: z.object({
    overridesApplied: z.number(),
    excludedPaperCount: z.number(),
    unknownProtocolFamiliesResolved: z.number(),
    unknownProtocolFamilyRateDelta: z.number(),
    unknownStepPhaseDelta: z.number(),
    experimentalPaperDelta: z.number(),
    methodsPaperDelta: z.number(),
    reviewPaperDelta: z.number(),
    commentaryPaperDelta: z.number()
  })
});

const UnattendedBatchSchema = z.object({
  domain: DomainIdSchema,
  includeIngest: z.boolean(),
  extractionCount: z.number(),
  resolvedExtractionCount: z.number(),
  normalizedProtocolCount: z.number(),
  protocolsWithNormalizationWarnings: z.number(),
  reviewedOutcomeCoverage: z.number(),
  reviewedStepPhaseCoverage: z.number(),
  loopProposalCount: z.number(),
  pendingBenchmarkProposalCount: z.number(),
  pendingSourceEnrichmentCount: z.number(),
  reviewedSourceEnrichmentCount: z.number(),
  minimumDepthReady: z.boolean()
});

type DataSource<T> = {
  data: T;
  relativePath: string;
  absolutePath: string;
  sourceLabel: "worktree" | "primary";
};

type ExtractionSnapshotData = z.infer<typeof ExtractionSnapshotSchema>;
type NormalizedProtocolSnapshotData = z.infer<typeof NormalizedProtocolSnapshotSchema>;
type ArtifactMeta = {
  label: string;
  relativePath: string;
  sourceLabel: "worktree" | "primary";
  generatedAt: string | null;
};

export type OverviewCard = {
  domain: DomainId;
  label: string;
  strapline: string;
  accent: string;
  readinessScore: number;
  evidenceScore: number;
  commercialScore: number;
  standardPattern: string;
  topWedge: string;
  currentPainPoint: string;
  nextMove: string;
  reviewedOutcomeCoverage: number;
  reviewedStepPhaseCoverage: number;
  normalizedProtocolCount: number;
  pendingSourceEnrichments: number;
  sourceLabel: "worktree" | "primary";
};

export type OverviewData = {
  cards: OverviewCard[];
  totalProtocols: number;
  pendingSourceEnrichments: number;
  readyDomainCount: number;
};

export type DomainData = {
  domain: DomainId;
  sourceLabel: "worktree" | "primary";
  callPacket: z.infer<typeof CallPacketSchema>;
  wedgeBrief: z.infer<typeof WedgeBriefSchema>;
  atlasSummary: z.infer<typeof AtlasSummarySchema>;
  atlasAnalysis: z.infer<typeof AtlasAnalysisSchema>;
  benchmarkSummary: z.infer<typeof BenchmarkSummarySchema>;
  benchmarkAnalysis: z.infer<typeof BenchmarkAnalysisSchema>;
  batchSummary: z.infer<typeof UnattendedBatchSchema>;
  benchmarkFile: z.infer<typeof BenchmarkFileSchema>;
  sourceEnrichment: z.infer<typeof SourceEnrichmentFileSchema>;
  proposalFile: z.infer<typeof AutoresearchProposalFileSchema>;
  decisionFile: z.infer<typeof BenchmarkProposalDecisionFileSchema>;
  artifacts: ArtifactMeta[];
  extractionSnapshot: ExtractionSnapshotData | null;
  resolvedExtractionSnapshot: ExtractionSnapshotData | null;
  normalizedSnapshot: NormalizedProtocolSnapshotData | null;
};

export type DebugData = {
  available: false;
  domain: DomainId;
  sourceLabel: "worktree" | "primary";
  reason: string;
} | {
  available: true;
  domain: DomainId;
  sourceLabel: "worktree" | "primary";
  selectedPaperId: string;
  protocolCards: Array<{
    paperId: string;
    title: string;
    protocolFamily: string;
    normalizationConfidence: number;
    warningCount: number;
    conditionCount: number;
    stepCount: number;
  }>;
  benchmarkEntry: z.infer<typeof BenchmarkFileSchema>["entries"][number] | null;
  enrichmentRecord: z.infer<typeof SourceEnrichmentFileSchema>["records"][number] | null;
  selected: {
    paperId: string;
    title: string;
    protocolFamily: string;
    paperType: string;
    species: string[];
    specimenTypes: string[];
    normalizationConfidence: number;
    warnings: string[];
    representativeConditions: Array<{
      phase: string;
      chemical: string;
      measurement: string;
      source: string;
      confidence: number;
      label: string;
    }>;
    steps: Array<{
      order: number;
      phase: string;
      summary: string;
      transition: string | null;
      temperatures: string[];
      durations: string[];
      concentrations: string[];
      evidenceCount: number;
    }>;
    baseline: {
      extractionConfidence: number;
      chemicalCount: number;
      stepCount: number;
      outcomeCount: number;
      raw: unknown;
    } | null;
    resolved: {
      extractionConfidence: number;
      chemicalCount: number;
      stepCount: number;
      outcomeCount: number;
      strongestAuthority: string;
      reviewedSnippetCount: number;
      directSnippetCount: number;
      raw: unknown;
    } | null;
    rawNormalized: unknown;
  };
};

function uniqueRoots() {
  const worktreeRoot = path.resolve(process.cwd(), "../..");
  const roots = [worktreeRoot];
  const parent = path.dirname(worktreeRoot);

  if (path.basename(parent) === ".worktrees") {
    roots.push(path.dirname(parent));
  }

  return Array.from(new Set(roots));
}

function labelForRoot(root: string): "worktree" | "primary" {
  return root === uniqueRoots()[0] ? "worktree" : "primary";
}

async function readJsonArtifact<T>(
  relativePath: string,
  schema: z.ZodType<T>,
  options?: { optional?: boolean }
): Promise<DataSource<T> | null> {
  const attemptedPaths: string[] = [];

  for (const root of uniqueRoots()) {
    const absolutePath = path.join(root, relativePath);
    attemptedPaths.push(absolutePath);

    try {
      const raw = await readFile(absolutePath, "utf8");
      return {
        data: schema.parse(JSON.parse(raw)),
        relativePath,
        absolutePath,
        sourceLabel: labelForRoot(root)
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        continue;
      }

      if (error instanceof z.ZodError) {
        throw new Error(`Schema validation failed for ${absolutePath}: ${error.message}`);
      }

      throw error;
    }
  }

  if (options?.optional) {
    return null;
  }

  throw new Error(`Missing artifact ${relativePath}. Checked: ${attemptedPaths.join(", ")}`);
}

function pickSourceLabel(...sources: Array<DataSource<unknown> | null>) {
  return sources.find(Boolean)?.sourceLabel ?? "worktree";
}

function getGeneratedAt(data: unknown): string | null {
  if (typeof data === "object" && data !== null && "generatedAt" in data) {
    const value = (data as { generatedAt?: unknown }).generatedAt;
    return typeof value === "string" ? value : null;
  }

  return null;
}

function toArtifactMeta(label: string, source: DataSource<unknown> | null): ArtifactMeta | null {
  if (!source) {
    return null;
  }

  return {
    label,
    relativePath: source.relativePath,
    sourceLabel: source.sourceLabel,
    generatedAt: getGeneratedAt(source.data)
  };
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function formatCondition(value: {
  measurement: {
    normalizedText: string;
    value: number;
    unit: string;
  };
}) {
  return value.measurement.normalizedText || `${value.measurement.value} ${value.measurement.unit}`;
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function formatScore(value: number) {
  return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

export function formatDateTime(value: string | null) {
  if (!value) {
    return "n/a";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export async function getOverviewData(): Promise<OverviewData> {
  const opportunitySource = await readJsonArtifact(
    "data/processed/opportunity-scan.json",
    OpportunityScanSchema
  );

  const cards = await Promise.all(
    DOMAIN_ORDER.map(async (domain) => {
      const [callPacketSource, batchSource] = await Promise.all([
        readJsonArtifact(`data/processed/${domain}/call-packet.json`, CallPacketSchema),
        readJsonArtifact(`data/autoresearch/${domain}/unattended-batch.json`, UnattendedBatchSchema)
      ]);

      const opportunity = opportunitySource.data.find((entry) => entry.domain === domain);

      if (!opportunity) {
        throw new Error(`Opportunity scan missing domain ${domain}`);
      }

      const meta = getDomainMeta(domain);

      return {
        domain,
        label: meta.label,
        strapline: meta.strapline,
        accent: meta.accent,
        readinessScore: opportunity.readinessScore,
        evidenceScore: opportunity.evidenceScore,
        commercialScore: opportunity.commercialScore,
        standardPattern: opportunity.standardPattern,
        topWedge: callPacketSource.data.bestWedge.title,
        currentPainPoint: opportunity.painPoint,
        nextMove: opportunity.recommendedNextMove,
        reviewedOutcomeCoverage: batchSource.data.reviewedOutcomeCoverage,
        reviewedStepPhaseCoverage: batchSource.data.reviewedStepPhaseCoverage,
        normalizedProtocolCount: batchSource.data.normalizedProtocolCount,
        pendingSourceEnrichments: batchSource.data.pendingSourceEnrichmentCount,
        sourceLabel: pickSourceLabel(callPacketSource, batchSource, opportunitySource)
      } satisfies OverviewCard;
    })
  );

  return {
    cards,
    totalProtocols: sum(cards.map((card) => card.normalizedProtocolCount)),
    pendingSourceEnrichments: sum(cards.map((card) => card.pendingSourceEnrichments)),
    readyDomainCount: cards.filter(
      (card) => card.reviewedOutcomeCoverage >= 0.4 && card.reviewedStepPhaseCoverage >= 0.4
    ).length
  };
}

export async function getDomainData(domain: DomainId): Promise<DomainData> {
  const [
    callPacket,
    wedgeBrief,
    atlasSummary,
    atlasAnalysis,
    benchmarkSummary,
    benchmarkAnalysis,
    batchSummary,
    benchmarkFile,
    sourceEnrichment,
    proposalFile,
    decisionFile,
    extractionSnapshot,
    resolvedExtractionSnapshot,
    normalizedSnapshot
  ] = await Promise.all([
    readJsonArtifact(`data/processed/${domain}/call-packet.json`, CallPacketSchema),
    readJsonArtifact(`data/processed/${domain}/wedge-brief.json`, WedgeBriefSchema),
    readJsonArtifact(`data/processed/${domain}/atlas-summary.json`, AtlasSummarySchema),
    readJsonArtifact(`data/processed/${domain}/atlas-analysis.json`, AtlasAnalysisSchema),
    readJsonArtifact(`data/processed/${domain}/benchmark-summary.json`, BenchmarkSummarySchema),
    readJsonArtifact(`data/processed/${domain}/benchmark-analysis.json`, BenchmarkAnalysisSchema),
    readJsonArtifact(`data/autoresearch/${domain}/unattended-batch.json`, UnattendedBatchSchema),
    readJsonArtifact(`data/benchmarks/${domain}/gold-set.json`, BenchmarkFileSchema),
    readJsonArtifact(`data/curated/${domain}/source-enrichment.json`, SourceEnrichmentFileSchema),
    readJsonArtifact(`data/autoresearch/${domain}/proposal-file.json`, AutoresearchProposalFileSchema),
    readJsonArtifact(
      `data/autoresearch/${domain}/benchmark-review-decisions.json`,
      BenchmarkProposalDecisionFileSchema
    ),
    readJsonArtifact(
      `data/processed/${domain}/extraction-snapshot.json`,
      ExtractionSnapshotSchema,
      { optional: true }
    ),
    readJsonArtifact(
      `data/processed/${domain}/resolved-extraction-snapshot.json`,
      ExtractionSnapshotSchema,
      { optional: true }
    ),
    readJsonArtifact(
      `data/processed/${domain}/normalized-protocols.json`,
      NormalizedProtocolSnapshotSchema,
      { optional: true }
    )
  ]);

  return {
    domain,
    sourceLabel: pickSourceLabel(
      callPacket,
      wedgeBrief,
      atlasSummary,
      atlasAnalysis,
      benchmarkSummary,
      benchmarkAnalysis,
      batchSummary,
      benchmarkFile,
      sourceEnrichment,
      proposalFile,
      decisionFile,
      extractionSnapshot,
      resolvedExtractionSnapshot,
      normalizedSnapshot
    ),
    callPacket: callPacket.data,
    wedgeBrief: wedgeBrief.data,
    atlasSummary: atlasSummary.data,
    atlasAnalysis: atlasAnalysis.data,
    benchmarkSummary: benchmarkSummary.data,
    benchmarkAnalysis: benchmarkAnalysis.data,
    batchSummary: batchSummary.data,
    benchmarkFile: benchmarkFile.data,
    sourceEnrichment: sourceEnrichment.data,
    proposalFile: proposalFile.data,
    decisionFile: decisionFile.data,
    artifacts: [
      toArtifactMeta("Call packet", callPacket),
      toArtifactMeta("Wedge brief", wedgeBrief),
      toArtifactMeta("Atlas summary", atlasSummary),
      toArtifactMeta("Atlas analysis", atlasAnalysis),
      toArtifactMeta("Benchmark summary", benchmarkSummary),
      toArtifactMeta("Benchmark analysis", benchmarkAnalysis),
      toArtifactMeta("Unattended batch", batchSummary),
      toArtifactMeta("Benchmark gold set", benchmarkFile),
      toArtifactMeta("Source enrichment", sourceEnrichment),
      toArtifactMeta("Autoresearch proposals", proposalFile),
      toArtifactMeta("Benchmark decisions", decisionFile),
      toArtifactMeta("Extraction snapshot", extractionSnapshot),
      toArtifactMeta("Resolved extraction", resolvedExtractionSnapshot),
      toArtifactMeta("Normalized protocols", normalizedSnapshot)
    ].filter((artifact): artifact is ArtifactMeta => artifact !== null),
    extractionSnapshot: extractionSnapshot?.data ?? null,
    resolvedExtractionSnapshot: resolvedExtractionSnapshot?.data ?? null,
    normalizedSnapshot: normalizedSnapshot?.data ?? null
  };
}

export async function getDebugData(
  domain: DomainId,
  requestedPaperId?: string
): Promise<DebugData> {
  const domainData = await getDomainData(domain);

  if (
    !domainData.extractionSnapshot ||
    !domainData.resolvedExtractionSnapshot ||
    !domainData.normalizedSnapshot
  ) {
    return {
      available: false,
      domain,
      sourceLabel: domainData.sourceLabel,
      reason:
        "The debug surface needs extraction, resolved extraction, and normalized protocol snapshots. Run the current batch pipeline or continue reading from the primary checkout artifacts."
    };
  }

  const protocolCards = domainData.normalizedSnapshot.protocols
    .map((protocol) => ({
      paperId: protocol.paperId,
      title: protocol.paperTitle,
      protocolFamily: protocol.protocolFamily,
      normalizationConfidence: protocol.normalizationConfidence,
      warningCount: protocol.normalizationWarnings.length,
      conditionCount: protocol.representativeConditions.length,
      stepCount: protocol.normalizedSteps.length
    }))
    .sort(
      (left, right) =>
        right.warningCount - left.warningCount ||
        right.conditionCount - left.conditionCount ||
        right.normalizationConfidence - left.normalizationConfidence
    );

  const selectedPaperId =
    requestedPaperId && protocolCards.some((card) => card.paperId === requestedPaperId)
      ? requestedPaperId
      : protocolCards[0]?.paperId;

  if (!selectedPaperId) {
    return {
      available: false,
      domain,
      sourceLabel: domainData.sourceLabel,
      reason: "No normalized protocols are available for this domain yet."
    };
  }

  const selectedProtocol = domainData.normalizedSnapshot.protocols.find(
    (protocol) => protocol.paperId === selectedPaperId
  );
  const baselineExtraction = domainData.extractionSnapshot.extractions.find(
    (extraction) => extraction.paper.id === selectedPaperId
  );
  const resolvedExtraction = domainData.resolvedExtractionSnapshot.extractions.find(
    (extraction) => extraction.paper.id === selectedPaperId
  );
  const benchmarkEntry =
    domainData.benchmarkFile.entries.find((entry) => entry.paperId === selectedPaperId) ?? null;
  const enrichmentRecord =
    domainData.sourceEnrichment.records.find((record) => record.paperId === selectedPaperId) ?? null;

  if (!selectedProtocol) {
    return {
      available: false,
      domain,
      sourceLabel: domainData.sourceLabel,
      reason: `Selected protocol ${selectedPaperId} is missing from the normalized snapshot.`
    };
  }

  return {
    available: true,
    domain,
    sourceLabel: domainData.sourceLabel,
    selectedPaperId,
    protocolCards,
    benchmarkEntry,
    enrichmentRecord,
    selected: {
      paperId: selectedProtocol.paperId,
      title: selectedProtocol.paperTitle,
      protocolFamily: selectedProtocol.protocolFamily,
      paperType: selectedProtocol.paperType,
      species: selectedProtocol.speciesMentions,
      specimenTypes: selectedProtocol.specimenTypes,
      normalizationConfidence: selectedProtocol.normalizationConfidence,
      warnings: selectedProtocol.normalizationWarnings,
      representativeConditions: selectedProtocol.representativeConditions.map((condition) => ({
        phase: condition.phase,
        chemical: condition.chemical,
        measurement: formatCondition(condition),
        source: condition.source,
        confidence: condition.confidence,
        label: condition.label
      })),
      steps: selectedProtocol.normalizedSteps.map((step) => ({
        order: step.order,
        phase: step.phase,
        summary: step.summary,
        transition: step.transitionToNextPhase ?? null,
        temperatures: step.temperatures.map((measurement) => measurement.normalizedText),
        durations: step.durations.map((measurement) => measurement.normalizedText),
        concentrations: step.concentrations.map((measurement) => measurement.normalizedText),
        evidenceCount: step.evidence.length
      })),
      baseline: baselineExtraction
        ? {
            extractionConfidence: baselineExtraction.extractionConfidence,
            chemicalCount: baselineExtraction.chemicalMentions.length,
            stepCount: baselineExtraction.protocolSteps.length,
            outcomeCount: baselineExtraction.outcomeMentions.length,
            raw: baselineExtraction
          }
        : null,
      resolved: resolvedExtraction
        ? {
            extractionConfidence: resolvedExtraction.extractionConfidence,
            chemicalCount: resolvedExtraction.chemicalMentions.length,
            stepCount: resolvedExtraction.protocolSteps.length,
            outcomeCount: resolvedExtraction.outcomeMentions.length,
            strongestAuthority: resolvedExtraction.evidenceAuthority.strongestAuthority,
            reviewedSnippetCount: resolvedExtraction.evidenceAuthority.reviewedSnippetCount,
            directSnippetCount: resolvedExtraction.evidenceAuthority.directSnippetCount,
            raw: resolvedExtraction
          }
        : null,
      rawNormalized: selectedProtocol
    }
  };
}

export function getReviewedEntryCounts(benchmarkFile: z.infer<typeof BenchmarkFileSchema>) {
  return {
    reviewed: benchmarkFile.entries.filter((entry) => entry.reviewStatus === "reviewed").length,
    seeded: benchmarkFile.entries.filter((entry) => entry.reviewStatus === "seeded").length,
    inAtlas: benchmarkFile.entries.filter((entry) => entry.expectedInAtlas).length,
    excluded: benchmarkFile.entries.filter((entry) => !entry.expectedInAtlas).length
  };
}

export function getSourceEnrichmentCounts(
  file: z.infer<typeof SourceEnrichmentFileSchema>
) {
  return {
    pending: file.records.filter((record) => record.status === "pending").length,
    inProgress: file.records.filter((record) => record.status === "in-progress").length,
    reviewed: file.records.filter((record) => record.status === "reviewed").length,
    rejected: file.records.filter((record) => record.status === "rejected").length
  };
}
