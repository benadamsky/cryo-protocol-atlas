import {
  type CryoPaper,
  type DomainId,
  type SourceEnrichmentExcerpt,
  type SourceEnrichmentFile,
  type SourceEnrichmentRecord
} from "../../shared/src/schema.js";

export function selectReviewedEnrichmentRecord(
  sourceEnrichment: SourceEnrichmentFile | undefined,
  paper: CryoPaper
): SourceEnrichmentRecord | undefined {
  if (!sourceEnrichment) {
    return undefined;
  }

  return sourceEnrichment.records.find((record) => {
    if (record.status !== "reviewed") {
      return false;
    }

    return record.paperId === (paper.paper_id ?? paper.id);
  });
}

export function buildAugmentedSourceText(
  domain: DomainId,
  paper: CryoPaper,
  record: SourceEnrichmentRecord | undefined
): string {
  const reviewedExcerpts =
    record?.excerpts.filter((excerpt) => excerpt.reviewed && excerpt.text.trim().length > 0) ?? [];
  const parts = [
    paper.title,
    paper.abstract ?? "",
    ...reviewedExcerpts.map((excerpt) => `${excerpt.label}: ${excerpt.text}`)
  ].filter((part) => part.trim().length > 0);

  const prefix = domain === "islets" ? "Islet source context" : "Ovarian source context";
  return `${prefix}. ${parts.join(" ")}`;
}

export function enrichmentEvidenceSnippets(
  record: SourceEnrichmentRecord | undefined
): Array<{ text: string; confidence: number }> {
  if (!record || record.status !== "reviewed") {
    return [];
  }

  return record.excerpts
    .filter((excerpt) => excerpt.reviewed && excerpt.text.trim().length > 0)
    .map((excerpt: SourceEnrichmentExcerpt) => ({
      text: `${excerpt.label}: ${excerpt.text}`.trim(),
      confidence: excerpt.confidence ?? 0.92
    }));
}
