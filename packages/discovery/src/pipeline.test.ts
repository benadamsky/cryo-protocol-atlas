import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DiscoveryImportSummarySchema,
  DiscoveryPromotionQueueSchema,
  DiscoveryPromotionReviewPacketSchema,
  DiscoverySnapshotSchema
} from "../../shared/src/schema.js";

const projectRoot = fileURLToPath(new URL("../../../", import.meta.url));
const tsxLoaderCandidates = [
  join(projectRoot, "node_modules", "tsx", "dist", "loader.mjs"),
  join(dirname(projectRoot), "node_modules", "tsx", "dist", "loader.mjs"),
  join(dirname(dirname(projectRoot)), "node_modules", "tsx", "dist", "loader.mjs")
];
const resolvedTsxLoader = tsxLoaderCandidates.find((candidate) => existsSync(candidate));
if (!resolvedTsxLoader) {
  throw new Error(`Unable to locate tsx loader from ${projectRoot}`);
}
const tsxLoader = resolvedTsxLoader;
const importScript = join(projectRoot, "scripts", "import-discovery-exports.ts");
const discoverScript = join(projectRoot, "scripts", "discover-domain-corpus.ts");
const queueScript = join(projectRoot, "scripts", "build-discovery-review-queue.ts");
const packetScript = join(projectRoot, "scripts", "build-discovery-promotion-packet.ts");
const validateScript = join(projectRoot, "scripts", "validate-discovery-refresh.ts");

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2), "utf8");
}

async function readJson<T>(path: string, parser: { parse: (value: unknown) => T }): Promise<T> {
  return parser.parse(JSON.parse(await readFile(path, "utf8")));
}

function runScript(scriptPath: string, cwd: string, args: string[]): void {
  execFileSync(process.execPath, ["--import", tsxLoader, scriptPath, ...args], {
    cwd,
    stdio: "pipe"
  });
}

