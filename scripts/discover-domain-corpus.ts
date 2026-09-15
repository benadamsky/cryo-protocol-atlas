import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  getDiscoveryDomainConfig,
  scoreDiscoveryText,
  shouldKeepDiscoveryCandidate
} from "../packages/discovery/src/domain.js";
import { fetchDiscoverySource, resolveLiveDiscoveryProviders } from "../packages/discovery/src/providers.js";
import { parseDomainArg } from "../packages/shared/src/domains/index.js";
import {
  DiscoveryImportSummarySchema,
  DiscoveryPaperSchema,
  DiscoverySnapshotSchema,
  ManualDiscoveryImportFileSchema,
  MergedDiscoveryImportFileSchema,
  type DiscoveryImportRecord,
  type DiscoveryPaper,
  type DiscoveryProviderSummary,
  type DiscoverySnapshot,
  type DiscoverySourceRecord,
  type DomainId,
  type ManualDiscoveryRecord
} from "../packages/shared/src/schema.js";

const domain = parseDomainArg(process.argv[2], "discover-domain-corpus <domain>");
const SOURCE_DIVERSITY_BASELINE = [
  "cryodb",
  "pubmed",
  "openalex",
  "crossref",
  "europe-pmc",
  "semantic-scholar"
] as const;

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

