import Link from "next/link";
import {
  DataTable,
  MetricCard,
  MetricGrid,
  PageIntro,
  ProvenanceCallout,
  Section,
  SourceNote,
  StatusPill
} from "@/components/atlas-ui";
import { formatDateTime } from "@/lib/data";
import { getRecommendationPageData } from "@/lib/decision-data";

function confidenceLabel(value: "high" | "medium" | "low") {
  return `${value} confidence`;
}

export default async function RecommendationPage() {
  const data = await getRecommendationPageData();
  const current = data.current;

  return (
    <>
      <PageIntro
        eyebrow="Current Recommendation"
        title={current.title}
        summary={current.thesis}
      >
        <div className="hero__stack">
          <SourceNote sourceLabel={current.sourceLabel} />
          <div className="chip-row">
            <StatusPill tone={current.wedgeClass === "plausible first company wedge" ? "good" : "warn"}>
              {current.wedgeClass}
            </StatusPill>
            <StatusPill tone={current.confidenceBand === "high" ? "good" : current.confidenceBand === "medium" ? "neutral" : "warn"}>
              {confidenceLabel(current.confidenceBand)}
            </StatusPill>
            <StatusPill tone="neutral">{current.translationalSignal}</StatusPill>
          </div>
          <ProvenanceCallout
            eyebrow="Recommendation"
            title="What Atlas says right now"
            summary={current.oneSentenceRecommendation}
            items={[
              { label: "Updated", value: formatDateTime(current.updatedAt) },
              { label: "System state", value: data.overallState },
              { label: "Decision unlock", value: current.nextExperiment?.title ?? "No experiment packet" }
            ]}
          />
        </div>
      </PageIntro>

      <MetricGrid>
        <MetricCard label="Wedge class" value={current.wedgeClass} detail="Explicit framing for how seriously to treat this wedge today." tone={current.wedgeClass === "plausible first company wedge" ? "good" : "warn"} />
        <MetricCard label="Confidence" value={confidenceLabel(current.confidenceBand)} detail={`${Math.round(current.confidenceScore * 100)}% evidence confidence from the active wedge artifact.`} tone={current.confidenceBand === "high" ? "good" : current.confidenceBand === "medium" ? "default" : "warn"} />
        <MetricCard label="Translational signal" value={current.translationalSignal} detail={current.translationalRationale} />
        <MetricCard label="Current blocker" value={current.biggestUncertainty} detail="The highest-signal unresolved uncertainty or confound on the current recommendation." tone="warn" />
      </MetricGrid>

      <Section
        title="Why Atlas Recommends This"
        subtitle="The homepage now behaves like a decision memo: current verdict first, supporting rationale second."
        actions={<Link href={`/domains/${current.domain}`}>Open wedge detail</Link>}
      >
        <div className="split-grid">
          <article className="surface">
            <div className="surface__header">
              <div>
                <h3>Why this wedge wins now</h3>
                <p>{current.whyInteresting}</p>
              </div>
              <StatusPill tone="good">current lead</StatusPill>
            </div>
            <ul className="feature-list">
              <li>{current.standardPattern}</li>
              <li>{current.keyOutcomePattern}</li>
              <li>{current.currentVerdict}</li>
            </ul>
          </article>

          <article className="surface">
            <div className="surface__header">
              <div>
                <h3>Highest-leverage next experiment</h3>
                <p>{current.nextExperiment?.proposedExperiment ?? "No packet available yet."}</p>
              </div>
              <StatusPill tone="neutral">{current.nextExperiment?.category ?? "pending"}</StatusPill>
            </div>
            <ul className="feature-list">
              <li><strong>Decision:</strong> {current.decisionUnlock}</li>
              <li><strong>Primary readouts:</strong> {current.nextExperiment?.primaryReadouts.join(", ") || "n/a"}</li>
              <li><strong>Changed variables:</strong> {current.nextExperiment?.comparisonArms.join(", ") || "n/a"}</li>
              <li><strong>Fixed variables:</strong> {current.nextExperiment?.fixedVariables.join(", ") || "n/a"}</li>
            </ul>
          </article>
        </div>
      </Section>

      <Section
        title="Runner-Up Wedges"
        subtitle="Useful alternatives and follow-ons, with explicit reasons they are not first."
        actions={<Link href="/wedges">See all wedges</Link>}
      >
        <div className="family-grid">
          {data.runnersUp.map((runner) => (
            <article className="family-card" key={runner.domain}>
              <div className="surface__header">
                <div>
                  <h3>{runner.label}</h3>
                  <p>{runner.title}</p>
                </div>
                <StatusPill tone={runner.wedgeClass === "plausible first company wedge" ? "good" : "warn"}>
                  {runner.wedgeClass}
                </StatusPill>
              </div>
              <p>{runner.thesis}</p>
              <p className="surface__detail"><strong>Why not first:</strong> {runner.runnerUps[0]?.notFirstReason ?? runner.biggestUncertainty}</p>
              <div className="chip-row">
                <span className="data-chip">{confidenceLabel(runner.confidenceBand)}</span>
                <span className="data-chip">{runner.translationalSignal}</span>
              </div>
              <p className="surface__detail">{runner.nextExperiment?.title ?? "No packet queued."}</p>
              <Link href={`/domains/${runner.domain}`}>Open wedge detail</Link>
            </article>
          ))}
        </div>
      </Section>

      <Section
        title="Trust Posture"
        subtitle="How much to trust the recommendation, what still blocks conviction, and what Atlas would do next."
        actions={<Link href="/evidence">Open evidence queues</Link>}
      >
        <div className="split-grid">
          <article className="surface">
            <h3>Recommendation posture</h3>
            <ul className="feature-list">
              <li><strong>Current verdict:</strong> {current.currentVerdict}</li>
              <li><strong>Biggest remaining confound:</strong> {current.mainConfound}</li>
              <li><strong>Top evidence gap:</strong> {current.topEvidenceGap?.title ?? "No ranked gap currently queued."}</li>
              <li><strong>What would raise confidence:</strong> {current.topEvidenceGap?.recommendedAction ?? current.nextExperiment?.decisionQuestion ?? "Run the top packet and close the top gap."}</li>
            </ul>
          </article>

          <article className="surface">
            <h3>Atlas-wide comparison</h3>
            <DataTable
              columns={["Domain", "Wedge class", "Confidence", "Translational", "Current blocker", "Next test"]}
              rows={data.domains.map((domain) => [
                <Link href={`/domains/${domain.domain}`} key={domain.domain}>{domain.label}</Link>,
                domain.wedgeClass,
                confidenceLabel(domain.confidenceBand),
                domain.translationalSignal,
                domain.biggestUncertainty,
                domain.nextExperiment?.title ?? "No packet"
              ])}
            />
          </article>
        </div>
      </Section>
    </>
  );
}
