import {
  type ActiveWedge,
  type ExtractionSnapshot,
  type SourceEnrichmentFile,
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

function decisionImpactFor(input: {
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

export function buildWedgeEvidenceGapQueue(input: {
  snapshot: ExtractionSnapshot;
  activeWedge: ActiveWedge;
  benchmarkAnalysis: BenchmarkAnalysis;
  sourceEnrichment?: SourceEnrichmentFile;
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

      return {
        paperId: record.paperId,
        title: record.title,
        priority: record.priority,
        status: record.status,
        decisionImpact: decisionImpactFor({
          translationalSignal,
          missingFields,
          wedgeRelevanceScore
        }),
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
    lines.push(
      `- ${record.title} | impact=${record.decisionImpact} | priority=${record.priority} | status=${record.status} | authority=${record.authorityProfile} | translational=${record.translationalSignal} | relevance=${record.wedgeRelevanceScore}`
    );
    lines.push(`  missing fields=${record.missingFields.join(", ")}`);
    lines.push(`  rationale=${record.rationale}`);
    lines.push(`  action=${record.recommendedAction}`);
  }
  lines.push("");
  return lines.join("\n");
}
