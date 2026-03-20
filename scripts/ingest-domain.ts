import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { listAvailableProperties, listPapers, mapAdvancedSearchPaper } from "../packages/ingest/src/cryodb.js";
import { scorePaperForDomain } from "../packages/ingest/src/domain.js";
import {
  CryoPaperSchema,
  DomainIdSchema,
  DomainSnapshotSchema,
  type DomainId,
  type DomainPaper
} from "../packages/shared/src/schema.js";

const domain = DomainIdSchema.parse(process.argv[2] ?? "ovarian-tissue");
const perPage = 100;

async function main(selectedDomain: DomainId): Promise<void> {
  const rawDir = join(process.cwd(), "data", "raw", selectedDomain);
  const processedDir = join(process.cwd(), "data", "processed", selectedDomain);

  await mkdir(rawDir, { recursive: true });
  await mkdir(processedDir, { recursive: true });

  const matchedPapers: DomainPaper[] = [];
  let totalFetched = 0;
  let totalPages = 1;
  let usedBrowserImport = false;
  let properties: string[] = [];

  try {
    for (let page = 1; page <= totalPages; page += 1) {
      const response = await listPapers(page, perPage);
      totalFetched += response.papers.length;
      totalPages = Math.max(totalPages, Math.ceil(response.total / perPage));

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
  } catch (error) {
    const browserImportPath = join(rawDir, "browser-import-papers.json");
    const browserImportFile = await readFile(browserImportPath, "utf8");
    const browserImport = JSON.parse(browserImportFile) as {
      total?: number;
      totalPages?: number;
      papers?: unknown[];
    };

    const papers = (browserImport.papers ?? []).map((paper) => CryoPaperSchema.parse(mapAdvancedSearchPaper(paper as never)));
    totalFetched = papers.length;
    totalPages = browserImport.totalPages ?? Math.ceil(papers.length / perPage);
    usedBrowserImport = true;

    for (const paper of papers) {
      const scored = scorePaperForDomain(paper, selectedDomain);
      if (scored) {
        matchedPapers.push(scored);
      }
    }

    console.warn(
      JSON.stringify(
        {
          domain: selectedDomain,
          warning: "Falling back to browser-import-papers.json for ingest",
          error: error instanceof Error ? error.message : String(error)
        },
        null,
        2
      )
    );
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

  try {
    properties = await listAvailableProperties();
    await writeFile(join(rawDir, "available-properties.json"), JSON.stringify(properties, null, 2), "utf8");
  } catch (error) {
    if (!usedBrowserImport) {
      throw error;
    }

    const browserPropertiesFile = await readFile(join(rawDir, "available-properties.json"), "utf8");
    properties = JSON.parse(browserPropertiesFile) as string[];
  }

  console.log(JSON.stringify({
    domain: selectedDomain,
    totalFetched,
    totalMatched: matchedPapers.length,
    usedBrowserImport,
    topTitles: matchedPapers.slice(0, 5).map((entry) => entry.paper.title)
  }, null, 2));
}

main(domain).catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
