import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DomainIdSchema } from "../packages/shared/src/schema.js";
import { buildOpportunityScan, renderOpportunityScanMarkdown, type DomainWedgeBrief } from "../packages/research/src/wedges.js";

const domains = [DomainIdSchema.parse("ovarian-tissue"), DomainIdSchema.parse("islets")];

async function main(): Promise<void> {
  const briefs: DomainWedgeBrief[] = [];

  for (const domain of domains) {
    const briefPath = join(process.cwd(), "data", "processed", domain, "wedge-brief.json");
    const brief = JSON.parse(await readFile(briefPath, "utf8")) as DomainWedgeBrief;
    briefs.push(brief);
  }

  const scan = buildOpportunityScan(briefs);
  const processedDir = join(process.cwd(), "data", "processed");
  await mkdir(processedDir, { recursive: true });
  await writeFile(join(processedDir, "opportunity-scan.json"), JSON.stringify(scan, null, 2), "utf8");
  await writeFile(join(processedDir, "opportunity-scan.md"), renderOpportunityScanMarkdown(scan), "utf8");

  console.log(
    JSON.stringify(
      {
        domainCount: scan.length,
        topDomain: scan[0]?.domain ?? null
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
