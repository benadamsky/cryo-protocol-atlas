import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { DiscoveryPaperSchema, DomainSnapshotSchema, BenchmarkFileSchema } from "../../shared/src/schema.js";
import {
  applyMutation,
  buildOptimizerBenchmark,
  evaluateOptimizerPolicy,
  mutationSignature,
  optimizerPolicy,
  recommendDiscoveryPaper,
  readOptimizerProgram,
  renderPolicyFile
} from "./index.js";
import { OptimizerBenchmarkSchema } from "./schema.js";

test("buildOptimizerBenchmark fails when reviewed benchmark coverage is missing", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "optimizer-benchmark-"));
  await mkdir(join(rootDir, "data", "processed", "islets"), { recursive: true });
  await mkdir(join(rootDir, "data", "benchmarks", "islets"), { recursive: true });

  const snapshot = DomainSnapshotSchema.parse({
    generatedAt: "2026-03-24T00:00:00.000Z",
    domain: "islets",
    totalFetched: 1,
    totalMatched: 1,
    papers: [
      {
        domain: "islets",
        paper: {
          id: "paper-a",
          title: "Paper A",
          abstract: "Cryopreservation study",
          doi: null,
          journal: null,
          published_year: 2020
        },
        score: 10,
        matchedKeywords: ["islets", "cryopreservation"]
      }
    ]
  });
  const benchmark = BenchmarkFileSchema.parse({
    generatedAt: "2026-03-24T00:00:00.000Z",
    domain: "islets",
    description: "test",
    entries: [
      {
        paperId: "paper-a",
        title: "Paper A",
        reviewStatus: "reviewed",
        expectedInAtlas: true
      },
      {
        paperId: "paper-missing",
        title: "Paper Missing",
        reviewStatus: "reviewed",
        expectedInAtlas: false
      }
    ]
  });

  await writeFile(
    join(rootDir, "data", "processed", "islets", "domain-snapshot.json"),
    JSON.stringify(snapshot, null, 2),
    "utf8"
  );
  await writeFile(
    join(rootDir, "data", "benchmarks", "islets", "gold-set.json"),
    JSON.stringify(benchmark, null, 2),
    "utf8"
  );

  await assert.rejects(
    () =>
      buildOptimizerBenchmark({
        rootDir,
        domains: ["islets"],
        policy: optimizerPolicy
      }),
    /Optimizer benchmark coverage mismatch/
  );
});

