import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { listAvailableProperties, listPapers } from "../packages/ingest/src/cryodb.js";
import { scorePaperForDomain } from "../packages/ingest/src/domain.js";
import { DomainIdSchema, DomainSnapshotSchema, type DomainId, type DomainPaper } from "../packages/shared/src/schema.js";

const domain = DomainIdSchema.parse(process.argv[2] ?? "ovarian-tissue");
const perPage = 100;
const maxPages = 5;

async function main(selectedDomain: DomainId): Promise<void> {
  const rawDir = join(process.cwd(), "data", "raw", selectedDomain);
  const processedDir = join(process.cwd(), "data", "processed", selectedDomain);

  await mkdir(rawDir, { recursive: true });
  await mkdir(processedDir, { recursive: true });

  const matchedPapers: DomainPaper[] = [];
  let totalFetched = 0;

  for (let page = 1; page <= maxPages; page += 1) {
    const response = await listPapers(page, perPage);
    totalFetched += response.papers.length;

    await writeFile(
      join(rawDir, `papers-page-${page}.json`),
      JSON.stringify(response, null, 2),
      "utf8"
    );

    for (const paper of response.papers) {
      const scored = scorePaperForDomain(paper, selectedDomain);
      if (scored) {
        matchedPapers.push(scored);
      }
    }

    if (response.papers.length < perPage) {
      break;
    }
  }

  matchedPapers.sort((a, b) => b.score - a.score || a.paper.title.localeCompare(b.paper.title));

  const snapshot = DomainSnapshotSchema.parse({
    generatedAt: new Date().toISOString(),
    domain: selectedDomain,
    totalFetched,
    totalMatched: matchedPapers.length,
    papers: matchedPapers
  });

  await writeFile(join(processedDir, "domain-snapshot.json"), JSON.stringify(snapshot, null, 2), "utf8");

  const properties = await listAvailableProperties();
  await writeFile(join(rawDir, "available-properties.json"), JSON.stringify(properties, null, 2), "utf8");

  console.log(JSON.stringify({
    domain: selectedDomain,
    totalFetched,
    totalMatched: matchedPapers.length,
    topTitles: matchedPapers.slice(0, 5).map((entry) => entry.paper.title)
  }, null, 2));
}

main(domain).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
