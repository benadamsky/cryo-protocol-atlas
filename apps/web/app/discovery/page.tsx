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
import { INTERNAL_DEBUG_ENABLED } from "@/lib/runtime-flags";
import { humanizeSystemState, recommendationTone } from "@/lib/ui-copy";

export default async function DiscoveryPage() {
  const data = await getDiscoveryData();

  return (
    <>
      <PageIntro
        eyebrow="Discovery"
        title="Broader discovery search"
        summary="This page shows the broader search lane Atlas uses to find candidate papers and build review queues. It is useful, but it is not the current trusted recommendation."
      >
        <div className="hero__stack">
          <SourceNote sourceLabel={data.sourceLabel} />
          <StatusPill tone={data.runHealth.overallState === "stalled-human-gate" ? "warn" : "good"}>
            {humanizeSystemState(data.runHealth.overallState)}
          </StatusPill>
          <div className="chip-row">
            <Link className="data-chip data-chip--strong" href="/">
              Recommendation
            </Link>
            <Link className="data-chip data-chip--strong" href="/experiments">
              Experiment packets
            </Link>
          </div>
        </div>
      </PageIntro>

      <Section
        title="Where Discovery Fits"
        subtitle="Recommendation first, experiment second, broader search after that."
      >
        <div className="split-grid discovery-fit-grid">
          <article className="surface discovery-flow-card">
            <div className="discovery-flow">
              <div className="discovery-flow__step">
                <span className="section-kicker">Step 1</span>
                <h3>Recommendation</h3>
                <p>Atlas ranks the current wedge on the reviewed slice.</p>
              </div>
              <div className="discovery-flow__arrow">→</div>
              <div className="discovery-flow__step">
                <span className="section-kicker">Step 2</span>
                <h3>Experiment packet</h3>
                <p>The recommendation becomes a concrete next experiment.</p>
              </div>
              <div className="discovery-flow__arrow">→</div>
              <div className="discovery-flow__step">
                <span className="section-kicker">Step 3</span>
                <h3>Broader search</h3>
                <p>This page manages later candidate evidence and review packets.</p>
              </div>
            </div>
          </article>

          <div className="truth-strip truth-strip--compact">
            <article className="truth-card">
              <span className="section-kicker">Current truth</span>
              <p>The recommendation and evidence pages define the current Atlas claim.</p>
            </article>
            <article className="truth-card">
              <span className="section-kicker">This page</span>
              <p>Promotion and review recommendations are candidate inputs to later human review.</p>
            </article>
            <article className="truth-card">
              <span className="section-kicker">Later update</span>
              <p>If reviewed and promoted later, this work can change Atlas. Until then it remains provisional.</p>
            </article>
          </div>
        </div>
      </Section>

      <MetricGrid>
        <MetricCard label="Domains surfaced" value={String(data.domains.length)} />
        <MetricCard
          label="Pending downstream items"
          value={String(data.totalPendingCount)}
          tone={data.totalPendingCount > 0 ? "warn" : "good"}
        />
        <MetricCard label="Promote recommendations" value={String(data.totalPromoteRecommendations)} />
        <MetricCard
          label="Review packet items"
          value={String(data.totalPacketItems)}
          detail="Candidates already elevated into the human review packet."
        />
      </MetricGrid>

      <Section
        title="Lane Status"
        subtitle="Per-domain queue pressure and provider failures in the broader search lane."
      >
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

      <Section
        title="Discovery Candidates"
        subtitle="Highest-ranked items in the discovery queue, shown as a cleaner ranked list."
      >
        <div className="split-grid">
          {data.domains.map((domain) => (
            <article className="surface discovery-lane-card" key={domain.domain}>
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
                  <span>Tracked</span>
                  <strong>{domain.trackedCount}</strong>
                </div>
                <div className="inline-stat">
                  <span>Novel</span>
                  <strong>{domain.novelCandidateCount}</strong>
                </div>
              </div>

              <div className="chip-row">
                {domain.providerSummaries.map((summary) => (
                  <span className="data-chip" key={`${domain.domain}-${summary.source}`}>
                    {summary.source}: {summary.acceptedCount}/{summary.fetchedCount}
                    {summary.failed ? " failed" : ""}
                  </span>
                ))}
              </div>

              <div className="candidate-list">
                {domain.topDecisions.map((decision, index) => (
                  <article className="candidate-row" key={decision.dedupeKey}>
                    <div className="candidate-row__rank">{index + 1}</div>
                    <div className="candidate-row__body">
                      <div className="candidate-row__header">
                        <strong>{decision.title}</strong>
                        <StatusPill tone={recommendationTone(decision.recommendation)}>
                          {decision.recommendation}
                        </StatusPill>
                      </div>
                      <div className="candidate-row__meta">
                        <span>{decision.matchedKeywords.slice(0, 4).join(", ") || "no keywords"}</span>
                        <span>{decision.fullTextAvailability}</span>
                        <span>ranking {formatScore(decision.rankingScore)}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section
        title="Review Candidates"
        subtitle="Items already elevated into the human review packet."
      >
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
                <div className="review-item-list">
                  {domain.topReviewItems.map((item) => (
                    <article className="review-item" key={item.dedupeKey}>
                      <div className="review-item__header">
                        <strong>{item.title}</strong>
                        <StatusPill tone={recommendationTone(item.recommendation)}>
                          {item.recommendation}
                        </StatusPill>
                      </div>
                      <p>{item.recommendationReasons[0] ?? "No recommendation reason recorded."}</p>
                      <div className="candidate-row__meta">
                        <span>{item.recommendation}</span>
                        <span>ranking {formatScore(item.rankingScore)}</span>
                        <span>{item.matchedKeywords.slice(0, 3).join(", ") || "no keywords"}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </Section>

      {INTERNAL_DEBUG_ENABLED ? (
        <Section
          title="Artifact Ledger"
          subtitle="Exact discovery files the web app is reading right now."
        >
          <ArtifactLedger artifacts={data.artifacts} />
        </Section>
      ) : null}
    </>
  );
}