test("evaluateOptimizerPolicy aggregates metrics from corpus-level counts", () => {
  const benchmark = OptimizerBenchmarkSchema.parse({
    generatedAt: "2026-03-24T00:00:00.000Z",
    description: "test",
    heuristicFingerprint: "test",
    domains: ["islets", "ovarian-tissue"],
    candidateCount: 5,
    positiveCount: 3,
    negativeCount: 2,
    candidates: [
      {
        domain: "islets",
        paperId: "a-pos",
        title: "A positive",
        label: "promote",
        reviewStatus: "reviewed",
        expectedInAtlas: true,
        metadata: { doi: null, journal: null, publishedYear: null, matchedKeywords: [] },
        features: {
          retrievalScore: 1,
          matchedKeywordCount: 0,
          titleProtocolHits: 0,
          titleExperimentalHits: 0,
          abstractProtocolHits: 0,
          abstractOutcomeHits: 0,
          negativeSignalHits: 0,
          doiPresent: 0,
          journalPresent: 0,
          recentYear: 0,
          discoveryRankingScore: 0,
          discoveryRelevanceScore: 0,
          authorityScore: 0,
          sourceDiversityScore: 0,
          multiSourceEvidence: 0,
          fullTextLink: 0,
          openAccessFullText: 0
        }
      },
      {
        domain: "islets",
        paperId: "a-neg",
        title: "A negative",
        label: "defer",
        reviewStatus: "reviewed",
        expectedInAtlas: false,
        metadata: { doi: null, journal: null, publishedYear: null, matchedKeywords: [] },
        features: {
          retrievalScore: 0,
          matchedKeywordCount: 0,
          titleProtocolHits: 0,
          titleExperimentalHits: 0,
          abstractProtocolHits: 0,
          abstractOutcomeHits: 0,
          negativeSignalHits: 0,
          doiPresent: 0,
          journalPresent: 0,
          recentYear: 0,
          discoveryRankingScore: 0,
          discoveryRelevanceScore: 0,
          authorityScore: 0,
          sourceDiversityScore: 0,
          multiSourceEvidence: 0,
          fullTextLink: 0,
          openAccessFullText: 0
        }
      },
      {
        domain: "ovarian-tissue",
        paperId: "b-pos-1",
        title: "B positive 1",
        label: "promote",
        reviewStatus: "reviewed",
        expectedInAtlas: true,
        metadata: { doi: null, journal: null, publishedYear: null, matchedKeywords: [] },
        features: {
          retrievalScore: 0.5,
          matchedKeywordCount: 0,
          titleProtocolHits: 0,
          titleExperimentalHits: 0,
          abstractProtocolHits: 0,
          abstractOutcomeHits: 0,
          negativeSignalHits: 0,
          doiPresent: 0,
          journalPresent: 0,
          recentYear: 0,
          discoveryRankingScore: 0,
          discoveryRelevanceScore: 0,
          authorityScore: 0,
          sourceDiversityScore: 0,
          multiSourceEvidence: 0,
          fullTextLink: 0,
          openAccessFullText: 0
        }
      },
      {
        domain: "ovarian-tissue",
        paperId: "b-pos-2",
        title: "B positive 2",
        label: "promote",
        reviewStatus: "reviewed",
        expectedInAtlas: true,
        metadata: { doi: null, journal: null, publishedYear: null, matchedKeywords: [] },
        features: {
          retrievalScore: 0.4,
          matchedKeywordCount: 0,
          titleProtocolHits: 0,
          titleExperimentalHits: 0,
          abstractProtocolHits: 0,
          abstractOutcomeHits: 0,
          negativeSignalHits: 0,
          doiPresent: 0,
          journalPresent: 0,
          recentYear: 0,
          discoveryRankingScore: 0,
          discoveryRelevanceScore: 0,
          authorityScore: 0,
          sourceDiversityScore: 0,
          multiSourceEvidence: 0,
          fullTextLink: 0,
          openAccessFullText: 0
        }
      },
      {
        domain: "ovarian-tissue",
        paperId: "b-neg",
        title: "B negative",
        label: "defer",
        reviewStatus: "reviewed",
        expectedInAtlas: false,
        metadata: { doi: null, journal: null, publishedYear: null, matchedKeywords: [] },
        features: {
          retrievalScore: 0.9,
          matchedKeywordCount: 0,
          titleProtocolHits: 0,
          titleExperimentalHits: 0,
          abstractProtocolHits: 0,
          abstractOutcomeHits: 0,
          negativeSignalHits: 0,
          doiPresent: 0,
          journalPresent: 0,
          recentYear: 0,
          discoveryRankingScore: 0,
          discoveryRelevanceScore: 0,
          authorityScore: 0,
          sourceDiversityScore: 0,
          multiSourceEvidence: 0,
          fullTextLink: 0,
          openAccessFullText: 0
        }
      }
    ]
  });

  const evaluation = evaluateOptimizerPolicy({
    benchmark,
    policy: {
      ...optimizerPolicy,
      weights: {
        ...optimizerPolicy.weights,
        bias: 0,
        retrievalScore: 1,
        matchedKeywordCount: 0,
        titleProtocolHits: 0,
        titleExperimentalHits: 0,
        abstractProtocolHits: 0,
        abstractOutcomeHits: 0,
        negativeSignalHits: 0,
        doiPresent: 0,
        journalPresent: 0,
        recentYear: 0,
        discoveryRankingScore: 0,
        discoveryRelevanceScore: 0,
        authorityScore: 0,
        sourceDiversityScore: 0,
        multiSourceEvidence: 0,
        fullTextLink: 0,
        openAccessFullText: 0
      },
      thresholds: {
        promote: 0.9,
        review: 0.4
      }
    }
  });

  assert.equal(evaluation.aggregate.rankingAccuracy, 0.6667);
  assert.equal(evaluation.aggregate.promotePrecision, 0.5);
  assert.equal(evaluation.aggregate.promoteRecall, 0.3333);
  assert.equal(evaluation.aggregate.reviewOrPromoteRecall, 1);
  assert.equal(evaluation.aggregate.deferPrecision, 1);
  assert.equal(evaluation.aggregate.objective, 0.6333);
});

test("applyMutation rejects stale mutation baselines", () => {
  const mutation = {
    path: "weights.bias",
    from: optimizerPolicy.weights.bias - 1,
    to: optimizerPolicy.weights.bias,
    delta: 1
  };

  assert.throws(() => applyMutation(optimizerPolicy, mutation), /Mutation baseline mismatch/);
  assert.equal(
    mutationSignature({
      path: "weights.bias",
      from: 1,
      to: 2,
      delta: 1
    }),
    "weights.bias:1:2"
  );
});

