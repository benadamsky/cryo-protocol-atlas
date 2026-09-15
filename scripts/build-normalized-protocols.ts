import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildNormalizedProtocolSnapshot, renderNormalizedProtocolReport } from "../packages/normalize/src/canonical-protocols.js";
import { parseDomainArg } from "../packages/shared/src/domains/index.js";
import {
  ExtractionSnapshotSchema,
  type DomainId
} from "../packages/shared/src/schema.js";

const domain = parseDomainArg(process.argv[2], "build-normalized-protocols <domain>");

async function main(selectedDomain: DomainId): Promise<void> {
  const processedDir = join(process.cwd(), "data", "processed", selectedDomain);
  const resolvedSnapshot = ExtractionSnapshotSchema.parse(
    JSON.parse(await readFile(join(processedDir, "resolved-extraction-snapshot.json"), "utf8"))
  );
  const normalizedSnapshot = buildNormalizedProtocolSnapshot(resolvedSnapshot);
  const report = renderNormalizedProtocolReport(normalizedSnapshot);

  await mkdir(processedDir, { recursive: true });
  await writeFile(
    join(processedDir, "normalized-protocols.json"),
    JSON.stringify(normalizedSnapshot, null, 2),
    "utf8"
  );
  await writeFile(join(processedDir, "normalized-protocol-report.md"), report, "utf8");

  console.log(
    JSON.stringify(
      {
        domain: selectedDomain,
        totalProtocols: normalizedSnapshot.totalProtocols,
        protocolsWithWarnings: normalizedSnapshot.protocols.filter(
          (protocol) => protocol.normalizationWarnings.length > 0
        ).length
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
