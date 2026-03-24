import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  BenchmarkFileSchema,
  DomainSnapshotSchema,
  type BenchmarkEntry,
  type DomainId,
  type DomainPaper
} from "../../shared/src/schema.js";
import { buildOptimizerFeatureVector } from "./features.js";
import { OptimizerBenchmarkSchema, type OptimizerBenchmarkCandidate, type OptimizerPolicy } from "./schema.js";

function buildHeuristicFingerprint(policy: OptimizerPolicy): string {
  return createHash("sha256").update(JSON.stringify(policy.heuristics)).digest("hex");
}

function buildCandidate(
  domainPaper: DomainPaper,
  benchmarkEntry: BenchmarkEntry,
  policy: OptimizerPolicy
): OptimizerBenchmarkCandidate {
  const retrievalScore = Number(Math.max(0, Math.min(1, domainPaper.score / 20)).toFixed(4));
  const keywordDensity = Number(Math.max(0, Math.min(1, domainPaper.matchedKeywords.length / 10)).toFixed(4));
  const metadataAuthority = Number(
    Math.min(
      1,
      (domainPaper.paper.doi ? 0.15 : 0) +
        (domainPaper.paper.journal ? 0.1 : 0) +
        ((domainPaper.paper.published_year ?? 0) >= 2015 ? 0.05 : 0)
    ).toFixed(4)
  );

  return {
    domain: domainPaper.domain,
    paperId: domainPaper.paper.id,
    title: domainPaper.paper.title,
    label: benchmarkEntry.expectedInAtlas ? "promote" : "defer",
    reviewStatus: "reviewed",
    expectedInAtlas: benchmarkEntry.expectedInAtlas,
    metadata: {
      doi: domainPaper.paper.doi ?? null,
      journal: domainPaper.paper.journal ?? null,
      publishedYear: domainPaper.paper.published_year ?? null,
      matchedKeywords: domainPaper.matchedKeywords
    },
    features: buildOptimizerFeatureVector(
      {
        title: domainPaper.paper.title,
        abstract: domainPaper.paper.abstract,
        doi: domainPaper.paper.doi ?? null,
        journal: domainPaper.paper.journal ?? null,
        publishedYear: domainPaper.paper.published_year ?? null,
        matchedKeywords: domainPaper.matchedKeywords,
        retrievalScore,
        // The benchmark is still a proxy, so discovery-native features are deterministically
        // approximated from the current matched corpus instead of pulled from live discovery.
        discoveryRankingScore: Number((retrievalScore * 15).toFixed(4)),
        discoveryRelevanceScore: Number((keywordDensity * 15).toFixed(4)),
        authorityScore: metadataAuthority
      },
      policy
    )
  };
}

export async function buildOptimizerBenchmark(input: {
  rootDir: string;
  domains: DomainId[];
  policy: OptimizerPolicy;
}) {
  const candidates: OptimizerBenchmarkCandidate[] = [];
  const missingReviewedEntries: Array<{ domain: DomainId; paperId: string; title: string }> = [];

  for (const domain of input.domains) {
    const domainSnapshot = DomainSnapshotSchema.parse(
      JSON.parse(await readFile(join(input.rootDir, "data", "processed", domain, "domain-snapshot.json"), "utf8"))
    );
    const benchmark = BenchmarkFileSchema.parse(
      JSON.parse(await readFile(join(input.rootDir, "data", "benchmarks", domain, "gold-set.json"), "utf8"))
    );
    const reviewedEntries = benchmark.entries.filter((entry) => entry.reviewStatus === "reviewed");
    const papersById = new Map(domainSnapshot.papers.map((paper) => [paper.paper.id, paper]));

    for (const entry of reviewedEntries) {
      const paper = papersById.get(entry.paperId);
      if (!paper) {
        missingReviewedEntries.push({
          domain,
          paperId: entry.paperId,
          title: entry.title
        });
        continue;
      }
      candidates.push(buildCandidate(paper, entry, input.policy));
    }
  }

  if (missingReviewedEntries.length > 0) {
    throw new Error(
      [
        "Optimizer benchmark coverage mismatch.",
        ...missingReviewedEntries.map(
          (entry) => `${entry.domain}:${entry.paperId}:${entry.title}`
        )
      ].join(" ")
    );
  }

  const benchmark = OptimizerBenchmarkSchema.parse({
    generatedAt: new Date().toISOString(),
    description:
      "Optimizer benchmark derived from reviewed gold-set labels joined against the current matched domain corpus, with deterministic proxy discovery features inferred from retrieval and metadata. It is additive and does not modify atlas outputs.",
    heuristicFingerprint: buildHeuristicFingerprint(input.policy),
    domains: input.domains,
    candidateCount: candidates.length,
    positiveCount: candidates.filter((candidate) => candidate.label === "promote").length,
    negativeCount: candidates.filter((candidate) => candidate.label === "defer").length,
    candidates
  });

  return benchmark;
}
