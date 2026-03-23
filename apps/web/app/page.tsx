import Link from "next/link";
import {
  DomainBadge,
  MetricCard,
  MetricGrid,
  PageIntro,
  ScoreBar,
  Section,
  SourceNote,
  StatusPill
} from "@/components/atlas-ui";
import { formatPercent, getOverviewData } from "@/lib/data";

export default async function OverviewPage() {
  const overview = await getOverviewData();

  return (
    <>
      <PageIntro
        eyebrow="Atlas Overview"
        title="Benchmark-led cryopreservation research, rendered for humans."
        summary="This console stays tied to the file-backed pipeline. It reads the latest benchmarked artifacts, call packets, review queues, and normalized protocol outputs without creating a second mutable source of truth."
      >
        <SourceNote sourceLabel={overview.cards[0]?.sourceLabel ?? "worktree"} />
      </PageIntro>

      <MetricGrid>
        <MetricCard
          label="Domains surfaced"
          value={String(overview.cards.length)}
          detail="Current vertical slices available for comparison and wedge-finding."
        />
        <MetricCard
          label="Minimum-depth ready"
          value={String(overview.readyDomainCount)}
          detail="Domains with reviewed outcome and step-phase coverage above the current readiness floor."
          tone="good"
        />
        <MetricCard
          label="Normalized protocols"
          value={String(overview.totalProtocols)}
          detail="Protocols currently represented in the normalized comparison layer."
        />
        <MetricCard
          label="Pending enrichments"
          value={String(overview.pendingSourceEnrichments)}
          detail="Human review backlog still blocking stronger evidence depth."
          tone={overview.pendingSourceEnrichments > 0 ? "warn" : "good"}
        />
      </MetricGrid>

      <Section
        title="Domain readiness"
        subtitle="A technical demo surface for founders and academics. Each card combines market framing with the benchmark signals backing it."
      >
        <div className="domain-grid">
          {overview.cards.map((card) => (
            <article className="domain-card" key={card.domain}>
              <div className="domain-card__header">
                <div>
                  <DomainBadge domain={card.domain} />
                  <h3>{card.label}</h3>
                  <p>{card.strapline}</p>
                </div>
                <StatusPill tone={card.reviewedOutcomeCoverage >= 0.4 ? "good" : "warn"}>
                  {card.reviewedOutcomeCoverage >= 0.4 ? "review-ready" : "depth gap"}
                </StatusPill>
              </div>

              <div className="domain-card__scores">
                <ScoreBar label="Readiness" value={card.readinessScore} tone="teal" />
                <ScoreBar label="Evidence" value={card.evidenceScore} tone="amber" />
                <ScoreBar label="Commercial" value={card.commercialScore} tone="rose" />
              </div>

              <div className="domain-card__body">
                <p className="domain-card__lede">{card.standardPattern}</p>
                <p>{card.currentPainPoint}</p>
              </div>

              <div className="domain-card__facts">
                <span>Top wedge: {card.topWedge}</span>
                <span>Outcome coverage: {formatPercent(card.reviewedOutcomeCoverage)}</span>
                <span>Step coverage: {formatPercent(card.reviewedStepPhaseCoverage)}</span>
              </div>

              <p className="domain-card__next">{card.nextMove}</p>

              <div className="domain-card__actions">
                <Link href={`/domains/${card.domain}`}>Open domain</Link>
                <Link href={`/domains/${card.domain}/debug`}>Open debug</Link>
              </div>
            </article>
          ))}
        </div>
      </Section>
    </>
  );
}
