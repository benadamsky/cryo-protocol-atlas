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
import { formatDateTime, formatPercent, formatScore, getDiscoveryData } from "@/lib/data";

export default async function DiscoveryPage() {
  const data = await getDiscoveryData();

  return (
    <>
      <PageIntro
        eyebrow="Discovery"
        title="Corpus refresh, candidate intake, and source coverage"
        summary="This view is intentionally conservative. It shows the current discovery snapshot, the run-health state, and the corpus evidence backing each domain without introducing a mutable backend."
      >
        <div className="hero__stack">
          <SourceNote sourceLabel={data.sourceLabel} />
          <StatusPill tone={data.runHealth.overallState === "stalled-human-gate" ? "warn" : "good"}>
            {data.runHealth.overallState}
          </StatusPill>
          <div className="chip-row">
            <Link className="data-chip data-chip--strong" href="/compare">
              Compare
            </Link>
            <Link className="data-chip data-chip--strong" href="/history">
              History
            </Link>
          </div>
        </div>
      </PageIntro>

      <MetricGrid>
        <MetricCard label="Available domains" value={String(data.runHealth.availableDomainCount)} />
        <MetricCard label="Ready domains" value={String(data.overview.readyDomainCount)} detail="Domains already passing the current reviewed depth floor." />
        <MetricCard
          label="Total matched"
          value={String(data.domains.reduce((total, domain) => total + domain.totalMatched, 0))}
          detail="Corpus slices matched to cryopreservation protocol terms."
        />
        <MetricCard
          label="Total normalized protocols"
          value={String(data.runHealth.totalNormalizedProtocolCount)}
          detail="Protocols currently tracked by the autoresearch loop."
        />
        <MetricCard
          label="Pending source enrichment"
          value={String(data.runHealth.totalPendingSourceEnrichmentCount)}
          detail="This is the current human gate for deeper corpus progression."
          tone={data.runHealth.totalPendingSourceEnrichmentCount > 0 ? "warn" : "good"}
        />
      </MetricGrid>

      <Section
        title="Run health"
        subtitle="A concise snapshot of the current discovery loop state, including stop reasons and backlog pressure."
      >
        <DataTable
          columns={["Domain", "State", "Stop reason", "Cycles", "Outcome", "Step phase", "Backlog"]}
          rows={data.runHealth.domains.map((domain) => [
            <DomainBadge key={`${domain.domain}-badge`} domain={domain.domain} />,
            <StatusPill key={`${domain.domain}-state`} tone={domain.passesAllGates ? "good" : "warn"}>
              {domain.healthState}
            </StatusPill>,
            domain.stopReason,
            domain.cyclesCompleted,
            formatPercent(domain.reviewedOutcomeCoverage),
            formatPercent(domain.reviewedStepPhaseCoverage),
            domain.pendingSourceEnrichmentCount
          ])}
        />
      </Section>

      <Section title="Corpus snapshots" subtitle="The latest search corpus slices, surfaced as technical cards rather than a dead-end data dump.">
        <div className="split-grid">
          {data.domains.map((domain) => (
            <article className="surface" key={domain.domain}>
              <div className="surface__header">
                <div>
                  <DomainBadge domain={domain.domain} />
                  <h3>{domain.label}</h3>
                  <p>{domain.strapline}</p>
                </div>
                <StatusPill tone={domain.matchRate > 0 ? "good" : "warn"}>
                  {formatPercent(domain.matchRate)} matched
                </StatusPill>
              </div>

              <div className="quick-facts">
                <div className="inline-stat">
                  <span>Snapshot</span>
                  <strong>{formatDateTime(domain.generatedAt)}</strong>
                </div>
                <div className="inline-stat">
                  <span>Fetched</span>
                  <strong>{domain.totalFetched}</strong>
                </div>
                <div className="inline-stat">
                  <span>Matched</span>
                  <strong>{domain.totalMatched}</strong>
                </div>
              </div>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Top paper</th>
                      <th>Score</th>
                      <th>Journal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {domain.topPapers.slice(0, 3).map((paper) => (
                      <tr key={`${domain.domain}-${paper.title}`}>
                        <td>
                          <strong>{paper.title}</strong>
                          <div className="artifact-ledger__meta">
                            <span>{paper.publishedYear ?? "n/a"}</span>
                            <span>{paper.matchedKeywords.slice(0, 4).join(", ")}</span>
                          </div>
                        </td>
                        <td>{formatScore(paper.score)}</td>
                        <td>{paper.journal ?? "n/a"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Recommendations" subtitle="The current refresh path is explicit about where human review still matters.">
        <div className="family-grid">
          {data.runHealth.recommendations.map((recommendation) => (
            <article className="family-card" key={recommendation}>
              <p>{recommendation}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Artifact ledger" subtitle="These are the files the discovery view is reading right now.">
        <ArtifactLedger artifacts={data.artifacts} />
      </Section>
    </>
  );
}
