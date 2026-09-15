import { getDomain } from "../../shared/src/domains/index.js";
import {
  type CryoPaper,
  type DomainId,
  EvidenceAuthoritySummarySchema,
  type EvidenceAuthoritySummary,
  type EvidenceSnippet,
  type EvidenceAuthorityTier,
  type EvidenceExplicitness,
  type EvidenceSourceType,
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

  return `${getDomain(domain).extraction.sourceContextPrefix}. ${parts.join(" ")}`;
}

export function enrichmentEvidenceSnippets(
  record: SourceEnrichmentRecord | undefined
): Array<{
  text: string;
  confidence: number;
  sourceType: EvidenceSourceType;
  authorityTier: EvidenceAuthorityTier;
  explicitness: EvidenceExplicitness;
  reviewed: boolean;
}> {
  if (!record || record.status !== "reviewed") {
    return [];
  }

  const reviewerNotes = record.reviewerNotes?.toLowerCase() ?? "";
  const recordAuthority: EvidenceAuthorityTier = /secondary-source|secondary rather than the original|secondary review/i.test(
    reviewerNotes
  )
    ? "secondary"
    : "manual-curation";

  return record.excerpts
    .filter((excerpt) => excerpt.reviewed && excerpt.text.trim().length > 0)
    .map((excerpt: SourceEnrichmentExcerpt) => ({
      text: `${excerpt.label}: ${excerpt.text}`.trim(),
      confidence: excerpt.confidence ?? 0.92,
      sourceType: excerpt.source,
      authorityTier:
        excerpt.source === "full-text" || excerpt.source === "methods" || excerpt.source === "results"
          ? recordAuthority === "secondary"
            ? "secondary"
            : "primary-direct"
          : excerpt.source === "discussion"
            ? recordAuthority === "secondary"
              ? "secondary"
              : "primary-indirect"
            : recordAuthority,
      explicitness:
        /results|viability|function|transplant|survival|recovery|yield|morpholog|histolog/i.test(excerpt.label)
          ? "direct"
          : excerpt.source === "manual-note"
            ? "indirect"
            : "indirect",
      reviewed: true
    }));
}

const AUTHORITY_RANK: EvidenceAuthorityTier[] = [
  "primary-direct",
  "primary-indirect",
  "manual-curation",
  "secondary",
  "derived"
];

export function summarizeEvidenceAuthority(snippets: EvidenceSnippet[]): EvidenceAuthoritySummary {
  const summary = {
    strongestAuthority: "derived" as EvidenceAuthorityTier,
    primaryDirectSnippetCount: 0,
    primaryIndirectSnippetCount: 0,
    secondarySnippetCount: 0,
    manualCurationSnippetCount: 0,
    reviewedSnippetCount: 0,
    directSnippetCount: 0,
    indirectSnippetCount: 0,
    inferredSnippetCount: 0
  };

  for (const snippet of snippets) {
    if (
      AUTHORITY_RANK.indexOf(snippet.authorityTier) < AUTHORITY_RANK.indexOf(summary.strongestAuthority)
    ) {
      summary.strongestAuthority = snippet.authorityTier;
    }

    if (snippet.authorityTier === "primary-direct") {
      summary.primaryDirectSnippetCount += 1;
    } else if (snippet.authorityTier === "primary-indirect") {
      summary.primaryIndirectSnippetCount += 1;
    } else if (snippet.authorityTier === "secondary") {
      summary.secondarySnippetCount += 1;
    } else if (snippet.authorityTier === "manual-curation") {
      summary.manualCurationSnippetCount += 1;
    }

    if (snippet.reviewed) {
      summary.reviewedSnippetCount += 1;
    }

    if (snippet.explicitness === "direct") {
      summary.directSnippetCount += 1;
    } else if (snippet.explicitness === "indirect") {
      summary.indirectSnippetCount += 1;
    } else {
      summary.inferredSnippetCount += 1;
    }
  }

  return EvidenceAuthoritySummarySchema.parse(summary);
}
