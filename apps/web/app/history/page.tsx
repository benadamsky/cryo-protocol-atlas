import Link from "next/link";
import {
  ArtifactLedger,
  DataTable,
  DomainBadge,
  MetricCard,
  MetricGrid,
  PageIntro,
  Section,
  SourceNote,
  StatusPill
} from "@/components/atlas-ui";
import { formatDateTime, formatPercent, formatSignedScore, getHistoryData } from "@/lib/data";
import { humanizeSystemState } from "@/lib/ui-copy";

function shortHash(value: string) {
  return value.slice(0, 8);
}

export default async function HistoryPage() {
  const data = await getHistoryData();
  const totalCycles = data.domains.reduce((total, domain) => total + domain.cyclesCompleted, 0);
  const totalBacklog = data.domains.reduce(
    (total, domain) => total + domain.pendingSourceEnrichmentCount + domain.pendingBenchmarkProposalCount,
    0
  );

  return (
    <>
      <PageIntro
        eyebrow="History"
        title="Recent Atlas runs"
        summary="This page shows the recent cycle ledger, what changed in the last runs, and what is still blocking progress."
      >
        <div className="hero__stack">
          <SourceNote sourceLabel={data.sourceLabel} />
          <StatusPill tone={data.overallState === "stalled-human-gate" ? "warn" : "good"}>
            {humanizeSystemState(data.overallState)}
          </StatusPill>
          <div className="chip-row">
            <Link className="data-chip data-chip--strong" href="/discovery">
              Discovery
            </Link>
            <Link className="data-chip data-chip--strong" href="/compare">
              Compare
            </Link>
          </div>
        </div>
      </PageIntro>

      <MetricGrid>
        <MetricCard label="Domains tracked" value={String(data.domains.length)} />
        <MetricCard label="Cycles completed" value={String(totalCycles)} />
        <MetricCard label="Backlog items" value={String(totalBacklog)} tone={totalBacklog > 0 ? "warn" : "good"} />
        <MetricCard label="Latest state" value={humanizeSystemState(data.overallState)} />
      </MetricGrid>

      <Section title="Cycle Ledger" subtitle="One row per run cycle. Hash changes stay visible so the state transition remains auditable.">
        <DataTable
          columns={["Domain", "Cycle", "State", "Proposals", "Backlog", "Outcome", "Step", "Hash transition", "Apply safe"]}
          rows={data.domains.flatMap((domain) =>
            domain.cycles.map((cycle) => [
              <DomainBadge key={`${domain.domain}-${cycle.cycle}-badge`} domain={domain.domain} />,
              cycle.cycle,
              cycle.autonomousStateChanged ? (
                <StatusPill key={`${domain.domain}-${cycle.cycle}-changed`} tone="good">
                  changed
                </StatusPill>
              ) : (
                <StatusPill key={`${domain.domain}-${cycle.cycle}-steady`} tone="neutral">
                  steady
                </StatusPill>
              ),
              `${cycle.proposalCount}/${cycle.overrideProposalCount}/${cycle.benchmarkProposalCount}`,
              cycle.pendingSourceEnrichmentCount + cycle.pendingBenchmarkProposalCount,
              formatPercent(cycle.reviewedOutcomeCoverage),
              formatPercent(cycle.reviewedStepPhaseCoverage),
              `${shortHash(cycle.beforeBenchmarkHash)} → ${shortHash(cycle.afterBenchmarkHash)}`,
              <StatusPill key={`${domain.domain}-${cycle.cycle}-safe`} tone={cycle.autoApplySafe ? "good" : "warn"}>
                {cycle.autoApplySafe ? "safe" : "manual"}
              </StatusPill>
            ])
          )}
        />
      </Section>

      <Section title="Quality Deltas" subtitle="What the resolved and reviewed layers improved in the latest pass.">
        <DataTable
          columns={["Domain", "Inclusion F1", "Family acc.", "Paper type acc.", "Gate passes", "Outcome cov.", "Step cov.", "Depth ready"]}
          rows={data.domains.map((domain) => [
            <DomainBadge key={`${domain.domain}-quality`} domain={domain.domain} />,
            formatSignedScore(domain.reviewedInclusionF1Delta),
            formatSignedScore(domain.reviewedProtocolFamilyAccuracyDelta),
            formatSignedScore(domain.reviewedPaperTypeAccuracyDelta),
            domain.gatePassCountDelta > 0 ? `+${domain.gatePassCountDelta}` : String(domain.gatePassCountDelta),
            formatPercent(domain.reviewedOutcomeCoverage),
            formatPercent(domain.reviewedStepPhaseCoverage),
            <StatusPill key={`${domain.domain}-ready`} tone={domain.reviewedMinimumDepthReady ? "good" : "warn"}>
              {domain.reviewedMinimumDepthReady ? "yes" : "no"}
            </StatusPill>
          ])}
        />
      </Section>

      <div className="split-grid">
        <Section title="Backlog Snapshot" subtitle="What is still blocking progress in the review loop.">
          <DataTable
            columns={["Domain", "Pending enrichment", "Missing outcomes", "Missing steps", "Stop reason", "Latest run"]}
            rows={data.domains.map((domain) => [
              <DomainBadge key={`${domain.domain}-backlog`} domain={domain.domain} />,
              domain.pendingSourceEnrichmentCount + domain.pendingBenchmarkProposalCount,
              domain.missingOutcomeCount,
              domain.missingStepPhaseCount,
              domain.stopReason,
              formatDateTime(domain.latestRunGeneratedAt)
            ])}
          />
        </Section>

        <Section title="Recommendation Trail" subtitle="What the current loop says should happen next.">
          <div className="family-grid">
            {data.recommendations.map((recommendation) => (
              <article className="family-card" key={recommendation}>
                <p>{recommendation}</p>
              </article>
            ))}
          </div>
        </Section>
      </div>

      <Section title="Artifact Ledger" subtitle="Exact generated files backing this history view.">
        <ArtifactLedger artifacts={data.artifacts} />
      </Section>
    </>
  );
}
