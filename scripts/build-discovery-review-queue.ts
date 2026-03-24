import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  buildTrackedKeys,
  evidenceFingerprintForPaper,
  findMatchingExistingDecision,
  paperIsTracked,
  recommendationForPaper,
  titleKey
} from "../packages/discovery/src/review.js";
import {
  DiscoveryPromotionDecisionSchema,
  DiscoveryPromotionRecommendationSchema,
  DiscoveryPromotionDecisionStatusSchema,
  DiscoveryPromotionQueueSchema,
  DiscoverySourceSchema,
  DiscoverySnapshotSchema,
  DomainIdSchema,
  DomainSnapshotSchema,
  FullTextAvailabilitySchema,
  type DiscoveryPaper,
  type DiscoveryPromotionDecision,
  type DomainId
} from "../packages/shared/src/schema.js";

const domain = DomainIdSchema.parse(process.argv[2] ?? "ovarian-tissue");

async function readOptionalFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function normalizeLegacyDecision(value: unknown): DiscoveryPromotionDecision | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const decision = value as Record<string, unknown>;
  if (typeof decision.dedupeKey !== "string" || typeof decision.title !== "string") {
    return null;
  }

  const decisionStatus = DiscoveryPromotionDecisionStatusSchema.safeParse(decision.decision).success
    ? (decision.decision as DiscoveryPromotionDecision["decision"])
    : "pending";
  const recommendation = DiscoveryPromotionRecommendationSchema.safeParse(decision.recommendation).success
    ? (decision.recommendation as DiscoveryPromotionDecision["recommendation"])
    : "review";
  const sourceTypes = Array.isArray(decision.sourceTypes)
    ? decision.sourceTypes
        .filter((entry): entry is string => typeof entry === "string")
        .filter((entry) => DiscoverySourceSchema.safeParse(entry).success)
    : [];

  return DiscoveryPromotionDecisionSchema.parse({
    dedupeKey: decision.dedupeKey,
    title: decision.title,
    doi: typeof decision.doi === "string" ? decision.doi : null,
    pmid: typeof decision.pmid === "string" ? decision.pmid : null,
    pmcid: typeof decision.pmcid === "string" ? decision.pmcid : null,
    titleKey: typeof decision.titleKey === "string" ? decision.titleKey : titleKey(decision.title),
    decision: decisionStatus,
    recommendation,
    recommendationReasons: Array.isArray(decision.recommendationReasons)
      ? decision.recommendationReasons.filter((entry): entry is string => typeof entry === "string")
      : [],
    rankingScore: typeof decision.rankingScore === "number" ? decision.rankingScore : 0,
    relevanceScore: typeof decision.relevanceScore === "number" ? decision.relevanceScore : 0,
    authorityScore: typeof decision.authorityScore === "number" ? decision.authorityScore : 0,
    sourceDiversityScore: typeof decision.sourceDiversityScore === "number" ? decision.sourceDiversityScore : 0,
    sourceCount: typeof decision.sourceCount === "number" && decision.sourceCount > 0 ? decision.sourceCount : 1,
    recordCount:
      typeof decision.recordCount === "number" && decision.recordCount > 0
        ? decision.recordCount
        : typeof decision.sourceCount === "number" && decision.sourceCount > 0
          ? decision.sourceCount
          : 1,
    sourceTypes: sourceTypes.length > 0 ? sourceTypes : ["other"],
    fullTextAvailability: FullTextAvailabilitySchema.safeParse(decision.fullTextAvailability).success
      ? decision.fullTextAvailability
      : "unknown",
    matchedKeywords: Array.isArray(decision.matchedKeywords)
      ? decision.matchedKeywords.filter((entry): entry is string => typeof entry === "string")
      : [],
    staleEvidence: Boolean(decision.staleEvidence),
    ...(typeof decision.staleReason === "string" ? { staleReason: decision.staleReason } : {}),
    ...(typeof decision.reviewerNotes === "string" ? { reviewerNotes: decision.reviewerNotes } : {}),
    ...(typeof decision.decidedAt === "string" ? { decidedAt: decision.decidedAt } : {})
  });
}

