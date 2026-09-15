import {
  type ActiveWedge,
  type DomainId,
  type ExperimentPacketFile,
  type SourceEnrichmentFile,
  type WedgeEvidenceGapQueue
} from "../../shared/src/schema.js";

export type RunDelta = {
  generatedAt: string;
  domain: DomainId;
  comparedTo: string | null;

  wedgeDelta: {
    wedgeChanged: boolean;
    previousWedgeTitle: string | null;
    currentWedgeTitle: string;
    confidenceDeltas: {
      scientificRelevance: number;
      companyRelevance: number;
      evidenceConfidence: number;
      translationalPotential: number;
    };
    supportingPaperCountDelta: number;
    blockerSummary: string;
  };

  evidenceGapDelta: {
    highImpactGapsBefore: number;
    highImpactGapsAfter: number;
    netHighImpactChange: number;
    topGapBefore: string | null;
    topGapAfter: string | null;
    gapsNarrowed: string[];
  };

  experimentPacketDelta: {
    topPacketChanged: boolean;
    previousTopPacket: string | null;
    currentTopPacket: string | null;
    packetCount: number;
  };

  enrichmentDelta: {
    pendingBefore: number;
    pendingAfter: number;
    llmDraftsGenerated: number;
    llmAutoTriaged: number;
    decisionChangingPending: number;
  };

  summary: string;
  productiveRun: boolean;
  progressAssessment: "improved" | "flat" | "regressed";
};

type DeltaSnapshot = {
  activeWedge: ActiveWedge | null;
  evidenceGapQueue: WedgeEvidenceGapQueue | null;
  experimentPackets: ExperimentPacketFile | null;
  enrichment: SourceEnrichmentFile | null;
};

function countHighImpactGaps(queue: WedgeEvidenceGapQueue | null): number {
  if (!queue) return 0;
  return queue.queue.filter((gap) => gap.decisionImpact === "high").length;
}

function topGapTitle(queue: WedgeEvidenceGapQueue | null): string | null {
  if (!queue || queue.queue.length === 0) return null;
  return queue.queue[0].title;
}

function countPendingEnrichment(enrichment: SourceEnrichmentFile | null): number {
  if (!enrichment) return 0;
  return enrichment.records.filter((r) => r.status === "pending" || r.status === "in-progress").length;
}

function countLlmDrafted(enrichment: SourceEnrichmentFile | null): number {
  if (!enrichment) return 0;
  return enrichment.records.filter((r) => r.llmDraft !== undefined).length;
}

function countLlmTriaged(enrichment: SourceEnrichmentFile | null): number {
  if (!enrichment) return 0;
  return enrichment.records.filter((r) => r.status === "llm-triaged").length;
}

function countDecisionChangingPending(enrichment: SourceEnrichmentFile | null): number {
  if (!enrichment) return 0;
  return enrichment.records.filter(
    (r) => (r.status === "pending" || r.status === "in-progress") && r.llmDraft?.safetyTier === "decision-changing"
  ).length;
}

function round3(value: number): number {
  return Number(value.toFixed(3));
}

