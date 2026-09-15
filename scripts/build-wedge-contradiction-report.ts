import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseDomainArg } from "../packages/shared/src/domains/index.js";
import {
  ActiveWedgeSchema,
  ContradictionSnapshotSchema,
  ExtractionSnapshotSchema,
  WedgeDecisionContradictionReportSchema,
  type DomainId
} from "../packages/shared/src/schema.js";
import {
  buildWedgeDecisionContradictionReport,
  renderWedgeDecisionContradictionReportMarkdown
} from "../packages/research/src/contradiction-report.js";
import { detectContradictions } from "../packages/research/src/contradictions.js";

const domain = parseDomainArg(process.argv[2], "build-wedge-contradiction-report <domain>");

async function maybeReadContradictionSnapshot(path: string, selectedDomain: DomainId) {
  try {
    return ContradictionSnapshotSchema.parse(JSON.parse(await readFile(path, "utf8")));
  } catch {
    return {
      generatedAt: new Date().toISOString(),
      domain: selectedDomain,
      contradictions: []
    };
  }
}

async function main(selectedDomain: DomainId): Promise<void> {
  const processedDir = join(process.cwd(), "data", "processed", selectedDomain);
  const snapshot = ExtractionSnapshotSchema.parse(
    JSON.parse(await readFile(join(processedDir, "resolved-extraction-snapshot.json"), "utf8"))
  );
  const activeWedge = ActiveWedgeSchema.parse(
    JSON.parse(await readFile(join(processedDir, "active-wedge.json"), "utf8"))
  );
  const contradictionSnapshot = await maybeReadContradictionSnapshot(
    join(processedDir, "contradictions.json"),
    selectedDomain
  );

  const report = buildWedgeDecisionContradictionReport({
    snapshot,
    activeWedge,
    contradictions:
      contradictionSnapshot.contradictions.length > 0
        ? contradictionSnapshot.contradictions
        : detectContradictions(snapshot)
  });

  await mkdir(processedDir, { recursive: true });
  await writeFile(join(processedDir, "wedge-contradiction-report.json"), JSON.stringify(report, null, 2), "utf8");
  await writeFile(
    join(processedDir, "wedge-contradiction-report.md"),
    renderWedgeDecisionContradictionReportMarkdown(report),
    "utf8"
  );

  console.log(JSON.stringify(WedgeDecisionContradictionReportSchema.parse(report), null, 2));
}

main(domain).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
