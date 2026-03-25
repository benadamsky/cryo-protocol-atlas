import Link from "next/link";
import {
  DataTable,
  MetricCard,
  MetricGrid,
  PageIntro,
  Section,
  SourceNote,
  StatusPill
} from "@/components/atlas-ui";
import { formatDateTime } from "@/lib/data";
import { getDecisionDomainsData } from "@/lib/decision-data";

function confidenceLabel(value: "high" | "medium" | "low") {
  return `${value} confidence`;
}

export default async function WedgesPage() {
  const domains = await getDecisionDomainsData();

  return (
    <>
      <PageIntro
        eyebrow="Wedges"
        title="Current wedge slate across Atlas"
        summary="Each wedge is framed as a strategic recommendation, not a protocol dashboard. The cards below answer what the wedge is, why it matters, how much to trust it, what still blocks conviction, and what to test next."
      >
        <div className="hero__stack">
          <SourceNote sourceLabel={domains[0]?.sourceLabel ?? "worktree"} />
          <div className="chip-row">
            <StatusPill tone="good">decision-first</StatusPill>
            <StatusPill tone="neutral">wedge validation</StatusPill>
            <StatusPill tone="warn">discovery downstream</StatusPill>
          </div>
        </div>
      </PageIntro>

      <MetricGrid>
        <MetricCard label="Domains" value={String(domains.length)} />
        <MetricCard label="Leading wedge" value={domains[0]?.title ?? "n/a"} detail={domains[0]?.label ?? "No domain loaded."} tone="good" />
        <MetricCard label="Strongest confidence" value={domains[0] ? confidenceLabel(domains[0].confidenceBand) : "n/a"} detail="The top-ranked wedge by current recommendation score." />
        <MetricCard label="Top blocker" value={domains[0]?.biggestUncertainty ?? "n/a"} detail="The main uncertainty still sitting on the lead wedge." tone="warn" />
      </MetricGrid>

      <Section title="Wedge Cards" subtitle="Decision narrative first. Supporting structure stays visible, but it no longer drives the page hierarchy.">
        <div className="domain-grid">
          {domains.map((domain) => (
            <article className="domain-card" key={domain.domain}>
              <div className="domain-card__header">
                <div>
                  <h3>{domain.title}</h3>
                  <p>{domain.label}</p>
                </div>
                <StatusPill tone={domain.wedgeClass === "plausible first company wedge" ? "good" : "warn"}>
                  {domain.wedgeClass}
                </StatusPill>
              </div>

              <p className="domain-card__lede">{domain.thesis}</p>
              <p>{domain.oneSentenceRecommendation}</p>

              <div className="quick-facts">
                <div className="inline-stat">
                  <span>Confidence</span>
                  <strong>{confidenceLabel(domain.confidenceBand)}</strong>
                </div>
                <div className="inline-stat">
                  <span>Translational</span>
                  <strong>{domain.translationalSignal}</strong>
                </div>
                <div className="inline-stat">
                  <span>Updated</span>
                  <strong>{formatDateTime(domain.updatedAt)}</strong>
                </div>
              </div>

              <div className="chip-row">
                <span className="data-chip">{domain.standardPattern}</span>
              </div>

              <p className="surface__detail"><strong>Main confound:</strong> {domain.mainConfound}</p>
              <p className="surface__detail"><strong>Next experiment:</strong> {domain.nextExperiment?.title ?? "No packet queued."}</p>

              <div className="domain-card__actions">
                <Link href={`/domains/${domain.domain}`}>Open wedge detail</Link>
                <Link href={`/domains/${domain.domain}/review`}>Open evidence</Link>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Compact Comparison" subtitle="Use this when you need the portfolio view instead of the full narrative.">
        <DataTable
          columns={["Domain", "Recommendation", "Wedge class", "Confidence", "Translational", "Top evidence gap", "Next experiment"]}
          rows={domains.map((domain) => [
            domain.label,
            domain.title,
            domain.wedgeClass,
            confidenceLabel(domain.confidenceBand),
            domain.translationalSignal,
            domain.topEvidenceGap?.title ?? "No ranked gap",
            domain.nextExperiment?.title ?? "No packet"
          ])}
        />
      </Section>
    </>
  );
}
