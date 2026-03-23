import { notFound } from "next/navigation";
import {
  ArtifactLedger,
  DataTable,
  DomainBadge,
  DomainTabs,
  MetricCard,
  MetricGrid,
  PageIntro,
  ScoreBar,
  Section,
  SourceNote,
  StatusPill
} from "@/components/atlas-ui";
import { formatPercent, getDomainData, getReviewedEntryCounts } from "@/lib/data";
import { getDomainMeta, parseDomainId } from "@/lib/domain";

export default async function BenchmarkPage({
  params
}: {
  params: Promise<{ domain: string }>;
}) {
  try {
    const { domain: rawDomain } = await params;
    const domain = parseDomainId(rawDomain);
    const meta = getDomainMeta(domain);
    const data = await getDomainData(domain);
    const reviewedSubset = data.benchmarkSummary.subsets.reviewed;
    const entryCounts = getReviewedEntryCounts(data.benchmarkFile);
    const baselineReviewed = data.benchmarkAnalysis.baseline.subsets.reviewed;
    const resolvedReviewed = data.benchmarkAnalysis.resolved.subsets.reviewed;

    return (
      <>
        <PageIntro
          eyebrow={`${meta.label} Benchmark`}
          title="Trust surface for current atlas outputs"
          summary={data.benchmarkSummary.benchmarkDescription}
        >
          <div className="hero__stack">
            <DomainBadge domain={domain} />
            <SourceNote sourceLabel={data.sourceLabel} />
          </div>
        </PageIntro>

        <DomainTabs current="benchmark" domain={domain} />

        <MetricGrid>
          <MetricCard
            label="All gates"
            value={data.benchmarkSummary.summary.passesAllGates ? "Pass" : "Fail"}
            tone={data.benchmarkSummary.summary.passesAllGates ? "good" : "warn"}
          />
          <MetricCard label="Benchmark entries" value={String(data.benchmarkSummary.benchmarkEntryCount)} />
          <MetricCard label="Reviewed rows" value={String(entryCounts.reviewed)} />
          <MetricCard label="Seeded rows" value={String(entryCounts.seeded)} />
        </MetricGrid>

        <Section title="Resolved vs baseline" subtitle="This is the most important trust story: what the override and normalization path actually fixed.">
          <div className="split-grid">
            <article className="surface">
              <ScoreBar
                label="Reviewed inclusion F1 delta"
                value={Math.max(resolvedReviewed.inclusion.f1 - baselineReviewed.inclusion.f1, 0)}
                tone="teal"
                detail={`baseline ${baselineReviewed.inclusion.f1.toFixed(3)} -> resolved ${resolvedReviewed.inclusion.f1.toFixed(3)}`}
              />
              <ScoreBar
                label="Reviewed protocol-family accuracy delta"
                value={
                  Math.max(
                    resolvedReviewed.exactFields.protocolFamily.accuracy -
                      baselineReviewed.exactFields.protocolFamily.accuracy,
                    0
                  )
                }
                tone="amber"
                detail={`baseline ${baselineReviewed.exactFields.protocolFamily.accuracy.toFixed(3)} -> resolved ${resolvedReviewed.exactFields.protocolFamily.accuracy.toFixed(3)}`}
              />
            </article>

            <article className="surface">
              <ScoreBar
                label="Reviewed paper-type accuracy delta"
                value={
                  Math.max(
                    resolvedReviewed.exactFields.paperType.accuracy -
                      baselineReviewed.exactFields.paperType.accuracy,
                    0
                  )
                }
                tone="rose"
                detail={`baseline ${baselineReviewed.exactFields.paperType.accuracy.toFixed(3)} -> resolved ${resolvedReviewed.exactFields.paperType.accuracy.toFixed(3)}`}
              />
              <ScoreBar
                label="Reviewed specimen macro F1 delta"
                value={
                  Math.max(
                    resolvedReviewed.setFields.specimenTypes.averageF1 -
                      baselineReviewed.setFields.specimenTypes.averageF1,
                    0
                  )
                }
                tone="teal"
                detail={`baseline ${baselineReviewed.setFields.specimenTypes.averageF1.toFixed(3)} -> resolved ${resolvedReviewed.setFields.specimenTypes.averageF1.toFixed(3)}`}
              />
            </article>
          </div>
        </Section>

        <Section title="Reviewed depth" subtitle="These are the two coverage metrics currently gating how much confidence you should place in the slice.">
          <div className="split-grid">
            <article className="surface">
              <ScoreBar
                label="Outcome coverage"
                value={data.benchmarkSummary.summary.reviewedOutcomeCoverage}
                tone="teal"
              />
              <ScoreBar
                label="Step-phase coverage"
                value={data.benchmarkSummary.summary.reviewedStepPhaseCoverage}
                tone="amber"
              />
            </article>

            <article className="surface">
              <h3>Reviewed subset</h3>
              <p>
                Inclusion F1 <strong>{reviewedSubset.inclusion.f1.toFixed(2)}</strong> with precision{" "}
                <strong>{reviewedSubset.inclusion.precision.toFixed(2)}</strong> and recall{" "}
                <strong>{reviewedSubset.inclusion.recall.toFixed(2)}</strong>.
              </p>
              <div className="quick-facts">
                <div className="inline-stat">
                  <span>Expected included</span>
                  <strong>{reviewedSubset.expectedIncludedCount}</strong>
                </div>
                <div className="inline-stat">
                  <span>Labeled outcomes</span>
                  <strong>{reviewedSubset.coverage.outcomeClasses?.labeledCount ?? 0}</strong>
                </div>
                <div className="inline-stat">
                  <span>Labeled steps</span>
                  <strong>{reviewedSubset.coverage.stepPhases?.labeledCount ?? 0}</strong>
                </div>
              </div>
            </article>
          </div>
        </Section>

        <Section title="Gate checks" subtitle="These are the safeguards against making the atlas look cleaner by dropping or relabeling difficult papers.">
          <DataTable
            columns={["Gate", "Status", "Actual", "Threshold", "Why it matters"]}
            rows={data.benchmarkSummary.gates.map((gate) => [
              gate.name,
              <StatusPill tone={gate.passed ? "good" : "hot"}>
                {gate.passed ? "pass" : "fail"}
              </StatusPill>,
              formatPercent(gate.actual),
              `${gate.comparator} ${formatPercent(gate.threshold)}`,
              gate.notes
            ])}
          />
        </Section>

        <div className="split-grid">
          <Section title="Reviewed coverage by field">
            <DataTable
              columns={["Field", "Coverage", "Labeled", "Eligible"]}
              rows={Object.values(reviewedSubset.coverage).map((field) => [
                field.field,
                formatPercent(field.coverageRate),
                field.labeledCount,
                field.eligibleCount
              ])}
            />
          </Section>

          <Section title="Reviewed exact metrics">
            <DataTable
              columns={["Field", "Accuracy", "Exact matches", "Labeled"]}
              rows={Object.values(reviewedSubset.exactFields).map((field) => [
                field.field,
                formatPercent(field.accuracy),
                field.exactMatchCount,
                field.labeledCount
              ])}
            />
          </Section>
        </div>

        <div className="split-grid">
          <Section title="Reviewed depth gaps" subtitle="These are the concrete reviewed papers still limiting the benchmark.">
            <DataTable
              columns={["Paper", "Gap type", "Reason"]}
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

          <Section title="Baseline mismatch watchlist" subtitle="What the baseline pass got wrong before overrides and reviewed repair.">
            <DataTable
              columns={["Field", "Paper", "Expected", "Actual"]}
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
        </div>

        <Section title="Artifact ledger" subtitle="Benchmark pages should be inspectable down to the exact generated artifact set.">
          <ArtifactLedger
            artifacts={data.artifacts.filter((artifact) =>
              [
                "Benchmark summary",
                "Benchmark analysis",
                "Benchmark gold set",
                "Unattended batch"
              ].includes(artifact.label)
            )}
          />
        </Section>
      </>
    );
  } catch {
    notFound();
  }
}
