import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  DiscoveryImportFileSchema,
  DiscoveryImportSummarySchema,
  DomainIdSchema,
  MergedDiscoveryImportFileSchema,
  ManualDiscoveryImportFileSchema,
  type DomainId,
  type DiscoveryImportRecord,
  type ManualDiscoveryRecord
} from "../packages/shared/src/schema.js";

const domain = DomainIdSchema.parse(process.argv[2] ?? "ovarian-tissue");
const allowEmpty = process.argv.includes("--allow-empty");

async function readOptionalFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function normalizeTitle(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function importIdentity(record: Pick<ManualDiscoveryRecord, "doi" | "pmid" | "pmcid" | "title"> & { source: string }): string {
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

function sortImportedRecords(records: DiscoveryImportRecord[]): DiscoveryImportRecord[] {
  return [...records].sort(
    (left, right) =>
      (right.publishedYear ?? 0) - (left.publishedYear ?? 0) ||
      left.source.localeCompare(right.source) ||
      left.title.localeCompare(right.title)
  );
}

async function main(selectedDomain: DomainId): Promise<void> {
  const discoveryDir = join(process.cwd(), "data", "discovery", selectedDomain);
  const importsDir = join(discoveryDir, "imports");
  const manualFilePath = join(discoveryDir, "manual-source-records.json");
  const mergedFilePath = join(discoveryDir, "imported-source-records.json");
  const summaryJsonPath = join(discoveryDir, "import-summary.json");
  const summaryMarkdownPath = join(discoveryDir, "import-summary.md");

  const [existingManualContent, existingMergedContent] = await Promise.all([
    readOptionalFile(manualFilePath),
    readOptionalFile(mergedFilePath)
  ]);

  const existingManualFile = existingManualContent
    ? ManualDiscoveryImportFileSchema.parse(JSON.parse(existingManualContent))
    : {
        generatedAt: new Date().toISOString(),
        domain: selectedDomain,
        records: []
      };
  const existingMergedFile = existingMergedContent
    ? MergedDiscoveryImportFileSchema.parse(JSON.parse(existingMergedContent))
    : null;

  const importedFiles = await readdir(importsDir).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  });
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

  const degradationReasons: string[] = [];
  const exactDedupedRecords = sortImportedRecords(
    Array.from(
      importedRecords.reduce((acc, record) => {
        acc.set(importIdentity(record), record);
        return acc;
      }, new Map<string, DiscoveryImportRecord>()).values()
    )
  );

  let mergedRecords = exactDedupedRecords;
  if (jsonFiles.length === 0 && existingMergedFile && !allowEmpty) {
    degradationReasons.push("no-import-files-present; preserved prior imported-source-records.json");
    mergedRecords = existingMergedFile.records;
  } else if (jsonFiles.length === 0 && !allowEmpty) {
    degradationReasons.push("no-import-files-present");
  }

  const nextMergedFile = MergedDiscoveryImportFileSchema.parse({
    generatedAt: new Date().toISOString(),
    domain: selectedDomain,
    isDegraded: degradationReasons.length > 0,
    degradationReasons,
    records: mergedRecords
  });

  const previousComparable = existingMergedContent
    ? JSON.stringify({ ...JSON.parse(existingMergedContent), generatedAt: null })
    : null;
  const nextComparable = JSON.stringify({ ...nextMergedFile, generatedAt: null });
  const stableMergedFile =
    previousComparable === nextComparable && existingMergedContent
      ? MergedDiscoveryImportFileSchema.parse(JSON.parse(existingMergedContent))
      : nextMergedFile;

  const manualOnlyCount = existingManualFile.records.length;
  const sourceBreakdown = stableMergedFile.records.reduce<Record<string, number>>((acc, record) => {
    acc[record.source] = (acc[record.source] ?? 0) + 1;
    return acc;
  }, {});

  const summary = DiscoveryImportSummarySchema.parse({
    domain: selectedDomain,
    importFileCount: jsonFiles.length,
    importedRecordCount: importedRecords.length,
    mergedImportedRecordCount: stableMergedFile.records.length,
    manualOnlyRecordCount: manualOnlyCount,
    importedSources,
    sourceBreakdown,
    isDegraded: stableMergedFile.isDegraded,
    degradationReasons: stableMergedFile.degradationReasons
  });

  const summaryMarkdown = [
    `# ${selectedDomain} discovery import summary`,
    "",
    `- import files: ${summary.importFileCount}`,
    `- imported records: ${summary.importedRecordCount}`,
    `- merged imported discovery records: ${summary.mergedImportedRecordCount}`,
    `- manual-only discovery records: ${summary.manualOnlyRecordCount}`,
    `- degraded imports: ${summary.isDegraded ? "yes" : "no"}`,
    `- imported sources: ${summary.importedSources.join(", ") || "none"}`,
    `- source breakdown: ${
      Object.entries(summary.sourceBreakdown)
        .map(([source, count]) => `${source}=${count}`)
        .join(", ") || "none"
    }`,
    ...(summary.degradationReasons.length > 0 ? [`- degradation reasons: ${summary.degradationReasons.join(" || ")}`] : []),
    ""
  ].join("\n");

  await mkdir(discoveryDir, { recursive: true });
  await writeFile(summaryJsonPath, JSON.stringify(summary, null, 2), "utf8");
  await writeFile(summaryMarkdownPath, summaryMarkdown, "utf8");

  const nextMergedContent = JSON.stringify(stableMergedFile, null, 2);
  if (existingMergedContent !== nextMergedContent) {
    await writeFile(mergedFilePath, nextMergedContent, "utf8");
  }

  console.log(JSON.stringify(summary, null, 2));
}

main(domain).catch((error) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
});