function parseExistingQueue(value: string | null): ReturnType<typeof DiscoveryPromotionQueueSchema.parse> | null {
  if (value === null) {
    return null;
  }
  const raw = JSON.parse(value);
  const parsed = DiscoveryPromotionQueueSchema.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }
  if (!raw || typeof raw !== "object") {
    throw parsed.error;
  }

  const queue = raw as Record<string, unknown>;
  const decisions = Array.isArray(queue.decisions)
    ? queue.decisions
        .map((decision) => normalizeLegacyDecision(decision))
        .filter((decision): decision is DiscoveryPromotionDecision => Boolean(decision))
    : [];

  return DiscoveryPromotionQueueSchema.parse({
    generatedAt: typeof queue.generatedAt === "string" ? queue.generatedAt : new Date().toISOString(),
    domain: typeof queue.domain === "string" ? queue.domain : domain,
    sourceSnapshotGeneratedAt:
      typeof queue.sourceSnapshotGeneratedAt === "string" ? queue.sourceSnapshotGeneratedAt : new Date().toISOString(),
    candidateCount: typeof queue.candidateCount === "number" ? queue.candidateCount : decisions.length,
    trackedCount: typeof queue.trackedCount === "number" ? queue.trackedCount : 0,
    novelCandidateCount: typeof queue.novelCandidateCount === "number" ? queue.novelCandidateCount : decisions.length,
    isDegraded: Boolean(queue.isDegraded),
    degradationReasons: Array.isArray(queue.degradationReasons)
      ? queue.degradationReasons.filter((entry): entry is string => typeof entry === "string")
      : [],
    decisions
  });
}

function renderMarkdown(
  domainId: DomainId,
  discoverySnapshot: ReturnType<typeof DiscoverySnapshotSchema.parse>,
  queue: ReturnType<typeof DiscoveryPromotionQueueSchema.parse>
): string {
  const lines: string[] = [];
  lines.push(`# ${domainId} discovery promotion queue`);
  lines.push("");
  lines.push(`- source snapshot: ${queue.sourceSnapshotGeneratedAt}`);
  lines.push(`- total discovery candidates: ${queue.candidateCount}`);
  lines.push(`- already tracked in current slice: ${queue.trackedCount}`);
  lines.push(`- novel candidates requiring review: ${queue.novelCandidateCount}`);
  lines.push(`- degraded refresh: ${queue.isDegraded ? "yes" : "no"}`);
  if (queue.degradationReasons.length > 0) {
    lines.push(`- degradation reasons: ${queue.degradationReasons.join(" || ")}`);
  }
  lines.push("");

  const counts = new Map<string, number>();
  for (const decision of queue.decisions) {
    counts.set(decision.decision, (counts.get(decision.decision) ?? 0) + 1);
  }

  lines.push("## Decision status");
  for (const status of DiscoveryPromotionDecisionStatusSchema.options) {
    lines.push(`- ${status}: ${counts.get(status) ?? 0}`);
  }
  lines.push("");
  lines.push("## Novel candidates");

  if (queue.decisions.length === 0) {
    lines.push("- none");
    lines.push("");
  } else {
    for (const decision of queue.decisions) {
      lines.push(
        `- [${decision.decision}] ${decision.title} | recommendation=${decision.recommendation} | ranking=${decision.rankingScore}`
      );
      lines.push(`  dedupeKey=${decision.dedupeKey}`);
      lines.push(
        `  sources=${decision.sourceTypes.join(", ")} | sourceCount=${decision.sourceCount} | recordCount=${decision.recordCount}`
      );
      lines.push(
        `  relevance=${decision.relevanceScore} authority=${decision.authorityScore} diversity=${decision.sourceDiversityScore}`
      );
      lines.push(`  reasons=${decision.recommendationReasons.join(" || ")}`);
      if (decision.staleEvidence) {
        lines.push(`  staleEvidence=${decision.staleReason ?? "evidence changed since the previous decision"}`);
      }
      if (decision.doi) {
        lines.push(`  doi=${decision.doi}`);
      } else if (decision.pmid) {
        lines.push(`  pmid=${decision.pmid}`);
      }
      if (decision.reviewerNotes) {
        lines.push(`  reviewerNotes=${decision.reviewerNotes}`);
      }
    }
    lines.push("");
  }

  const providerFailureCount = discoverySnapshot.providerSummaries.filter((summary) => summary.failed).length;
  lines.push("## Provider status");
  lines.push(`- provider failures: ${providerFailureCount}`);
  for (const summary of discoverySnapshot.providerSummaries) {
    if (summary.kind === "live-provider") {
      lines.push(
        `- ${summary.source}: fetched=${summary.fetchedCount} accepted=${summary.acceptedCount}${summary.totalHits !== null && summary.totalHits !== undefined ? ` total=${summary.totalHits}` : ""}${summary.truncated ? " truncated=yes" : ""}${summary.failed ? ` error=${summary.error}` : ""}`
      );
      continue;
    }
    lines.push(`- ${summary.source}: fetched=${summary.fetchedCount} accepted=${summary.acceptedCount} label=${summary.label}`);
  }
  lines.push("");

  return lines.join("\n");
}

