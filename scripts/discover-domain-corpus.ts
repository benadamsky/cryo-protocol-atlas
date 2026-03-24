import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  getDiscoveryDomainConfig,
  scoreDiscoveryText,
  shouldKeepDiscoveryCandidate
} from "../packages/discovery/src/domain.js";
import { LIVE_DISCOVERY_PROVIDERS, fetchDiscoverySource } from "../packages/discovery/src/providers.js";
import {
  ManualDiscoveryImportFileSchema,
  MergedDiscoveryImportFileSchema,
  DiscoveryPaperSchema,
  DiscoverySnapshotSchema,
  DomainIdSchema,
  type DiscoveryPaper,
  type DiscoveryProviderSummary,
  type DiscoverySnapshot,
  type DiscoverySourceRecord,
  type DomainId
} from "../packages/shared/src/schema.js";

const domain = DomainIdSchema.parse(process.argv[2] ?? "ovarian-tissue");
const SOURCE_DIVERSITY_BASELINE = ["cryodb", "pubmed", "openalex", "crossref", "europe-pmc", "semantic-scholar"] as const;

function normalizeTitle(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function buildDedupeKey(record: DiscoverySourceRecord): string {
  if (record.doi) {
    return `doi:${record.doi.toLowerCase()}`;
  }
  if (record.pmid) {
    return `pmid:${record.pmid}`;
  }
  if (record.pmcid) {
    return `pmcid:${record.pmcid}`;
  }
  return `title:${normalizeTitle(record.title)}`;
}

function computeAuthorityScore(records: DiscoverySourceRecord[]): number {
  const citationContribution = Math.min(
    1,
    records.reduce((max, record) => Math.max(max, record.citationCount ?? 0), 0) / 100
  );
  const fullTextContribution = records.some((record) => record.fullTextAvailability === "open-access-full-text")
    ? 0.3
    : records.some((record) => record.fullTextAvailability === "full-text-link")
      ? 0.15
      : 0;

  return Number((citationContribution + fullTextContribution).toFixed(3));
}

function choosePreferredString(values: Array<string | null | undefined>): string | null {
  const unique = values.map((value) => value?.trim()).filter(Boolean) as string[];
  unique.sort((left, right) => right.length - left.length);
  return unique[0] ?? null;
}

function choosePreferredYear(values: Array<number | null | undefined>): number | null {
  const normalized = values.filter((value): value is number => Number.isInteger(value));
  normalized.sort((left, right) => right - left);
  return normalized[0] ?? null;
}

function rankPaper(dedupeKey: string, records: DiscoverySourceRecord[], domain: DomainId): DiscoveryPaper {
  const sourceTypes = Array.from(new Set(records.map((record) => record.source))).sort();
  const matchedKeywords = Array.from(new Set(records.flatMap((record) => record.matchedKeywords))).sort();
  const sourceCount = records.length;
  const sourceDiversityCount = sourceTypes.filter((source) =>
    SOURCE_DIVERSITY_BASELINE.includes(source as (typeof SOURCE_DIVERSITY_BASELINE)[number])
  ).length;
  const sourceDiversityScore = Number((sourceDiversityCount / SOURCE_DIVERSITY_BASELINE.length).toFixed(3));
  const relevanceScore = Number(
    (records.reduce((max, record) => Math.max(max, record.relevanceScore), 0) + matchedKeywords.length * 0.1).toFixed(3)
  );
  const authorityScore = computeAuthorityScore(records);
  const rankingScore = Number((relevanceScore + authorityScore + sourceDiversityScore).toFixed(3));
  const fullTextAvailability = records.some((record) => record.fullTextAvailability === "open-access-full-text")
    ? "open-access-full-text"
    : records.some((record) => record.fullTextAvailability === "full-text-link")
      ? "full-text-link"
      : records.some((record) => record.fullTextAvailability === "abstract-only")
        ? "abstract-only"
        : "unknown";

  return DiscoveryPaperSchema.parse({
    domain,
    dedupeKey,
    title: choosePreferredString(records.map((record) => record.title)) ?? "untitled",
    abstract: choosePreferredString(records.map((record) => record.abstract ?? null)),
    doi: choosePreferredString(records.map((record) => record.doi ?? null)),
    pmid: choosePreferredString(records.map((record) => record.pmid ?? null)),
    pmcid: choosePreferredString(records.map((record) => record.pmcid ?? null)),
    journal: choosePreferredString(records.map((record) => record.journal ?? null)),
    publishedYear: choosePreferredYear(records.map((record) => record.publishedYear ?? null)),
    authorsFlat: choosePreferredString(records.map((record) => record.authorsFlat ?? null)),
    sourceCount,
    sources: records,
    matchedKeywords,
    sourceTypes,
    fullTextAvailability,
    relevanceScore,
    authorityScore,
    sourceDiversityScore,
    rankingScore
  });
}

function renderMarkdown(snapshot: DiscoverySnapshot): string {
  const lines: string[] = [];
  lines.push(`# ${snapshot.domain} discovery snapshot`);
  lines.push("");
  lines.push(`- generated at: ${snapshot.generatedAt}`);
  lines.push(`- query description: ${snapshot.queryDescription}`);
  lines.push(`- total candidates: ${snapshot.totalCandidates}`);
  lines.push("");
  lines.push("## Providers");
  for (const summary of snapshot.providerSummaries) {
    lines.push(
      `- ${summary.source}: fetched=${summary.fetchedCount} accepted=${summary.acceptedCount}${summary.failed ? ` failed=${summary.error}` : ""}`
    );
  }
  lines.push("");
  lines.push("## Top candidates");
  for (const paper of snapshot.papers.slice(0, 25)) {
    lines.push(
      `- ${paper.title} | ranking=${paper.rankingScore} relevance=${paper.relevanceScore} authority=${paper.authorityScore} sources=${paper.sourceTypes.join(", ")}`
    );
    lines.push(`  matchedKeywords=${paper.matchedKeywords.join(", ") || "none"}`);
    if (paper.doi) {
      lines.push(`  doi=${paper.doi}`);
    }
    if (paper.pmid) {
      lines.push(`  pmid=${paper.pmid}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

async function readOptionalJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return null;
  }
}

function mapImportedRecord(
  record: ReturnType<typeof ManualDiscoveryImportFileSchema.parse>["records"][number],
  domain: DomainId
): DiscoverySourceRecord | null {
  const paper = DiscoveryPaperSchema.shape.sources.element.parse({
    source: record.source,
    sourceId: record.sourceId,
    sourceUrl: record.sourceUrl ?? null,
    rawQuery: record.rawQuery,
    title: record.title,
    abstract: record.abstract ?? null,
    doi: record.doi ?? null,
    pmid: record.pmid ?? null,
    pmcid: record.pmcid ?? null,
    journal: record.journal ?? null,
    publishedYear: record.publishedYear ?? null,
    authorsFlat: record.authorsFlat ?? null,
    citationCount: record.citationCount ?? null,
    fullTextAvailability: record.fullTextAvailability,
    matchedKeywords: [],
    relevanceScore: 0
  });

  if (!shouldKeepDiscoveryCandidate(record.title, record.abstract ?? null, domain)) {
    return null;
  }
  const { matchedKeywords, relevanceScore } = scoreDiscoveryText(record.title, record.abstract ?? null, domain);
  return {
    ...paper,
    matchedKeywords,
    relevanceScore
  };
}

function recordIdentity(record: DiscoverySourceRecord): string {
  if (record.doi) {
    return `${record.source}:doi:${record.doi.toLowerCase()}`;
  }
  if (record.pmid) {
    return `${record.source}:pmid:${record.pmid}`;
  }
  if (record.pmcid) {
    return `${record.source}:pmcid:${record.pmcid}`;
  }
  return `${record.source}:title:${normalizeTitle(record.title)}`;
}

function addDiscoveryRecord(
  recordBuckets: Map<string, DiscoverySourceRecord[]>,
  record: DiscoverySourceRecord
): void {
  const dedupeKey = buildDedupeKey(record);
  const bucket = recordBuckets.get(dedupeKey) ?? [];
  const identity = recordIdentity(record);
  if (!bucket.some((existing) => recordIdentity(existing) === identity)) {
    bucket.push(record);
    recordBuckets.set(dedupeKey, bucket);
  }
}

async function main(selectedDomain: DomainId): Promise<void> {
  const config = getDiscoveryDomainConfig(selectedDomain);
  const providerSummaries: DiscoveryProviderSummary[] = [];
  const recordBuckets = new Map<string, DiscoverySourceRecord[]>();
  const discoveryDir = join(process.cwd(), "data", "discovery", selectedDomain);

  for (const source of LIVE_DISCOVERY_PROVIDERS) {
    try {
      const result = await fetchDiscoverySource(source, selectedDomain);
      for (const record of result.records) {
        addDiscoveryRecord(recordBuckets, record);
      }
      providerSummaries.push({
        source,
        query: config.providerQueries[source],
        fetchedCount: result.fetchedCount,
        acceptedCount: result.records.length,
        failed: false,
        error: null
      });
    } catch (error) {
      providerSummaries.push({
        source,
        query: config.providerQueries[source],
        fetchedCount: 0,
        acceptedCount: 0,
        failed: true,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  const mergedImports = await readOptionalJson<unknown>(join(discoveryDir, "imported-source-records.json"));
  if (mergedImports) {
    const mergedFile = MergedDiscoveryImportFileSchema.parse(mergedImports);
    const importedRecords = mergedFile.records
      .map((record) => mapImportedRecord(record, selectedDomain))
      .filter((record): record is DiscoverySourceRecord => Boolean(record));
    const importedCounts = new Map<string, { fetched: number; accepted: number }>();
    for (const rawRecord of mergedFile.records) {
      const current = importedCounts.get(rawRecord.source) ?? { fetched: 0, accepted: 0 };
      current.fetched += 1;
      importedCounts.set(rawRecord.source, current);
    }
    for (const record of importedRecords) {
      addDiscoveryRecord(recordBuckets, record);
      const current = importedCounts.get(record.source) ?? { fetched: 0, accepted: 0 };
      current.accepted += 1;
      importedCounts.set(record.source, current);
    }
    for (const [source, counts] of importedCounts.entries()) {
      providerSummaries.push({
        source: DiscoveryPaperSchema.shape.sourceTypes.element.parse(source),
        query: "imported-source-records.json",
        fetchedCount: counts.fetched,
        acceptedCount: counts.accepted,
        failed: false,
        error: null
      });
    }
  }

  const manualImport = await readOptionalJson<unknown>(join(discoveryDir, "manual-source-records.json"));
  if (manualImport) {
    const manualFile = ManualDiscoveryImportFileSchema.parse(manualImport);
    const manualOnlyRecords = manualFile.records.filter((record) => record.source === "manual");
    const manualRecords = manualOnlyRecords
      .map((record) => mapImportedRecord(record, selectedDomain))
      .filter((record): record is DiscoverySourceRecord => Boolean(record));
    for (const record of manualRecords) {
      addDiscoveryRecord(recordBuckets, record);
    }
    if (manualOnlyRecords.length > 0) {
      providerSummaries.push({
        source: "manual",
        query: "manual-source-records.json",
        fetchedCount: manualOnlyRecords.length,
        acceptedCount: manualRecords.length,
        failed: false,
        error: null
      });
    }
  }

  const papers = Array.from(recordBuckets.entries())
    .map(([dedupeKey, records]) => rankPaper(dedupeKey, records, selectedDomain))
    .sort(
      (left, right) =>
        right.rankingScore - left.rankingScore ||
        right.sourceCount - left.sourceCount ||
        (right.publishedYear ?? 0) - (left.publishedYear ?? 0) ||
        left.title.localeCompare(right.title)
    );

  const snapshot = DiscoverySnapshotSchema.parse({
    generatedAt: new Date().toISOString(),
    domain: selectedDomain,
    queryDescription: config.queryDescription,
    totalCandidates: papers.length,
    providerSummaries,
    papers
  });

  const outputDir = discoveryDir;
  const jsonPath = join(outputDir, "discovery-snapshot.json");
  const markdownPath = join(outputDir, "discovery-snapshot.md");
  const previousSnapshot = await readOptionalJson<DiscoverySnapshot>(jsonPath);
  const stableSnapshot =
    previousSnapshot &&
    JSON.stringify({ ...previousSnapshot, generatedAt: null }) ===
      JSON.stringify({ ...snapshot, generatedAt: null })
      ? previousSnapshot
      : snapshot;

  await mkdir(outputDir, { recursive: true });
  await writeFile(jsonPath, JSON.stringify(stableSnapshot, null, 2), "utf8");
  await writeFile(markdownPath, renderMarkdown(stableSnapshot), "utf8");

  console.log(
    JSON.stringify(
      {
        domain: selectedDomain,
        totalCandidates: stableSnapshot.totalCandidates,
        providerFailures: stableSnapshot.providerSummaries.filter((summary) => summary.failed).length,
        topTitle: stableSnapshot.papers[0]?.title ?? null
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
