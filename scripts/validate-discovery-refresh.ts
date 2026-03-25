import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  DiscoveryImportSummarySchema,
  DiscoveryPromotionQueueSchema,
  DiscoveryPromotionReviewPacketSchema,
  DiscoverySnapshotSchema,
  DomainIdSchema,
  type DomainId
} from "../packages/shared/src/schema.js";

function parseArgs(argv: string[]): DomainId[] {
  const domainArg = argv[2] ?? "all";
  return domainArg === "all"
    ? ["ovarian-tissue", "islets"]
    : [DomainIdSchema.parse(domainArg)];
}

async function readJson<T>(path: string, parser: { parse: (value: unknown) => T }): Promise<T> {
  return parser.parse(JSON.parse(await readFile(path, "utf8")));
}

function blockingDegradationReasons(reasons: string[]): string[] {
  return reasons.filter((reason) => !reason.startsWith("live-provider-truncation:"));
}

async function validateDomain(domain: DomainId): Promise<void> {
  const discoveryDir = join(process.cwd(), "data", "discovery", domain);
  const importSummary = await readJson(join(discoveryDir, "import-summary.json"), DiscoveryImportSummarySchema);
  const snapshot = await readJson(join(discoveryDir, "discovery-snapshot.json"), DiscoverySnapshotSchema);
  const queue = await readJson(join(discoveryDir, "promotion-queue.json"), DiscoveryPromotionQueueSchema);
  const packet = await readJson(join(discoveryDir, "promotion-review-packet.json"), DiscoveryPromotionReviewPacketSchema);

  const failures: string[] = [];
  const warnings: string[] = [];
  if (importSummary.isDegraded) {
    const blockingReasons = blockingDegradationReasons(importSummary.degradationReasons);
    if (blockingReasons.length > 0) {
      failures.push(`import-summary degraded: ${blockingReasons.join(", ") || "unknown"}`);
    }
  }
  if (snapshot.isDegraded) {
    const blockingReasons = blockingDegradationReasons(snapshot.degradationReasons);
    if (blockingReasons.length > 0) {
      failures.push(`discovery-snapshot degraded: ${blockingReasons.join(", ") || "unknown"}`);
    }
    const truncationReasons = snapshot.degradationReasons.filter((reason) => reason.startsWith("live-provider-truncation:"));
    if (truncationReasons.length > 0) {
      warnings.push(`discovery-snapshot truncated: ${truncationReasons.join(", ")}`);
    }
  }
  if (queue.isDegraded) {
    const blockingReasons = blockingDegradationReasons(queue.degradationReasons);
    if (blockingReasons.length > 0) {
      failures.push(`promotion-queue degraded: ${blockingReasons.join(", ") || "unknown"}`);
    }
    const truncationReasons = queue.degradationReasons.filter((reason) => reason.startsWith("live-provider-truncation:"));
    if (truncationReasons.length > 0) {
      warnings.push(`promotion-queue truncated: ${truncationReasons.join(", ")}`);
    }
  }
  if (packet.isDegraded) {
    const blockingReasons = blockingDegradationReasons(packet.degradationReasons);
    if (blockingReasons.length > 0) {
      failures.push(`promotion-review-packet degraded: ${blockingReasons.join(", ") || "unknown"}`);
    }
    const truncationReasons = packet.degradationReasons.filter((reason) => reason.startsWith("live-provider-truncation:"));
    if (truncationReasons.length > 0) {
      warnings.push(`promotion-review-packet truncated: ${truncationReasons.join(", ")}`);
    }
  }
  if (queue.sourceSnapshotGeneratedAt !== snapshot.generatedAt) {
    failures.push("promotion-queue sourceSnapshotGeneratedAt does not match discovery-snapshot generatedAt");
  }
  if (packet.sourceSnapshotGeneratedAt !== snapshot.generatedAt) {
    failures.push("promotion-review-packet sourceSnapshotGeneratedAt does not match discovery-snapshot generatedAt");
  }
  if (packet.queueGeneratedAt !== queue.generatedAt) {
    failures.push("promotion-review-packet queueGeneratedAt does not match promotion-queue generatedAt");
  }
  if (packet.reviewItemCount !== packet.items.length) {
    failures.push("promotion-review-packet reviewItemCount does not match items length");
  }
  const queueByDedupeKey = new Map(queue.decisions.map((decision) => [decision.dedupeKey, decision]));
  for (const item of packet.items) {
    const decision = queueByDedupeKey.get(item.dedupeKey);
    if (!decision) {
      failures.push(`review packet item missing queue decision: ${item.dedupeKey}`);
      continue;
    }
    if (decision.recommendation === "defer") {
      failures.push(`review packet included deferred candidate: ${item.dedupeKey}`);
    }
    if (decision.recommendation !== item.recommendation) {
      failures.push(`review packet recommendation mismatch for ${item.dedupeKey}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`${domain} discovery refresh validation failed:\n- ${failures.join("\n- ")}`);
  }

  if (warnings.length > 0) {
    console.warn(JSON.stringify({ domain, warnings: Array.from(new Set(warnings)) }, null, 2));
  }
}

async function main(): Promise<void> {
  const domains = parseArgs(process.argv);
  for (const domain of domains) {
    await validateDomain(domain);
  }
  console.log(JSON.stringify({ domains, valid: true }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
});
