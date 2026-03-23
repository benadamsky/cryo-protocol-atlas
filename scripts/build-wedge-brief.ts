import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  BenchmarkFileSchema,
  DomainIdSchema,
  ExtractionSnapshotSchema,
  NormalizedProtocolSnapshotSchema,
  SourceEnrichmentFileSchema,
  type DomainId
} from "../packages/shared/src/schema.js";
import type { AtlasSummary } from "../packages/research/src/atlas.js";
import { buildDomainWedgeBrief, renderDomainWedgeBriefMarkdown } from "../packages/research/src/wedges.js";

const domain = DomainIdSchema.parse(process.argv[2] ?? "islets");

type BenchmarkAnalysis = {
  domain: string;
  resolved: {
    summary: {
      passesAllGates: boolean;
      reviewedOutcomeCoverage: number;
      reviewedStepPhaseCoverage: number;
      reviewedMinimumDepthReady: boolean;
    };
  };
  reviewedDepth: {
    missingOutcomeCount: number;
    missingStepPhaseCount: number;
    missingOutcomeAudit: {
      extractorGapCount: number;
      ambiguousEvidenceCount: number;
      evidenceThinCount: number;
    };
  };
};

async function maybeReadSourceEnrichment(path: string) {
  try {
    return SourceEnrichmentFileSchema.parse(JSON.parse(await readFile(path, "utf8")));
  } catch {
    return undefined;
  }
}

async function maybeReadNormalizedProtocols(path: string) {
  try {
    return NormalizedProtocolSnapshotSchema.parse(JSON.parse(await readFile(path, "utf8")));
  } catch {
    return undefined;
  }
}

async function main(selectedDomain: DomainId): Promise<void> {
  const processedDir = join(process.cwd(), "data", "processed", selectedDomain);
  const benchmarkDir = join(process.cwd(), "data", "benchmarks", selectedDomain);
  const curatedDir = join(process.cwd(), "data", "curated", selectedDomain);

  const snapshot = ExtractionSnapshotSchema.parse(
    JSON.parse(await readFile(join(processedDir, "resolved-extraction-snapshot.json"), "utf8"))
  );
  const atlas = JSON.parse(await readFile(join(processedDir, "atlas-summary.json"), "utf8")) as AtlasSummary;
  const benchmarkEntries = BenchmarkFileSchema.parse(
    JSON.parse(await readFile(join(benchmarkDir, "gold-set.json"), "utf8"))
  ).entries;
  const benchmarkAnalysis = JSON.parse(
    await readFile(join(processedDir, "benchmark-analysis.json"), "utf8")
  ) as BenchmarkAnalysis;
  const sourceEnrichment = await maybeReadSourceEnrichment(
    join(curatedDir, "source-enrichment.json")
  );
  const normalizedProtocols = await maybeReadNormalizedProtocols(
    join(processedDir, "normalized-protocols.json")
  );

  const brief = buildDomainWedgeBrief({
    snapshot,
    atlas,
    benchmarkAnalysis,
    benchmarkEntries,
    sourceEnrichment,
    normalizedProtocols
  });

  await mkdir(processedDir, { recursive: true });
  await writeFile(join(processedDir, "wedge-brief.json"), JSON.stringify(brief, null, 2), "utf8");
  await writeFile(join(processedDir, "wedge-brief.md"), renderDomainWedgeBriefMarkdown(brief), "utf8");

  console.log(
    JSON.stringify(
      {
        domain: selectedDomain,
        dominantProtocolFamily: brief.standardPattern.dominantProtocolFamily,
        reviewedOutcomeCoverage: brief.evidenceQuality.reviewedOutcomeCoverage,
        reviewedStepPhaseCoverage: brief.evidenceQuality.reviewedStepPhaseCoverage,
        opportunityCount: brief.opportunityScan.length
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
