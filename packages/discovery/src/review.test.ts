import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPromotionReviewItem,
  buildTrackedKeys,
  findMatchingExistingDecision,
  noveltyBasisForPaper,
  promotionRisksForPaper,
  recommendationForPaper
} from "./review.js";
import {
  DiscoveryPaperSchema,
  DomainSnapshotSchema,
  type DiscoveryPromotionDecision
} from "../../shared/src/schema.js";

const domainSnapshot = DomainSnapshotSchema.parse({
  generatedAt: "2026-03-24T00:00:00.000Z",
  domain: "islets",
  totalFetched: 2,
  totalMatched: 2,
  papers: [
    {
      domain: "islets",
      score: 9,
      matchedKeywords: ["islets", "cryopreservation"],
      paper: {
        id: "tracked-doi",
        paper_id: "tracked-paper-1",
        doi: "10.1000/tracked",
        title: "Tracked islet cryopreservation paper",
        abstract: "Tracked abstract"
      }
    },
    {
      domain: "islets",
      score: 8,
      matchedKeywords: ["islets", "transplantation"],
      paper: {
        id: "tracked-pmid",
        paper_id: "tracked-paper-2",
        pmid: "35288694",
        pmcid: "PMC9018423",
        title: "Tracked PMCID-only islet paper",
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
  pmid: "99999999",
  pmcid: "PMC9999999",
  journal: "Nature Medicine",
  publishedYear: 2022,
  authorsFlat: "Author A; Author B",
  sourceCount: 1,
  recordCount: 1,
  sources: [
    {
      source: "pubmed",
      sourceId: "pubmed:99999999",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/99999999/",
      rawQuery: "pancreatic islet cryopreservation vitrification",
      title: "Pancreatic islet cryopreservation by vitrification achieves high viability, function, recovery and clinical scalability for transplantation",
      abstract: "Cryopreservation and transplantation study for pancreatic islets.",
      doi: "10.1038/s41591-022-01718-1",
      pmid: "99999999",
      pmcid: "PMC9999999",
      journal: "Nature Medicine",
      publishedYear: 2022,
      authorsFlat: "Author A; Author B",
      citationCount: 30,
      fullTextAvailability: "open-access-full-text",
      matchedKeywords: ["islets", "cryopreservation", "transplantation", "vitrification"],
      relevanceScore: 8.1
    }
  ],
  matchedKeywords: ["islets", "cryopreservation", "transplantation", "vitrification"],
  sourceTypes: ["pubmed"],
  fullTextAvailability: "open-access-full-text",
  relevanceScore: 8.1,
  authorityScore: 0.6,
  sourceDiversityScore: 0.167,
  rankingScore: 8.867
});

const weakPaper = DiscoveryPaperSchema.parse({
  domain: "ovarian-tissue",
  dedupeKey: "doi:10.1000/weak",
  title: "Retrospective ovarian tissue preservation cohort note",
  abstract: "Clinical note with sparse cryopreservation detail.",
  doi: "10.1000/weak",
  pmid: "11111111",
  pmcid: null,
  journal: "Archive Notes",
  publishedYear: 2001,
  authorsFlat: "Author C",
  sourceCount: 1,
  recordCount: 1,
  sources: [
    {
      source: "pubmed",
      sourceId: "pubmed:11111111",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/11111111/",
      rawQuery: "ovarian tissue cryopreservation retrospective",
      title: "Retrospective ovarian tissue preservation cohort note",
      abstract: "Clinical note with sparse cryopreservation detail.",
      doi: "10.1000/weak",
      pmid: "11111111",
      pmcid: null,
      journal: "Archive Notes",
      publishedYear: 2001,
      authorsFlat: "Author C",
      citationCount: 1,
      fullTextAvailability: "abstract-only",
      matchedKeywords: ["ovarian tissue", "cryopreservation"],
      relevanceScore: 3.8
    }
  ],
  matchedKeywords: ["ovarian tissue", "cryopreservation"],
  sourceTypes: ["pubmed"],
  fullTextAvailability: "abstract-only",
  relevanceScore: 3.8,
  authorityScore: 0.05,
  sourceDiversityScore: 0.167,
  rankingScore: 4.1
});

test("recommendationForPaper promotes high-signal open-access candidates", () => {
  const result = recommendationForPaper(novelPaper);
  assert.equal(result.recommendation, "promote");
  assert.ok(result.reasons.some((reason) => reason.includes("optimizer score")));
  assert.ok(result.reasons.includes("open-access full text is available"));
  assert.ok(result.reasons.includes("domain relevance score is high"));
});

test("recommendationForPaper defers weak single-source candidates", () => {
  const result = recommendationForPaper(weakPaper);
  assert.equal(result.recommendation, "defer");
  assert.ok(result.reasons.some((reason) => reason.includes("stayed below the review threshold")));
});

test("buildTrackedKeys includes pmid and pmcid identities", () => {
  const trackedKeys = buildTrackedKeys(domainSnapshot);
  assert.ok(trackedKeys.has("pmid:35288694"));
  assert.ok(trackedKeys.has("pmcid:PMC9018423"));
});

test("noveltyBasisForPaper checks DOI and title against current slice", () => {
  const trackedKeys = buildTrackedKeys(domainSnapshot);
  const basis = noveltyBasisForPaper(novelPaper, trackedKeys);
  assert.ok(basis.includes("doi-not-in-current-slice"));
  assert.ok(basis.includes("title-not-in-current-slice"));
  assert.ok(basis.includes("pmid-available-for-review"));
});

test("findMatchingExistingDecision survives dedupe key changes through pmid identity", () => {
  const existingDecision: DiscoveryPromotionDecision = {
    dedupeKey: "pmid:99999999",
    title: novelPaper.title,
    doi: null,
    pmid: "99999999",
    pmcid: null,
    titleKey: "title:pancreatic islet cryopreservation by vitrification achieves high viability function recovery and clinical scalability for transplantation",
    decision: "promote",
    recommendation: "promote",
    recommendationReasons: ["existing review"],
    rankingScore: 7.2,
    relevanceScore: 7.2,
    authorityScore: 0.2,
    sourceDiversityScore: 0.167,
    sourceCount: 1,
    recordCount: 1,
    sourceTypes: ["pubmed"],
    fullTextAvailability: "open-access-full-text",
    matchedKeywords: ["islets", "cryopreservation"],
    staleEvidence: false
  };

  const match = findMatchingExistingDecision([existingDecision], novelPaper);
  assert.ok(match);
  assert.equal(match?.pmid, "99999999");
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
    pmcid: novelPaper.pmcid ?? null,
    titleKey: "title:pancreatic islet cryopreservation by vitrification achieves high viability function recovery and clinical scalability for transplantation",
    decision: "pending",
    recommendation: "promote",
    recommendationReasons: [
      "open-access full text is available",
      "authority score is high enough to justify direct promotion review",
      "domain relevance score is high"
    ],
    rankingScore: novelPaper.rankingScore,
    relevanceScore: novelPaper.relevanceScore,
    authorityScore: novelPaper.authorityScore,
    sourceDiversityScore: novelPaper.sourceDiversityScore,
    sourceCount: novelPaper.sourceCount,
    recordCount: novelPaper.recordCount,
    sourceTypes: novelPaper.sourceTypes,
    fullTextAvailability: novelPaper.fullTextAvailability,
    matchedKeywords: novelPaper.matchedKeywords,
    staleEvidence: false
  };

  const item = buildPromotionReviewItem(novelPaper, decision, trackedKeys);
  assert.equal(item.sources[0]?.source, "pubmed");
  assert.ok(item.noveltyBasis.includes("doi-not-in-current-slice"));
  assert.ok(item.reviewChecklist.includes("look for corroborating records from a second literature source"));
});