async function withTempRepo(fn: (cwd: string) => Promise<void>): Promise<void> {
  const cwd = await mkdtemp(join(tmpdir(), "cryo-discovery-"));
  try {
    await fn(cwd);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
}

async function seedProcessedDomainSnapshot(cwd: string): Promise<void> {
  await writeJson(join(cwd, "data", "processed", "islets", "domain-snapshot.json"), {
    generatedAt: "2026-03-24T00:00:00.000Z",
    domain: "islets",
    totalFetched: 1,
    totalMatched: 1,
    papers: [
      {
        domain: "islets",
        score: 9,
        matchedKeywords: ["islets", "cryopreservation"],
        paper: {
          id: "tracked-1",
          paper_id: "tracked-paper-1",
          doi: "10.1000/tracked",
          title: "Tracked islet cryopreservation paper",
          abstract: "Tracked abstract",
          paper_url: "https://example.org/tracked"
        }
      }
    ]
  });
}

async function seedImportFile(
  cwd: string,
  fileName: string,
  source: "pubmed" | "openalex",
  records: Array<Record<string, unknown>>
): Promise<void> {
  await writeJson(join(cwd, "data", "discovery", "islets", "imports", fileName), {
    generatedAt: "2026-03-24T00:00:00.000Z",
    domain: "islets",
    source,
    label: `${source} seed`,
    records
  });
}

test("import pipeline preserves cross-source provenance and degrades instead of erasing prior merged imports", async () => {
  await withTempRepo(async (cwd) => {
    await seedImportFile(cwd, "pubmed.json", "pubmed", [
      {
        source: "pubmed",
        sourceId: "pubmed:111",
        sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/111/",
        rawQuery: "islet cryopreservation",
        title: "Pancreatic islets cryopreservation study",
        abstract: "Pancreatic islets were cryopreserved and assessed after thaw.",
        doi: "10.1000/shared",
        pmid: "111",
        fullTextAvailability: "open-access-full-text"
      }
    ]);
    await seedImportFile(cwd, "openalex.json", "openalex", [
      {
        source: "openalex",
        sourceId: "openalex:shared",
        sourceUrl: "https://openalex.org/W1",
        rawQuery: "islet cryopreservation",
        title: "Pancreatic islets cryopreservation study",
        abstract: "Pancreatic islets were cryopreserved and assessed after thaw.",
        doi: "10.1000/shared",
        pmid: "111",
        fullTextAvailability: "full-text-link"
      }
    ]);

    runScript(importScript, cwd, ["islets"]);

    const merged = await readJson(
      join(cwd, "data", "discovery", "islets", "imported-source-records.json"),
      { parse: (value) => value as { records: Array<{ source: string }> } }
    );
    const summary = await readJson(
      join(cwd, "data", "discovery", "islets", "import-summary.json"),
      DiscoveryImportSummarySchema
    );

    assert.equal(merged.records.length, 2);
    assert.deepEqual(
      merged.records.map((record) => record.source).sort(),
      ["openalex", "pubmed"]
    );
    assert.equal(summary.sourceBreakdown.pubmed, 1);
    assert.equal(summary.sourceBreakdown.openalex, 1);
    assert.equal(summary.isDegraded, false);

    await rm(join(cwd, "data", "discovery", "islets", "imports"), { recursive: true, force: true });
    await mkdir(join(cwd, "data", "discovery", "islets", "imports"), { recursive: true });

    runScript(importScript, cwd, ["islets"]);

    const degradedMerged = await readJson(
      join(cwd, "data", "discovery", "islets", "imported-source-records.json"),
      { parse: (value) => value as { records: Array<{ source: string }>; isDegraded: boolean } }
    );
    const degradedSummary = await readJson(
      join(cwd, "data", "discovery", "islets", "import-summary.json"),
      DiscoveryImportSummarySchema
    );

    assert.equal(degradedMerged.records.length, 2);
    assert.equal(degradedSummary.isDegraded, true);
    assert.ok(degradedSummary.degradationReasons.some((reason) => reason.includes("no-import-files-present")));
  });
});

test("queue carry-forward survives dedupe key changes and packet excludes newly deferred candidates", async () => {
  await withTempRepo(async (cwd) => {
    await seedProcessedDomainSnapshot(cwd);
    await seedImportFile(cwd, "pubmed.json", "pubmed", [
      {
        source: "pubmed",
        sourceId: "pubmed:222",
        sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/222/",
        rawQuery: "islet cryopreservation",
        title: "Pancreatic islets cryopreservation and transplantation",
        abstract: "Pancreatic islets were cryopreserved, transplanted, and recovered with strong function.",
        pmid: "222",
        citationCount: 60,
        fullTextAvailability: "open-access-full-text"
      }
    ]);

    runScript(importScript, cwd, ["islets"]);
    runScript(discoverScript, cwd, ["islets"]);
    runScript(queueScript, cwd, ["islets"]);
    runScript(packetScript, cwd, ["islets"]);

    const firstQueuePath = join(cwd, "data", "discovery", "islets", "promotion-queue.json");
    const firstQueue = await readJson(firstQueuePath, DiscoveryPromotionQueueSchema);
    assert.equal(firstQueue.decisions.length, 1);
    firstQueue.decisions[0] = {
      ...firstQueue.decisions[0],
      decision: "promote",
      reviewerNotes: "looked strong on first pass",
      decidedAt: "2026-03-24T01:00:00.000Z"
    };
    await writeJson(firstQueuePath, firstQueue);

    await seedImportFile(cwd, "pubmed.json", "pubmed", [
      {
        source: "pubmed",
        sourceId: "pubmed:222",
        sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/222/",
        rawQuery: "islet cryopreservation",
        title: "Pancreatic islets cryopreservation",
        abstract: "Pancreatic islets were cryopreserved.",
        doi: "10.1000/new-doi",
        pmid: "222",
        citationCount: 0,
        fullTextAvailability: "abstract-only"
      }
    ]);

    runScript(importScript, cwd, ["islets"]);
    runScript(discoverScript, cwd, ["islets"]);
    runScript(queueScript, cwd, ["islets"]);
    runScript(packetScript, cwd, ["islets"]);

    const nextQueue = await readJson(firstQueuePath, DiscoveryPromotionQueueSchema);
    assert.equal(nextQueue.decisions.length, 1);
    assert.equal(nextQueue.decisions[0]?.dedupeKey, "doi:10.1000/new-doi");
    assert.equal(nextQueue.decisions[0]?.decision, "pending");
    assert.equal(nextQueue.decisions[0]?.recommendation, "defer");
    assert.equal(nextQueue.decisions[0]?.staleEvidence, true);
    assert.ok(nextQueue.decisions[0]?.reviewerNotes?.includes("first pass"));

    const packet = await readJson(
      join(cwd, "data", "discovery", "islets", "promotion-review-packet.json"),
      DiscoveryPromotionReviewPacketSchema
    );
    assert.equal(packet.reviewItemCount, 0);
    assert.deepEqual(packet.items, []);
  });
});

test("validation script accepts consistent non-degraded discovery artifacts", async () => {
  await withTempRepo(async (cwd) => {
    const generatedAt = "2026-03-24T02:00:00.000Z";
    await writeJson(join(cwd, "data", "discovery", "ovarian-tissue", "import-summary.json"), {
      domain: "ovarian-tissue",
      importFileCount: 1,
      importedRecordCount: 1,
      mergedImportedRecordCount: 1,
      manualOnlyRecordCount: 0,
      importedSources: ["pubmed:seed.json"],
      sourceBreakdown: { pubmed: 1 },
      isDegraded: false,
      degradationReasons: []
    });
    await writeJson(join(cwd, "data", "discovery", "ovarian-tissue", "discovery-snapshot.json"), {
      generatedAt,
      domain: "ovarian-tissue",
      queryDescription: "test",
      totalCandidates: 1,
      isDegraded: false,
      degradationReasons: [],
      providerSummaries: [],
      papers: []
    });
    await writeJson(join(cwd, "data", "discovery", "ovarian-tissue", "promotion-queue.json"), {
      generatedAt: "2026-03-24T02:05:00.000Z",
      domain: "ovarian-tissue",
      sourceSnapshotGeneratedAt: generatedAt,
      candidateCount: 1,
      trackedCount: 0,
      novelCandidateCount: 0,
      isDegraded: false,
      degradationReasons: [],
      decisions: []
    });
    await writeJson(join(cwd, "data", "discovery", "ovarian-tissue", "promotion-review-packet.json"), {
      generatedAt: "2026-03-24T02:06:00.000Z",
      domain: "ovarian-tissue",
      sourceSnapshotGeneratedAt: generatedAt,
      queueGeneratedAt: "2026-03-24T02:05:00.000Z",
      candidateCount: 1,
      reviewItemCount: 0,
      isDegraded: false,
      degradationReasons: [],
      items: []
    });

    await writeJson(join(cwd, "data", "discovery", "islets", "import-summary.json"), {
      domain: "islets",
      importFileCount: 1,
      importedRecordCount: 1,
      mergedImportedRecordCount: 1,
      manualOnlyRecordCount: 0,
      importedSources: ["pubmed:seed.json"],
      sourceBreakdown: { pubmed: 1 },
      isDegraded: false,
      degradationReasons: []
    });
    await writeJson(join(cwd, "data", "discovery", "islets", "discovery-snapshot.json"), {
      generatedAt,
      domain: "islets",
      queryDescription: "test",
      totalCandidates: 1,
      isDegraded: false,
      degradationReasons: [],
      providerSummaries: [],
      papers: []
    });
    await writeJson(join(cwd, "data", "discovery", "islets", "promotion-queue.json"), {
      generatedAt: "2026-03-24T02:05:00.000Z",
      domain: "islets",
      sourceSnapshotGeneratedAt: generatedAt,
      candidateCount: 1,
      trackedCount: 0,
      novelCandidateCount: 0,
      isDegraded: false,
      degradationReasons: [],
      decisions: []
    });
    await writeJson(join(cwd, "data", "discovery", "islets", "promotion-review-packet.json"), {
      generatedAt: "2026-03-24T02:06:00.000Z",
      domain: "islets",
      sourceSnapshotGeneratedAt: generatedAt,
      queueGeneratedAt: "2026-03-24T02:05:00.000Z",
      candidateCount: 1,
      reviewItemCount: 0,
      isDegraded: false,
      degradationReasons: [],
      items: []
    });

    runScript(validateScript, cwd, ["all"]);
  });
});

test("validation script accepts truncation-only degraded discovery artifacts", async () => {
  await withTempRepo(async (cwd) => {
    const generatedAt = "2026-03-24T02:00:00.000Z";
    const truncationReason = "live-provider-truncation:openalex,crossref,europe-pmc";
    await writeJson(join(cwd, "data", "discovery", "ovarian-tissue", "import-summary.json"), {
      domain: "ovarian-tissue",
      importFileCount: 1,
      importedRecordCount: 1,
      mergedImportedRecordCount: 1,
      manualOnlyRecordCount: 0,
      importedSources: ["pubmed:seed.json"],
      sourceBreakdown: { pubmed: 1 },
      isDegraded: false,
      degradationReasons: []
    });
    await writeJson(join(cwd, "data", "discovery", "ovarian-tissue", "discovery-snapshot.json"), {
      generatedAt,
      domain: "ovarian-tissue",
      queryDescription: "test",
      totalCandidates: 1,
      isDegraded: true,
      degradationReasons: [truncationReason],
      providerSummaries: [],
      papers: []
    });
    await writeJson(join(cwd, "data", "discovery", "ovarian-tissue", "promotion-queue.json"), {
      generatedAt: "2026-03-24T02:05:00.000Z",
      domain: "ovarian-tissue",
      sourceSnapshotGeneratedAt: generatedAt,
      candidateCount: 1,
      trackedCount: 0,
      novelCandidateCount: 0,
      isDegraded: true,
      degradationReasons: [truncationReason],
      decisions: []
    });
    await writeJson(join(cwd, "data", "discovery", "ovarian-tissue", "promotion-review-packet.json"), {
      generatedAt: "2026-03-24T02:06:00.000Z",
      domain: "ovarian-tissue",
      sourceSnapshotGeneratedAt: generatedAt,
      queueGeneratedAt: "2026-03-24T02:05:00.000Z",
      candidateCount: 1,
      reviewItemCount: 0,
      isDegraded: true,
      degradationReasons: [truncationReason],
      items: []
    });

    await writeJson(join(cwd, "data", "discovery", "islets", "import-summary.json"), {
      domain: "islets",
      importFileCount: 1,
      importedRecordCount: 1,
      mergedImportedRecordCount: 1,
      manualOnlyRecordCount: 0,
      importedSources: ["pubmed:seed.json"],
      sourceBreakdown: { pubmed: 1 },
      isDegraded: false,
      degradationReasons: []
    });
    await writeJson(join(cwd, "data", "discovery", "islets", "discovery-snapshot.json"), {
      generatedAt,
      domain: "islets",
      queryDescription: "test",
      totalCandidates: 1,
      isDegraded: true,
      degradationReasons: [truncationReason],
      providerSummaries: [],
      papers: []
    });
    await writeJson(join(cwd, "data", "discovery", "islets", "promotion-queue.json"), {
      generatedAt: "2026-03-24T02:05:00.000Z",
      domain: "islets",
      sourceSnapshotGeneratedAt: generatedAt,
      candidateCount: 1,
      trackedCount: 0,
      novelCandidateCount: 0,
      isDegraded: true,
      degradationReasons: [truncationReason],
      decisions: []
    });
    await writeJson(join(cwd, "data", "discovery", "islets", "promotion-review-packet.json"), {
      generatedAt: "2026-03-24T02:06:00.000Z",
      domain: "islets",
      sourceSnapshotGeneratedAt: generatedAt,
      queueGeneratedAt: "2026-03-24T02:05:00.000Z",
      candidateCount: 1,
      reviewItemCount: 0,
      isDegraded: true,
      degradationReasons: [truncationReason],
      items: []
    });

    runScript(validateScript, cwd, ["all"]);
  });
});

test("validation script rejects provider failure degradation", async () => {
  await withTempRepo(async (cwd) => {
    const generatedAt = "2026-03-24T02:00:00.000Z";
    const failureReason = "live-provider-failures:openalex";
    await writeJson(join(cwd, "data", "discovery", "ovarian-tissue", "import-summary.json"), {
      domain: "ovarian-tissue",
      importFileCount: 1,
      importedRecordCount: 1,
      mergedImportedRecordCount: 1,
      manualOnlyRecordCount: 0,
      importedSources: ["pubmed:seed.json"],
      sourceBreakdown: { pubmed: 1 },
      isDegraded: false,
      degradationReasons: []
    });
    await writeJson(join(cwd, "data", "discovery", "ovarian-tissue", "discovery-snapshot.json"), {
      generatedAt,
      domain: "ovarian-tissue",
      queryDescription: "test",
      totalCandidates: 1,
      isDegraded: true,
      degradationReasons: [failureReason],
      providerSummaries: [],
      papers: []
    });
    await writeJson(join(cwd, "data", "discovery", "ovarian-tissue", "promotion-queue.json"), {
      generatedAt: "2026-03-24T02:05:00.000Z",
      domain: "ovarian-tissue",
      sourceSnapshotGeneratedAt: generatedAt,
      candidateCount: 1,
      trackedCount: 0,
      novelCandidateCount: 0,
      isDegraded: true,
      degradationReasons: [failureReason],
      decisions: []
    });
    await writeJson(join(cwd, "data", "discovery", "ovarian-tissue", "promotion-review-packet.json"), {
      generatedAt: "2026-03-24T02:06:00.000Z",
      domain: "ovarian-tissue",
      sourceSnapshotGeneratedAt: generatedAt,
      queueGeneratedAt: "2026-03-24T02:05:00.000Z",
      candidateCount: 1,
      reviewItemCount: 0,
      isDegraded: true,
      degradationReasons: [failureReason],
      items: []
    });

    await writeJson(join(cwd, "data", "discovery", "islets", "import-summary.json"), {
      domain: "islets",
      importFileCount: 1,
      importedRecordCount: 1,
      mergedImportedRecordCount: 1,
      manualOnlyRecordCount: 0,
      importedSources: ["pubmed:seed.json"],
      sourceBreakdown: { pubmed: 1 },
      isDegraded: false,
      degradationReasons: []
    });
    await writeJson(join(cwd, "data", "discovery", "islets", "discovery-snapshot.json"), {
      generatedAt,
      domain: "islets",
      queryDescription: "test",
      totalCandidates: 1,
      isDegraded: false,
      degradationReasons: [],
      providerSummaries: [],
      papers: []
    });
    await writeJson(join(cwd, "data", "discovery", "islets", "promotion-queue.json"), {
      generatedAt: "2026-03-24T02:05:00.000Z",
      domain: "islets",
      sourceSnapshotGeneratedAt: generatedAt,
      candidateCount: 1,
      trackedCount: 0,
      novelCandidateCount: 0,
      isDegraded: false,
      degradationReasons: [],
      decisions: []
    });
    await writeJson(join(cwd, "data", "discovery", "islets", "promotion-review-packet.json"), {
      generatedAt: "2026-03-24T02:06:00.000Z",
      domain: "islets",
      sourceSnapshotGeneratedAt: generatedAt,
      queueGeneratedAt: "2026-03-24T02:05:00.000Z",
      candidateCount: 1,
      reviewItemCount: 0,
      isDegraded: false,
      degradationReasons: [],
      items: []
    });

    assert.throws(
      () => runScript(validateScript, cwd, ["all"]),
      /discovery refresh validation failed/
    );
  });
});
