import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseDomainArg } from "../packages/shared/src/domains/index.js";
import {
  ActiveWedgeSchema,
  ExtractionSnapshotSchema,
  SourceEnrichmentFileSchema,
  type DomainId
} from "../packages/shared/src/schema.js";
import type { AtlasSummary } from "../packages/research/src/atlas.js";
import { buildActiveWedge, renderActiveWedgeMarkdown } from "../packages/research/src/active-wedge.js";

const domain = parseDomainArg(process.argv[2], "build-active-wedge <domain>");

type BenchmarkAnalysis = {
  resolved: {
    summary: {
      reviewedOutcomeCoverage: number;
      reviewedStepPhaseCoverage: number;
    };
  };
};

async function maybeReadSourceEnrichment(path: string) {
  try {
    return SourceEnrichmentFileSchema.parse(JSON.parse(await readFile(path, "utf8")));
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
  const atlas = JSON.parse(await readFile(join(processedDir, "atlas-summary.json"), "utf8")) as AtlasSummary;
  const benchmarkAnalysis = JSON.parse(
    await readFile(join(processedDir, "benchmark-analysis.json"), "utf8")
  ) as BenchmarkAnalysis;
  const sourceEnrichment = await maybeReadSourceEnrichment(join(curatedDir, "source-enrichment.json"));

  const activeWedge = buildActiveWedge({
    snapshot,
    atlas,
    benchmarkAnalysis,
    sourceEnrichment
  });

  if (!activeWedge) {
    throw new Error(`No active wedge could be selected for ${selectedDomain}.`);
  }

  await mkdir(processedDir, { recursive: true });
  await writeFile(join(processedDir, "active-wedge.json"), JSON.stringify(activeWedge, null, 2), "utf8");
  await writeFile(join(processedDir, "active-wedge.md"), renderActiveWedgeMarkdown(activeWedge), "utf8");

  console.log(JSON.stringify(ActiveWedgeSchema.parse(activeWedge), null, 2));
}

main(domain).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
