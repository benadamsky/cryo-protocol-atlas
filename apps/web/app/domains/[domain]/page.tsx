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
import { parseDomainId, staticDomainParams } from "@/lib/domain";
import { INTERNAL_DEBUG_ENABLED } from "@/lib/runtime-flags";

function confidenceLabel(value: "high" | "medium" | "low") {
  return `${value} confidence`;
}

function formatImpact(value: "high" | "medium" | "low") {
  return value;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function providerLabel(source: string) {
  switch (source) {
    case "cryodb":
      return "CryoDB / CryoRepository";
    case "openalex":
      return "OpenAlex";
    case "crossref":
      return "Crossref";
    case "europe-pmc":
      return "Europe PMC";
    case "pubmed":
      return "PubMed";
    default:
      return source;
  }
}

export const dynamicParams = false;

export function generateStaticParams() {
  return staticDomainParams();
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
          eyebrow={`${data.label} recommendation`}
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
                { label: "Recommendation score", value: data.recommendationScore.toFixed(2) },
                { label: "Next experiment", value: topPacket?.title ?? "No packet queued" }
              ]}
            />
          </div>
        </PageIntro>

        <DomainTabs current="overview" domain={domain} />

        <MetricGrid>
          <MetricCard label="Recommendation type" value={data.wedgeClass} detail="This describes how strong and decision-ready the current recommendation is." tone={data.wedgeClass === "plausible first company wedge" ? "good" : "warn"} />
          <MetricCard label="Confidence" value={confidenceLabel(data.confidenceBand)} detail={`${Math.round(data.confidenceScore * 100)}% evidence confidence on the active wedge.`} tone={data.confidenceBand === "high" ? "good" : data.confidenceBand === "medium" ? "default" : "warn"} />
          <MetricCard label="Why this could matter in practice" value={data.translationalSignal} detail={data.translationalRationale} />
          <MetricCard label="Biggest reason this could still move" value={data.biggestUncertainty} detail="The shortest path to changing the current recommendation." tone="warn" />
        </MetricGrid>

        <Section
          title="Literature Funnel"
          subtitle="This is the shortest explanation of how Atlas got from a large paper set to one recommended experiment."
        >
          <div className="surface">
            <MetricGrid>
              <MetricCard label="Papers scanned" value={formatCount(data.provenanceFunnel.papersFetched)} detail="Source papers Atlas started from for this domain." />
              <MetricCard label="Matched to this domain" value={formatCount(data.provenanceFunnel.papersMatched)} detail="Papers that survived domain filtering." />
              <MetricCard label="Reviewed trust rows" value={formatCount(data.provenanceFunnel.reviewedBenchmarkRows)} detail="Human-validated benchmark rows Atlas uses to check itself." />
              <MetricCard label="Reviewed rows in scope" value={formatCount(data.provenanceFunnel.reviewedInScopeRows)} detail="Reviewed rows Atlas currently believes belong in the domain slice." />
              <MetricCard label="Rows driving the current recommendation" value={formatCount(data.provenanceFunnel.activeWedgeRelevantRows)} detail="Wedge-relevant rows behind the current experiment choice." />
              <MetricCard label="Recommended experiment" value={data.provenanceFunnel.recommendedExperimentTitle ?? "No packet queued"} detail="The lead experiment Atlas currently recommends." tone="good" />
            </MetricGrid>

            <details className="detail-panel">
              <summary>Show source breakdown</summary>
              <div className="detail-panel__content">
                <h4>Trusted Atlas corpus</h4>
                <ul className="feature-list">
                  <li>
                    <strong>{data.sourceBreakdown.atlasCorpus.sourceLabel}:</strong> scanned{" "}
                    {formatCount(data.sourceBreakdown.atlasCorpus.papersFetched)} papers and matched{" "}
                    {formatCount(data.sourceBreakdown.atlasCorpus.papersMatched)} into this domain.
                  </li>
                </ul>

                {data.sourceBreakdown.discoveryProviders.length > 0 ? (
                  <>
                    <h4>Broader discovery search coverage</h4>
                    <p className="surface__detail">
                      This is the wider discovery lane stored alongside Atlas. It shows where newer candidate papers came from, but it is broader and more provisional than the trusted corpus above.
                    </p>
                    <ul className="feature-list">
                      {data.sourceBreakdown.discoveryQueryDescription ? (
                        <li>
                          <strong>Discovery query:</strong> {data.sourceBreakdown.discoveryQueryDescription}
                        </li>
                      ) : null}
                      {data.sourceBreakdown.discoveryTotalCandidates !== null ? (
                        <li>
                          <strong>Total discovery candidates:</strong> {formatCount(data.sourceBreakdown.discoveryTotalCandidates)}
                          {data.sourceBreakdown.discoveryGeneratedAt
                            ? ` as of ${formatDateTime(data.sourceBreakdown.discoveryGeneratedAt)}`
                            : ""}
                        </li>
                      ) : null}
                      {data.sourceBreakdown.discoveryProviders.map((provider) => (
                        <li key={`${provider.source}-${provider.query ?? provider.label ?? "provider"}`}>
                          <strong>{providerLabel(provider.source)}:</strong> accepted{" "}
                          {formatCount(provider.acceptedCount)} from {formatCount(provider.fetchedCount)} fetched
                          {provider.totalHits !== null ? ` out of ${formatCount(provider.totalHits)} total hits` : ""}
                          {provider.truncated ? "; live provider returned a truncated slice" : ""}
                          {provider.failed ? `; provider failed${provider.error ? ` (${provider.error})` : ""}` : ""}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>
            </details>
          </div>
        </Section>

        <Section
          title="How Atlas Got Here"
          subtitle="See how Atlas narrowed the literature into this recommendation before looking at the full matrix and evidence queues."
          actions={<Link href={`/domains/${domain}/review`}>Open evidence view</Link>}
        >
          <div className="split-grid">
            <article className="surface">
              <h3>Why this is the current recommendation</h3>
              <ul className="feature-list">
                <li>
                  <strong>Top supporting papers:</strong>{" "}
                  {data.topSupportingPapers.length > 0
                    ? data.topSupportingPapers.slice(0, 3).map((paper, index) => (
                        <span key={paper.paperId}>
                          {index > 0 ? "; " : null}
                          {paper.href ? (
                            <a href={paper.href} rel="noreferrer" target="_blank">
                              {paper.title}
                            </a>
                          ) : (
                            paper.title
                          )}
                        </span>
                      ))
                    : "No direct paper links recorded yet."}
                </li>
                <li><strong>Why this question rose to the top:</strong> {data.whyInteresting}</li>
                <li><strong>Current baseline in the literature:</strong> {data.standardPattern}</li>
                <li><strong>What the strongest papers are measuring:</strong> {data.keyOutcomePattern}</li>
                <li><strong>What still limits confidence:</strong> {data.mainConfound}</li>
                <li><strong>What Atlas recommends doing next:</strong> {data.oneSentenceRecommendation}</li>
              </ul>
            </article>

            <article className="surface">
              <h3>Other strong next questions</h3>
              {data.runnerUps.length === 0 ? (
                <p className="surface__detail">Atlas does not currently have another next-step question that is close enough to challenge this recommendation.</p>
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
          title="Papers Driving This Recommendation"
          subtitle="These are the key rows behind the current experiment choice: the preservation approach, base cryomix, additives, outcomes, and main confounds."
          actions={<Link href={`/domains/${domain}/atlas`}>Open matrix route</Link>}
        >
          <DataTable
            columns={[
              "Paper",
              "Protocol family",
              "Base cryomix",
              "Added compound",
              "Species",
              "Specimen",
              "Main outcomes",
              "Transplant?",
              "How direct the evidence is",
              "Evidence strength",
              "Translational",
              "Relevance to this recommendation",
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
          title="How Direct The Evidence Is"
          subtitle="This shows how much of the recommendation is grounded in primary paper support versus abstract-only or manually clarified evidence."
        >
          <div className="split-grid">
            <article className="surface">
              <QuickFacts
                items={[
                  { label: "Primary-backed", value: data.authorityBreakdown.primaryBacked },
                  { label: "Primary paper, indirect support", value: data.authorityBreakdown.primaryIndirect },
                  { label: "Manual clarification added", value: data.authorityBreakdown.manualCurationBacked },
                  { label: "Secondary-source supported", value: data.authorityBreakdown.secondaryBacked },
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
          title="Conflicts That Still Matter"
          subtitle="A contradiction only stays here if it could change the recommendation or how the experiment should be designed."
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
                    <li><strong>Which papers disagree:</strong> {item.paperA} vs {item.paperB}</li>
                    <li><strong>Likely reason:</strong> {item.reason}</li>
                    <li><strong>Why this could change the recommendation:</strong> {item.decisionImpact} impact on wedge choice</li>
                    <li><strong>What would resolve it:</strong> {item.resolutionPath}</li>
                  </ul>
                </article>
              ))
            )}
          </div>
        </Section>

        <Section
          title="Evidence Gaps Most Likely To Change The Call"
          subtitle="These are ranked by effect on the recommendation, not by generic completeness."
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
          title="Recommended Experiments"
          subtitle="These are the concrete tests Atlas can justify from the current evidence. The first card is the lead recommendation."
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
                  <li><strong>Question this experiment answers:</strong> {packet.decisionQuestion}</li>
                  <li><strong>What stays fixed:</strong> {packet.fixedVariables.join(", ")}</li>
                  <li><strong>What changes:</strong> {packet.comparisonArms.join(", ")}</li>
                  <li><strong>Primary readout:</strong> {packet.primaryReadouts.join(", ")}</li>
                  <li><strong>Minimum comparison to run:</strong> {packet.comparisonArms.slice(0, 3).join(" vs ")}</li>
                  <li><strong>Key supporting papers:</strong> {packet.supportingPaperTitles.slice(0, 3).join("; ")}</li>
                  <li><strong>Main watch-outs:</strong> {packet.keyUncertainties.join("; ") || "No blocker recorded."}</li>
                  <li><strong>Why this could move the decision:</strong> {packet.translationalRationale}</li>
                </ul>
              </article>
            ))}
          </div>
        </Section>

        <Section title="Current Bottom Line" subtitle="A short verdict, what would increase confidence, and what result would weaken this recommendation.">
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
              <h3>See the underlying evidence</h3>
              <div className="domain-card__actions">
                <Link href={`/domains/${domain}/review`}>Evidence</Link>
                <Link href={`/domains/${domain}/benchmark`}>Benchmark</Link>
                {INTERNAL_DEBUG_ENABLED ? <Link href={`/domains/${domain}/debug`}>Debug</Link> : null}
              </div>
              <p className="surface__detail">
                Atlas narrowed {formatCount(data.provenanceFunnel.papersFetched)} source papers to{" "}
                {formatCount(data.provenanceFunnel.papersMatched)} domain-matched papers and based this recommendation on{" "}
                {formatCount(data.provenanceFunnel.activeWedgeRelevantRows)} wedge-driving rows.
              </p>
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
