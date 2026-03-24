import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPromotionReviewItem,
  buildTrackedKeys,
  noveltyBasisForPaper,
  promotionRisksForPaper,
  recommendationForPaper
} from "./review.js";
import {
  DomainSnapshotSchema,
  DiscoveryPaperSchema,
  type DiscoveryPromotionDecision
} from "../../shared/src/schema.js";

const domainSnapshot = DomainSnapshotSchema.parse({
  generatedAt: "2026-03-24T00:00:00.000Z",
  domain: "islets",
  totalFetched: 1,
  totalMatched: 1,
  papers: [
    {
      domain: "islets",
      score: 9,
      matchedKeywords: ["islet", "cryopreservation"],
      paper: {
        id: "tracked-1",
        paper_id: "tracked-paper-1",
        doi: "10.1000/tracked",
        title: "Tracked islet cryopreservation paper",
        abstract: "Tracked abstract"
      }
    }
  ]
});

const novelPaper = DiscoveryPaperSchema.parse({
  domain: "islets",
  dedupeKey: "doi:10.1038/s41591-022-01718-1",
  title: "Pancreatic islet cryopreservation by vitrification achieves high viability, function, recovery and clinical scalability for transplantation",
  abstract: "Cryopreservation and transplantation study for pancreatic islets.",
  doi: "10.1038/s41591-022-01718-1",
  pmid: "35288694",
  pmcid: "PMC9018423",
  journal: "Nature Medicine",
  publishedYear: 2022,
  authorsFlat: "Author A; Author B",
  sourceCount: 1,
  sources: [
    {
      source: "pubmed",
      sourceId: "pubmed:35288694",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/35288694/",
      rawQuery: "pancreatic islet cryopreservation vitrification",
      title: "Pancreatic islet cryopreservation by vitrification achieves high viability, function, recovery and clinical scalability for transplantation",
      abstract: "Cryopreservation and transplantation study for pancreatic islets.",
      doi: "10.1038/s41591-022-01718-1",
      pmid: "35288694",
      pmcid: "PMC9018423",
      journal: "Nature Medicine",
      publishedYear: 2022,
      authorsFlat: "Author A; Author B",
      citationCount: 0,
      fullTextAvailability: "open-access-full-text",
      matchedKeywords: ["islet", "cryopreservation", "transplantation", "vitrification"],
      relevanceScore: 13.9
    }
  ],
  matchedKeywords: ["islet", "cryopreservation", "transplantation", "vitrification"],
  sourceTypes: ["pubmed"],
  fullTextAvailability: "open-access-full-text",
  relevanceScore: 13.9,
  authorityScore: 0.3,
  sourceDiversityScore: 0.167,
  rankingScore: 14.367
});

test("recommendationForPaper promotes high-signal open-access candidates", () => {
  const result = recommendationForPaper(novelPaper);
  assert.equal(result.recommendation, "promote");
  assert.ok(result.reasons.includes("open-access full text is available"));
  assert.ok(result.reasons.includes("domain relevance score is high"));
});

test("noveltyBasisForPaper checks DOI and title against current slice", () => {
  const trackedKeys = buildTrackedKeys(domainSnapshot);
  const basis = noveltyBasisForPaper(novelPaper, trackedKeys);
  assert.ok(basis.includes("doi-not-in-current-slice"));
  assert.ok(basis.includes("title-not-in-current-slice"));
  assert.ok(basis.includes("pmid-available-for-review"));
});

test("promotionRisksForPaper flags single-source evidence", () => {
  const risks = promotionRisksForPaper(novelPaper);
  assert.ok(risks.includes("single-source evidence; cross-source confirmation is still missing"));
  assert.equal(risks.includes("full experimental detail may still require a landing-page or subscription review"), false);
});

test("buildPromotionReviewItem preserves source provenance and review framing", () => {
  const trackedKeys = buildTrackedKeys(domainSnapshot);
  const decision: DiscoveryPromotionDecision = {
    dedupeKey: novelPaper.dedupeKey,
    title: novelPaper.title,
    doi: novelPaper.doi ?? null,
    pmid: novelPaper.pmid ?? null,
    decision: "pending",
    recommendation: "promote",
    recommendationReasons: [
      "open-access full text is available",
      "authority score is directionally promising",
      "domain relevance score is high"
    ],
    rankingScore: novelPaper.rankingScore,
    relevanceScore: novelPaper.relevanceScore,
    authorityScore: novelPaper.authorityScore,
    sourceDiversityScore: novelPaper.sourceDiversityScore,
    sourceCount: novelPaper.sourceCount,
    sourceTypes: novelPaper.sourceTypes,
    fullTextAvailability: novelPaper.fullTextAvailability,
    matchedKeywords: novelPaper.matchedKeywords
  };

  const item = buildPromotionReviewItem(novelPaper, decision, trackedKeys);
  assert.equal(item.sources[0]?.source, "pubmed");
  assert.ok(item.noveltyBasis.includes("doi-not-in-current-slice"));
  assert.ok(item.reviewChecklist.includes("look for corroborating records from a second literature source"));
});
