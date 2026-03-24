import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildTrackedKeys, recommendationForPaper } from "../packages/discovery/src/review.js";
import {
  DiscoveryPromotionDecisionStatusSchema,
  DiscoveryPromotionQueueSchema,
  DiscoverySnapshotSchema,
  DomainIdSchema,
  DomainSnapshotSchema,
  type DiscoveryPaper,
  type DiscoveryPromotionQueue,
  type DomainId
} from "../packages/shared/src/schema.js";

const domain = DomainIdSchema.parse(process.argv[2] ?? "ovarian-tissue");

async function readOptionalFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

function normalizeTitle(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function renderMarkdown(
  domainId: DomainId,
  discoverySnapshot: ReturnType<typeof DiscoverySnapshotSchema.parse>,
  queue: DiscoveryPromotionQueue
): string {
  const lines: string[] = [];
  lines.push(`# ${domainId} discovery promotion queue`);
  lines.push("");
  lines.push(`- source snapshot: ${queue.sourceSnapshotGeneratedAt}`);
  lines.push(`- total discovery candidates: ${queue.candidateCount}`);
  lines.push(`- already tracked in current slice: ${queue.trackedCount}`);
  lines.push(`- novel candidates requiring review: ${queue.novelCandidateCount}`);
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
      lines.push(`  sources=${decision.sourceTypes.join(", ")} | sourceCount=${decision.sourceCount}`);
      lines.push(
        `  relevance=${decision.relevanceScore} authority=${decision.authorityScore} diversity=${decision.sourceDiversityScore}`
      );
      lines.push(`  reasons=${decision.recommendationReasons.join(" || ")}`);
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
    lines.push(
      `- ${summary.source}: fetched=${summary.fetchedCount} accepted=${summary.acceptedCount}${summary.failed ? ` error=${summary.error}` : ""}`
    );
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
    const tracked =
      trackedKeys.has(paper.dedupeKey) ||
      (paper.doi ? trackedKeys.has(`doi:${paper.doi.toLowerCase()}`) : false) ||
      trackedKeys.has(`title:${normalizeTitle(paper.title)}`);
    if (tracked) {
      trackedCount += 1;
      continue;
    }
    novelCandidates.push(paper);
  }

  let existingQueue: DiscoveryPromotionQueue | null = null;
  try {
    existingQueue = DiscoveryPromotionQueueSchema.parse(JSON.parse(await readFile(queueJsonPath, "utf8")));
  } catch {
    existingQueue = null;
  }

  const existingByKey = new Map(existingQueue?.decisions.map((decision) => [decision.dedupeKey, decision]) ?? []);
  const nextQueue = DiscoveryPromotionQueueSchema.parse({
    generatedAt: new Date().toISOString(),
    domain: selectedDomain,
    sourceSnapshotGeneratedAt: discoverySnapshot.generatedAt,
    candidateCount: discoverySnapshot.totalCandidates,
    trackedCount,
    novelCandidateCount: novelCandidates.length,
    decisions: novelCandidates.map((paper) => {
      const existing = existingByKey.get(paper.dedupeKey);
      const recommendation = recommendationForPaper(paper);
      return {
        dedupeKey: paper.dedupeKey,
        title: paper.title,
        doi: paper.doi ?? null,
        pmid: paper.pmid ?? null,
        decision: existing?.decision ?? "pending",
        recommendation: recommendation.recommendation,
        recommendationReasons: recommendation.reasons,
        rankingScore: paper.rankingScore,
        relevanceScore: paper.relevanceScore,
        authorityScore: paper.authorityScore,
        sourceDiversityScore: paper.sourceDiversityScore,
        sourceCount: paper.sourceCount,
        sourceTypes: paper.sourceTypes,
        fullTextAvailability: paper.fullTextAvailability,
        matchedKeywords: paper.matchedKeywords,
        ...(existing?.reviewerNotes ? { reviewerNotes: existing.reviewerNotes } : {}),
        ...(existing?.decidedAt ? { decidedAt: existing.decidedAt } : {})
      };
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
  console.error(error);
  process.exitCode = 1;
});
