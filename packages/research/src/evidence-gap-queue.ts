import {
  type ActiveWedge,
  type DecisionImpactScore,
  type ExperimentPacketFile,
  type ExtractionSnapshot,
  type SourceEnrichmentFile,
  type WedgeDecisionContradictionReport,
  WedgeEvidenceGapQueueSchema,
  type WedgeEvidenceGapQueue
} from "../../shared/src/schema.js";
import {
  meaningfulPhases,
  pickAuthorityProfile,
  pickTranslationalSignal,
  reviewedEnrichmentTitleSet,
  unique
} from "./wedge-helpers.js";

type BenchmarkAnalysis = {
  reviewedDepth: {
    missingOutcomes?: Array<{
      paperId: string;
      title: string;
      evidenceStatus: "extractor-gap" | "ambiguous-evidence" | "evidence-thin";
    }>;
    missingStepPhases?: Array<{
      paperId: string;
      title: string;
    }>;
  };
};

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function round3(value: number): number {
  return Number(value.toFixed(3));
}

/** Legacy tier — preserved alongside continuous score for validation */
function decisionImpactTier(input: {
  translationalSignal: string;
  missingFields: string[];
  wedgeRelevanceScore: number;
}): "high" | "medium" | "low" {
  if (
    input.wedgeRelevanceScore >= 0.8 &&
    (input.translationalSignal === "clinically adjacent" || input.translationalSignal === "transplant relevant")
  ) {
    return "high";
  }
  if (input.wedgeRelevanceScore >= 0.55 || input.missingFields.length >= 2) {
    return "medium";
  }
  return "low";
}

function computeDecisionImpactScore(input: {
  paperId: string;
  title: string;
  wedgeRelevanceScore: number;
  authorityProfile: string;
  missingFields: string[];
  activeWedge: ActiveWedge;
  contradictionReport?: WedgeDecisionContradictionReport;
  experimentPackets?: ExperimentPacketFile;
}): DecisionImpactScore {
  const components = {
    wedgeRelevance: round3(input.wedgeRelevanceScore),
    blockerProximity: 0,
    experimentPacketEffect: 0,
    evidenceAuthorityUplift: 0,
    contradictionResolution: 0
  };
  const reasons: string[] = [];

  // Blocker proximity: does resolving this gap address a current wedge uncertainty/blocker?
  const blockerText = [
    input.activeWedge.currentRead ?? "",
    ...(input.activeWedge.keyUncertainties ?? [])
  ].join(" ").toLowerCase();
  const titleLower = input.title.toLowerCase();
  const titleWords = titleLower.split(/\s+/).filter((word) => word.length > 3);
  const blockerOverlap = titleWords.filter((word) => blockerText.includes(word)).length;
  if (blockerOverlap >= 3) {
    components.blockerProximity = round3(clamp(blockerOverlap / 6));
    reasons.push(`title shares ${blockerOverlap} terms with wedge blockers`);
  } else if (blockerOverlap >= 1) {
    components.blockerProximity = round3(clamp(blockerOverlap / 8));
    reasons.push(`title has weak overlap with wedge blockers`);
  }

  // Experiment packet effect: is this paper in the supporting set of a top experiment packet?
  if (input.experimentPackets) {
    for (const packet of input.experimentPackets.packets) {
      if (packet.supportingPaperTitles.includes(input.title)) {
        components.experimentPacketEffect = round3(clamp(packet.priorityScore));
        reasons.push(`supports experiment packet "${packet.title}"`);
        break;
      }
    }
  }

  // Evidence authority uplift: would enrichment upgrade from abstract-only to primary?
  if (input.authorityProfile === "abstract-only") {
    components.evidenceAuthorityUplift = 0.7;
    reasons.push("currently abstract-only; enrichment could upgrade authority");
  } else if (input.authorityProfile === "secondary") {
    components.evidenceAuthorityUplift = 0.3;
    reasons.push("currently secondary; enrichment could strengthen authority");
  }

  // Contradiction resolution: is this paper involved in a flagged contradiction?
  if (input.contradictionReport) {
    for (const contradiction of input.contradictionReport.contradictions) {
      if (contradiction.paperA === input.title || contradiction.paperB === input.title) {
        const impactWeight = contradiction.decisionImpact === "high" ? 1 : contradiction.decisionImpact === "medium" ? 0.6 : 0.3;
        components.contradictionResolution = round3(clamp(impactWeight * contradiction.confidence));
        reasons.push(`involved in ${contradiction.decisionImpact}-impact contradiction: "${contradiction.topic}"`);
        break;
      }
    }
  }

  // Weighted composite
  const score = round3(clamp(
    components.wedgeRelevance * 0.30 +
    components.blockerProximity * 0.25 +
    components.experimentPacketEffect * 0.20 +
    components.evidenceAuthorityUplift * 0.15 +
    components.contradictionResolution * 0.10
  ));

  if (reasons.length === 0) {
    reasons.push("no strong decision-impact signals detected");
  }

  return { score, components, rationale: reasons.join("; ") };
}

