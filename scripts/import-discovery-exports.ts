import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  DiscoveryImportFileSchema,
  DomainIdSchema,
  MergedDiscoveryImportFileSchema,
  ManualDiscoveryImportFileSchema,
  type DomainId,
  type DiscoveryImportRecord,
  type ManualDiscoveryRecord
} from "../packages/shared/src/schema.js";

const domain = DomainIdSchema.parse(process.argv[2] ?? "ovarian-tissue");

async function readOptionalFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

function normalizeTitle(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function dedupeKey(record: Pick<ManualDiscoveryRecord, "doi" | "pmid" | "pmcid" | "title">): string {
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

function preferString(values: Array<string | null | undefined>): string | null {
  const candidates = values.map((value) => value?.trim()).filter(Boolean) as string[];
  candidates.sort((left, right) => right.length - left.length);
  return candidates[0] ?? null;
}

function preferYear(values: Array<number | null | undefined>): number | null {
  const years = values.filter((value): value is number => Number.isInteger(value));
  years.sort((left, right) => right - left);
  return years[0] ?? null;
}

function mergeRecords(records: DiscoveryImportRecord[]): DiscoveryImportRecord {
  const preferredSource =
    records.find((record) => record.source !== "manual" && record.source !== "other")?.source ??
    records[0]?.source ??
    "manual";
  return {
    source: preferredSource,
    sourceId: preferString(records.map((record) => record.sourceId)) ?? crypto.randomUUID(),
    sourceUrl: preferString(records.map((record) => record.sourceUrl ?? null)),
    rawQuery: preferString(records.map((record) => record.rawQuery)) ?? "manual-import",
    title: preferString(records.map((record) => record.title)) ?? "untitled",
    abstract: preferString(records.map((record) => record.abstract ?? null)),
    doi: preferString(records.map((record) => record.doi ?? null)),
    pmid: preferString(records.map((record) => record.pmid ?? null)),
    pmcid: preferString(records.map((record) => record.pmcid ?? null)),
    journal: preferString(records.map((record) => record.journal ?? null)),
    publishedYear: preferYear(records.map((record) => record.publishedYear ?? null)),
    authorsFlat: preferString(records.map((record) => record.authorsFlat ?? null)),
    citationCount: Math.max(...records.map((record) => record.citationCount ?? 0), 0),
    fullTextAvailability: records.some((record) => record.fullTextAvailability === "open-access-full-text")
      ? "open-access-full-text"
      : records.some((record) => record.fullTextAvailability === "full-text-link")
        ? "full-text-link"
        : records.some((record) => record.fullTextAvailability === "abstract-only")
          ? "abstract-only"
          : "unknown"
  };
}

async function main(selectedDomain: DomainId): Promise<void> {
  const discoveryDir = join(process.cwd(), "data", "discovery", selectedDomain);
  const importsDir = join(discoveryDir, "imports");
  const manualFilePath = join(discoveryDir, "manual-source-records.json");
  const mergedFilePath = join(discoveryDir, "imported-source-records.json");
  const summaryJsonPath = join(discoveryDir, "import-summary.json");
  const summaryMarkdownPath = join(discoveryDir, "import-summary.md");

  const [existingManual, existingMerged] = await Promise.all([
    readOptionalFile(manualFilePath),
    readOptionalFile(mergedFilePath)
  ]);
  const existingManualFile = existingManual
    ? ManualDiscoveryImportFileSchema.parse(JSON.parse(existingManual))
    : {
        generatedAt: new Date().toISOString(),
        domain: selectedDomain,
        records: []
      };

  const importedFiles = await readdir(importsDir).catch(() => []);
  const jsonFiles = importedFiles.filter((name) => name.endsWith(".json")).sort();
  const importedRecords: DiscoveryImportRecord[] = [];
  const importedSources: string[] = [];

  for (const fileName of jsonFiles) {
    const filePath = join(importsDir, fileName);
    const parsed = DiscoveryImportFileSchema.parse(JSON.parse(await readFile(filePath, "utf8")));
    if (parsed.domain !== selectedDomain) {
      throw new Error(`Import file ${fileName} targets ${parsed.domain}, expected ${selectedDomain}`);
    }
    importedRecords.push(...parsed.records);
    importedSources.push(`${parsed.source}:${fileName}`);
  }

  const allRecords = importedRecords;
  const buckets = new Map<string, DiscoveryImportRecord[]>();
  for (const record of allRecords) {
    const key = dedupeKey(record);
    const bucket = buckets.get(key) ?? [];
    bucket.push(record);
    buckets.set(key, bucket);
  }

  const mergedRecords = Array.from(buckets.values())
    .map((bucket) => mergeRecords(bucket))
    .sort(
      (left, right) =>
        (right.publishedYear ?? 0) - (left.publishedYear ?? 0) ||
        left.title.localeCompare(right.title)
    );

  const nextMergedFile = MergedDiscoveryImportFileSchema.parse({
    generatedAt: new Date().toISOString(),
    domain: selectedDomain,
    records: mergedRecords
  });

  const previousComparable = existingMerged
    ? JSON.stringify({ ...JSON.parse(existingMerged), generatedAt: null })
    : null;
  const nextComparable = JSON.stringify({ ...nextMergedFile, generatedAt: null });
  const stableMergedFile =
    previousComparable === nextComparable && existingMerged
      ? MergedDiscoveryImportFileSchema.parse(JSON.parse(existingMerged))
      : nextMergedFile;

  const manualOnlyCount = existingManualFile.records.filter((record) => record.source === "manual").length;
  const sourceBreakdown = stableMergedFile.records.reduce<Record<string, number>>((acc, record) => {
    acc[record.source] = (acc[record.source] ?? 0) + 1;
    return acc;
  }, {});

  const summary = {
    domain: selectedDomain,
    importFileCount: jsonFiles.length,
    importedRecordCount: importedRecords.length,
    mergedImportedRecordCount: stableMergedFile.records.length,
    manualOnlyRecordCount: manualOnlyCount,
    importedSources,
    sourceBreakdown
  };

  const summaryMarkdown = [
    `# ${selectedDomain} discovery import summary`,
    "",
    `- import files: ${summary.importFileCount}`,
    `- imported records: ${summary.importedRecordCount}`,
    `- merged imported discovery records: ${summary.mergedImportedRecordCount}`,
    `- manual-only discovery records: ${summary.manualOnlyRecordCount}`,
    `- imported sources: ${summary.importedSources.join(", ") || "none"}`,
    `- source breakdown: ${
      Object.entries(summary.sourceBreakdown)
        .map(([source, count]) => `${source}=${count}`)
        .join(", ") || "none"
    }`,
    ""
  ].join("\n");

  await mkdir(discoveryDir, { recursive: true });
  await writeFile(summaryJsonPath, JSON.stringify(summary, null, 2), "utf8");
  await writeFile(summaryMarkdownPath, summaryMarkdown, "utf8");

  const nextMergedContent = JSON.stringify(stableMergedFile, null, 2);
  if (existingMerged !== nextMergedContent) {
    await writeFile(mergedFilePath, nextMergedContent, "utf8");
  }

  console.log(JSON.stringify(summary, null, 2));
}

main(domain).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
