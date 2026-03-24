import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildPromotionReviewItem, buildTrackedKeys } from "../packages/discovery/src/review.js";
import {
  DiscoveryPromotionQueueSchema,
  DiscoveryPromotionReviewPacketSchema,
  DiscoverySnapshotSchema,
  DomainIdSchema,
  DomainSnapshotSchema,
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

function renderMarkdown(selectedDomain: DomainId, packet: ReturnType<typeof DiscoveryPromotionReviewPacketSchema.parse>): string {
  const lines: string[] = [];
  lines.push(`# ${selectedDomain} discovery promotion review packet`);
  lines.push("");
  lines.push(`- source snapshot: ${packet.sourceSnapshotGeneratedAt}`);
  lines.push(`- queue snapshot: ${packet.queueGeneratedAt}`);
  lines.push(`- total queue candidates: ${packet.candidateCount}`);
  lines.push(`- review items: ${packet.reviewItemCount}`);
  lines.push("");
  lines.push("## Review items");

  if (packet.items.length === 0) {
    lines.push("- none");
    lines.push("");
    return lines.join("\n");
  }

  for (const item of packet.items) {
    lines.push(`- ${item.title} | recommendation=${item.recommendation} | decision=${item.decision}`);
    lines.push(
      `  ranking=${item.rankingScore} relevance=${item.relevanceScore} authority=${item.authorityScore} diversity=${item.sourceDiversityScore}`
    );
    lines.push(`  sources=${item.sourceTypes.join(", ")} | sourceCount=${item.sourceCount}`);
    lines.push(`  noveltyBasis=${item.noveltyBasis.join(" || ")}`);
    lines.push(`  recommendationReasons=${item.recommendationReasons.join(" || ")}`);
    lines.push(`  promotionRisks=${item.promotionRisks.join(" || ") || "none"}`);
    lines.push(`  reviewChecklist=${item.reviewChecklist.join(" || ")}`);
    if (item.doi) {
      lines.push(`  doi=${item.doi}`);
    } else if (item.pmid) {
      lines.push(`  pmid=${item.pmid}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

async function main(selectedDomain: DomainId): Promise<void> {
  const discoveryDir = join(process.cwd(), "data", "discovery", selectedDomain);
  const processedDir = join(process.cwd(), "data", "processed", selectedDomain);
  const packetJsonPath = join(discoveryDir, "promotion-review-packet.json");
  const packetMarkdownPath = join(discoveryDir, "promotion-review-packet.md");

  const discoverySnapshot = DiscoverySnapshotSchema.parse(
    JSON.parse(await readFile(join(discoveryDir, "discovery-snapshot.json"), "utf8"))
  );
  const promotionQueue = DiscoveryPromotionQueueSchema.parse(
    JSON.parse(await readFile(join(discoveryDir, "promotion-queue.json"), "utf8"))
  );
  const domainSnapshot = DomainSnapshotSchema.parse(
    JSON.parse(await readFile(join(processedDir, "domain-snapshot.json"), "utf8"))
  );
  const trackedKeys = buildTrackedKeys(domainSnapshot);
  const papersByKey = new Map(discoverySnapshot.papers.map((paper) => [paper.dedupeKey, paper]));

  const items = promotionQueue.decisions
    .filter((decision) => decision.recommendation !== "defer" || decision.decision === "promote")
    .map((decision) => {
      const paper = papersByKey.get(decision.dedupeKey);
      if (!paper) {
        throw new Error(`Missing discovery paper for queue decision ${decision.dedupeKey}`);
      }
      return buildPromotionReviewItem(paper, decision, trackedKeys);
    });

  const nextPacket = DiscoveryPromotionReviewPacketSchema.parse({
    generatedAt: new Date().toISOString(),
    domain: selectedDomain,
    sourceSnapshotGeneratedAt: discoverySnapshot.generatedAt,
    queueGeneratedAt: promotionQueue.generatedAt,
    candidateCount: promotionQueue.candidateCount,
    reviewItemCount: items.length,
    items
  });

  const previousJson = await readOptionalFile(packetJsonPath);
  const previousMarkdown = await readOptionalFile(packetMarkdownPath);
  const stablePacket =
    previousJson &&
    JSON.stringify({ ...JSON.parse(previousJson), generatedAt: null, sourceSnapshotGeneratedAt: null, queueGeneratedAt: null }) ===
      JSON.stringify({ ...nextPacket, generatedAt: null, sourceSnapshotGeneratedAt: null, queueGeneratedAt: null })
      ? DiscoveryPromotionReviewPacketSchema.parse(JSON.parse(previousJson))
      : nextPacket;

  await mkdir(discoveryDir, { recursive: true });
  const nextJson = JSON.stringify(stablePacket, null, 2);
  const nextMarkdown = renderMarkdown(selectedDomain, stablePacket);

  if (previousJson !== nextJson) {
    await writeFile(packetJsonPath, nextJson, "utf8");
  }
  if (previousMarkdown !== nextMarkdown) {
    await writeFile(packetMarkdownPath, nextMarkdown, "utf8");
  }

  console.log(
    JSON.stringify(
      {
        domain: selectedDomain,
        candidateCount: stablePacket.candidateCount,
        reviewItemCount: stablePacket.reviewItemCount
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
