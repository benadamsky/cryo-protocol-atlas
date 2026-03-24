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
    label: "Protocol Intelligence",
    summary: "Current domain slices and the explicit active wedge"
  },
  {
    id: "benchmarking",
    label: "Benchmarking",
    summary: "Coverage, gate status, and evidence confidence behind the wedge"
  },
  {
    id: "discovery",
    label: "Discovery",
    summary: "Live queue state, review packet pressure, and next-move candidates"
  },
  {
    id: "optimizer",
    label: "Optimizer",
    summary: "Policy thresholds, eval health, and bounded loop outputs"
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
        title="Decision-useful cryopreservation protocol intelligence."
        summary="This console stays tied to the file-backed pipeline. It reads the latest active wedge, benchmark matrix, evidence-gap queue, experiment packets, and call artifacts without creating a second mutable source of truth."
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
          detail="Current vertical slices available for protocol comparison and wedge validation."
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
        subtitle="The protocol-intelligence slice. Each card combines wedge framing with the benchmark signals backing it."
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
                <span>Active wedge: {card.topWedge}</span>
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
        subtitle="Coverage, gate status, and the evidence confidence behind the active wedge."
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
              Gate-ready coverage is the practical threshold for trust. The remaining work is about tightening evidence
              density and authority behind the active wedge rather than widening the surface area.
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
        subtitle="Discovery stays downstream from protocol intelligence. Use the dedicated route for queue recommendations, packet assembly, and provider degradation state."
        actions={<Link href="/discovery">Open discovery lane</Link>}
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
        id="optimizer"
        title="Optimizer"
        subtitle="The optimizer lane stays separate from the trusted atlas and tunes only downstream discovery recommendation policy."
        actions={<Link href="/optimizer">Open optimizer lane</Link>}
      >
        <div className="split-grid">
          <article className="surface">
            <h3>What it exposes</h3>
            <ul className="feature-list">
              <li>current mutable policy thresholds and top weights</li>
              <li>deterministic evaluation metrics from the local benchmark</li>
              <li>bounded keep/revert loop attempts when generated</li>
            </ul>
          </article>

          <article className="surface">
            <h3>Why it is separate</h3>
            <p className="surface__detail">
              The optimizer lane is allowed to iterate quickly because it does not mutate trusted atlas outputs.
              It is a sidecar for discovery promotion policy, not a second source of atlas truth.
            </p>
          </article>
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
