import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ExtractionSnapshotSchema, SourceEnrichmentFileSchema } from "../packages/shared/src/schema.js";
import {
  buildIsletBenchmarkMatrix,
  renderIsletBenchmarkMatrixMarkdown
} from "../packages/research/src/islet-benchmark-matrix.js";

async function main(): Promise<void> {
  const processedDir = join(process.cwd(), "data", "processed", "islets");
  const curatedDir = join(process.cwd(), "data", "curated", "islets");

  const snapshot = ExtractionSnapshotSchema.parse(
    JSON.parse(await readFile(join(processedDir, "extraction-snapshot.json"), "utf8"))
  );
  const sourceEnrichment = SourceEnrichmentFileSchema.parse(
    JSON.parse(await readFile(join(curatedDir, "source-enrichment.json"), "utf8"))
  );
  const benchmarkAnalysis = JSON.parse(
    await readFile(join(processedDir, "benchmark-analysis.json"), "utf8")
  );

  const matrix = buildIsletBenchmarkMatrix({
    snapshot,
    sourceEnrichment,
    benchmarkAnalysis
  });

  await mkdir(processedDir, { recursive: true });
  await writeFile(join(processedDir, "benchmark-matrix.json"), JSON.stringify(matrix, null, 2), "utf8");
  await writeFile(join(processedDir, "benchmark-matrix.md"), renderIsletBenchmarkMatrixMarkdown(matrix), "utf8");

  console.log(
    JSON.stringify(
      {
        rowCount: matrix.rows.length,
        strongestTranslationalRows: matrix.summary.strongestTranslationalRows.length,
        unresolvedTranslationalRows: matrix.unresolvedWatchlist.length,
        currentRead: matrix.summary.currentRead
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
