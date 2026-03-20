import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { extractOvarianProtocol } from "../packages/extract/src/ovarian.js";
import {
  DomainIdSchema,
  DomainSnapshotSchema,
  ExtractionSnapshotSchema,
  type DomainId
} from "../packages/shared/src/schema.js";

const domain = DomainIdSchema.parse(process.argv[2] ?? "ovarian-tissue");

async function main(selectedDomain: DomainId): Promise<void> {
  if (selectedDomain !== "ovarian-tissue") {
    throw new Error(`No extractor implemented yet for domain: ${selectedDomain}`);
  }

  const processedDir = join(process.cwd(), "data", "processed", selectedDomain);
  const snapshotPath = join(processedDir, "domain-snapshot.json");
  const snapshotFile = await readFile(snapshotPath, "utf8");
  const domainSnapshot = DomainSnapshotSchema.parse(JSON.parse(snapshotFile));

  const extractions = domainSnapshot.papers.map((paper) => extractOvarianProtocol(paper));
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