async function main(selectedDomain: DomainId): Promise<void> {
  const discoveryDir = join(process.cwd(), "data", "discovery", selectedDomain);
  const processedDir = join(process.cwd(), "data", "processed", selectedDomain);
  const queueJsonPath = join(discoveryDir, "promotion-queue.json");
  const queueMarkdownPath = join(discoveryDir, "promotion-queue.md");

  const discoverySnapshot = DiscoverySnapshotSchema.parse(
    JSON.parse(await readFile(join(discoveryDir, "discovery-snapshot.json"), "utf8"))
  );
  const domainSnapshot = DomainSnapshotSchema.parse(
    JSON.parse(await readFile(join(processedDir, "domain-snapshot.json"), "utf8"))
  );
  const trackedKeys = buildTrackedKeys(domainSnapshot);

  let trackedCount = 0;
  const novelCandidates: DiscoveryPaper[] = [];
  for (const paper of discoverySnapshot.papers) {
    if (paperIsTracked(paper, trackedKeys)) {
      trackedCount += 1;
      continue;
    }
    novelCandidates.push(paper);
  }

  const existingQueue = parseExistingQueue(await readOptionalFile(queueJsonPath));

  const existingDecisions = existingQueue?.decisions ?? [];
  const nextQueue = DiscoveryPromotionQueueSchema.parse({
    generatedAt: new Date().toISOString(),
    domain: selectedDomain,
    sourceSnapshotGeneratedAt: discoverySnapshot.generatedAt,
    candidateCount: discoverySnapshot.totalCandidates,
    trackedCount,
    novelCandidateCount: novelCandidates.length,
    isDegraded: discoverySnapshot.isDegraded,
    degradationReasons: discoverySnapshot.degradationReasons,
    decisions: novelCandidates.map((paper) => {
      const existing = findMatchingExistingDecision(existingDecisions, paper);
      const recommendation = recommendationForPaper(paper);
      const nextFingerprint = evidenceFingerprintForPaper(paper, recommendation.recommendation);
      const previousFingerprint =
        existing &&
        evidenceFingerprintForPaper(
          {
            ...paper,
            rankingScore: existing.rankingScore,
            relevanceScore: existing.relevanceScore,
            authorityScore: existing.authorityScore,
            sourceDiversityScore: existing.sourceDiversityScore,
            sourceCount: existing.sourceCount,
            recordCount: existing.recordCount,
            sourceTypes: existing.sourceTypes,
            fullTextAvailability: existing.fullTextAvailability
          },
          existing.recommendation
        );
      const staleReason =
        existing && previousFingerprint !== nextFingerprint
          ? "evidence or recommendation changed since the previous review state"
          : undefined;
      const shouldResetDecision = Boolean(existing && existing.decision !== "pending" && staleReason);
      return {
        dedupeKey: paper.dedupeKey,
        title: paper.title,
        doi: paper.doi ?? null,
        pmid: paper.pmid ?? null,
        pmcid: paper.pmcid ?? null,
        titleKey: titleKey(paper.title),
        decision: shouldResetDecision ? "pending" : existing?.decision ?? "pending",
        recommendation: recommendation.recommendation,
        recommendationReasons: recommendation.reasons,
        rankingScore: paper.rankingScore,
        relevanceScore: paper.relevanceScore,
        authorityScore: paper.authorityScore,
        sourceDiversityScore: paper.sourceDiversityScore,
        sourceCount: paper.sourceCount,
        recordCount: paper.recordCount,
        sourceTypes: paper.sourceTypes,
        fullTextAvailability: paper.fullTextAvailability,
        matchedKeywords: paper.matchedKeywords,
        staleEvidence: Boolean(staleReason),
        ...(staleReason ? { staleReason } : {}),
        ...(existing?.reviewerNotes ? { reviewerNotes: existing.reviewerNotes } : {}),
        ...(existing?.decidedAt ? { decidedAt: existing.decidedAt } : {})
      } satisfies DiscoveryPromotionDecision;
    })
  });

  const previousJson = await readOptionalFile(queueJsonPath);
  const stableQueue =
    previousJson &&
    JSON.stringify({ ...JSON.parse(previousJson), generatedAt: null, sourceSnapshotGeneratedAt: null }) ===
      JSON.stringify({ ...nextQueue, generatedAt: null, sourceSnapshotGeneratedAt: null })
      ? DiscoveryPromotionQueueSchema.parse(JSON.parse(previousJson))
      : nextQueue;

  await mkdir(discoveryDir, { recursive: true });
  const nextJson = JSON.stringify(stableQueue, null, 2);
  const nextMarkdown = renderMarkdown(selectedDomain, discoverySnapshot, stableQueue);
  const previousMarkdown = await readOptionalFile(queueMarkdownPath);

  if (previousJson !== nextJson) {
    await writeFile(queueJsonPath, nextJson, "utf8");
  }
  if (previousMarkdown !== nextMarkdown) {
    await writeFile(queueMarkdownPath, nextMarkdown, "utf8");
  }

  console.log(
    JSON.stringify(
      {
        domain: selectedDomain,
        candidateCount: stableQueue.candidateCount,
        trackedCount: stableQueue.trackedCount,
        novelCandidateCount: stableQueue.novelCandidateCount,
        pendingCount: stableQueue.decisions.filter((decision) => decision.decision === "pending").length
      },
      null,
      2
    )
  );
}

main(domain).catch((error) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
});
