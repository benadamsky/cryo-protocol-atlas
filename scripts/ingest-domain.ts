import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { shouldKeepDiscoveryCandidate } from "../packages/discovery/src/domain.js";
import { listAvailableProperties, listPapers, mapAdvancedSearchPaper } from "../packages/ingest/src/cryodb.js";
import { scorePaperForDomain } from "../packages/ingest/src/domain.js";
import { parseDomainArg } from "../packages/shared/src/domains/index.js";
import {
  CryoPaperSchema,
  DiscoveryImportFileSchema,
  DomainSnapshotSchema,
  type CryoPaper,
  type DiscoveryImportRecord,
  type DomainId,
  type DomainPaper
} from "../packages/shared/src/schema.js";

const domain = parseDomainArg(process.argv[2], "ingest-domain <domain> [--corpus cryodb|imports]");
const corpusSource = readCorpusSource(process.argv);
const perPage = 100;

/**
 * `--corpus imports` builds the domain snapshot from the discovery import files
 * under data/discovery/<domain>/imports/ (for example a PubMed E-utilities
 * export) instead of CryoDB. CryoDB only lists cryopreservation papers, so an
 * import corpus is first passed through the domain's discovery filter (title
 * anchor plus explicit cryo signal, blocked review titles) to keep the slice
 * comparable. Paper ids are stable source ids (pubmed:<pmid>), so curated
 * overrides and benchmark rows keep pointing at the same paper across
 * refreshes. Use it when CryoDB is unreachable or a domain is not covered
 * there; the snapshot records which corpus it came from.
 */
function readCorpusSource(argv: string[]): "cryodb" | "imports" {
  const index = argv.indexOf("--corpus");
  const value = index >= 0 ? argv[index + 1] : "cryodb";
  if (value !== "cryodb" && value !== "imports") {
    throw new Error(`Unknown --corpus value: ${value}. Expected cryodb or imports.`);
  }
  return value;
}

function importPaperId(record: DiscoveryImportRecord): string {
  if (record.pmid) {
    return `pubmed:${record.pmid}`;
  }
  if (record.doi) {
    return `doi:${record.doi.toLowerCase()}`;
  }
  return `${record.source}:${record.sourceId}`;
}

function importRecordToPaper(record: DiscoveryImportRecord): CryoPaper {
  return CryoPaperSchema.parse({
    id: importPaperId(record),
    paper_id: importPaperId(record),
    doi: record.doi ?? null,
    pmid: record.pmid ?? null,
    pmcid: record.pmcid ?? null,
    title: record.title,
    abstract: record.abstract ?? null,
    paper_url: record.sourceUrl ?? null,
    journal: record.journal ?? null,
    published_year: record.publishedYear ?? null,
    authors_flat: record.authorsFlat ?? null
  });
}

async function readImportCorpus(selectedDomain: DomainId): Promise<CryoPaper[]> {
  const importsDir = join(process.cwd(), "data", "discovery", selectedDomain, "imports");
  const fileNames = (await readdir(importsDir)).filter((name) => name.endsWith(".json")).sort();
  if (fileNames.length === 0) {
    throw new Error(`No import files under ${importsDir}; run fetch-pubmed-import first.`);
  }

  const papers = new Map<string, CryoPaper>();
  for (const fileName of fileNames) {
    const file = DiscoveryImportFileSchema.parse(JSON.parse(await readFile(join(importsDir, fileName), "utf8")));
    if (file.domain !== selectedDomain) {
      throw new Error(`Import file ${fileName} targets ${file.domain}, expected ${selectedDomain}`);
    }
    for (const record of file.records) {
      if (!shouldKeepDiscoveryCandidate(record.title, record.abstract ?? null, selectedDomain)) {
        continue;
      }
      const paper = importRecordToPaper(record);
      if (!papers.has(paper.id)) {
        papers.set(paper.id, paper);
      }
    }
  }
  return Array.from(papers.values());
}

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

  if (corpusSource === "imports") {
    const papers = await readImportCorpus(selectedDomain);
    totalFetched = papers.length;
    for (const paper of papers) {
      const scored = scorePaperForDomain(paper, selectedDomain);
      if (scored) {
        matchedPapers.push(scored);
      }
    }
  } else {
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
  }

  matchedPapers.sort((a, b) => b.score - a.score || a.paper.title.localeCompare(b.paper.title));

  const snapshot = DomainSnapshotSchema.parse({
    generatedAt: new Date().toISOString(),
    domain: selectedDomain,
    corpusSource,
    totalFetched,
    totalMatched: matchedPapers.length,
    papers: matchedPapers
  });

  await writeFile(join(processedDir, "domain-snapshot.json"), JSON.stringify(snapshot, null, 2), "utf8");

  if (corpusSource === "cryodb") {
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
  }

  console.log(JSON.stringify({
    domain: selectedDomain,
    corpusSource,
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
