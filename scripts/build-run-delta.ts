import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseDomainArg } from "../packages/shared/src/domains/index.js";
import {
  ActiveWedgeSchema,
  ExperimentPacketFileSchema,
  SourceEnrichmentFileSchema,
  WedgeEvidenceGapQueueSchema,
  type DomainId
} from "../packages/shared/src/schema.js";
import { computeRunDelta, renderRunDeltaMarkdown, type RunDelta } from "../packages/research/src/run-delta.js";

const domain = parseDomainArg(process.argv[2], "build-run-delta <domain>");

const MAX_DELTA_HISTORY = 50;

async function maybeReadJson<T>(path: string, parser: { parse: (value: unknown) => T }): Promise<T | null> {
  try {
    return parser.parse(JSON.parse(await readFile(path, "utf8")));
  } catch {
    return null;
  }
}

async function maybeReadRawJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return null;
  }
}

async function main(selectedDomain: DomainId): Promise<void> {
  const rootDir = process.cwd();
  const processedDir = join(rootDir, "data", "processed", selectedDomain);
  const curatedDir = join(rootDir, "data", "curated", selectedDomain);
  const loopDir = join(rootDir, "data", "autoresearch", selectedDomain);
  const deltaPath = join(loopDir, "run-delta.json");
  const deltaHistoryPath = join(loopDir, "run-delta-history.json");
  const snapshotBeforePath = join(loopDir, "delta-snapshot-before.json");

  // Read the "before" snapshot (saved at start of batch)
  const snapshotBefore = await maybeReadRawJson<{
    activeWedge: unknown;
    evidenceGapQueue: unknown;
    experimentPackets: unknown;
    enrichment: unknown;
  }>(snapshotBeforePath);

  // Parse before state
  const before = {
    activeWedge: snapshotBefore?.activeWedge
      ? ActiveWedgeSchema.safeParse(snapshotBefore.activeWedge).data ?? null
      : null,
    evidenceGapQueue: snapshotBefore?.evidenceGapQueue
      ? WedgeEvidenceGapQueueSchema.safeParse(snapshotBefore.evidenceGapQueue).data ?? null
      : null,
    experimentPackets: snapshotBefore?.experimentPackets
      ? ExperimentPacketFileSchema.safeParse(snapshotBefore.experimentPackets).data ?? null
      : null,
    enrichment: snapshotBefore?.enrichment
      ? SourceEnrichmentFileSchema.safeParse(snapshotBefore.enrichment).data ?? null
      : null
  };

  // Read current (after) state
  const after = {
    activeWedge: await maybeReadJson(join(processedDir, "active-wedge.json"), ActiveWedgeSchema),
    evidenceGapQueue: await maybeReadJson(join(processedDir, "wedge-evidence-gap-queue.json"), WedgeEvidenceGapQueueSchema),
    experimentPackets: await maybeReadJson(join(processedDir, "experiment-packets.json"), ExperimentPacketFileSchema),
    enrichment: await maybeReadJson(join(curatedDir, "source-enrichment.json"), SourceEnrichmentFileSchema)
  };

  const delta = computeRunDelta(selectedDomain, before, after);

  await mkdir(loopDir, { recursive: true });
  await writeFile(deltaPath, JSON.stringify(delta, null, 2), "utf8");

  // Append to history (capped)
  let history: RunDelta[] = await maybeReadRawJson<RunDelta[]>(deltaHistoryPath) ?? [];
  history.push(delta);
  if (history.length > MAX_DELTA_HISTORY) {
    history = history.slice(history.length - MAX_DELTA_HISTORY);
  }
  await writeFile(deltaHistoryPath, JSON.stringify(history, null, 2), "utf8");

  console.log(JSON.stringify(delta, null, 2));
}

main(domain).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
