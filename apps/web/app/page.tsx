import Link from "next/link";
import {
  DataTable,
  DomainBadge,
  MetricCard,
  MetricGrid,
  PageIntro,
  ProvenanceCallout,
  QuickFacts,
  ScoreBar,
  Section,
  SectionNav,
  SourceNote,
  StatusPill
} from "@/components/atlas-ui";
import { formatPercent, getOverviewData } from "@/lib/data";

const OVERVIEW_SECTIONS = [
  {
    id: "validated-atlas",
    label: "Validated Atlas",
    summary: "Current domain slices and the strongest wedge signal"
  },
  {
    id: "benchmarking",
    label: "Benchmarking",
    summary: "Coverage, gate status, and deltas against the reviewed slice"
  },
  {
    id: "discovery",
    label: "Discovery",
    summary: "Pain points and next moves the candidate corpus should answer"
  },
  {
    id: "debug",
    label: "Debug",
    summary: "Lineage, artifact roots, and paper-level provenance"
  }
];

export default async function OverviewPage() {
  const overview = await getOverviewData();

  return (
    <>
      <PageIntro
        eyebrow="Atlas Overview"
        title="Benchmark-led cryopreservation research, rendered for humans."
        summary="This console stays tied to the file-backed pipeline. It reads the latest benchmarked artifacts, call packets, review queues, and normalized protocol outputs without creating a second mutable source of truth."
      >
        <div className="hero__stack">
          <SourceNote sourceLabel={overview.cards[0]?.sourceLabel ?? "worktree"} />
          <ProvenanceCallout
            eyebrow="Shell"
            title="Read-only, lineage-aware"
            summary="The web layer should explain the evidence, not mutate it. Benchmark truth stays in the pipeline while this console renders the current state as an auditable lens."
            items={[
              { label: "Validated domains", value: String(overview.readyDomainCount) },
              { label: "Total protocols", value: String(overview.totalProtocols) },
              { label: "Pending enrichments", value: String(overview.pendingSourceEnrichments) }
            ]}
          />
        </div>
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

      <SectionNav items={OVERVIEW_SECTIONS} />

      <Section
        id="validated-atlas"
        title="Validated Atlas"
        subtitle="The validated slice. Each card combines market framing with the benchmark signals backing it."
        actions={<Link href="/domains/ovarian-tissue">Open ovarian slice</Link>}
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
                <span>Source: {card.sourceLabel}</span>
              </div>

              <p className="domain-card__next">{card.nextMove}</p>

              <div className="domain-card__actions">
                <Link href={`/domains/${card.domain}`}>Open domain</Link>
                <Link href={`/domains/${card.domain}/benchmark`}>Benchmark</Link>
                <Link href={`/domains/${card.domain}/review`}>Review</Link>
                <Link href={`/domains/${card.domain}/debug`}>Open debug</Link>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section
        id="benchmarking"
        title="Benchmarking"
        subtitle="Coverage, gate status, and the delta between baseline extraction and resolved normalization."
        actions={<Link href="/domains/islets/benchmark">Open benchmark view</Link>}
      >
        <div className="split-grid">
          <article className="surface">
            <h3>Coverage summary</h3>
            <QuickFacts
              items={[
                { label: "Ready domains", value: overview.readyDomainCount },
                { label: "Total protocols", value: overview.totalProtocols },
                { label: "Pending enrichments", value: overview.pendingSourceEnrichments }
              ]}
            />
            <p className="surface__detail">
              Gate-ready coverage is the practical threshold for trust. The remaining work is about tightening the
              gap between baseline extraction and resolved normalization.
            </p>
          </article>

          <article className="surface">
            <h3>Benchmarked domains</h3>
            <DataTable
              columns={["Domain", "Readiness", "Outcome", "Step", "Protocols"]}
              rows={overview.cards.map((card) => [
                card.label,
                formatPercent(card.readinessScore),
                formatPercent(card.reviewedOutcomeCoverage),
                formatPercent(card.reviewedStepPhaseCoverage),
                card.normalizedProtocolCount
              ])}
            />
          </article>
        </div>
      </Section>

      <Section
        id="discovery"
        title="Discovery"
        subtitle="This is where the next corpus layer should land. For now it is a gap map, showing the questions the current atlas can already answer and the ones it cannot."
      >
        <div className="discovery-grid">
          {overview.cards.map((card) => (
            <article className="discovery-card" key={`${card.domain}-discovery`}>
              <div className="discovery-card__header">
                <DomainBadge domain={card.domain} />
                <StatusPill tone="neutral">next move</StatusPill>
              </div>
              <h3>{card.label}</h3>
              <p className="discovery-card__lede">{card.currentPainPoint}</p>
              <p>{card.nextMove}</p>
              <div className="discovery-card__facts">
                <span>{card.topWedge}</span>
                <span>{formatPercent(card.reviewedOutcomeCoverage)} outcome coverage</span>
                <span>{formatPercent(card.reviewedStepPhaseCoverage)} step coverage</span>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section
        id="debug"
        title="Debug / Lineage"
        subtitle="The console should always show the backing files, not just the final rendering."
      >
        <div className="split-grid">
          <article className="surface">
            <h3>What debug surfaces expose</h3>
            <ul className="feature-list">
              <li>baseline versus resolved extraction</li>
              <li>normalized protocol rows and representative conditions</li>
              <li>normalization warnings and evidence authority</li>
              <li>raw JSON snapshots for audit and comparison</li>
            </ul>
          </article>

          <article className="surface">
            <h3>Debug entry points</h3>
            <DataTable
              columns={["Domain", "Focus", "Action"]}
              rows={overview.cards.map((card) => [
                card.label,
                "paper-level lineage and normalization state",
                <Link href={`/domains/${card.domain}/debug`}>Open debug</Link>
              ])}
            />
          </article>
        </div>
      </Section>
    </>
  );
}
