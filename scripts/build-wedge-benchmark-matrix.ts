import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseDomainArg } from "../packages/shared/src/domains/index.js";
import {
  ActiveWedgeSchema,
  ExtractionSnapshotSchema,
  SourceEnrichmentFileSchema,
  WedgeBenchmarkMatrixSchema,
  type DomainId
} from "../packages/shared/src/schema.js";
import {
  buildWedgeBenchmarkMatrix,
  renderWedgeBenchmarkMatrixMarkdown
} from "../packages/research/src/wedge-benchmark-matrix.js";

const domain = parseDomainArg(process.argv[2], "build-wedge-benchmark-matrix <domain>");

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
  const activeWedge = ActiveWedgeSchema.parse(
    JSON.parse(await readFile(join(processedDir, "active-wedge.json"), "utf8"))
  );
  const sourceEnrichment = await maybeReadSourceEnrichment(join(curatedDir, "source-enrichment.json"));

  const matrix = buildWedgeBenchmarkMatrix({
    snapshot,
    activeWedge,
    sourceEnrichment
  });

  await mkdir(processedDir, { recursive: true });
  await writeFile(join(processedDir, "wedge-benchmark-matrix.json"), JSON.stringify(matrix, null, 2), "utf8");
  await writeFile(join(processedDir, "wedge-benchmark-matrix.md"), renderWedgeBenchmarkMatrixMarkdown(matrix), "utf8");

  console.log(JSON.stringify(WedgeBenchmarkMatrixSchema.parse(matrix), null, 2));
}

main(domain).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
