import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArtifactLedger,
  DataTable,
  DomainBadge,
  DomainTabs,
  MetricCard,
  MetricGrid,
  PageIntro,
  QuickFacts,
  Section,
  SourceNote,
  StatusPill
} from "@/components/atlas-ui";
import { formatDateTime, getDomainData, getSourceEnrichmentCounts } from "@/lib/data";
import { getDomainMeta, parseDomainId } from "@/lib/domain";

export default async function ReviewPage({
  params
}: {
  params: Promise<{ domain: string }>;
}) {
  try {
    const { domain: rawDomain } = await params;
    const domain = parseDomainId(rawDomain);
    const meta = getDomainMeta(domain);
    const data = await getDomainData(domain);
    const enrichmentCounts = getSourceEnrichmentCounts(data.sourceEnrichment);

    return (
      <>
        <PageIntro
          eyebrow={`${meta.label} Review Queue`}
          title="Human review backlog and proposal state"
          summary="This page is still read-only. It exposes the current queue state without moving benchmark or enrichment decisions out of the pipeline. Use it to see how candidate evidence becomes reviewable provenance."
        >
          <div className="hero__stack">
            <DomainBadge domain={domain} />
            <SourceNote sourceLabel={data.sourceLabel} />
            <StatusPill tone={enrichmentCounts.pending > 0 ? "warn" : "good"}>
              {enrichmentCounts.pending > 0 ? "queue open" : "queue clean"}
            </StatusPill>
            <QuickFacts
              items={[
                {
                  label: "Enrichment generated",
                  value: formatDateTime(data.sourceEnrichment.generatedAt)
                },
                {
                  label: "Proposal generated",
                  value: formatDateTime(data.proposalFile.generatedAt)
                },
                {
                  label: "Decision generated",
                  value: formatDateTime(data.decisionFile.generatedAt)
                },
                {
                  label: "Read path",
                  value: data.sourceLabel
                }
              ]}
            />
          </div>
        </PageIntro>

        <DomainTabs current="review" domain={domain} />

        <Section
          title="Review flow"
          subtitle="This lane is the bridge between candidate evidence, conservative autoresearch, and benchmark decisions."
        >
          <div className="split-grid">
            <article className="surface">
              <div className="surface__header">
                <h3>Source enrichment</h3>
                <StatusPill tone="warn">candidate evidence</StatusPill>
              </div>
              <p>Shows where source support remains manual, thin, or pending further review.</p>
              <Link href={`/domains/${domain}/debug`}>Check debug</Link>
            </article>
            <article className="surface">
              <div className="surface__header">
                <h3>Autoresearch proposals</h3>
                <StatusPill tone="neutral">conservative loop</StatusPill>
              </div>
              <p>Shows the read-only loop output before anything can mutate the validated slice.</p>
              <Link href={`/domains/${domain}/benchmark`}>Check benchmark</Link>
            </article>
            <article className="surface">
              <div className="surface__header">
                <h3>Decisions</h3>
                <StatusPill tone="good">promoted state</StatusPill>
              </div>
              <p>Shows the review outcome currently stored in the generated decision file.</p>
              <Link href={`/domains/${domain}/atlas`}>Check atlas</Link>
            </article>
          </div>
        </Section>

        <MetricGrid>
          <MetricCard label="Pending enrichments" value={String(enrichmentCounts.pending)} tone="warn" />
          <MetricCard label="Reviewed enrichments" value={String(enrichmentCounts.reviewed)} tone="good" />
          <MetricCard label="Autoresearch proposals" value={String(data.proposalFile.proposalCount)} />
          <MetricCard label="Benchmark decisions" value={String(data.decisionFile.decisionCount)} />
        </MetricGrid>

        <Section title="Source-enrichment queue" subtitle="Evidence depth remains manual by design. This queue shows where better source support still matters.">
          <DataTable
            columns={["Status", "Priority", "Paper", "Source", "Rationale", "Excerpts"]}
            rows={data.sourceEnrichment.records.map((record) => [
              <StatusPill key={`${record.paperId}-status`} tone={record.status === "reviewed" ? "good" : "warn"}>
                {record.status}
              </StatusPill>,
              record.priority,
              record.title,
              record.paperUrl ? (
                <Link href={record.paperUrl} target="_blank" rel="noreferrer">
                  {record.doi ?? "paper url"}
                </Link>
              ) : (
                record.doi ?? "n/a"
              ),
              record.rationale,
              record.excerpts.length
            ])}
          />
        </Section>

        <div className="split-grid">
          <Section title="Autoresearch proposals" subtitle="Conservative loop output waiting for review or currently clean.">
            {data.proposalFile.proposals.length === 0 ? (
              <div className="empty-state">
                <h3>No open proposals</h3>
                <p>The current loop output is aligned for this slice.</p>
              </div>
            ) : (
              <DataTable
                columns={["Title", "Action", "Fields", "Confidence"]}
                rows={data.proposalFile.proposals.map((proposal) => [
                  proposal.title,
                  proposal.action,
                  proposal.fields.join(", "),
                  proposal.proposalConfidence.toFixed(2)
                ])}
              />
            )}
          </Section>

          <Section title="Decision file" subtitle="Current benchmark review decision state for promoted proposals.">
            {data.decisionFile.decisions.length === 0 ? (
              <div className="empty-state">
                <h3>No decisions recorded</h3>
                <p>There are no accepted, deferred, or rejected benchmark proposals in the current cycle.</p>
              </div>
            ) : (
              <DataTable
                columns={["Paper", "Decision", "Notes"]}
                rows={data.decisionFile.decisions.map((decision) => [
                  decision.title,
                  decision.decision,
                  decision.reviewerNotes ?? "none"
                ])}
              />
            )}
          </Section>
        </div>

        <div className="split-grid">
          <Section title="Evidence provenance" subtitle="A quick audit of how much of the reviewed slice is backed by stronger curated evidence.">
            <DataTable
              columns={["Signal", "Count"]}
              rows={[
                ["Reviewed primary-supported rows", data.wedgeBrief.evidenceQuality.reviewedPrimarySupportedCount],
                ["Reviewed secondary-supported rows", data.wedgeBrief.evidenceQuality.reviewedSecondarySupportedCount],
                ["Reviewed manual-only rows", data.wedgeBrief.evidenceQuality.reviewedManualOnlyCount],
                ["Secondary-source reviewed", data.wedgeBrief.evidenceQuality.secondarySourceReviewedCount]
              ]}
            />
            <QuickFacts
              items={[
                {
                  label: "Pending",
                  value: enrichmentCounts.pending
                },
                {
                  label: "Reviewed",
                  value: enrichmentCounts.reviewed
                },
                {
                  label: "Rejected",
                  value: enrichmentCounts.rejected
                },
                {
                  label: "In progress",
                  value: enrichmentCounts.inProgress
                }
              ]}
            />
          </Section>

          <Section title="Artifact ledger" subtitle="Review state still comes from generated files and curated JSON, not app-side state.">
            <ArtifactLedger
              artifacts={data.artifacts.filter((artifact) =>
                [
                  "Source enrichment",
                  "Autoresearch proposals",
                  "Benchmark decisions",
                  "Benchmark gold set"
                ].includes(artifact.label)
              )}
            />
          </Section>
        </div>
      </>
    );
  } catch {
    notFound();
  }
}
