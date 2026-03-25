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
import { humanizeSystemState, wedgeClassLabel } from "@/lib/ui-copy";

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
        title="What still blocks the current recommendation"
        summary="This page is not a generic evidence inbox. It is organized around what could move wedge ranking, sharpen the next experiment, or materially change confidence in the current call."
      >
        <div className="hero__stack">
          <SourceNote sourceLabel={data.domains[0]?.sourceLabel ?? "worktree"} />
          <div className="chip-row">
            <StatusPill tone="good">{highImpactGapCount} decision-changing gaps</StatusPill>
            <StatusPill tone={pendingSourceCount > 0 ? "warn" : "good"}>
              {pendingSourceCount} pending reviewed-source follow-ups
            </StatusPill>
            <StatusPill tone={data.contradictions.length > 0 ? "warn" : "neutral"}>
              {data.contradictions.length} unresolved confounds
            </StatusPill>
          </div>
        </div>
      </PageIntro>

      <MetricGrid>
        <MetricCard label="Reviewed evidence status" value={humanizeSystemState(data.overallState)} />
        <MetricCard
          label="Decision-changing evidence gaps"
          value={String(data.evidenceGaps.length)}
          detail="Ranked by expected effect on wedge ordering or experiment clarity."
        />
        <MetricCard
          label="Reviewed-source follow-up"
          value={String(data.sourceEnrichments.length)}
          detail="These are the fuller-source checks most likely to change the recommendation."
          tone={data.sourceEnrichments.length > 0 ? "warn" : "good"}
        />
        <MetricCard
          label="Contradictions to resolve"
          value={String(data.contradictions.length)}
          detail="Only conflicts that still matter for wedge choice or experiment design are shown here."
          tone={data.contradictions.length > 0 ? "warn" : "default"}
        />
      </MetricGrid>

      <Section
        title="What Would Most Change the Current Call"
        subtitle="A quick domain-level read before you drop into the full queues."
      >
        <div className="family-grid">
          {data.domains.map((domain) => (
            <article className="family-card" key={domain.domain}>
              <span className="section-kicker">{domain.label}</span>
              <h3>{domain.title}</h3>
              <p>{wedgeClassLabel(domain.wedgeClass)}</p>
              <ul className="feature-list">
                <li>
                  <strong>Main blocker:</strong> {domain.biggestUncertainty}
                </li>
                <li>
                  <strong>Top evidence gap:</strong> {domain.topEvidenceGap?.title ?? "No ranked gap"}
                </li>
                <li>
                  <strong>What would change the call:</strong>{" "}
                  {domain.topEvidenceGap?.recommendedAction ??
                    domain.nextExperiment?.decisionQuestion ??
                    "A sharper next experiment is now more important than more literature cleanup."}
                </li>
              </ul>
            </article>
          ))}
        </div>
      </Section>

      <Section
        title="Evidence Gap Queue"
        subtitle="Ordered by impact on wedge recommendation and experiment clarity, not by generic completeness."
      >
        <DataTable
          columns={[
            "Domain",
            "Paper",
            "Decision impact",
            "Authority",
            "Translational signal",
            "Missing fields",
            "What to do"
          ]}
          rows={data.evidenceGaps.map((gap) => [
            <Link href={`/domains/${gap.domain}/review`} key={`${gap.domain}-${gap.paperId}`}>
              {gap.domainLabel}
            </Link>,
            gap.title,
            <StatusPill key={`${gap.paperId}-impact`} tone={impactTone(gap.decisionImpact)}>
              {gap.decisionImpact}
            </StatusPill>,
            gap.authorityProfile,
            gap.translationalSignal,
            gap.missingFields.join(", "),
            gap.recommendedAction
          ])}
        />
      </Section>

      <Section
        title="Reviewed-Source Follow-Up Queue"
        subtitle="These records stay visible only because they could materially change the current wedge read."
      >
        <div className="family-grid">
          {data.sourceEnrichments.map((record) => (
            <article className="family-card" key={`${record.domain}-${record.paperId}`}>
              <div className="surface__header">
                <div>
                  <h3>{record.title}</h3>
                  <p>{record.domainLabel}</p>
                </div>
                <StatusPill tone={record.status === "pending" ? "warn" : "neutral"}>{record.status}</StatusPill>
              </div>
              <p>{record.rationale}</p>
              <ul className="feature-list">
                <li>
                  <strong>Wedge context:</strong> {record.wedgeTitle}
                </li>
                <li>
                  <strong>Priority:</strong> {record.priority}
                </li>
                <li>
                  <strong>Reviewer notes:</strong> {record.reviewerNotes || "No reviewer note yet."}
                </li>
                <li>
                  <strong>Loaded excerpts:</strong> {record.excerpts.length}
                </li>
              </ul>
            </article>
          ))}
        </div>
      </Section>

      <Section
        title="Contradictions That Still Matter"
        subtitle="Conflicts only stay on this page if they still affect wedge choice or how the next experiment should be designed."
      >
        <div className="family-grid">
          {data.contradictions.map((item) => (
            <article className="family-card" key={`${item.domain}-${item.topic}-${item.paperA}`}>
              <div className="surface__header">
                <div>
                  <h3>{item.topic}</h3>
                  <p>{item.domainLabel}</p>
                </div>
                <StatusPill tone={impactTone(item.decisionImpact)}>{item.decisionImpact} impact</StatusPill>
              </div>
              <ul className="feature-list">
                <li>
                  <strong>What conflicts:</strong> {item.paperA} vs {item.paperB}
                </li>
                <li>
                  <strong>Likely reason:</strong> {item.reason}
                </li>
                <li>
                  <strong>Why it matters:</strong> {item.decisionImpact} impact on wedge choice
                </li>
                <li>
                  <strong>What resolves it:</strong> {item.resolutionPath}
                </li>
              </ul>
            </article>
          ))}
        </div>
      </Section>
    </>
  );
}
