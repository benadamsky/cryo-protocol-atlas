import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { selectReviewedEnrichmentRecord } from "../packages/extract/src/enrichment.js";
import { extractProtocol } from "../packages/extract/src/protocol.js";
import { parseDomainArg } from "../packages/shared/src/domains/index.js";
import {
  DomainSnapshotSchema,
  ExtractionSnapshotSchema,
  SourceEnrichmentFileSchema,
  type DomainId
} from "../packages/shared/src/schema.js";

const domain = parseDomainArg(process.argv[2], "extract-domain <domain>");

async function main(selectedDomain: DomainId): Promise<void> {
  const processedDir = join(process.cwd(), "data", "processed", selectedDomain);
  const curatedDir = join(process.cwd(), "data", "curated", selectedDomain);
  const snapshotPath = join(processedDir, "domain-snapshot.json");
  const snapshotFile = await readFile(snapshotPath, "utf8");
  const domainSnapshot = DomainSnapshotSchema.parse(JSON.parse(snapshotFile));
  let sourceEnrichment:
    | ReturnType<typeof SourceEnrichmentFileSchema.parse>
    | undefined;

  try {
    sourceEnrichment = SourceEnrichmentFileSchema.parse(
      JSON.parse(await readFile(join(curatedDir, "source-enrichment.json"), "utf8"))
    );
  } catch {
    sourceEnrichment = undefined;
  }

  const extractions = domainSnapshot.papers.map((paper) =>
    extractProtocol(selectedDomain, paper, selectReviewedEnrichmentRecord(sourceEnrichment, paper.paper))
  );
  const protocolFamilyCounts = extractions.reduce<Record<string, number>>((counts, extraction) => {
    counts[extraction.protocolFamily] = (counts[extraction.protocolFamily] ?? 0) + 1;
    return counts;
  }, {});

  const extractionSnapshot = ExtractionSnapshotSchema.parse({
    generatedAt: new Date().toISOString(),
    domain: selectedDomain,
    totalPapers: extractions.length,
    protocolFamilyCounts,
    extractions
  });

  await mkdir(processedDir, { recursive: true });
  await writeFile(
    join(processedDir, "extraction-snapshot.json"),
    JSON.stringify(extractionSnapshot, null, 2),
    "utf8"
  );

  const summary = {
    domain: selectedDomain,
    totalPapers: extractionSnapshot.totalPapers,
    protocolFamilyCounts: extractionSnapshot.protocolFamilyCounts,
    topHighConfidenceTitles: extractionSnapshot.extractions
      .slice()
      .sort((a, b) => b.extractionConfidence - a.extractionConfidence)
      .slice(0, 5)
      .map((entry) => ({
        title: entry.paper.title,
        protocolFamily: entry.protocolFamily,
        extractionConfidence: entry.extractionConfidence,
        chemicals: entry.chemicalMentions.map((chemical) => chemical.canonicalName)
      }))
  };

  await writeFile(join(processedDir, "extraction-summary.json"), JSON.stringify(summary, null, 2), "utf8");

  console.log(JSON.stringify(summary, null, 2));
}

main(domain).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