export function buildWedgeEvidenceGapQueue(input: {
  snapshot: ExtractionSnapshot;
  activeWedge: ActiveWedge;
  benchmarkAnalysis: BenchmarkAnalysis;
  sourceEnrichment?: SourceEnrichmentFile;
  contradictionReport?: WedgeDecisionContradictionReport;
  experimentPackets?: ExperimentPacketFile;
}): WedgeEvidenceGapQueue {
  const extractionByPaperId = new Map(input.snapshot.extractions.map((extraction) => [extraction.paper.id, extraction]));
  const extractionByTitle = new Map(input.snapshot.extractions.map((extraction) => [extraction.paper.title, extraction]));
  const reviewedEnrichmentTitles = reviewedEnrichmentTitleSet(input.sourceEnrichment);
  const missingOutcomeByPaperId = new Map(
    (input.benchmarkAnalysis.reviewedDepth.missingOutcomes ?? []).map((item) => [item.paperId, item])
  );
  const missingStepByPaperId = new Map(
    (input.benchmarkAnalysis.reviewedDepth.missingStepPhases ?? []).map((item) => [item.paperId, item])
  );

  const queue = (input.sourceEnrichment?.records ?? [])
    .filter(
      (record) =>
        record.status === "pending" ||
        record.status === "in-progress" ||
        input.activeWedge.supportingPaperTitles.includes(record.title)
    )
    .map((record) => {
      const extraction =
        extractionByPaperId.get(record.paperId) ?? extractionByTitle.get(record.title);
      const authorityProfile = extraction
        ? pickAuthorityProfile(extraction, reviewedEnrichmentTitles)
        : "abstract-only";
      const translationalSignal = extraction ? pickTranslationalSignal(extraction) : "research only";
      const missingFields = unique(
        [
          missingOutcomeByPaperId.has(record.paperId) ? "outcomeClasses" : null,
          missingStepByPaperId.has(record.paperId) ? "stepPhases" : null,
          authorityProfile === "abstract-only" ? "authority" : null,
          extraction && meaningfulPhases(extraction).length <= 1 ? "protocolDetail" : null
        ].filter((value): value is "outcomeClasses" | "stepPhases" | "authority" | "protocolDetail" => Boolean(value))
      );
      const wedgeRelevanceScore = Number(
        clamp(
          (input.activeWedge.supportingPaperTitles.includes(record.title) ? 0.55 : 0.25) +
            (extraction?.chemicalMentions.some((chemical) =>
              input.activeWedge.dominantPatterns.chemicals.includes(chemical.canonicalName)
            )
              ? 0.15
              : 0) +
            (extraction?.specimenTypes.some((specimen) =>
              input.activeWedge.dominantPatterns.specimenTypes.includes(specimen)
            )
              ? 0.15
              : 0) +
            (extraction?.protocolFamily &&
            input.activeWedge.dominantPatterns.protocolFamilies.includes(extraction.protocolFamily)
              ? 0.15
              : 0)
        ).toFixed(3)
      );

      const decisionImpactScore = computeDecisionImpactScore({
        paperId: record.paperId,
        title: record.title,
        wedgeRelevanceScore,
        authorityProfile,
        missingFields,
        activeWedge: input.activeWedge,
        contradictionReport: input.contradictionReport,
        experimentPackets: input.experimentPackets
      });

      return {
        paperId: record.paperId,
        title: record.title,
        priority: record.priority,
        status: record.status,
        decisionImpact: decisionImpactTier({
          translationalSignal,
          missingFields,
          wedgeRelevanceScore
        }),
        decisionImpactScore,
        missingFields: missingFields.length > 0 ? missingFields : ["authority"],
        authorityProfile,
        translationalSignal,
        wedgeRelevanceScore,
        rationale:
          record.rationale ||
          "This paper is wedge-relevant, but stronger evidence density is still needed before Atlas should lean on it heavily.",
        recommendedAction:
          record.status === "reviewed"
            ? "monitor"
            : "review source enrichment for wedge-relevant evidence"
      };
    })
    .sort((left, right) => {
      // Primary sort: continuous decision impact score (new)
      // Secondary: legacy tier (preserved for validation)
      // Tertiary: wedge relevance, then title
      const scoreDiff = (right.decisionImpactScore?.score ?? 0) - (left.decisionImpactScore?.score ?? 0);
      if (Math.abs(scoreDiff) >= 0.01) {
        return scoreDiff;
      }
      const impactOrder = { high: 3, medium: 2, low: 1 };
      return (
        impactOrder[right.decisionImpact] - impactOrder[left.decisionImpact] ||
        right.wedgeRelevanceScore - left.wedgeRelevanceScore ||
        left.title.localeCompare(right.title)
      );
    });

  return WedgeEvidenceGapQueueSchema.parse({
    generatedAt: new Date().toISOString(),
    domain: input.snapshot.domain,
    wedgeId: input.activeWedge.wedgeId,
    queue
  });
}

export function renderWedgeEvidenceGapQueueMarkdown(queue: WedgeEvidenceGapQueue): string {
  const lines: string[] = [];
  lines.push(`# ${queue.domain} wedge evidence gap queue`);
  lines.push("");
  if (queue.queue.length === 0) {
    lines.push("- No wedge-scoped evidence gaps are queued right now.");
    lines.push("");
    return lines.join("\n");
  }

  for (const record of queue.queue) {
    const scoreLabel = record.decisionImpactScore
      ? `score=${record.decisionImpactScore.score}`
      : "score=n/a";
    lines.push(
      `- ${record.title} | ${scoreLabel} | tier=${record.decisionImpact} | priority=${record.priority} | status=${record.status} | authority=${record.authorityProfile} | translational=${record.translationalSignal} | relevance=${record.wedgeRelevanceScore}`
    );
    if (record.decisionImpactScore) {
      const c = record.decisionImpactScore.components;
      lines.push(
        `  components: wedge=${c.wedgeRelevance} blocker=${c.blockerProximity} packet=${c.experimentPacketEffect} authority=${c.evidenceAuthorityUplift} contradiction=${c.contradictionResolution}`
      );
      lines.push(`  score rationale=${record.decisionImpactScore.rationale}`);
    }
    lines.push(`  missing fields=${record.missingFields.join(", ")}`);
    lines.push(`  rationale=${record.rationale}`);
    lines.push(`  action=${record.recommendedAction}`);
  }
  lines.push("");
  return lines.join("\n");
}
