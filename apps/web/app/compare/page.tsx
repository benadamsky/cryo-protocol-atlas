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
import {
  formatDateTime,
  formatPercent,
  formatScore,
  formatSignedPercent,
  formatSignedScore,
  getCompareData
} from "@/lib/data";
import { INTERNAL_DEBUG_ENABLED } from "@/lib/runtime-flags";

export default async function ComparePage() {
  const data = await getCompareData();

  return (
    <>
      <PageIntro
        eyebrow="Compare"
        title="Compare domains side by side"
        summary="Use this page to compare domain readiness, evidence quality, and corpus size side by side."
      >
        <div className="hero__stack">
          <SourceNote sourceLabel={data.sourceLabel} />
          <div className="chip-row">
            <Link className="data-chip data-chip--strong" href="/discovery">
              Discovery
            </Link>
            <Link className="data-chip data-chip--strong" href="/history">
              History
            </Link>
          </div>
        </div>
      </PageIntro>

      <MetricGrid>
        <MetricCard label="Domains compared" value={String(data.runHealth.availableDomainCount)} />
        <MetricCard label="Ready domains" value={String(data.overview.readyDomainCount)} />
        <MetricCard label="Pending source enrichment" value={String(data.runHealth.totalPendingSourceEnrichmentCount)} tone={data.runHealth.totalPendingSourceEnrichmentCount > 0 ? "warn" : "good"} />
        <MetricCard label="Total normalized protocols" value={String(data.runHealth.totalNormalizedProtocolCount)} />
      </MetricGrid>

      <Section title="Domain Snapshot" subtitle="Review depth, corpus scale, and current wedge posture side by side.">
        <div className="split-grid">
          {data.domains.map((domain) => (
            <article className="surface" key={domain.domain}>
              <div className="surface__header">
                <div>
                  <DomainBadge domain={domain.domain} />
                  <h3>{domain.label}</h3>
                  <p>{domain.strapline}</p>
                </div>
                <StatusPill tone={domain.reviewedMinimumDepthReady ? "good" : "warn"}>
                  {domain.reviewedMinimumDepthReady ? "ready" : "depth gap"}
                </StatusPill>
              </div>

              <div className="quick-facts">
                <div className="inline-stat">
                  <span>Readiness</span>
                  <strong>{formatScore(domain.readinessScore)}</strong>
                </div>
                <div className="inline-stat">
                  <span>Evidence</span>
                  <strong>{formatScore(domain.evidenceScore)}</strong>
                </div>
                <div className="inline-stat">
                  <span>Commercial</span>
                  <strong>{formatScore(domain.commercialScore)}</strong>
                </div>
                <div className="inline-stat">
                  <span>Reviewed F1</span>
                  <strong>{formatScore(domain.reviewedInclusionF1)}</strong>
                </div>
                <div className="inline-stat">
                  <span>Family acc.</span>
                  <strong>{formatScore(domain.reviewedProtocolFamilyAccuracy)}</strong>
                </div>
                <div className="inline-stat">
                  <span>Paper type</span>
                  <strong>{formatScore(domain.reviewedPaperTypeAccuracy)}</strong>
                </div>
                <div className="inline-stat">
                  <span>Matched corpus</span>
                  <strong>{formatPercent(domain.matchRate)}</strong>
                </div>
              </div>

              <p className="surface__detail">{domain.bestWedgeTitle}</p>
              <p>{domain.likelyPainPoint}</p>

              <div className="chip-row">
                <span className="data-chip">{domain.healthState}</span>
                <span className="data-chip data-chip--strong">{domain.stopReason}</span>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Benchmark Deltas" subtitle="These numbers show whether the resolved layer improved the right things, not just the presentation.">
        <DataTable
          columns={["Domain", "Inclusion F1", "Family acc.", "Paper type acc.", "Outcome cov.", "Step cov.", "Gate passes"]}
          rows={data.domains.map((domain) => [
            <DomainBadge key={`${domain.domain}-badge`} domain={domain.domain} />,
            formatSignedScore(domain.reviewedInclusionF1Delta),
            formatSignedScore(domain.reviewedProtocolFamilyAccuracyDelta),
            formatSignedScore(domain.reviewedPaperTypeAccuracyDelta),
            formatSignedPercent(domain.reviewedOutcomeCoverageDelta),
            formatSignedPercent(domain.reviewedStepPhaseCoverageDelta),
            domain.gatePassCountDelta > 0 ? `+${domain.gatePassCountDelta}` : String(domain.gatePassCountDelta)
          ])}
        />
      </Section>

      <Section title="Corpus Comparison" subtitle="Corpus size and match rate from the latest saved snapshots.">
        <DataTable
          columns={["Domain", "Fetched", "Matched", "Match rate", "Top snapshot paper", "Latest run"]}
          rows={data.domains.map((domain) => [
            <DomainBadge key={`${domain.domain}-snapshot`} domain={domain.domain} />,
            domain.totalFetched,
            domain.totalMatched,
            formatPercent(domain.matchRate),
            domain.topSnapshotTitle,
            formatDateTime(domain.latestRunGeneratedAt)
          ])}
        />
      </Section>

      {INTERNAL_DEBUG_ENABLED ? (
        <Section title="Artifact Ledger" subtitle="Exact generated files backing this comparison view.">
          <ArtifactLedger artifacts={data.artifacts} />
        </Section>
      ) : null}
    </>
  );
}
