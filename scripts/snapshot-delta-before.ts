import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DomainIdSchema, type DomainId } from "../packages/shared/src/schema.js";

const domain = DomainIdSchema.parse(process.argv[2] ?? "islets");

async function readOptionalFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

async function main(selectedDomain: DomainId): Promise<void> {
  const rootDir = process.cwd();
  const processedDir = join(rootDir, "data", "processed", selectedDomain);
  const curatedDir = join(rootDir, "data", "curated", selectedDomain);
  const loopDir = join(rootDir, "data", "autoresearch", selectedDomain);

  const [activeWedge, evidenceGapQueue, experimentPackets, enrichment] = await Promise.all([
    readOptionalFile(join(processedDir, "active-wedge.json")),
    readOptionalFile(join(processedDir, "wedge-evidence-gap-queue.json")),
    readOptionalFile(join(processedDir, "experiment-packets.json")),
    readOptionalFile(join(curatedDir, "source-enrichment.json"))
  ]);

  const snapshot = {
    activeWedge: activeWedge ? JSON.parse(activeWedge) : null,
    evidenceGapQueue: evidenceGapQueue ? JSON.parse(evidenceGapQueue) : null,
    experimentPackets: experimentPackets ? JSON.parse(experimentPackets) : null,
    enrichment: enrichment ? JSON.parse(enrichment) : null
  };

  await mkdir(loopDir, { recursive: true });
  await writeFile(
    join(loopDir, "delta-snapshot-before.json"),
    JSON.stringify(snapshot, null, 2),
    "utf8"
  );

  console.log(`Delta snapshot saved for ${selectedDomain}.`);
}

main(domain).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
