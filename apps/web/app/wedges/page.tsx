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
import {
  experimentBridgeLabel,
  plainEnglishWedgeSummary,
  shortConfidenceLabel,
  strategicSignificance,
  translationalSignalLabel,
  wedgeClassLabel,
  wedgeClassNarrative
} from "@/lib/ui-copy";

export default async function WedgesPage() {
  const domains = await getDecisionDomainsData();
  const lead = domains[0];

  return (
    <>
      <PageIntro
        eyebrow="Wedges"
        title="Current wedge slate across Atlas"
        summary="Use this page to compare the current recommended questions across Atlas, see which one leads today, and jump to the linked experiment."
      >
        <div className="hero__stack">
          <SourceNote sourceLabel={lead?.sourceLabel ?? "worktree"} />
        </div>
      </PageIntro>

      <MetricGrid>
        <MetricCard label="Domains compared" value={String(domains.length)} />
        <MetricCard
          label="Current lead wedge"
          value={lead?.label ?? "n/a"}
          detail={lead ? `${lead.title}. ${wedgeClassNarrative(lead.wedgeClass, lead.label)}` : "No domain loaded."}
          tone="good"
        />
        <MetricCard
          label="Confidence in current lead ordering"
          value={lead ? shortConfidenceLabel(lead.confidenceBand) : "n/a"}
          detail={lead ? `${Math.round(lead.confidenceScore * 100)}% evidence confidence on the current reviewed slice.` : undefined}
        />
        <MetricCard
          label="Lead linked experiment"
          value={lead?.nextExperiment?.title ?? "n/a"}
          detail={lead ? experimentBridgeLabel(lead.nextExperiment?.title) : "No packet loaded."}
          tone="good"
        />
      </MetricGrid>

      <Section
        title="Wedge Cards"
        subtitle="Each card shows the current question, why it matters, what still blocks conviction, and the experiment it leads to."
      >
        <div className="domain-grid">
          {domains.map((domain) => (
            <article className="domain-card" key={domain.domain}>
              <div className="domain-card__header">
                <div>
                  <span className="section-kicker">{domain.label}</span>
                  <h3>{domain.title}</h3>
                  <p className="domain-card__lede">
                    {plainEnglishWedgeSummary(domain.domain, domain.title, domain.thesis)}
                  </p>
                </div>
                <StatusPill tone={domain.domain === lead?.domain ? "good" : "warn"}>
                  {wedgeClassLabel(domain.wedgeClass)}
                </StatusPill>
              </div>

              <div className="chip-row">
                <span className="data-chip">{shortConfidenceLabel(domain.confidenceBand)}</span>
                <span className="data-chip">{translationalSignalLabel(domain.translationalSignal)}</span>
                <span className="data-chip">Updated {formatDateTime(domain.updatedAt)}</span>
              </div>

              <div className="card-summary-list">
                <p>
                  <strong>Wedge class:</strong> {wedgeClassNarrative(domain.wedgeClass, domain.label)}
                </p>
                <p>
                  <strong>Strategic significance:</strong> {strategicSignificance(domain.domain)}
                </p>
                <p>
                  <strong>Main blocker:</strong> {domain.biggestUncertainty}
                </p>
                <p>
                  <strong>Linked experiment:</strong> {experimentBridgeLabel(domain.nextExperiment?.title)}
                </p>
              </div>

              <div className="domain-card__actions">
                <Link href={`/domains/${domain.domain}`}>Open wedge detail</Link>
                <Link href="/experiments">Open experiment packets</Link>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section
        title="Compact Comparison"
        subtitle="A tighter cross-domain table once you have the card-level read."
      >
        <DataTable
          columns={[
            "Domain",
            "Current wedge",
            "Role",
            "Confidence",
            "Translational signal",
            "Main blocker",
            "Experiment bridge"
          ]}
          rows={domains.map((domain) => [
            domain.label,
            domain.title,
            wedgeClassLabel(domain.wedgeClass),
            shortConfidenceLabel(domain.confidenceBand),
            translationalSignalLabel(domain.translationalSignal),
            domain.biggestUncertainty,
            domain.nextExperiment?.title ?? "No packet"
          ])}
        />
      </Section>
    </>
  );
}
