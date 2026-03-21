import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  DomainIdSchema,
  SourceEnrichmentFileSchema,
  SourceEnrichmentPrioritySchema,
  SourceEnrichmentStatusSchema,
  type DomainId,
  type SourceEnrichmentFile,
  type SourceEnrichmentPriority,
  type SourceEnrichmentRecord,
  type SourceEnrichmentStatus
} from "../packages/shared/src/schema.js";

const domain = DomainIdSchema.parse(process.argv[2] ?? "ovarian-tissue");

type BenchmarkAnalysis = {
  domain: DomainId;
  reviewedDepth: {
    missingOutcomes: Array<{
      paperId: string;
      title: string;
      protocolFamily?: string;
      paperType?: string;
      doi?: string | null;
      paperUrl?: string | null;
      evidenceStatus?: "extractor-gap" | "ambiguous-evidence" | "evidence-thin";
      evidenceReason?: string;
    }>;
    missingStepPhases: Array<{
      paperId: string;
      title: string;
      protocolFamily?: string;
      paperType?: string;
      doi?: string | null;
      paperUrl?: string | null;
    }>;
  };
};

function priorityRank(priority: SourceEnrichmentPriority): number {
  switch (priority) {
    case "extractor-gap":
      return 0;
    case "ambiguous-evidence":
      return 1;
    case "evidence-thin":
      return 2;
    case "step-phase-manual":
      return 3;
  }
}

function statusRank(status: SourceEnrichmentStatus): number {
  switch (status) {
    case "in-progress":
      return 0;
    case "pending":
      return 1;
    case "reviewed":
      return 2;
    case "rejected":
      return 3;
  }
}

function defaultRationale(priority: SourceEnrichmentPriority, title: string): string {
  switch (priority) {
    case "extractor-gap":
      return `Outcome evidence for "${title}" likely already exists in the current source text, so enrichment should focus on verifying or clarifying the missed signal.`;
    case "ambiguous-evidence":
      return `Outcome signal for "${title}" is directionally promising but too ambiguous in the current abstract/title; enrich with fuller methods/results text before promotion.`;
    case "evidence-thin":
      return `Current title/abstract for "${title}" is mostly procedural. Enrich only if fuller source text is available; otherwise keep unlabeled.`;
    case "step-phase-manual":
      return `Step phases for "${title}" still require manual or fuller-source confirmation before benchmark promotion.`;
  }
}

function mergeRecord(
  existing: SourceEnrichmentRecord | undefined,
  incoming: Omit<SourceEnrichmentRecord, "status" | "excerpts">,
  fallbackStatus: SourceEnrichmentStatus
): SourceEnrichmentRecord {
  return SourceEnrichmentFileSchema.shape.records.element.parse({
    ...incoming,
    status: existing?.status ?? fallbackStatus,
    reviewerNotes: existing?.reviewerNotes,
    excerpts: existing?.excerpts ?? []
  });
}

function renderMarkdown(domainId: DomainId, enrichmentFile: SourceEnrichmentFile): string {
  const lines: string[] = [];
  lines.push(`# ${domainId} source enrichment queue`);
  lines.push("");

  const groups: Array<{ priority: SourceEnrichmentPriority; title: string }> = [
    { priority: "extractor-gap", title: "Extractor gaps" },
    { priority: "ambiguous-evidence", title: "Ambiguous evidence" },
    { priority: "evidence-thin", title: "Evidence-thin" },
    { priority: "step-phase-manual", title: "Step-phase manual review" }
  ];

  for (const group of groups) {
    const records = enrichmentFile.records.filter((record) => record.priority === group.priority);
    lines.push(`## ${group.title}`);
    if (records.length === 0) {
      lines.push("- none");
      lines.push("");
      continue;
    }

    for (const record of records) {
      lines.push(`- [${record.status}] ${record.title}`);
      lines.push(`  paperId=${record.paperId}`);
      lines.push(`  rationale=${record.rationale}`);
      if (record.doi) {
        lines.push(`  doi=${record.doi}`);
      } else if (record.paperUrl) {
        lines.push(`  source=${record.paperUrl}`);
      }
      if (record.reviewerNotes) {
        lines.push(`  reviewerNotes=${record.reviewerNotes}`);
      }
      if (record.excerpts.length > 0) {
        lines.push(`  reviewedExcerpts=${record.excerpts.length}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function main(selectedDomain: DomainId): Promise<void> {
  const processedDir = join(process.cwd(), "data", "processed", selectedDomain);
  const curatedDir = join(process.cwd(), "data", "curated", selectedDomain);
  const analysis = JSON.parse(
    await readFile(join(processedDir, "benchmark-analysis.json"), "utf8")
  ) as BenchmarkAnalysis;

  await mkdir(curatedDir, { recursive: true });

  let existing: SourceEnrichmentFile | undefined;
  try {
    existing = SourceEnrichmentFileSchema.parse(
      JSON.parse(await readFile(join(curatedDir, "source-enrichment.json"), "utf8"))
    );
  } catch {
    existing = undefined;
  }

  const existingByPaperId = new Map(existing?.records.map((record) => [record.paperId, record]) ?? []);
  const nextRecords = new Map<string, SourceEnrichmentRecord>();

  for (const entry of analysis.reviewedDepth.missingOutcomes) {
    const priority = SourceEnrichmentPrioritySchema.parse(entry.evidenceStatus ?? "evidence-thin");
    const existingRecord = existingByPaperId.get(entry.paperId);
    nextRecords.set(
      entry.paperId,
      mergeRecord(
        existingRecord,
        {
          paperId: entry.paperId,
          title: entry.title,
          doi: entry.doi ?? undefined,
          paperUrl: entry.paperUrl ?? undefined,
          priority,
          rationale: entry.evidenceReason ?? defaultRationale(priority, entry.title)
        },
        "pending"
      )
    );
  }

  for (const entry of analysis.reviewedDepth.missingStepPhases) {
    const existingRecord = nextRecords.get(entry.paperId) ?? existingByPaperId.get(entry.paperId);
    if (existingRecord && existingRecord.priority !== "step-phase-manual") {
      continue;
    }

    nextRecords.set(
      entry.paperId,
      mergeRecord(
        existingRecord,
        {
          paperId: entry.paperId,
          title: entry.title,
          doi: entry.doi ?? undefined,
          paperUrl: entry.paperUrl ?? undefined,
          priority: "step-phase-manual",
          rationale: defaultRationale("step-phase-manual", entry.title)
        },
        existingRecord?.status ?? "pending"
      )
    );
  }

  for (const record of existing?.records ?? []) {
    if (record.status === "reviewed" || record.status === "rejected") {
      nextRecords.set(record.paperId, record);
    }
  }

  const records = Array.from(nextRecords.values()).sort(
    (left, right) =>
      priorityRank(left.priority) - priorityRank(right.priority) ||
      statusRank(left.status) - statusRank(right.status) ||
      left.title.localeCompare(right.title)
  );

  const nextFile = SourceEnrichmentFileSchema.parse({
    generatedAt: new Date().toISOString(),
    domain: selectedDomain,
    records
  });

  await writeFile(join(curatedDir, "source-enrichment.json"), JSON.stringify(nextFile, null, 2), "utf8");
  await writeFile(join(curatedDir, "source-enrichment.md"), renderMarkdown(selectedDomain, nextFile), "utf8");

  console.log(
    JSON.stringify(
      {
        domain: selectedDomain,
        recordCount: nextFile.records.length,
        reviewedCount: nextFile.records.filter((record) => record.status === "reviewed").length,
        pendingCount: nextFile.records.filter((record) => record.status === "pending").length
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
