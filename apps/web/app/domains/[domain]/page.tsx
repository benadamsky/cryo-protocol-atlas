import Link from "next/link";
import { notFound } from "next/navigation";
import {
  DataTable,
  DomainTabs,
  MetricCard,
  MetricGrid,
  PageIntro,
  QuickFacts,
  Section,
  SourceNote,
  StatusPill
} from "@/components/atlas-ui";
import { formatDateTime } from "@/lib/data";
import { getDecisionDomainData } from "@/lib/decision-data";
import { parseDomainId } from "@/lib/domain";

function confidenceLabel(value: "high" | "medium" | "low") {
  return `${value} confidence`;
}

function formatImpact(value: "high" | "medium" | "low") {
  return value;
}

export default async function DomainPage({
  params
}: {
  params: Promise<{ domain: string }>;
}) {
  try {
    const { domain: rawDomain } = await params;
    const domain = parseDomainId(rawDomain);
    const data = await getDecisionDomainData(domain);
    const topPacket = data.nextExperiment;
    const topGap = data.topEvidenceGap;

    return (
      <>
        <PageIntro
          eyebrow={`${data.label} wedge`}
          title={data.title}
          summary={data.thesis}
        >
          <div className="hero__stack">
            <SourceNote sourceLabel={data.sourceLabel} />
            <div className="chip-row">
              <StatusPill tone={data.wedgeClass === "plausible first company wedge" ? "good" : "warn"}>
                {data.wedgeClass}
              </StatusPill>
              <StatusPill tone={data.confidenceBand === "high" ? "good" : data.confidenceBand === "medium" ? "neutral" : "warn"}>
                {confidenceLabel(data.confidenceBand)}
              </StatusPill>
              <StatusPill tone="neutral">{data.translationalSignal}</StatusPill>
            </div>
            <QuickFacts
              items={[
                { label: "Last updated", value: formatDateTime(data.updatedAt) },
                { label: "Decision score", value: data.recommendationScore.toFixed(2) },
                { label: "Next packet", value: topPacket?.title ?? "No packet queued" }
              ]}
            />
          </div>
        </PageIntro>

        <DomainTabs current="overview" domain={domain} />

        <MetricGrid>
          <MetricCard label="Wedge class" value={data.wedgeClass} detail="This is now a first-class product concept, shown consistently across Atlas." tone={data.wedgeClass === "plausible first company wedge" ? "good" : "warn"} />
          <MetricCard label="Confidence" value={confidenceLabel(data.confidenceBand)} detail={`${Math.round(data.confidenceScore * 100)}% evidence confidence on the active wedge.`} tone={data.confidenceBand === "high" ? "good" : data.confidenceBand === "medium" ? "default" : "warn"} />
          <MetricCard label="Translational signal" value={data.translationalSignal} detail={data.translationalRationale} />
          <MetricCard label="Biggest uncertainty" value={data.biggestUncertainty} detail="The shortest path to changing the current verdict." tone="warn" />
        </MetricGrid>

        <Section
          title="Wedge Summary"
          subtitle="A concise narrative summary that starts with the strategic read instead of the pipeline."
          actions={<Link href={`/domains/${domain}/review`}>Open evidence view</Link>}
        >
          <div className="split-grid">
            <article className="surface">
              <h3>Summary</h3>
              <ul className="feature-list">
                <li><strong>Why interesting:</strong> {data.whyInteresting}</li>
                <li><strong>Dominant protocol pattern:</strong> {data.standardPattern}</li>
                <li><strong>Key outcome pattern:</strong> {data.keyOutcomePattern}</li>
                <li><strong>Main confound:</strong> {data.mainConfound}</li>
                <li><strong>Current recommendation:</strong> {data.oneSentenceRecommendation}</li>
              </ul>
            </article>

            <article className="surface">
              <h3>Runner-up wedge candidates</h3>
              {data.runnerUps.length === 0 ? (
                <p className="surface__detail">No runner-up packets are currently available for this wedge.</p>
              ) : (
                <div className="family-grid family-grid--stack">
                  {data.runnerUps.map((runner) => (
                    <article className="family-card" key={runner.title}>
                      <div className="surface__header">
                        <div>
                          <h3>{runner.title}</h3>
                          <p>{runner.category}</p>
                        </div>
                        <StatusPill tone="neutral">runner-up</StatusPill>
                      </div>
                      <p>{runner.whyInteresting}</p>
                      <p className="surface__detail"><strong>Why not first:</strong> {runner.notFirstReason}</p>
                    </article>
                  ))}
                </div>
              )}
            </article>
          </div>
        </Section>

        <Section
          title="Benchmark Matrix"
          subtitle="Compact, human-readable rows that keep the wedge decision interpretable."
          actions={<Link href={`/domains/${domain}/atlas`}>Open matrix route</Link>}
        >
          <DataTable
            columns={[
              "Paper",
              "Protocol family",
              "CPA backbone",
              "Additive / adjunct",
              "Species",
              "Specimen",
              "Endpoint class",
              "Transplant?",
              "Evidence authority",
              "Evidence strength",
              "Translational",
              "Wedge relevance",
              "Key confound"
            ]}
            rows={data.wedgeMatrix.rows.map((row) => [
              row.title,
              row.protocolFamily,
              row.baseCpaBackbone,
              row.adjuncts.join(", ") || "base only",
              row.species.join(", "),
              row.specimenTypes.join(", "),
              row.endpointClasses.join(", "),
              row.endpointClasses.includes("transplantation") ? "yes" : "no",
              row.authorityProfile,
              row.evidenceStrength,
              row.translationalSignal,
              row.wedgeRelevanceScore.toFixed(2),
              row.confoundFlags.join(", ") || "none"
            ])}
          />
        </Section>

        <Section
          title="Evidence Authority Breakdown"
          subtitle="Authority counts explain how much of the wedge story is primary-backed versus still abstract-bound."
        >
          <div className="split-grid">
            <article className="surface">
              <QuickFacts
                items={[
                  { label: "Primary-backed", value: data.authorityBreakdown.primaryBacked },
                  { label: "Primary-indirect", value: data.authorityBreakdown.primaryIndirect },
                  { label: "Manual-curation-backed", value: data.authorityBreakdown.manualCurationBacked },
                  { label: "Secondary-backed", value: data.authorityBreakdown.secondaryBacked },
                  { label: "Abstract-only", value: data.authorityBreakdown.abstractOnly }
                ]}
              />
            </article>
            <article className="surface">
              <h3>Why this matters</h3>
              <ul className="feature-list">
                <li>Primary-backed rows are the strongest basis for wedge choice and experiment design.</li>
                <li>Abstract-only rows can still guide prioritization, but they should not be over-trusted.</li>
                <li>The current row-level artifact set does not split direct versus indirect primary support, so primary-indirect is reported separately only when surfaced explicitly.</li>
              </ul>
            </article>
          </div>
        </Section>

        <Section
          title="Contradictions and Confounds"
          subtitle="Conflicts are only useful if the page explains why they matter and what evidence would actually resolve them."
        >
          <div className="family-grid">
            {data.contradictionReport.contradictions.length === 0 ? (
              <article className="family-card">
                <h3>No contradiction report items</h3>
                <p className="surface__detail">The current wedge does not carry an explicit contradiction report item, but evidence gaps still limit confidence.</p>
              </article>
            ) : (
              data.contradictionReport.contradictions.map((item) => (
                <article className="family-card" key={`${item.topic}-${item.paperA}`}>
                  <div className="surface__header">
                    <div>
                      <h3>{item.topic}</h3>
                      <p>{formatImpact(item.decisionImpact)} impact</p>
                    </div>
                    <StatusPill tone={item.decisionImpact === "high" ? "good" : item.decisionImpact === "medium" ? "warn" : "neutral"}>
                      {item.decisionImpact}
                    </StatusPill>
                  </div>
                  <ul className="feature-list">
                    <li><strong>What conflicts:</strong> {item.paperA} vs {item.paperB}</li>
                    <li><strong>Likely reason:</strong> {item.reason}</li>
                    <li><strong>Does it matter:</strong> {item.decisionImpact} impact on wedge choice</li>
                    <li><strong>What evidence would resolve it:</strong> {item.resolutionPath}</li>
                  </ul>
                </article>
              ))
            )}
          </div>
        </Section>

        <Section
          title="Evidence Gap Queue"
          subtitle="Ranked by decision impact rather than generic completeness."
        >
          <DataTable
            columns={["Paper", "Impact", "Authority", "Translational", "Missing fields", "Rationale", "Action"]}
            rows={data.evidenceGapQueue.map((gap) => [
              gap.title,
              gap.decisionImpact,
              gap.authorityProfile,
              gap.translationalSignal,
              gap.missingFields.join(", "),
              gap.rationale,
              gap.recommendedAction
            ])}
          />
        </Section>

        <Section
          title="Next Experiment Packets"
          subtitle="Prominent, decision-linked experiments that make Atlas useful for pre-wet-lab planning."
          actions={<Link href="/experiments">Open all experiments</Link>}
        >
          <div className="family-grid">
            {data.experimentPackets.map((packet) => (
              <article className="family-card" key={packet.packetId}>
                <div className="surface__header">
                  <div>
                    <h3>{packet.title}</h3>
                    <p>{packet.category}</p>
                  </div>
                  <StatusPill tone={packet.priorityScore >= 0.8 ? "good" : packet.priorityScore >= 0.6 ? "neutral" : "warn"}>
                    priority {packet.priorityScore.toFixed(2)}
                  </StatusPill>
                </div>
                <ul className="feature-list">
                  <li><strong>Question it answers:</strong> {packet.decisionQuestion}</li>
                  <li><strong>Fixed variables:</strong> {packet.fixedVariables.join(", ")}</li>
                  <li><strong>Changed variables:</strong> {packet.comparisonArms.join(", ")}</li>
                  <li><strong>Primary readout:</strong> {packet.primaryReadouts.join(", ")}</li>
                  <li><strong>Minimum comparison set:</strong> {packet.comparisonArms.slice(0, 3).join(" vs ")}</li>
                  <li><strong>Supporting papers:</strong> {packet.supportingPaperTitles.slice(0, 3).join("; ")}</li>
                  <li><strong>Blocking uncertainties:</strong> {packet.keyUncertainties.join("; ") || "No blocker recorded."}</li>
                  <li><strong>Why high leverage:</strong> {packet.translationalRationale}</li>
                </ul>
              </article>
            ))}
          </div>
        </Section>

        <Section title="Decision Box" subtitle="End the page with a verdict, a confidence read, and explicit disqualifiers.">
          <div className="split-grid">
            <article className="surface">
              <h3>Current verdict</h3>
              <ul className="feature-list">
                <li><strong>Verdict:</strong> {data.currentVerdict}</li>
                <li><strong>Confidence:</strong> {confidenceLabel(data.confidenceBand)}</li>
                <li><strong>What would increase confidence:</strong> {topGap?.recommendedAction ?? topPacket?.decisionQuestion ?? "Close the top evidence gap and rerun the lead benchmark."}</li>
                <li><strong>What would disqualify this wedge:</strong> A matched benchmark that fails to reproduce the core claim or collapses under the main confound.</li>
              </ul>
            </article>

            <article className="surface">
              <h3>Direct entry points</h3>
              <div className="domain-card__actions">
                <Link href={`/domains/${domain}/review`}>Evidence</Link>
                <Link href={`/domains/${domain}/benchmark`}>Benchmark</Link>
                <Link href={`/domains/${domain}/debug`}>Debug</Link>
              </div>
              <p className="surface__detail">{data.oneSentenceRecommendation}</p>
            </article>
          </div>
        </Section>
      </>
    );
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      notFound();
    }

    throw error;
  }
}
