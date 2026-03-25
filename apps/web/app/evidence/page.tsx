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
import { getEvidencePageData } from "@/lib/decision-data";

function impactTone(value: "high" | "medium" | "low") {
  if (value === "high") {
    return "good" as const;
  }

  if (value === "medium") {
    return "warn" as const;
  }

  return "neutral" as const;
}

export default async function EvidencePage() {
  const data = await getEvidencePageData();
  const pendingSourceCount = data.sourceEnrichments.filter((item) => item.status === "pending").length;
  const highImpactGapCount = data.evidenceGaps.filter((gap) => gap.decisionImpact === "high").length;

  return (
    <>
      <PageIntro
        eyebrow="Evidence"
        title="Decision-relevant evidence queues"
        summary="This page is organized by impact on wedge confidence and experiment clarity, not by generic completeness. Evidence gaps, enrichment work, contradictions, and benchmark consequences all stay tied to the recommendation layer."
      >
        <div className="hero__stack">
          <SourceNote sourceLabel={data.domains[0]?.sourceLabel ?? "worktree"} />
          <div className="chip-row">
            <StatusPill tone="good">{highImpactGapCount} high-impact gaps</StatusPill>
            <StatusPill tone={pendingSourceCount > 0 ? "warn" : "good"}>{pendingSourceCount} pending enrichments</StatusPill>
            <StatusPill tone={data.contradictions.length > 0 ? "warn" : "neutral"}>{data.contradictions.length} contradiction items</StatusPill>
          </div>
        </div>
      </PageIntro>

      <MetricGrid>
        <MetricCard label="System state" value={data.overallState} />
        <MetricCard label="Evidence gaps" value={String(data.evidenceGaps.length)} detail="Ranked by decision impact and wedge relevance." />
        <MetricCard label="Source enrichment" value={String(data.sourceEnrichments.length)} detail="Curated fuller-source work still blocking stronger confidence." tone={data.sourceEnrichments.length > 0 ? "warn" : "good"} />
        <MetricCard label="Contradictions" value={String(data.contradictions.length)} detail="Conflicts that still matter for wedge choice or experiment design." tone={data.contradictions.length > 0 ? "warn" : "default"} />
      </MetricGrid>

      <Section title="Evidence Gap Queue" subtitle="Ranked by expected effect on wedge confidence, not by generic missingness.">
        <DataTable
          columns={["Domain", "Paper", "Impact", "Authority", "Translational", "Missing fields", "Recommended action"]}
          rows={data.evidenceGaps.map((gap) => [
            <Link href={`/domains/${gap.domain}/review`} key={`${gap.domain}-${gap.paperId}`}>{gap.domainLabel}</Link>,
            gap.title,
            <StatusPill key={`${gap.paperId}-impact`} tone={impactTone(gap.decisionImpact)}>{gap.decisionImpact}</StatusPill>,
            gap.authorityProfile,
            gap.translationalSignal,
            gap.missingFields.join(", "),
            gap.recommendedAction
          ])}
        />
      </Section>

      <Section title="Source Enrichment Queue" subtitle="Curated source work still most likely to change the quality of the recommendation or the experiment packets.">
        <div className="family-grid">
          {data.sourceEnrichments.map((record) => (
            <article className="family-card" key={`${record.domain}-${record.paperId}`}>
              <div className="surface__header">
                <div>
                  <h3>{record.title}</h3>
                  <p>{record.domainLabel}</p>
                </div>
                <StatusPill tone={record.status === "pending" ? "warn" : "neutral"}>
                  {record.status}
                </StatusPill>
              </div>
              <p>{record.rationale}</p>
              <ul className="feature-list">
                <li><strong>Wedge context:</strong> {record.wedgeTitle}</li>
                <li><strong>Priority:</strong> {record.priority}</li>
                <li><strong>Reviewer notes:</strong> {record.reviewerNotes || "No reviewer note yet."}</li>
                <li><strong>Excerpts loaded:</strong> {record.excerpts.length}</li>
              </ul>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Contradiction Resolution Queue" subtitle="Confounds are only useful if the page explains whether they actually matter for wedge choice and how they would be resolved.">
        <div className="family-grid">
          {data.contradictions.map((item) => (
            <article className="family-card" key={`${item.domain}-${item.topic}-${item.paperA}`}>
              <div className="surface__header">
                <div>
                  <h3>{item.topic}</h3>
                  <p>{item.domainLabel}</p>
                </div>
                <StatusPill tone={impactTone(item.decisionImpact)}>{item.decisionImpact}</StatusPill>
              </div>
              <ul className="feature-list">
                <li><strong>What conflicts:</strong> {item.paperA} vs {item.paperB}</li>
                <li><strong>Likely reason:</strong> {item.reason}</li>
                <li><strong>Does it matter:</strong> {item.decisionImpact} impact on wedge choice</li>
                <li><strong>What would resolve it:</strong> {item.resolutionPath}</li>
              </ul>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Benchmark Impact Estimates" subtitle="The point of the queue is to improve the recommendation, not just to tidy the corpus.">
        <DataTable
          columns={["Domain", "Current wedge", "Outcome coverage", "Step coverage", "Pending enrichments", "Top blocker", "Likely benchmark effect"]}
          rows={data.domains.map((domain) => [
            <Link href={`/domains/${domain.domain}`} key={`impact-${domain.domain}`}>{domain.label}</Link>,
            domain.title,
            `${Math.round(domain.runHealth.reviewedOutcomeCoverage * 100)}%`,
            `${Math.round(domain.runHealth.reviewedStepPhaseCoverage * 100)}%`,
            domain.runHealth.pendingSourceEnrichmentCount,
            domain.biggestUncertainty,
            domain.topEvidenceGap
              ? `Resolving ${domain.topEvidenceGap.title} should most directly change wedge confidence.`
              : "Current confidence is now more bounded by experiment quality than by missing evidence."
          ])}
        />
      </Section>
    </>
  );
}
