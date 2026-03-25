import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  ActiveWedgeSchema,
  DomainIdSchema,
  ExperimentPacketFileSchema,
  type DomainId
} from "../packages/shared/src/schema.js";
import type { AtlasSummary } from "../packages/research/src/atlas.js";
import {
  buildExperimentPacketFile,
  renderExperimentPacketFileMarkdown
} from "../packages/research/src/experiment-packets.js";

const domain = DomainIdSchema.parse(process.argv[2] ?? "islets");

async function main(selectedDomain: DomainId): Promise<void> {
  const processedDir = join(process.cwd(), "data", "processed", selectedDomain);
  const activeWedge = ActiveWedgeSchema.parse(
    JSON.parse(await readFile(join(processedDir, "active-wedge.json"), "utf8"))
  );
  const atlas = JSON.parse(await readFile(join(processedDir, "atlas-summary.json"), "utf8")) as AtlasSummary;

  const packetFile = buildExperimentPacketFile({
    domain: selectedDomain,
    activeWedge,
    atlas
  });

  await mkdir(processedDir, { recursive: true });
  await writeFile(join(processedDir, "experiment-packets.json"), JSON.stringify(packetFile, null, 2), "utf8");
  await writeFile(join(processedDir, "experiment-packets.md"), renderExperimentPacketFileMarkdown(packetFile), "utf8");

  console.log(JSON.stringify(ExperimentPacketFileSchema.parse(packetFile), null, 2));
}

main(domain).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