test("applyMutation rejects invalid numeric paths", () => {
  assert.throws(
    () =>
      applyMutation(optimizerPolicy, {
        path: "heuristics.protocolSignals",
        from: 0,
        to: 1,
        delta: 1
      }),
    /Invalid numeric path in policy/
  );

  assert.throws(
    () =>
      applyMutation(optimizerPolicy, {
        path: "weights.missingWeight",
        from: 0,
        to: 1,
        delta: 1
      }),
    /Invalid numeric path in policy/
  );
});

test("renderPolicyFile round-trips through a generated module", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "optimizer-policy-"));
  const filePath = join(rootDir, "policy.ts");
  const schemaPath = join(rootDir, "schema.js");
  await writeFile(
    schemaPath,
    `export * from ${JSON.stringify(pathToFileURL(join(process.cwd(), "packages", "optimizer", "src", "schema.ts")).href)};\n`,
    "utf8"
  );
  await writeFile(filePath, renderPolicyFile(optimizerPolicy), "utf8");

  const imported = await import(`${pathToFileURL(filePath).href}?t=${Date.now()}`);
  assert.deepEqual(imported.optimizerPolicy, optimizerPolicy);
});

test("readOptimizerProgram parses promote recall guardrails", async () => {
  const rootDir = await mkdtemp(join(tmpdir(), "optimizer-program-"));
  const filePath = join(rootDir, "program.md");
  await writeFile(
    filePath,
    [
      "# Optimizer Program",
      "",
      "- domains: islets, ovarian-tissue",
      "- max attempts: 12",
      "- max accepted mutations: 3",
      "- minimum score delta: 0.01",
      "- minimum promote precision: 0.8",
      "- minimum promote recall: 0.15"
    ].join("\n"),
    "utf8"
  );

  const program = await readOptimizerProgram(filePath);
  assert.deepEqual(program.domains, ["islets", "ovarian-tissue"]);
  assert.equal(program.maxAttempts, 12);
  assert.equal(program.maxAcceptedMutations, 3);
  assert.equal(program.minimumScoreDelta, 0.01);
  assert.equal(program.minimumPromotePrecision, 0.8);
  assert.equal(program.minimumPromoteRecall, 0.15);
});

test("recommendDiscoveryPaper uses optimizer policy for live discovery decisions", () => {
  const promoteCandidate = DiscoveryPaperSchema.parse({
    domain: "islets" as const,
    dedupeKey: "doi:10.1000/promote",
    title: "Pancreatic islet cryopreservation by vitrification improves insulin function",
    abstract: "Cryopreservation and transplantation study for pancreatic islets with viability outcomes.",
    doi: "10.1000/promote",
    pmid: "12345678",
    pmcid: null,
    journal: "Nature Medicine",
    publishedYear: 2024,
    authorsFlat: "Author A",
    sourceCount: 2,
    recordCount: 2,
    sources: [],
    matchedKeywords: ["islets", "cryopreservation", "transplantation", "vitrification", "insulin"],
    sourceTypes: ["pubmed", "openalex"],
    fullTextAvailability: "open-access-full-text",
    relevanceScore: 11.5,
    authorityScore: 0.45,
    sourceDiversityScore: 0.5,
    rankingScore: 12.45
  });
  const deferCandidate = DiscoveryPaperSchema.parse({
    ...promoteCandidate,
    dedupeKey: "doi:10.1000/defer",
    title: "Retrospective ovarian tissue preservation cohort note",
    abstract: "Clinical note with sparse cryopreservation detail.",
    doi: "10.1000/defer",
    pmid: "87654321",
    journal: "Archive Notes",
    publishedYear: 2001,
    sourceCount: 1,
    recordCount: 1,
    sources: [],
    matchedKeywords: ["ovarian tissue", "cryopreservation"],
    sourceTypes: ["pubmed"],
    fullTextAvailability: "abstract-only",
    relevanceScore: 3.8,
    authorityScore: 0.05,
    sourceDiversityScore: 0.167,
    rankingScore: 4.1
  });

  const promote = recommendDiscoveryPaper(promoteCandidate);
  const defer = recommendDiscoveryPaper(deferCandidate);

  assert.equal(promote.recommendation, "promote");
  assert.ok(promote.reasons.some((reason) => reason.includes("optimizer score")));
  assert.ok(promote.reasons.includes("candidate appears in multiple discovery sources"));
  assert.equal(defer.recommendation, "defer");
  assert.ok(defer.reasons.some((reason) => reason.includes("stayed below the review threshold")));
});
