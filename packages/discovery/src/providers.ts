import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  DomainSnapshotSchema,
  FullTextAvailabilitySchema,
  type DiscoverySource,
  type DiscoverySourceRecord,
  type DomainId
} from "../../shared/src/schema.js";
import { getDiscoveryDomainConfig, scoreDiscoveryText, shouldKeepDiscoveryCandidate } from "./domain.js";

type DiscoveryFetchResult = {
  records: DiscoverySourceRecord[];
  fetchedCount: number;
};

function normalizeAuthorList(authors: string[]): string | null {
  const normalized = authors.map((author) => author.trim()).filter(Boolean);
  return normalized.length > 0 ? normalized.join("; ") : null;
}

function normalizeString(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapRecord(
  input: Omit<DiscoverySourceRecord, "matchedKeywords" | "relevanceScore"> & {
    domain: DomainId;
  }
): DiscoverySourceRecord | null {
  if (!shouldKeepDiscoveryCandidate(input.title, input.abstract, input.domain)) {
    return null;
  }

  const { matchedKeywords, relevanceScore } = scoreDiscoveryText(input.title, input.abstract, input.domain);
  return {
    source: input.source,
    sourceId: input.sourceId,
    sourceUrl: input.sourceUrl,
    rawQuery: input.rawQuery,
    title: input.title,
    abstract: input.abstract,
    doi: input.doi,
    pmid: input.pmid,
    pmcid: input.pmcid,
    journal: input.journal,
    publishedYear: input.publishedYear,
    authorsFlat: input.authorsFlat,
    citationCount: input.citationCount,
    fullTextAvailability: FullTextAvailabilitySchema.parse(input.fullTextAvailability),
    matchedKeywords,
    relevanceScore
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "user-agent": "cryo-protocol-atlas-discovery/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText} (${url})`);
  }

  return (await response.json()) as T;
}

async function fetchCryoDbSnapshot(domain: DomainId): Promise<DiscoveryFetchResult> {
  const snapshot = DomainSnapshotSchema.parse(
    JSON.parse(
      await readFile(join(process.cwd(), "data", "processed", domain, "domain-snapshot.json"), "utf8")
    )
  );
  const query = getDiscoveryDomainConfig(domain).providerQueries.cryodb;
  const records = snapshot.papers
    .map((entry) =>
      mapRecord({
        domain,
        source: "cryodb",
        sourceId: entry.paper.id,
        sourceUrl: entry.paper.paper_url ?? null,
        rawQuery: query,
        title: entry.paper.title,
        abstract: entry.paper.abstract ?? null,
        doi: entry.paper.doi ?? null,
        pmid: null,
        pmcid: null,
        journal: entry.paper.journal ?? null,
        publishedYear: entry.paper.published_year ?? null,
        authorsFlat: entry.paper.authors_flat ?? null,
        citationCount: null,
        fullTextAvailability: entry.paper.paper_url ? "full-text-link" : "abstract-only"
      })
    )
    .filter((record): record is DiscoverySourceRecord => Boolean(record));

  return {
    records,
    fetchedCount: snapshot.papers.length
  };
}

type OpenAlexResponse = {
  results?: Array<{
    id?: string;
    doi?: string | null;
    title?: string | null;
    abstract_inverted_index?: Record<string, number[]> | null;
    primary_location?: { landing_page_url?: string | null; source?: { display_name?: string | null } | null } | null;
    publication_year?: number | null;
    cited_by_count?: number | null;
    authorships?: Array<{ author?: { display_name?: string | null } | null }> | null;
    ids?: { pmid?: string | null; pmcid?: string | null } | null;
    open_access?: { is_oa?: boolean | null } | null;
  }>;
};

function decodeAbstract(index: Record<string, number[]> | null | undefined): string | null {
  if (!index) {
    return null;
  }

  const ordered: Array<[number, string]> = [];
  for (const [token, positions] of Object.entries(index)) {
    for (const position of positions) {
      ordered.push([position, token]);
    }
  }
  ordered.sort((left, right) => left[0] - right[0]);
  return ordered.length > 0 ? ordered.map((entry) => entry[1]).join(" ") : null;
}

async function fetchOpenAlex(domain: DomainId): Promise<DiscoveryFetchResult> {
  const query = getDiscoveryDomainConfig(domain).providerQueries.openalex;
  const url = `https://api.openalex.org/works?per-page=50&search=${encodeURIComponent(query)}`;
  const response = await fetchJson<OpenAlexResponse>(url);
  const results = response.results ?? [];
  const records = results
    .map((result) =>
      mapRecord({
        domain,
        source: "openalex",
        sourceId: normalizeString(result.id) ?? crypto.randomUUID(),
        sourceUrl: normalizeString(result.primary_location?.landing_page_url) ?? normalizeString(result.id),
        rawQuery: query,
        title: normalizeString(result.title) ?? "untitled",
        abstract: decodeAbstract(result.abstract_inverted_index),
        doi: normalizeString(result.doi)?.replace("https://doi.org/", "") ?? null,
        pmid: normalizeString(result.ids?.pmid)?.replace("https://pubmed.ncbi.nlm.nih.gov/", "") ?? null,
        pmcid: normalizeString(result.ids?.pmcid)?.replace("https://www.ncbi.nlm.nih.gov/pmc/articles/", "") ?? null,
        journal: normalizeString(result.primary_location?.source?.display_name) ?? null,
        publishedYear: result.publication_year ?? null,
        authorsFlat: normalizeAuthorList(
          (result.authorships ?? []).map((entry) => normalizeString(entry.author?.display_name) ?? "").filter(Boolean)
        ),
        citationCount: result.cited_by_count ?? null,
        fullTextAvailability: result.open_access?.is_oa ? "open-access-full-text" : "abstract-only"
      })
    )
    .filter((record): record is DiscoverySourceRecord => Boolean(record));

  return {
    records,
    fetchedCount: results.length
  };
}

type CrossrefResponse = {
  message?: {
    items?: Array<{
      DOI?: string;
      title?: string[];
      abstract?: string;
      URL?: string;
      "container-title"?: string[];
      published?: { "date-parts"?: number[][] };
      author?: Array<{ given?: string; family?: string }>;
      "is-referenced-by-count"?: number;
    }>;
  };
};

function stripCrossrefAbstractMarkup(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || null;
}

async function fetchCrossref(domain: DomainId): Promise<DiscoveryFetchResult> {
  const query = getDiscoveryDomainConfig(domain).providerQueries.crossref;
  const url = `https://api.crossref.org/works?rows=50&query.bibliographic=${encodeURIComponent(query)}`;
  const response = await fetchJson<CrossrefResponse>(url);
  const items = response.message?.items ?? [];
  const records = items
    .map((item) =>
      mapRecord({
        domain,
        source: "crossref",
        sourceId: normalizeString(item.DOI) ?? crypto.randomUUID(),
        sourceUrl: normalizeString(item.URL),
        rawQuery: query,
        title: normalizeString(item.title?.[0]) ?? "untitled",
        abstract: stripCrossrefAbstractMarkup(item.abstract),
        doi: normalizeString(item.DOI),
        pmid: null,
        pmcid: null,
        journal: normalizeString(item["container-title"]?.[0]),
        publishedYear: item.published?.["date-parts"]?.[0]?.[0] ?? null,
        authorsFlat: normalizeAuthorList(
          (item.author ?? []).map((author) => [author.given, author.family].filter(Boolean).join(" "))
        ),
        citationCount: item["is-referenced-by-count"] ?? null,
        fullTextAvailability: item.URL ? "full-text-link" : "abstract-only"
      })
    )
    .filter((record): record is DiscoverySourceRecord => Boolean(record));

  return {
    records,
    fetchedCount: items.length
  };
}

type EuropePmcResponse = {
  resultList?: {
    result?: Array<{
      id?: string;
      title?: string;
      abstractText?: string;
      doi?: string;
      pmid?: string;
      pmcid?: string;
      journalTitle?: string;
      pubYear?: string;
      authorString?: string;
      hasBook?: string;
      fullTextUrlList?: { fullTextUrl?: Array<{ url?: string; availability?: string }> };
      citedByCount?: number;
    }>;
  };
};

async function fetchEuropePmc(domain: DomainId): Promise<DiscoveryFetchResult> {
  const query = getDiscoveryDomainConfig(domain).providerQueries["europe-pmc"];
  const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&pageSize=50&query=${encodeURIComponent(query)}`;
  const response = await fetchJson<EuropePmcResponse>(url);
  const results = response.resultList?.result ?? [];
  const records = results
    .map((result) =>
      mapRecord({
        domain,
        source: "europe-pmc",
        sourceId: normalizeString(result.id) ?? crypto.randomUUID(),
        sourceUrl: normalizeString(result.fullTextUrlList?.fullTextUrl?.[0]?.url),
        rawQuery: query,
        title: normalizeString(result.title) ?? "untitled",
        abstract: normalizeString(result.abstractText),
        doi: normalizeString(result.doi),
        pmid: normalizeString(result.pmid),
        pmcid: normalizeString(result.pmcid),
        journal: normalizeString(result.journalTitle),
        publishedYear: result.pubYear ? Number.parseInt(result.pubYear, 10) : null,
        authorsFlat: normalizeString(result.authorString),
        citationCount: result.citedByCount ?? null,
        fullTextAvailability: result.pmcid
          ? "open-access-full-text"
          : result.fullTextUrlList?.fullTextUrl?.length
            ? "full-text-link"
            : "abstract-only"
      })
    )
    .filter((record): record is DiscoverySourceRecord => Boolean(record));

  return {
    records,
    fetchedCount: results.length
  };
}

export async function fetchDiscoverySource(
  source: Exclude<DiscoverySource, "manual">,
  domain: DomainId
): Promise<DiscoveryFetchResult> {
  switch (source) {
    case "cryodb":
      return fetchCryoDbSnapshot(domain);
    case "openalex":
      return fetchOpenAlex(domain);
    case "crossref":
      return fetchCrossref(domain);
    case "europe-pmc":
      return fetchEuropePmc(domain);
  }
}

export const DISCOVERY_SOURCES: Array<Exclude<DiscoverySource, "manual">> = [
  "cryodb",
  "openalex",
  "crossref",
  "europe-pmc"
];