function rankPaper(dedupeKey: string, records: DiscoverySourceRecord[], domainId: DomainId): DiscoveryPaper {
  const sourceTypes = Array.from(new Set(records.map((record) => record.source))).sort();
  const matchedKeywords = Array.from(new Set(records.flatMap((record) => record.matchedKeywords))).sort();
  const sourceCount = sourceTypes.length;
  const recordCount = records.length;
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
    domain: domainId,
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
    recordCount,
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

async function readOptionalJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function readOptionalText(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function renderProviderSummary(summary: DiscoveryProviderSummary): string {
  if (summary.kind === "live-provider") {
    return `- ${summary.source}: fetched=${summary.fetchedCount} accepted=${summary.acceptedCount}${summary.totalHits !== null && summary.totalHits !== undefined ? ` total=${summary.totalHits}` : ""}${summary.truncated ? " truncated=yes" : ""}${summary.failed ? ` failed=${summary.error}` : ""}`;
  }
  return `- ${summary.source}: fetched=${summary.fetchedCount} accepted=${summary.acceptedCount} label=${summary.label}`;
}

function renderMarkdown(snapshot: DiscoverySnapshot): string {
  const lines: string[] = [];
  lines.push(`# ${snapshot.domain} discovery snapshot`);
  lines.push("");
  lines.push(`- generated at: ${snapshot.generatedAt}`);
  lines.push(`- query description: ${snapshot.queryDescription}`);
  lines.push(`- total candidates: ${snapshot.totalCandidates}`);
  lines.push(`- degraded refresh: ${snapshot.isDegraded ? "yes" : "no"}`);
  if (snapshot.degradationReasons.length > 0) {
    lines.push(`- degradation reasons: ${snapshot.degradationReasons.join(" || ")}`);
  }
  lines.push("");
  lines.push("## Providers");
  for (const summary of snapshot.providerSummaries) {
    lines.push(renderProviderSummary(summary));
  }
  lines.push("");
  lines.push("## Top candidates");
  for (const paper of snapshot.papers.slice(0, 25)) {
    lines.push(
      `- ${paper.title} | ranking=${paper.rankingScore} relevance=${paper.relevanceScore} authority=${paper.authorityScore} sources=${paper.sourceTypes.join(", ")}`
    );
    lines.push(
      `  matchedKeywords=${paper.matchedKeywords.join(", ") || "none"} | sourceCount=${paper.sourceCount} | recordCount=${paper.recordCount}`
    );
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

function computeDegradationState(input: {
  providerSummaries: DiscoveryProviderSummary[];
  importSummary: ReturnType<typeof DiscoveryImportSummarySchema.parse> | null;
  mergedImports: ReturnType<typeof MergedDiscoveryImportFileSchema.parse> | null;
}): { isDegraded: boolean; degradationReasons: string[] } {
  const reasons: string[] = [];
  const liveSummaries = input.providerSummaries.filter((summary) => summary.kind === "live-provider");
  const failedProviders = liveSummaries.filter((summary) => summary.failed);
  const truncatedProviders = liveSummaries.filter((summary) => summary.truncated);

  if (failedProviders.length > 0) {
    reasons.push(`live-provider-failures:${failedProviders.map((summary) => summary.source).join(",")}`);
  }
  if (truncatedProviders.length > 0) {
    reasons.push(`live-provider-truncation:${truncatedProviders.map((summary) => summary.source).join(",")}`);
  }
  if (liveSummaries.length > 0 && liveSummaries.every((summary) => summary.failed)) {
    reasons.push("all-live-providers-failed");
  }
  if (input.importSummary?.isDegraded) {
    reasons.push(...input.importSummary.degradationReasons.map((reason) => `imports:${reason}`));
  }
  if (input.mergedImports?.isDegraded) {
    reasons.push(...input.mergedImports.degradationReasons.map((reason) => `merged-imports:${reason}`));
  }

  return {
    isDegraded: reasons.length > 0,
    degradationReasons: Array.from(new Set(reasons))
  };
}

function parseOptionalInput<T>(path: string, parser: { parse: (value: unknown) => T }): Promise<T | null> {
  return readOptionalJson<unknown>(path).then((value) => (value === null ? null : parser.parse(value)));
}

function toDiscoveryRecord(
  record: Pick<
    DiscoveryImportRecord | ManualDiscoveryRecord,
    | "source"
    | "sourceId"
    | "sourceUrl"
    | "rawQuery"
    | "title"
    | "abstract"
    | "doi"
    | "pmid"
    | "pmcid"
    | "journal"
    | "publishedYear"
    | "authorsFlat"
    | "citationCount"
    | "fullTextAvailability"
  >,
  selectedDomain: DomainId
): DiscoverySourceRecord | null {
  if (!shouldKeepDiscoveryCandidate(record.title, record.abstract ?? null, selectedDomain)) {
    return null;
  }

  const { matchedKeywords, relevanceScore } = scoreDiscoveryText(record.title, record.abstract ?? null, selectedDomain);
  return DiscoveryPaperSchema.shape.sources.element.parse({
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
    matchedKeywords,
    relevanceScore
  });
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

function addDiscoveryRecord(recordBuckets: Map<string, DiscoverySourceRecord[]>, record: DiscoverySourceRecord): void {
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

  for (const source of resolveLiveDiscoveryProviders()) {
    try {
      const result = await fetchDiscoverySource(source, selectedDomain);
      for (const record of result.records) {
        addDiscoveryRecord(recordBuckets, record);
      }
      providerSummaries.push({
        kind: "live-provider",
        source,
        query: config.providerQueries[source],
        fetchedCount: result.fetchedCount,
        acceptedCount: result.records.length,
        failed: false,
        error: null,
        totalHits: result.totalHits,
        truncated: result.truncated
      });
    } catch (error) {
      providerSummaries.push({
        kind: "live-provider",
        source,
        query: config.providerQueries[source],
        fetchedCount: 0,
        acceptedCount: 0,
        failed: true,
        error: error instanceof Error ? error.message : String(error),
        totalHits: null,
        truncated: false
      });
    }
  }

  const importSummary = await parseOptionalInput(
    join(discoveryDir, "import-summary.json"),
    DiscoveryImportSummarySchema
  );
  const mergedImports = await parseOptionalInput(
    join(discoveryDir, "imported-source-records.json"),
    MergedDiscoveryImportFileSchema
  );
  if (mergedImports) {
    const importedCounts = new Map<string, { fetched: number; accepted: number }>();
    for (const rawRecord of mergedImports.records) {
      const current = importedCounts.get(rawRecord.source) ?? { fetched: 0, accepted: 0 };
      current.fetched += 1;
      const mappedRecord = toDiscoveryRecord(rawRecord, selectedDomain);
      if (mappedRecord) {
        addDiscoveryRecord(recordBuckets, mappedRecord);
        current.accepted += 1;
      }
      importedCounts.set(rawRecord.source, current);
    }
    for (const [source, counts] of [...importedCounts.entries()].sort(([left], [right]) => left.localeCompare(right))) {
      providerSummaries.push({
        kind: "import",
        source: DiscoveryPaperSchema.shape.sourceTypes.element.parse(source),
        label: "imported-source-records.json",
        fetchedCount: counts.fetched,
        acceptedCount: counts.accepted,
        failed: false,
        error: null
      });
    }
  }

  const manualImport = await parseOptionalInput(
    join(discoveryDir, "manual-source-records.json"),
    ManualDiscoveryImportFileSchema
  );
  if (manualImport && manualImport.records.length > 0) {
    let acceptedCount = 0;
    for (const record of manualImport.records) {
      const mappedRecord = toDiscoveryRecord(record, selectedDomain);
      if (mappedRecord) {
        addDiscoveryRecord(recordBuckets, mappedRecord);
        acceptedCount += 1;
      }
    }
    providerSummaries.push({
      kind: "manual",
      source: "manual",
      label: "manual-source-records.json",
      fetchedCount: manualImport.records.length,
      acceptedCount,
      failed: false,
      error: null
    });
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
    ...computeDegradationState({
      providerSummaries,
      importSummary,
      mergedImports
    }),
    providerSummaries,
    papers
  });

  const jsonPath = join(discoveryDir, "discovery-snapshot.json");
  const markdownPath = join(discoveryDir, "discovery-snapshot.md");
  const previousSnapshot = await readOptionalJson<DiscoverySnapshot>(jsonPath);
  const stableSnapshot =
    previousSnapshot &&
    JSON.stringify({ ...previousSnapshot, generatedAt: null }) ===
      JSON.stringify({ ...snapshot, generatedAt: null })
      ? previousSnapshot
      : snapshot;

  await mkdir(discoveryDir, { recursive: true });
  const nextJson = JSON.stringify(stableSnapshot, null, 2);
  const nextMarkdown = renderMarkdown(stableSnapshot);
  const previousJson = previousSnapshot ? JSON.stringify(previousSnapshot, null, 2) : null;
  const previousMarkdown = await readOptionalText(markdownPath);

  if (previousJson !== nextJson) {
    await writeFile(jsonPath, nextJson, "utf8");
  }
  if (previousMarkdown !== nextMarkdown) {
    await writeFile(markdownPath, nextMarkdown, "utf8");
  }

  console.log(
    JSON.stringify(
      {
        domain: selectedDomain,
        totalCandidates: stableSnapshot.totalCandidates,
        providerFailures: stableSnapshot.providerSummaries.filter(
          (summary) => summary.kind === "live-provider" && summary.failed
        ).length,
        isDegraded: stableSnapshot.isDegraded,
        topTitle: stableSnapshot.papers[0]?.title ?? null
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
