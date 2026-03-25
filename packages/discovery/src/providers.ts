import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  DomainSnapshotSchema,
  FullTextAvailabilitySchema,
  LiveDiscoveryProviderSchema,
  type DiscoverySourceRecord,
  type DomainId
} from "../../shared/src/schema.js";
import { getDiscoveryDomainConfig, scoreDiscoveryText, shouldKeepDiscoveryCandidate } from "./domain.js";

type DiscoveryFetchResult = {
  records: DiscoverySourceRecord[];
  fetchedCount: number;
  totalHits: number | null;
  truncated: boolean;
};

const PAGE_SIZE = 50;
const MAX_PROVIDER_PAGES = readPositiveIntEnv("DISCOVERY_MAX_PROVIDER_PAGES", 5);
const FETCH_TIMEOUT_MS = readPositiveIntEnv("DISCOVERY_FETCH_TIMEOUT_MS", 15_000);
const FETCH_RETRY_ATTEMPTS = readPositiveIntEnv("DISCOVERY_FETCH_RETRY_ATTEMPTS", 2);

function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

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

function shouldRetryResponse(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function describeFetchError(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return `request timed out after ${FETCH_TIMEOUT_MS}ms`;
    }
    return error.message;
  }
  return String(error);
}

async function fetchJson<T>(url: string): Promise<T> {
  let lastError: string | null = null;
  for (let attempt = 1; attempt <= FETCH_RETRY_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "user-agent": "cryo-protocol-atlas-discovery/1.0"
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
      });

      if (!response.ok) {
        const message = `Request failed: ${response.status} ${response.statusText}`;
        if (attempt < FETCH_RETRY_ATTEMPTS && shouldRetryResponse(response.status)) {
          lastError = message;
          continue;
        }
        throw new Error(message);
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = describeFetchError(error);
      if (attempt === FETCH_RETRY_ATTEMPTS) {
        break;
      }
    }
  }

  throw new Error(`Request failed after ${FETCH_RETRY_ATTEMPTS} attempts: ${lastError ?? "unknown error"} (${url})`);
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
    fetchedCount: snapshot.papers.length,
    totalHits: snapshot.papers.length,
    truncated: false
  };
}

type OpenAlexResponse = {
  meta?: { count?: number | null };
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
  const records: DiscoverySourceRecord[] = [];
  let totalHits: number | null = null;
  let page = 1;
  while (page <= MAX_PROVIDER_PAGES) {
    const url = `https://api.openalex.org/works?per-page=${PAGE_SIZE}&page=${page}&search=${encodeURIComponent(query)}`;
    const response = await fetchJson<OpenAlexResponse>(url);
    totalHits = response.meta?.count ?? totalHits;
    const results = response.results ?? [];
    records.push(
      ...results
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
              (result.authorships ?? [])
                .map((entry) => normalizeString(entry.author?.display_name) ?? "")
                .filter(Boolean)
            ),
            citationCount: result.cited_by_count ?? null,
            fullTextAvailability: result.open_access?.is_oa ? "open-access-full-text" : "abstract-only"
          })
        )
        .filter((record): record is DiscoverySourceRecord => Boolean(record))
    );
    if (results.length < PAGE_SIZE) {
      break;
    }
    page += 1;
  }

  return {
    records,
    fetchedCount: records.length,
    totalHits,
    truncated: totalHits !== null ? records.length < totalHits : page > MAX_PROVIDER_PAGES
  };
}

type CrossrefResponse = {
  message?: {
    "total-results"?: number;
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
  const records: DiscoverySourceRecord[] = [];
  let totalHits: number | null = null;
  for (let page = 0; page < MAX_PROVIDER_PAGES; page += 1) {
    const offset = page * PAGE_SIZE;
    const url = `https://api.crossref.org/works?rows=${PAGE_SIZE}&offset=${offset}&query.bibliographic=${encodeURIComponent(query)}`;
    const response = await fetchJson<CrossrefResponse>(url);
    totalHits = response.message?.["total-results"] ?? totalHits;
    const items = response.message?.items ?? [];
    records.push(
      ...items
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
        .filter((record): record is DiscoverySourceRecord => Boolean(record))
    );
    if (items.length < PAGE_SIZE) {
      break;
    }
  }

  return {
    records,
    fetchedCount: records.length,
    totalHits,
    truncated: totalHits !== null ? records.length < totalHits : records.length >= PAGE_SIZE * MAX_PROVIDER_PAGES
  };
}

type EuropePmcResponse = {
  hitCount?: number;
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
  const records: DiscoverySourceRecord[] = [];
  let totalHits: number | null = null;
  for (let page = 1; page <= MAX_PROVIDER_PAGES; page += 1) {
    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&pageSize=${PAGE_SIZE}&page=${page}&query=${encodeURIComponent(query)}`;
    const response = await fetchJson<EuropePmcResponse>(url);
    totalHits = response.hitCount ?? totalHits;
    const results = response.resultList?.result ?? [];
    records.push(
      ...results
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
        .filter((record): record is DiscoverySourceRecord => Boolean(record))
    );
    if (results.length < PAGE_SIZE) {
      break;
    }
  }

  return {
    records,
    fetchedCount: records.length,
    totalHits,
    truncated: totalHits !== null ? records.length < totalHits : records.length >= PAGE_SIZE * MAX_PROVIDER_PAGES
  };
}

export async function fetchDiscoverySource(
  source: (typeof LiveDiscoveryProviderSchema.options)[number],
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

export const LIVE_DISCOVERY_PROVIDERS = LiveDiscoveryProviderSchema.options;
