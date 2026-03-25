import Link from "next/link";
import { notFound } from "next/navigation";
import {
  DataTable,
  DomainTabs,
  MetricCard,
  MetricGrid,
  PageIntro,
  Section,
  SourceNote,
  StatusPill
} from "@/components/atlas-ui";
import { getDecisionDomainData } from "@/lib/decision-data";
import { parseDomainId, staticDomainParams } from "@/lib/domain";

export const dynamicParams = false;

export function generateStaticParams() {
  return staticDomainParams();
}

export default async function DomainEvidencePage({
  params
}: {
  params: Promise<{ domain: string }>;
}) {
  try {
    const { domain: rawDomain } = await params;
    const domain = parseDomainId(rawDomain);
    const data = await getDecisionDomainData(domain);

    return (
      <>
        <PageIntro
          eyebrow={`${data.label} evidence`}
          title={`Evidence and review queue for ${data.title}`}
          summary="This page prioritizes the queues that change wedge confidence or experiment clarity, not generic pipeline completeness."
        >
          <div className="hero__stack">
            <SourceNote sourceLabel={data.sourceLabel} />
            <div className="chip-row">
              <StatusPill tone={data.topEvidenceGap?.decisionImpact === "high" ? "good" : "warn"}>
                {data.topEvidenceGap?.decisionImpact ?? "no ranked gap"} impact
              </StatusPill>
              <StatusPill tone={data.sourceEnrichmentQueue.length > 0 ? "warn" : "good"}>
                {data.sourceEnrichmentQueue.length} enrichment items
              </StatusPill>
              <StatusPill tone={data.contradictionReport.contradictions.length > 0 ? "warn" : "neutral"}>
                {data.contradictionReport.contradictions.length} contradiction items
              </StatusPill>
            </div>
          </div>
        </PageIntro>

        <DomainTabs current="review" domain={domain} />

        <MetricGrid>
          <MetricCard label="Top evidence gap" value={data.topEvidenceGap?.title ?? "None"} detail={data.topEvidenceGap?.rationale ?? "No decision-relevant gap is currently ranked."} tone="warn" />
          <MetricCard label="Pending enrichment" value={String(data.sourceEnrichmentQueue.length)} detail="Curated fuller-source work that still blocks stronger confidence." tone={data.sourceEnrichmentQueue.length > 0 ? "warn" : "good"} />
          <MetricCard label="Missing outcomes" value={String(data.runHealth.missingOutcomeCount)} />
          <MetricCard label="Missing step phases" value={String(data.runHealth.missingStepPhaseCount)} />
        </MetricGrid>

        <Section title="Ranked Evidence Gaps" subtitle="Ordered by effect on wedge confidence or experiment quality.">
          <DataTable
            columns={["Paper", "Impact", "Authority", "Translational", "Missing fields", "Rationale", "Recommended action"]}
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

        <Section title="Source Enrichment Queue" subtitle="Human-curated evidence work that still has leverage on the recommendation.">
          <div className="family-grid">
            {data.sourceEnrichmentQueue.length === 0 ? (
              <article className="family-card">
                <h3>No pending source enrichment</h3>
                <p className="surface__detail">Current evidence work is no longer blocked on fuller-source enrichment for this domain.</p>
              </article>
            ) : (
              data.sourceEnrichmentQueue.map((record) => (
                <article className="family-card" key={record.paperId}>
                  <div className="surface__header">
                    <div>
                      <h3>{record.title}</h3>
                      <p>{record.priority}</p>
                    </div>
                    <StatusPill tone={record.status === "pending" ? "warn" : "neutral"}>
                      {record.status}
                    </StatusPill>
                  </div>
                  <ul className="feature-list">
                    <li><strong>Rationale:</strong> {record.rationale}</li>
                    <li><strong>Reviewer notes:</strong> {record.reviewerNotes || "No reviewer note yet."}</li>
                    <li><strong>Existing excerpts:</strong> {record.excerpts.length}</li>
                  </ul>
                </article>
              ))
            )}
          </div>
        </Section>

        <Section title="Contradiction Resolution Queue" subtitle="Show what conflicts, why it matters, and what evidence would resolve it.">
          <div className="family-grid">
            {data.contradictionReport.contradictions.length === 0 ? (
              <article className="family-card">
                <h3>No contradiction items</h3>
                <p className="surface__detail">This wedge currently has no explicit contradiction report item. The main confidence limit is still evidence depth.</p>
              </article>
            ) : (
              data.contradictionReport.contradictions.map((item) => (
                <article className="family-card" key={`${item.topic}-${item.paperA}`}>
                  <div className="surface__header">
                    <div>
                      <h3>{item.topic}</h3>
                      <p>{item.decisionImpact} impact</p>
                    </div>
                    <StatusPill tone={item.decisionImpact === "high" ? "good" : item.decisionImpact === "medium" ? "warn" : "neutral"}>
                      {item.decisionImpact}
                    </StatusPill>
                  </div>
                  <ul className="feature-list">
                    <li><strong>What conflicts:</strong> {item.paperA} vs {item.paperB}</li>
                    <li><strong>Likely reason:</strong> {item.reason}</li>
                    <li><strong>Does it matter:</strong> {item.decisionImpact} for wedge choice</li>
                    <li><strong>What resolves it:</strong> {item.resolutionPath}</li>
                  </ul>
                </article>
              ))
            )}
          </div>
        </Section>

        <Section title="Benchmark Impact Estimate" subtitle="Tie evidence work back to the recommendation instead of treating it as queue maintenance.">
          <div className="split-grid">
            <article className="surface">
              <h3>What moves confidence</h3>
              <ul className="feature-list">
                <li><strong>Outcome coverage:</strong> {Math.round(data.runHealth.reviewedOutcomeCoverage * 100)}%</li>
                <li><strong>Step coverage:</strong> {Math.round(data.runHealth.reviewedStepPhaseCoverage * 100)}%</li>
                <li><strong>Likely wedge effect:</strong> {data.topEvidenceGap ? `Resolving ${data.topEvidenceGap.title} would most directly change the wedge read.` : "The next meaningful change now comes from experiment quality rather than more evidence extraction."}</li>
              </ul>
            </article>

            <article className="surface">
              <h3>Direct next step</h3>
              <p>{data.oneSentenceRecommendation}</p>
              <Link href={`/domains/${domain}`}>Return to wedge detail</Link>
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
