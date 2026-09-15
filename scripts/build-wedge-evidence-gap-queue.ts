import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseDomainArg } from "../packages/shared/src/domains/index.js";
import {
  ActiveWedgeSchema,
  ExperimentPacketFileSchema,
  ExtractionSnapshotSchema,
  SourceEnrichmentFileSchema,
  WedgeDecisionContradictionReportSchema,
  WedgeEvidenceGapQueueSchema,
  type DomainId
} from "../packages/shared/src/schema.js";
import {
  buildWedgeEvidenceGapQueue,
  renderWedgeEvidenceGapQueueMarkdown
} from "../packages/research/src/evidence-gap-queue.js";

const domain = parseDomainArg(process.argv[2], "build-wedge-evidence-gap-queue <domain>");

type BenchmarkAnalysis = {
  reviewedDepth: {
    missingOutcomes?: Array<{
      paperId: string;
      title: string;
      evidenceStatus: "extractor-gap" | "ambiguous-evidence" | "evidence-thin";
    }>;
    missingStepPhases?: Array<{
      paperId: string;
      title: string;
    }>;
  };
};

async function maybeReadSourceEnrichment(path: string) {
  try {
    return SourceEnrichmentFileSchema.parse(JSON.parse(await readFile(path, "utf8")));
  } catch {
    return undefined;
  }
}

async function maybeReadJson<T>(path: string, parser: { parse: (value: unknown) => T }): Promise<T | undefined> {
  try {
    return parser.parse(JSON.parse(await readFile(path, "utf8")));
  } catch {
    return undefined;
  }
}

async function main(selectedDomain: DomainId): Promise<void> {
  const rootDir = process.cwd();
  const processedDir = join(rootDir, "data", "processed", selectedDomain);
  const curatedDir = join(rootDir, "data", "curated", selectedDomain);

  const snapshot = ExtractionSnapshotSchema.parse(
    JSON.parse(await readFile(join(processedDir, "resolved-extraction-snapshot.json"), "utf8"))
  );
  const activeWedge = ActiveWedgeSchema.parse(
    JSON.parse(await readFile(join(processedDir, "active-wedge.json"), "utf8"))
  );
  const benchmarkAnalysis = JSON.parse(
    await readFile(join(processedDir, "benchmark-analysis.json"), "utf8")
  ) as BenchmarkAnalysis;
  const sourceEnrichment = await maybeReadSourceEnrichment(join(curatedDir, "source-enrichment.json"));
  const contradictionReport = await maybeReadJson(
    join(processedDir, "wedge-contradiction-report.json"),
    WedgeDecisionContradictionReportSchema
  );
  const experimentPackets = await maybeReadJson(
    join(processedDir, "experiment-packets.json"),
    ExperimentPacketFileSchema
  );

  const queue = buildWedgeEvidenceGapQueue({
    snapshot,
    activeWedge,
    benchmarkAnalysis,
    sourceEnrichment,
    contradictionReport,
    experimentPackets
  });

  await mkdir(processedDir, { recursive: true });
  await writeFile(join(processedDir, "wedge-evidence-gap-queue.json"), JSON.stringify(queue, null, 2), "utf8");
  await writeFile(join(processedDir, "wedge-evidence-gap-queue.md"), renderWedgeEvidenceGapQueueMarkdown(queue), "utf8");

  console.log(JSON.stringify(WedgeEvidenceGapQueueSchema.parse(queue), null, 2));
}

main(domain).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
