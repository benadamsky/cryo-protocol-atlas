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
import { formatDateTime, formatScore, getDiscoveryData } from "@/lib/data";

export default async function DiscoveryPage() {
  const data = await getDiscoveryData();

  return (
    <>
      <PageIntro
        eyebrow="Discovery Lane"
        title="Live corpus refresh, queue triage, and review packet assembly"
        summary="This is the downstream discovery operating surface. It reads the discovery snapshot, promotion queue, and promotion review packet artifacts directly instead of proxying through the trusted protocol-intelligence views."
      >
        <div className="hero__stack">
          <SourceNote sourceLabel={data.sourceLabel} />
          <StatusPill tone={data.runHealth.overallState === "stalled-human-gate" ? "warn" : "good"}>
            {data.runHealth.overallState}
          </StatusPill>
          <div className="chip-row">
            <Link className="data-chip data-chip--strong" href="/optimizer">
              Optimizer
            </Link>
            <Link className="data-chip data-chip--strong" href="/history">
              History
            </Link>
          </div>
        </div>
      </PageIntro>

      <MetricGrid>
        <MetricCard label="Domains surfaced" value={String(data.domains.length)} />
        <MetricCard label="Pending queue items" value={String(data.totalPendingCount)} tone={data.totalPendingCount > 0 ? "warn" : "good"} />
        <MetricCard label="Promote recommendations" value={String(data.totalPromoteRecommendations)} />
        <MetricCard label="Review recommendations" value={String(data.totalReviewRecommendations)} />
        <MetricCard label="Packet items" value={String(data.totalPacketItems)} detail="Candidates currently elevated into the human review packet." />
      </MetricGrid>

      <Section title="Lane status" subtitle="Per-domain queue pressure, provider failures, and packet volume.">
        <DataTable
          columns={["Domain", "State", "Novel", "Promote", "Review", "Packet", "Provider failures"]}
          rows={data.domains.map((domain) => [
            <DomainBadge key={`${domain.domain}-badge`} domain={domain.domain} />,
            <StatusPill key={`${domain.domain}-state`} tone={domain.isDegraded ? "warn" : "good"}>
              {domain.isDegraded ? "degraded" : "healthy"}
            </StatusPill>,
            domain.novelCandidateCount,
            domain.promoteCount,
            domain.reviewCount,
            domain.reviewItemCount,
            domain.providerFailureCount
          ])}
        />
      </Section>

      <Section title="Queue preview" subtitle="The highest-ranked recommendations in the current discovery promotion queue.">
        <div className="split-grid">
          {data.domains.map((domain) => (
            <article className="surface" key={domain.domain}>
              <div className="surface__header">
                <div>
                  <DomainBadge domain={domain.domain} />
                  <h3>{domain.label}</h3>
                  <p>{domain.queryDescription}</p>
                </div>
                <StatusPill tone={domain.promoteCount > 0 ? "good" : "neutral"}>
                  {domain.promoteCount} promote
                </StatusPill>
              </div>

              <div className="quick-facts">
                <div className="inline-stat">
                  <span>Snapshot</span>
                  <strong>{formatDateTime(domain.snapshotGeneratedAt)}</strong>
                </div>
                <div className="inline-stat">
                  <span>Queue</span>
                  <strong>{formatDateTime(domain.queueGeneratedAt)}</strong>
                </div>
                <div className="inline-stat">
                  <span>Total candidates</span>
                  <strong>{domain.totalCandidates}</strong>
                </div>
                <div className="inline-stat">
                  <span>Tracked</span>
                  <strong>{domain.trackedCount}</strong>
                </div>
              </div>

              <div className="chip-row">
                {domain.providerSummaries.map((summary) => (
                  <span className="data-chip" key={`${domain.domain}-${summary.source}`}>
                    {summary.source}: {summary.acceptedCount}/{summary.fetchedCount}
                    {summary.failed ? ` failed` : ""}
                  </span>
                ))}
              </div>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Recommendation</th>
                      <th>Ranking</th>
                    </tr>
                  </thead>
                  <tbody>
                    {domain.topDecisions.map((decision) => (
                      <tr key={decision.dedupeKey}>
                        <td>
                          <strong>{decision.title}</strong>
                          <div className="artifact-ledger__meta">
                            <span>{decision.matchedKeywords.slice(0, 4).join(", ") || "no keywords"}</span>
                            <span>{decision.fullTextAvailability}</span>
                          </div>
                        </td>
                        <td>
                          <StatusPill tone={decision.recommendation === "promote" ? "good" : decision.recommendation === "review" ? "warn" : "neutral"}>
                            {decision.recommendation}
                          </StatusPill>
                        </td>
                        <td>{formatScore(decision.rankingScore)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Review packet" subtitle="Candidates already elevated into the human review packet, with reasons and risk context.">
        <div className="split-grid">
          {data.domains.map((domain) => (
            <article className="surface" key={`${domain.domain}-packet`}>
              <div className="surface__header">
                <div>
                  <DomainBadge domain={domain.domain} />
                  <h3>{domain.label}</h3>
                  <p>{domain.reviewItemCount} packet items currently generated.</p>
                </div>
                <StatusPill tone={domain.reviewItemCount > 0 ? "good" : "neutral"}>
                  {domain.reviewItemCount} packet items
                </StatusPill>
              </div>

              {domain.topReviewItems.length === 0 ? (
                <p className="surface__detail">No review packet items are available yet for this domain.</p>
              ) : (
                <div className="family-grid">
                  {domain.topReviewItems.map((item) => (
                    <article className="family-card" key={item.dedupeKey}>
                      <strong>{item.title}</strong>
                      <p>{item.recommendationReasons[0] ?? "No recommendation reason recorded."}</p>
                      <div className="artifact-ledger__meta">
                        <span>{item.recommendation}</span>
                        <span>ranking {formatScore(item.rankingScore)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </Section>

      <Section title="Artifact ledger" subtitle="These are the exact discovery lane files the web app is reading right now.">
        <ArtifactLedger artifacts={data.artifacts} />
      </Section>
    </>
  );
}
