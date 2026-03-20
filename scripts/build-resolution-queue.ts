import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  DomainIdSchema,
  ExtractionSnapshotSchema,
  type DomainId,
  type ProtocolExtraction,
  type ProtocolOverrideFile
} from "../packages/shared/src/schema.js";
import { applyProtocolOverrides, parseOverrideFile } from "../packages/normalize/src/overrides.js";

const domain = DomainIdSchema.parse(process.argv[2] ?? "ovarian-tissue");

type ResolutionReason =
  | "unknown-protocol-family"
  | "unknown-paper-type"
  | "low-confidence"
  | "experimental-unknown-family";

type ResolutionQueueEntry = ReturnType<typeof summarizeExtraction>;

function getResolutionReasons(extraction: ProtocolExtraction): ResolutionReason[] {
  const reasons: ResolutionReason[] = [];
  if (extraction.protocolFamily === "unknown") {
    reasons.push("unknown-protocol-family");
  }
  if (extraction.paperType === "unknown") {
    reasons.push("unknown-paper-type");
  }
  if (extraction.extractionConfidence < 0.7) {
    reasons.push("low-confidence");
  }
  if (extraction.paperType === "experimental" && extraction.protocolFamily === "unknown") {
    reasons.push("experimental-unknown-family");
  }
  return reasons;
}

function needsResolution(extraction: ProtocolExtraction): boolean {
  return getResolutionReasons(extraction).length > 0;
}

function buildSourceUrl(extraction: ProtocolExtraction): string | null {
  const doi = extraction.paper.doi?.trim();
  return doi ? `https://doi.org/${doi}` : null;
}

function getPriorityScore(extraction: ProtocolExtraction, reasons: ResolutionReason[]): number {
  let score = 0;
  if (reasons.includes("experimental-unknown-family")) {
    score += 6;
  }
  if (reasons.includes("unknown-protocol-family")) {
    score += 4;
  }
  if (reasons.includes("unknown-paper-type")) {
    score += 2;
  }
  if (reasons.includes("low-confidence")) {
    score += 2;
  }
  if (extraction.specimenTypes.includes("ovarian tissue")) {
    score += 2;
  }
  if (extraction.specimenTypes.includes("whole ovary")) {
    score += 1;
  }
  if (extraction.chemicalMentions.length > 0) {
    score += 1;
  }
  score += Math.round((1 - extraction.extractionConfidence) * 10) / 10;
  return Number(score.toFixed(1));
}

function summarizeExtraction(extraction: ProtocolExtraction) {
  const reasons = getResolutionReasons(extraction);
  return {
    paperId: extraction.paper.id,
    title: extraction.paper.title,
    doi: extraction.paper.doi,
    sourceUrl: buildSourceUrl(extraction),
    paperType: extraction.paperType,
    protocolFamily: extraction.protocolFamily,
    extractionConfidence: extraction.extractionConfidence,
    priorityScore: getPriorityScore(extraction, reasons),
    reasons,
    speciesMentions: extraction.speciesMentions,
    specimenTypes: extraction.specimenTypes,
    chemicals: extraction.chemicalMentions.map((chemical) => chemical.canonicalName),
    topEvidence: extraction.evidenceSnippets.slice(0, 6).map((snippet) => ({
      kind: snippet.kind,
      text: snippet.text
    })),
    suggestedAction:
      extraction.protocolFamily === "unknown"
        ? "Resolve protocol family from full text or mark excluded if off-domain"
        : extraction.paperType === "unknown"
          ? "Classify paper type from full text"
          : "Review low-confidence extraction fields"
  };
}

function compareQueuePriority(a: ResolutionQueueEntry, b: ResolutionQueueEntry): number {
  return (
    b.priorityScore - a.priorityScore ||
    a.extractionConfidence - b.extractionConfidence ||
    a.title.localeCompare(b.title)
  );
}

function renderQueueMarkdown(domainId: DomainId, queue: ResolutionQueueEntry[]): string {
  const lines: string[] = [];
  lines.push(`# ${domainId} resolution queue`);
  lines.push("");
  lines.push(`Total queued papers: ${queue.length}`);
  lines.push("");
  lines.push("## Priority review queue");
  for (const entry of queue) {
    lines.push(
      `- priority=${entry.priorityScore} | family=${entry.protocolFamily} | type=${entry.paperType} | confidence=${entry.extractionConfidence} | ${entry.title}`
    );
    lines.push(`  reasons=${entry.reasons.join(", ")}`);
    if (entry.doi) {
      lines.push(`  doi=${entry.doi}`);
    }
    if (entry.sourceUrl) {
      lines.push(`  source=${entry.sourceUrl}`);
    }
    lines.push(`  specimen=${entry.specimenTypes.join(", ") || "unspecified"}`);
    lines.push(`  species=${entry.speciesMentions.join(", ") || "unspecified"}`);
    lines.push(`  chemicals=${entry.chemicals.join(", ") || "none"}`);
    lines.push(`  action=${entry.suggestedAction}`);
    for (const evidence of entry.topEvidence.slice(0, 3)) {
      lines.push(`  evidence[${evidence.kind}]=${evidence.text}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

async function main(selectedDomain: DomainId): Promise<void> {
  const processedDir = join(process.cwd(), "data", "processed", selectedDomain);
  const curatedDir = join(process.cwd(), "data", "curated", selectedDomain);
  const extractionPath = join(processedDir, "extraction-snapshot.json");
  const extractionFile = await readFile(extractionPath, "utf8");
  const extractionSnapshot = ExtractionSnapshotSchema.parse(JSON.parse(extractionFile));
  let resolvedSnapshot = extractionSnapshot;

  await mkdir(curatedDir, { recursive: true });

  const overridePath = join(curatedDir, "protocol-overrides.json");
  try {
    const overrideFile = await readFile(overridePath, "utf8");
    resolvedSnapshot = applyProtocolOverrides(extractionSnapshot, parseOverrideFile(JSON.parse(overrideFile)));
  } catch {
    resolvedSnapshot = extractionSnapshot;
  }

  const queue = resolvedSnapshot.extractions
    .filter(needsResolution)
    .map(summarizeExtraction)
    .sort(compareQueuePriority);
  await writeFile(join(curatedDir, "resolution-queue.json"), JSON.stringify(queue, null, 2), "utf8");
  await writeFile(join(curatedDir, "resolution-queue.md"), renderQueueMarkdown(selectedDomain, queue), "utf8");

  try {
    await readFile(overridePath, "utf8");
  } catch {
    const emptyOverrideFile: ProtocolOverrideFile = {
      generatedAt: new Date().toISOString(),
      domain: selectedDomain,
      overrides: []
    };
    await writeFile(overridePath, JSON.stringify(emptyOverrideFile, null, 2), "utf8");
  }

  console.log(
    JSON.stringify(
        {
          domain: selectedDomain,
          queueSize: queue.length,
          topPaperIds: queue.slice(0, 5).map((entry) => entry.paperId),
          topTitles: queue.slice(0, 5).map((entry) => entry.title)
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
