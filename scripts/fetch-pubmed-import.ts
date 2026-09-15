import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getDiscoveryDomainConfig } from "../packages/discovery/src/domain.js";
import { parseDomainArg } from "../packages/shared/src/domains/index.js";
import { DiscoveryImportFileSchema, type DiscoveryImportRecord, type DomainId } from "../packages/shared/src/schema.js";

/**
 * Pulls PubMed records for a domain through NCBI E-utilities and writes them as
 * a discovery import file (data/discovery/<domain>/imports/pubmed-eutils.json),
 * the same shape the hand-seeded pubmed-seed.json files use. The query is the
 * domain's live-provider query, which PubMed's boolean syntax accepts as-is.
 */

const domain = parseDomainArg(process.argv[2], "fetch-pubmed-import <domain> [--max N]");
const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const BATCH_SIZE = 100;
const REQUEST_GAP_MS = 400;

function readMax(argv: string[]): number {
  const index = argv.indexOf("--max");
  const raw = index >= 0 ? argv[index + 1] : undefined;
  const parsed = raw ? Number.parseInt(raw, 10) : 500;
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`Invalid --max value: ${raw}`);
  }
  return parsed;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "user-agent": "cryo-protocol-atlas-discovery/1.0" },
    signal: AbortSignal.timeout(30_000)
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText} (${url})`);
  }
  return response.text();
}

function decodeEntities(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function firstMatch(xml: string, pattern: RegExp): string | null {
  const match = xml.match(pattern);
  return match?.[1] ? decodeEntities(match[1]) : null;
}

function parseArticle(xml: string, rawQuery: string): DiscoveryImportRecord | null {
  const pmid = firstMatch(xml, /<PMID[^>]*>(\d+)<\/PMID>/);
  const title = firstMatch(xml, /<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/);
  if (!pmid || !title) {
    return null;
  }

  const abstractParts = Array.from(xml.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)).map((match) =>
    decodeEntities(match[1] ?? "")
  );
  const doi =
    firstMatch(xml, /<ArticleId IdType="doi">([\s\S]*?)<\/ArticleId>/) ??
    firstMatch(xml, /<ELocationID EIdType="doi"[^>]*>([\s\S]*?)<\/ELocationID>/);
  const pmcid = firstMatch(xml, /<ArticleId IdType="pmc">([\s\S]*?)<\/ArticleId>/);
  const journal = firstMatch(xml, /<Journal>[\s\S]*?<Title>([\s\S]*?)<\/Title>/);
  const yearText =
    firstMatch(xml, /<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/) ??
    firstMatch(xml, /<PubDate>[\s\S]*?<MedlineDate>(\d{4})/);
  const authors = Array.from(xml.matchAll(/<Author[^>]*>([\s\S]*?)<\/Author>/g))
    .map((match) => {
      const lastName = firstMatch(match[1] ?? "", /<LastName>([\s\S]*?)<\/LastName>/);
      const initials = firstMatch(match[1] ?? "", /<Initials>([\s\S]*?)<\/Initials>/);
      return [lastName, initials].filter(Boolean).join(" ");
    })
    .filter(Boolean);

  return {
    source: "pubmed",
    sourceId: `pubmed:${pmid}`,
    sourceUrl: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    rawQuery,
    title: title.replace(/\.$/, ""),
    abstract: abstractParts.length > 0 ? abstractParts.join(" ") : null,
    doi,
    pmid,
    pmcid,
    journal,
    publishedYear: yearText ? Number.parseInt(yearText, 10) : null,
    authorsFlat: authors.length > 0 ? authors.join("; ") : null,
    citationCount: null,
    fullTextAvailability: pmcid ? "open-access-full-text" : "abstract-only"
  };
}

async function main(selectedDomain: DomainId): Promise<void> {
  const max = readMax(process.argv);
  const query = getDiscoveryDomainConfig(selectedDomain).providerQueries.openalex;
  const searchUrl = `${EUTILS}/esearch.fcgi?db=pubmed&retmode=json&retmax=${max}&sort=relevance&term=${encodeURIComponent(query)}`;
  const search = JSON.parse(await fetchText(searchUrl)) as {
    esearchresult?: { count?: string; idlist?: string[] };
  };
  const ids = search.esearchresult?.idlist ?? [];
  const totalHits = Number.parseInt(search.esearchresult?.count ?? "0", 10);

  const records: DiscoveryImportRecord[] = [];
  for (let offset = 0; offset < ids.length; offset += BATCH_SIZE) {
    await sleep(REQUEST_GAP_MS);
    const batch = ids.slice(offset, offset + BATCH_SIZE);
    const fetchUrl = `${EUTILS}/efetch.fcgi?db=pubmed&retmode=xml&id=${batch.join(",")}`;
    const xml = await fetchText(fetchUrl);
    for (const match of xml.matchAll(/<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g)) {
      const record = parseArticle(match[1] ?? "", query);
      if (record) {
        records.push(record);
      }
    }
  }

  const importFile = DiscoveryImportFileSchema.parse({
    generatedAt: new Date().toISOString(),
    domain: selectedDomain,
    source: "pubmed",
    label: `PubMed E-utilities export (${records.length} of ${totalHits} hits)`,
    records
  });

  const importsDir = join(process.cwd(), "data", "discovery", selectedDomain, "imports");
  await mkdir(importsDir, { recursive: true });
  const outputPath = join(importsDir, "pubmed-eutils.json");
  await writeFile(outputPath, JSON.stringify(importFile, null, 2), "utf8");

  console.log(
    JSON.stringify(
      {
        domain: selectedDomain,
        query,
        totalHits,
        fetched: ids.length,
        written: records.length,
        outputPath
      },
      null,
      2
    )
  );
}

main(domain).catch((error) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
});
