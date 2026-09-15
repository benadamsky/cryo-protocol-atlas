import { notFound } from "next/navigation";
import { ArtifactList, Facts, Funnel, PageHeader, Section, Table } from "@/components/atlas-ui";
import { DomainCrumbs } from "@/components/domain-crumbs";
import { formatPercent, getDomainData, getReviewedEntryCounts } from "@/lib/data";
import { getDecisionDomainData } from "@/lib/decision-data";
import { getDomainMeta, parseDomainId, staticDomainParams } from "@/lib/domain";
import { INTERNAL_DEBUG_ENABLED } from "@/lib/runtime-flags";

export const dynamicParams = false;

export function generateStaticParams() {
  return staticDomainParams();
}

function delta(before: number, after: number) {
  return `${before.toFixed(3)} → ${after.toFixed(3)}`;
}

export default async function BenchmarkPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain: rawDomain } = await params;
  let domain;

  try {
    domain = parseDomainId(rawDomain);
  } catch {
    notFound();
  }

  const meta = getDomainMeta(domain);
  const [data, decision] = await Promise.all([getDomainData(domain), getDecisionDomainData(domain)]);
  const reviewed = data.benchmarkSummary.subsets.reviewed;
  const counts = getReviewedEntryCounts(data.benchmarkFile);
  const baselineReviewed = data.benchmarkAnalysis.baseline.subsets.reviewed;
  const resolvedReviewed = data.benchmarkAnalysis.resolved.subsets.reviewed;
  const funnel = decision.provenanceFunnel;

  return (
    <>
      <PageHeader
        note="Whether Atlas keeps the right papers in scope, labels them correctly, and extracts enough detail to back the recommendation."
        title={`${meta.label} benchmark`}
      />
      <DomainCrumbs current="benchmark" domain={domain} />

      <Facts
        items={[
          { label: "Gates", value: data.benchmarkSummary.summary.passesAllGates ? "all pass" : "failing" },
          { label: "Benchmark rows", value: data.benchmarkSummary.benchmarkEntryCount },
          { label: "Reviewed rows", value: counts.reviewed },
          { label: "Seeded rows", value: counts.seeded }
        ]}
      />

      <Section label="Provenance" first>
        <Funnel
          steps={[
            { value: funnel.papersFetched, label: "papers scanned" },
            { value: funnel.papersMatched, label: `matched to ${meta.shortLabel.toLowerCase()}` },
            { value: funnel.reviewedBenchmarkRows, label: "reviewed" },
            { value: funnel.reviewedInScopeRows, label: "in scope" },
            { value: funnel.activeWedgeRelevantRows, label: "drive the call" }
          ]}
        />
      </Section>

      <Section label="Resolved vs baseline">
        <Table
          columns={["Metric", { label: "Baseline → resolved", className: "mono" }]}
          rows={[
            ["Reviewed inclusion F1", delta(baselineReviewed.inclusion.f1, resolvedReviewed.inclusion.f1)],
            [
              "Reviewed protocol-family accuracy",
              delta(baselineReviewed.exactFields.protocolFamily.accuracy, resolvedReviewed.exactFields.protocolFamily.accuracy)
            ],
            [
              "Reviewed paper-type accuracy",
              delta(baselineReviewed.exactFields.paperType.accuracy, resolvedReviewed.exactFields.paperType.accuracy)
            ],
            [
              "Reviewed specimen macro F1",
              delta(baselineReviewed.setFields.specimenTypes.averageF1, resolvedReviewed.setFields.specimenTypes.averageF1)
            ]
          ]}
        />
      </Section>

      <Section label="Coverage">
        <Table
          columns={["Field", { label: "Coverage", className: "num" }, { label: "Labeled", className: "num" }, { label: "Eligible", className: "num" }]}
          rows={Object.values(reviewed.coverage).map((field) => [
            field.field,
            formatPercent(field.coverageRate),
            field.labeledCount,
            field.eligibleCount
          ])}
        />
        <p className="muted small" style={{ marginTop: 12 }}>
          Inclusion F1 {reviewed.inclusion.f1.toFixed(2)} (precision {reviewed.inclusion.precision.toFixed(2)}, recall{" "}
          {reviewed.inclusion.recall.toFixed(2)}); outcome coverage delta{" "}
          {formatPercent(data.benchmarkAnalysis.reviewedDepth.outcomeCoverageDelta)}, step-phase coverage delta{" "}
          {formatPercent(data.benchmarkAnalysis.reviewedDepth.stepPhaseCoverageDelta)}; minimum depth{" "}
          {data.benchmarkSummary.summary.reviewedMinimumDepthReady ? "ready" : "not ready"}.
        </p>
      </Section>

      <Section label="Exact metrics">
        <Table
          columns={["Field", { label: "Accuracy", className: "num" }, { label: "Exact", className: "num" }, { label: "Labeled", className: "num" }]}
          rows={Object.values(reviewed.exactFields).map((field) => [
            field.field,
            formatPercent(field.accuracy),
            field.exactMatchCount,
            field.labeledCount
          ])}
        />
      </Section>

      <Section label="Gates">
        <Table
          columns={["Gate", { label: "Status", className: "mono" }, { label: "Actual", className: "num" }, { label: "Threshold", className: "mono nowrap" }, { label: "Notes", className: "small" }]}
          rows={data.benchmarkSummary.gates.map((gate) => [
            gate.name,
            gate.passed ? "pass" : "fail",
            formatPercent(gate.actual),
            `${gate.comparator} ${formatPercent(gate.threshold)}`,
            gate.notes
          ])}
        />
      </Section>

      <Section label="Missing detail">
        <Table
          columns={["Paper", { label: "Gap", className: "tag" }, { label: "Reason", className: "small" }]}
          empty="No reviewed papers are missing outcomes or step phases."
          rows={[
            ...data.benchmarkAnalysis.reviewedDepth.missingOutcomes.map((row) => [
              row.title,
              `missing outcomes · ${row.evidenceStatus}`,
              row.evidenceReason
            ]),
            ...data.benchmarkAnalysis.reviewedDepth.missingStepPhases.map((row) => [
              row.title,
              "missing step phases",
              `${row.protocolFamily} · ${row.paperType}`
            ])
          ]}
        />
      </Section>

      <Section label="Baseline mismatches">
        <Table
          columns={[{ label: "Field", className: "tag" }, "Paper", { label: "Expected", className: "tag" }, { label: "Actual", className: "tag" }]}
          empty="No baseline mismatches recorded."
          rows={[
            ...baselineReviewed.exactFields.protocolFamily.mismatches.slice(0, 4).map((mismatch) => [
              "protocolFamily",
              mismatch.title,
              mismatch.expected,
              mismatch.actual
            ]),
            ...baselineReviewed.exactFields.paperType.mismatches.slice(0, 3).map((mismatch) => [
              "paperType",
              mismatch.title,
              mismatch.expected,
              mismatch.actual
            ])
          ]}
        />
      </Section>

      {INTERNAL_DEBUG_ENABLED ? (
        <Section label="Artifacts">
          <ArtifactList
            artifacts={data.artifacts.filter((artifact) =>
              ["Benchmark summary", "Benchmark analysis", "Benchmark gold set", "Unattended batch"].includes(artifact.label)
            )}
          />
        </Section>
      ) : null}
    </>
  );
}