export function computeRunDelta(
  domain: DomainId,
  before: DeltaSnapshot,
  after: DeltaSnapshot
): RunDelta {
  const now = new Date().toISOString();
  const previousTimestamp = before.activeWedge?.generatedAt ?? null;

  // Wedge delta
  const wedgeChanged = (before.activeWedge?.wedgeId ?? null) !== (after.activeWedge?.wedgeId ?? null);
  const confidenceDeltas = {
    scientificRelevance: round3((after.activeWedge?.scientificRelevance ?? 0) - (before.activeWedge?.scientificRelevance ?? 0)),
    companyRelevance: round3((after.activeWedge?.companyRelevance ?? 0) - (before.activeWedge?.companyRelevance ?? 0)),
    evidenceConfidence: round3((after.activeWedge?.evidenceConfidence ?? 0) - (before.activeWedge?.evidenceConfidence ?? 0)),
    translationalPotential: round3((after.activeWedge?.translationalPotential ?? 0) - (before.activeWedge?.translationalPotential ?? 0))
  };
  const supportingPaperCountDelta =
    (after.activeWedge?.supportingPaperTitles.length ?? 0) - (before.activeWedge?.supportingPaperTitles.length ?? 0);

  // Evidence gap delta
  const highBefore = countHighImpactGaps(before.evidenceGapQueue);
  const highAfter = countHighImpactGaps(after.evidenceGapQueue);
  const gapsNarrowed: string[] = [];
  if (before.evidenceGapQueue && after.evidenceGapQueue) {
    const afterPaperIds = new Set(after.evidenceGapQueue.queue.map((g) => g.paperId));
    for (const gap of before.evidenceGapQueue.queue) {
      if (gap.decisionImpact === "high" && !afterPaperIds.has(gap.paperId)) {
        gapsNarrowed.push(gap.title);
      }
    }
  }

  // Experiment packet delta
  const prevTopPacket = before.experimentPackets?.packets[0]?.title ?? null;
  const currTopPacket = after.experimentPackets?.packets[0]?.title ?? null;
  const topPacketChanged = prevTopPacket !== currTopPacket;

  // Enrichment delta
  const pendingBefore = countPendingEnrichment(before.enrichment);
  const pendingAfter = countPendingEnrichment(after.enrichment);
  const llmDraftsGenerated = countLlmDrafted(after.enrichment) - countLlmDrafted(before.enrichment);
  const llmAutoTriaged = countLlmTriaged(after.enrichment) - countLlmTriaged(before.enrichment);
  const decisionChangingPending = countDecisionChangingPending(after.enrichment);

  // Determine progress assessment
  const significantConfidenceChange = Object.values(confidenceDeltas).some((d) => Math.abs(d) >= 0.01);
  const gapsImproved = highAfter < highBefore || gapsNarrowed.length > 0;
  const enrichmentImproved = pendingAfter < pendingBefore;
  const anythingRegressed = Object.values(confidenceDeltas).some((d) => d < -0.02) || highAfter > highBefore;

  let progressAssessment: "improved" | "flat" | "regressed";
  if (anythingRegressed && !gapsImproved && !enrichmentImproved) {
    progressAssessment = "regressed";
  } else if (significantConfidenceChange || gapsImproved || enrichmentImproved || wedgeChanged || topPacketChanged) {
    progressAssessment = "improved";
  } else {
    progressAssessment = "flat";
  }

  // productiveRun: the run made a material difference to decision quality
  const productiveRun =
    progressAssessment === "improved" &&
    (gapsImproved || significantConfidenceChange || wedgeChanged || enrichmentImproved);

  // Build summary
  const summaryParts: string[] = [];
  if (wedgeChanged) {
    summaryParts.push(`Wedge changed from "${before.activeWedge?.title ?? "none"}" to "${after.activeWedge?.title ?? "none"}".`);
  }
  if (significantConfidenceChange) {
    const improved = Object.entries(confidenceDeltas).filter(([, d]) => d > 0).map(([k]) => k);
    if (improved.length > 0) {
      summaryParts.push(`Confidence improved in: ${improved.join(", ")}.`);
    }
  }
  if (gapsNarrowed.length > 0) {
    summaryParts.push(`${gapsNarrowed.length} high-impact gap(s) narrowed.`);
  }
  if (llmDraftsGenerated > 0) {
    summaryParts.push(`${llmDraftsGenerated} LLM enrichment draft(s) generated.`);
  }
  if (summaryParts.length === 0) {
    summaryParts.push("No material changes detected.");
  }

  return {
    generatedAt: now,
    domain,
    comparedTo: previousTimestamp,
    wedgeDelta: {
      wedgeChanged,
      previousWedgeTitle: before.activeWedge?.title ?? null,
      currentWedgeTitle: after.activeWedge?.title ?? "none",
      confidenceDeltas,
      supportingPaperCountDelta,
      blockerSummary: after.activeWedge?.currentRead ?? "no wedge selected"
    },
    evidenceGapDelta: {
      highImpactGapsBefore: highBefore,
      highImpactGapsAfter: highAfter,
      netHighImpactChange: highAfter - highBefore,
      topGapBefore: topGapTitle(before.evidenceGapQueue),
      topGapAfter: topGapTitle(after.evidenceGapQueue),
      gapsNarrowed
    },
    experimentPacketDelta: {
      topPacketChanged,
      previousTopPacket: prevTopPacket,
      currentTopPacket: currTopPacket,
      packetCount: after.experimentPackets?.packets.length ?? 0
    },
    enrichmentDelta: {
      pendingBefore,
      pendingAfter,
      llmDraftsGenerated: Math.max(0, llmDraftsGenerated),
      llmAutoTriaged: Math.max(0, llmAutoTriaged),
      decisionChangingPending
    },
    summary: summaryParts.join(" "),
    productiveRun,
    progressAssessment
  };
}

export function renderRunDeltaMarkdown(delta: RunDelta): string {
  const lines: string[] = [];
  lines.push(`### Delta (vs. previous run)`);
  lines.push(`- progress: **${delta.progressAssessment}**${delta.productiveRun ? " (productive)" : ""}`);

  if (delta.wedgeDelta.wedgeChanged) {
    lines.push(`- wedge: changed from "${delta.wedgeDelta.previousWedgeTitle}" to "${delta.wedgeDelta.currentWedgeTitle}"`);
  } else {
    lines.push(`- wedge: unchanged (${delta.wedgeDelta.currentWedgeTitle})`);
  }

  const cd = delta.wedgeDelta.confidenceDeltas;
  const confParts = Object.entries(cd)
    .filter(([, v]) => Math.abs(v) >= 0.001)
    .map(([k, v]) => `${k} ${v > 0 ? "+" : ""}${v}`);
  if (confParts.length > 0) {
    lines.push(`- confidence: ${confParts.join(", ")}`);
  } else {
    lines.push("- confidence: no change");
  }

  lines.push(`- evidence gaps: ${delta.evidenceGapDelta.highImpactGapsAfter} high-impact (${delta.evidenceGapDelta.netHighImpactChange >= 0 ? "+" : ""}${delta.evidenceGapDelta.netHighImpactChange})`);
  if (delta.evidenceGapDelta.gapsNarrowed.length > 0) {
    lines.push(`  narrowed: ${delta.evidenceGapDelta.gapsNarrowed.join(", ")}`);
  }

  if (delta.experimentPacketDelta.topPacketChanged) {
    lines.push(`- top packet: changed to "${delta.experimentPacketDelta.currentTopPacket}"`);
  } else {
    lines.push(`- top packet: unchanged`);
  }

  lines.push(`- enrichment: ${delta.enrichmentDelta.pendingAfter} pending (was ${delta.enrichmentDelta.pendingBefore})`);
  if (delta.enrichmentDelta.llmDraftsGenerated > 0) {
    lines.push(`  llm drafts: ${delta.enrichmentDelta.llmDraftsGenerated} generated, ${delta.enrichmentDelta.llmAutoTriaged} auto-triaged`);
  }
  if (delta.enrichmentDelta.decisionChangingPending > 0) {
    lines.push(`  decision-changing records still pending enrichment review: ${delta.enrichmentDelta.decisionChangingPending}`);
  }

  lines.push(`- summary: ${delta.summary}`);
  lines.push("");
  return lines.join("\n");
}
