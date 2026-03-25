import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  DomainIdSchema,
  WedgeBenchmarkMatrixSchema,
  type DomainId
} from "../packages/shared/src/schema.js";
import type { OpportunityScanEntry } from "../packages/research/src/wedges.js";
import {
  buildDomainCallPacket,
  renderDomainCallPacketMarkdown
} from "../packages/research/src/call-packet.js";

const domain = DomainIdSchema.parse(process.argv[2] ?? "islets");

async function maybeReadOpportunityScanEntry(
  rootDir: string,
  selectedDomain: DomainId
): Promise<OpportunityScanEntry | undefined> {
  try {
    const scan = JSON.parse(await readFile(join(rootDir, "data", "processed", "opportunity-scan.json"), "utf8")) as {
      entries?: OpportunityScanEntry[];
    };
    return scan.entries?.find((entry) => entry.domain === selectedDomain);
  } catch {
    return undefined;
  }
}

async function maybeReadWedgeMatrix(rootDir: string, selectedDomain: DomainId) {
  try {
    return WedgeBenchmarkMatrixSchema.parse(
      JSON.parse(
        await readFile(join(rootDir, "data", "processed", selectedDomain, "wedge-benchmark-matrix.json"), "utf8")
      )
    );
  } catch {
    return undefined;
  }
}

async function main(selectedDomain: DomainId): Promise<void> {
  const rootDir = process.cwd();
  const processedDir = join(rootDir, "data", "processed", selectedDomain);

  const brief = JSON.parse(await readFile(join(processedDir, "wedge-brief.json"), "utf8"));
  const opportunityScanEntry = await maybeReadOpportunityScanEntry(rootDir, selectedDomain);
  const wedgeMatrix = await maybeReadWedgeMatrix(rootDir, selectedDomain);

  const packet = buildDomainCallPacket({
    brief,
    opportunityScanEntry,
    wedgeMatrix
  });

  await mkdir(processedDir, { recursive: true });
  await writeFile(join(processedDir, "call-packet.json"), JSON.stringify(packet, null, 2), "utf8");
  await writeFile(join(processedDir, "call-packet.md"), renderDomainCallPacketMarkdown(packet), "utf8");

  console.log(
    JSON.stringify(
      {
        domain: selectedDomain,
        title: packet.bestWedge.title,
        reviewedOutcomeCoverage: packet.benchmarkSnapshot.reviewedOutcomeCoverage,
        reviewedStepPhaseCoverage: packet.benchmarkSnapshot.reviewedStepPhaseCoverage,
        pendingSourceEnrichments: packet.benchmarkSnapshot.pendingSourceEnrichments
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
