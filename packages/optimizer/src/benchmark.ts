import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  BenchmarkFileSchema,
  DomainSnapshotSchema,
  type BenchmarkEntry,
  type DomainId,
  type DomainPaper
} from "../../shared/src/schema.js";
import { OptimizerBenchmarkSchema, type OptimizerBenchmarkCandidate, type OptimizerPolicy } from "./schema.js";

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").toLowerCase();
}

function countSignalHits(text: string, signals: string[]): number {
  let hitCount = 0;
  for (const signal of signals) {
    if (text.includes(signal.toLowerCase())) {
      hitCount += 1;
    }
  }
  return hitCount;
}

function clampUnit(value: number, max: number): number {
  if (max <= 0) {
    return 0;
  }
  return Number(Math.max(0, Math.min(1, value / max)).toFixed(4));
}

function normalizeYear(year: number | null | undefined): number {
  if (!year) {
    return 0;
  }
  return Number(Math.max(0, Math.min(1, (year - 1990) / 40)).toFixed(4));
}

function buildCandidate(
  domainPaper: DomainPaper,
  benchmarkEntry: BenchmarkEntry,
  policy: OptimizerPolicy
): OptimizerBenchmarkCandidate {
  const title = normalizeText(domainPaper.paper.title);
  const abstract = normalizeText(domainPaper.paper.abstract);
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
    features: {
      retrievalScore: clampUnit(domainPaper.score, 20),
      matchedKeywordCount: clampUnit(domainPaper.matchedKeywords.length, 10),
      titleProtocolHits: clampUnit(countSignalHits(title, policy.heuristics.protocolSignals), 5),
      titleExperimentalHits: clampUnit(countSignalHits(title, policy.heuristics.experimentalSignals), 5),
      abstractProtocolHits: clampUnit(countSignalHits(abstract, policy.heuristics.protocolSignals), 6),
      abstractOutcomeHits: clampUnit(countSignalHits(abstract, policy.heuristics.outcomeSignals), 6),
      negativeSignalHits: clampUnit(
        countSignalHits(`${title} ${abstract}`, policy.heuristics.negativeSignals),
        4
      ),
      doiPresent: domainPaper.paper.doi ? 1 : 0,
      journalPresent: domainPaper.paper.journal ? 1 : 0,
      recentYear: normalizeYear(domainPaper.paper.published_year)
    }
  };
}

export async function buildOptimizerBenchmark(input: {
  rootDir: string;
  domains: DomainId[];
  policy: OptimizerPolicy;
}) {
  const candidates: OptimizerBenchmarkCandidate[] = [];

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
        continue;
      }
      candidates.push(buildCandidate(paper, entry, input.policy));
    }
  }

  const benchmark = OptimizerBenchmarkSchema.parse({
    generatedAt: new Date().toISOString(),
    description:
      "Optimizer benchmark derived from reviewed gold-set labels joined against the current matched domain corpus. It is additive and does not modify atlas outputs.",
    domains: input.domains,
    candidateCount: candidates.length,
    positiveCount: candidates.filter((candidate) => candidate.label === "promote").length,
    negativeCount: candidates.filter((candidate) => candidate.label === "defer").length,
    candidates
  });

  return benchmark;
}
