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

function confidenceLabel(value: "high" | "medium" | "low") {
  return `${value} confidence`;
}

function variableUnderTest(arms: string[]) {
  if (arms.length <= 1) {
    return "No comparison arms recorded.";
  }

  return arms.slice(1).join(", ");
}

function minimumViableExperiment(arms: string[], readouts: string[]) {
  const armList = arms.slice(0, Math.min(arms.length, 3)).join(" vs ");
  return `${armList || "Minimal arm set"} on ${readouts.join(", ") || "the primary readout set"}.`;
}

function negativeResultImplication(packetTitle: string, wedgeTitle: string) {
  return `A negative result would weaken ${wedgeTitle} as the current lead and push Atlas toward follow-on packets instead of scaling this thesis.`;
}

export default async function ExperimentsPage() {
  const data = await getExperimentsPageData();

  return (
    <>
      <PageIntro
        eyebrow="Experiments"
        title="Experiment packets that bridge literature to pre-wet-lab planning"
        summary="Atlas should feel useful before wet-lab work starts. Each packet below makes the strategic decision explicit, defines the minimum viable test, and shows what a positive or negative result would mean."
      >
        <div className="hero__stack">
          <SourceNote sourceLabel={data.domains[0]?.sourceLabel ?? "worktree"} />
          <div className="chip-row">
            <StatusPill tone="good">experiment planning</StatusPill>
            <StatusPill tone="neutral">decision-linked</StatusPill>
            <StatusPill tone="warn">not autonomous discovery</StatusPill>
          </div>
        </div>
      </PageIntro>

      <MetricGrid>
        <MetricCard label="Packets" value={String(data.packets.length)} />
        <MetricCard label="Domains" value={String(data.domains.length)} />
        <MetricCard label="Top packet" value={data.packets[0]?.packet.title ?? "n/a"} detail={data.packets[0]?.domainLabel ?? "No packet loaded."} tone="good" />
        <MetricCard label="Generated" value={new Date(data.generatedAt).toLocaleDateString("en-US")} />
      </MetricGrid>

      <Section title="Experiment Packet Queue" subtitle="Ranked by leverage and framed around the decision each packet is meant to unlock.">
        <div className="family-grid">
          {data.packets.map((entry) => (
            <article className="family-card" key={entry.packet.packetId}>
              <div className="surface__header">
                <div>
                  <h3>{entry.packet.title}</h3>
                  <p>{entry.domainLabel}</p>
                </div>
                <StatusPill tone={entry.packet.priorityScore >= 0.8 ? "good" : entry.packet.priorityScore >= 0.6 ? "neutral" : "warn"}>
                  priority {entry.packet.priorityScore.toFixed(2)}
                </StatusPill>
              </div>

              <div className="chip-row">
                <span className="data-chip">{entry.wedgeClass}</span>
                <span className="data-chip">{confidenceLabel(entry.confidenceBand)}</span>
                <span className="data-chip">{entry.translationalSignal}</span>
              </div>

              <ul className="feature-list">
                <li><strong>Decision being tested:</strong> {entry.packet.decisionQuestion}</li>
                <li><strong>Wedge context:</strong> {entry.wedgeTitle}</li>
                <li><strong>Hypothesis:</strong> {entry.packet.claim}</li>
                <li><strong>Fixed variables:</strong> {entry.packet.fixedVariables.join(", ")}</li>
                <li><strong>Variable under test:</strong> {variableUnderTest(entry.packet.comparisonArms)}</li>
                <li><strong>Readouts:</strong> {[...entry.packet.primaryReadouts, ...entry.packet.secondaryReadouts].join(", ")}</li>
                <li><strong>Minimum viable experiment:</strong> {minimumViableExperiment(entry.packet.comparisonArms, entry.packet.primaryReadouts)}</li>
                <li><strong>Supporting evidence:</strong> {entry.packet.supportingPaperTitles.slice(0, 3).join("; ")}</li>
                <li><strong>Blocking uncertainties:</strong> {entry.packet.keyUncertainties.join("; ") || "No explicit blocker recorded."}</li>
                <li><strong>Expected upside if positive:</strong> {entry.packet.translationalRationale}</li>
                <li><strong>What a negative result implies:</strong> {negativeResultImplication(entry.packet.title, entry.wedgeTitle)}</li>
              </ul>

              <Link href={`/domains/${entry.domain}`}>Open wedge context</Link>
            </article>
          ))}
        </div>
      </Section>
    </>
  );
}
