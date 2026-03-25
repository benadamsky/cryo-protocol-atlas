import Link from "next/link";
import {
  MetricCard,
  MetricGrid,
  PageIntro,
  Section,
  SourceNote,
  StatusPill
} from "@/components/atlas-ui";
import { getExperimentsPageData } from "@/lib/decision-data";
import {
  experimentBridgeLabel,
  shortConfidenceLabel,
  translationalSignalLabel,
  wedgeClassLabel
} from "@/lib/ui-copy";

function variableUnderTest(arms: string[]) {
  if (arms.length <= 1) {
    return "No comparison arms recorded.";
  }

  return arms.slice(1).join(", ");
}

function minimumViableExperiment(arms: string[], readouts: string[]) {
  const armList = arms.slice(0, Math.min(arms.length, 3)).join(" vs ");
  const readoutList = readouts.join(", ");
  return `${armList || "Minimal arm set"} on ${readoutList || "the primary readout set"}.`;
}

function packetStatusLabel(isLead: boolean, priorityScore: number) {
  if (isLead) {
    return "Current lead";
  }

  if (priorityScore >= 0.75) {
    return "Strong follow-on";
  }

  return "Follow-on";
}

function leadUncertainty(uncertainties: string[]) {
  return uncertainties[0] ?? "No explicit blocker recorded yet.";
}

function supportingPaperSummary(titles: string[]) {
  if (titles.length === 0) {
    return "No supporting papers surfaced yet.";
  }

  return titles.slice(0, 2).join("; ");
}

export default async function ExperimentsPage() {
  const data = await getExperimentsPageData();
  const lead = data.packets[0];

  return (
    <>
      <PageIntro
        eyebrow="Experiments"
        title="Recommended wet-lab experiments"
        summary="These are real lab experiments Atlas thinks are worth running next based on the current literature. They are not internal model evaluations."
      >
        <div className="hero__stack">
          <SourceNote sourceLabel={data.domains[0]?.sourceLabel ?? "worktree"} />
        </div>
      </PageIntro>

      <MetricGrid>
        <MetricCard label="Packets" value={String(data.packets.length)} />
        <MetricCard label="Domains covered" value={String(data.domains.length)} />
        <MetricCard
          label="Lead packet"
          value={lead?.packet.title ?? "n/a"}
          detail={lead ? `${lead.domainLabel}. ${experimentBridgeLabel(lead.packet.title)}` : "No packet loaded."}
          tone="good"
        />
        <MetricCard label="Generated" value={new Date(data.generatedAt).toLocaleDateString("en-US")} />
      </MetricGrid>

      <Section
        title="Why Experiment Packets Matter"
        subtitle="Atlas is most useful when it turns a literature read into a concrete lab test."
      >
        <div className="triad-grid">
          <article className="surface">
            <span className="section-kicker">Current recommendation</span>
            <h3>Atlas turns a literature call into a lab plan</h3>
            <p>The recommendation is only useful if it ends in a real experiment a team could run next.</p>
          </article>
          <article className="surface">
            <span className="section-kicker">Before wet-lab spend</span>
            <h3>Better framing before wet-lab spend</h3>
            <p>Packets specify the decision, variables, and readouts so teams do not waste cycles on poorly framed experiments.</p>
          </article>
          <article className="surface">
            <span className="section-kicker">After the result</span>
            <h3>Results can feed later research loops</h3>
            <p>Packet results can later feed broader discovery workflows, but that is downstream from the current recommendation.</p>
          </article>
        </div>
      </Section>

      <Section
        title="Experiment Cards"
        subtitle="Each card is a real lab experiment Atlas recommends. Start with the summary, then expand when you need variables, supporting papers, or detailed rationale."
      >
        <div className="family-grid family-grid--stack">
          {data.packets.map((entry) => {
            const isLead = entry.packet.packetId === lead?.packet.packetId;

            return (
            <article className="family-card experiment-card" key={entry.packet.packetId}>
              <div className="surface__header">
                <div>
                  <span className="section-kicker">{entry.domainLabel}</span>
                  <h3>{entry.packet.title}</h3>
                  <p>{entry.packet.claim}</p>
                </div>
                <StatusPill
                  tone={
                    isLead
                      ? "good"
                      : entry.packet.priorityScore >= 0.75
                        ? "neutral"
                        : "warn"
                  }
                >
                  {packetStatusLabel(isLead, entry.packet.priorityScore)}
                </StatusPill>
              </div>

              <div className="chip-row">
                <span className="data-chip">{wedgeClassLabel(entry.wedgeClass)}</span>
                <span className="data-chip">{shortConfidenceLabel(entry.confidenceBand)}</span>
                <span className="data-chip">{translationalSignalLabel(entry.translationalSignal)}</span>
              </div>

              <div className="experiment-summary-grid">
                <div className="summary-cell">
                  <span>Why this rose to the top</span>
                  <strong>{entry.packet.whyNow}</strong>
                </div>
                <div className="summary-cell">
                  <span>What you would actually run</span>
                  <strong>{minimumViableExperiment(entry.packet.comparisonArms, entry.packet.primaryReadouts)}</strong>
                </div>
                <div className="summary-cell">
                  <span>Strongest supporting papers</span>
                  <strong>{supportingPaperSummary(entry.packet.supportingPaperTitles)}</strong>
                </div>
                <div className="summary-cell">
                  <span>Main watch-out</span>
                  <strong>{leadUncertainty(entry.packet.keyUncertainties)}</strong>
                </div>
              </div>

              <details className="detail-panel">
                <summary>Show design details</summary>
                <div className="detail-panel__content">
                  <div className="detail-columns">
                    <div>
                      <h4>Experiment plan</h4>
                      <ul className="feature-list">
                        <li>
                          <strong>Strategic question:</strong> {entry.packet.decisionQuestion}
                        </li>
                        <li>
                          <strong>Why Atlas selected this test:</strong> {entry.wedgeTitle}
                        </li>
                        <li>
                          <strong>Experiment title:</strong> {experimentBridgeLabel(entry.packet.title)}
                        </li>
                        <li>
                          <strong>Proposed test:</strong> {entry.packet.proposedExperiment}
                        </li>
                        <li>
                          <strong>Fixed variables:</strong> {entry.packet.fixedVariables.join(", ") || "n/a"}
                        </li>
                        <li>
                          <strong>Changed variables:</strong> {variableUnderTest(entry.packet.comparisonArms)}
                        </li>
                        <li>
                          <strong>Primary readouts:</strong> {entry.packet.primaryReadouts.join(", ") || "n/a"}
                        </li>
                        <li>
                          <strong>Secondary readouts:</strong> {entry.packet.secondaryReadouts.join(", ") || "n/a"}
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h4>Evidence behind this lab test</h4>
                      <ul className="feature-list">
                        <li>
                          <strong>Supporting papers:</strong> {entry.packet.supportingPaperTitles.slice(0, 4).join("; ")}
                        </li>
                        <li>
                          <strong>Main uncertainties:</strong> {entry.packet.keyUncertainties.join("; ") || "No explicit blocker recorded."}
                        </li>
                        <li>
                          <strong>Authority notes:</strong> {entry.packet.authorityNotes.join("; ") || "No extra authority notes recorded."}
                        </li>
                        <li>
                          <strong>What success would unlock:</strong> {entry.packet.translationalRationale}
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </details>

              <Link href={`/domains/${entry.domain}`}>Open full rationale</Link>
            </article>
            );
          })}
        </div>
      </Section>
    </>
  );
}
