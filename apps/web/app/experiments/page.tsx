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
  strategicSignificance,
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

function negativeResultImplication(wedgeTitle: string) {
  return `A negative result would weaken ${wedgeTitle} as the current lead and push Atlas toward the follow-on packets instead of scaling this thesis.`;
}

export default async function ExperimentsPage() {
  const data = await getExperimentsPageData();
  const lead = data.packets[0];

  return (
    <>
      <PageIntro
        eyebrow="Experiments"
        title="Experiment packets"
        summary="This page shows the concrete experiments Atlas can justify from the current literature read, including the decision each one is meant to answer."
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
        subtitle="Atlas is most useful when it turns a literature read into a concrete next test."
      >
        <div className="triad-grid">
          <article className="surface">
            <span className="section-kicker">Current recommendation</span>
            <h3>Atlas turns the call into an experiment</h3>
            <p>The recommendation is useful because it does not stop at ranking. It outputs a concrete next experiment.</p>
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
        subtitle="Start with the summary. Expand a card only when you need variables, supporting papers, or detailed rationale."
      >
        <div className="family-grid family-grid--stack">
          {data.packets.map((entry) => (
            <article className="family-card experiment-card" key={entry.packet.packetId}>
              <div className="surface__header">
                <div>
                  <span className="section-kicker">{entry.domainLabel}</span>
                  <h3>{entry.packet.title}</h3>
                  <p>{entry.packet.claim}</p>
                </div>
                <StatusPill
                  tone={
                    entry.packet.priorityScore >= 0.8
                      ? "good"
                      : entry.packet.priorityScore >= 0.6
                        ? "neutral"
                        : "warn"
                  }
                >
                  Priority {entry.packet.priorityScore.toFixed(2)}
                </StatusPill>
              </div>

              <div className="chip-row">
                <span className="data-chip">{wedgeClassLabel(entry.wedgeClass)}</span>
                <span className="data-chip">{shortConfidenceLabel(entry.confidenceBand)}</span>
                <span className="data-chip">{translationalSignalLabel(entry.translationalSignal)}</span>
              </div>

              <div className="experiment-summary-grid">
                <div className="summary-cell">
                  <span>Decision being tested</span>
                  <strong>{entry.packet.decisionQuestion}</strong>
                </div>
                <div className="summary-cell">
                  <span>Plain-English significance</span>
                  <strong>{strategicSignificance(entry.domain)}</strong>
                </div>
                <div className="summary-cell">
                  <span>Minimum viable experiment</span>
                  <strong>{minimumViableExperiment(entry.packet.comparisonArms, entry.packet.primaryReadouts)}</strong>
                </div>
                <div className="summary-cell">
                  <span>Expected upside if positive</span>
                  <strong>{entry.packet.translationalRationale}</strong>
                </div>
                <div className="summary-cell">
                  <span>If negative</span>
                  <strong>{negativeResultImplication(entry.wedgeTitle)}</strong>
                </div>
              </div>

              <details className="detail-panel">
                <summary>Show packet details</summary>
                <div className="detail-panel__content">
                  <div className="detail-columns">
                    <div>
                      <h4>Experiment structure</h4>
                      <ul className="feature-list">
                        <li>
                          <strong>Wedge context:</strong> {entry.wedgeTitle}
                        </li>
                        <li>
                          <strong>Linked experiment:</strong> {experimentBridgeLabel(entry.packet.title)}
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
                      <h4>Evidence and risks</h4>
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
                      </ul>
                    </div>
                  </div>
                </div>
              </details>

              <Link href={`/domains/${entry.domain}`}>Open wedge context</Link>
            </article>
          ))}
        </div>
      </Section>
    </>
  );
}
