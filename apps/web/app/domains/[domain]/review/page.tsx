import { notFound } from "next/navigation";
import {
  ArtifactLedger,
  DataTable,
  DomainBadge,
  DomainTabs,
  MetricCard,
  MetricGrid,
  PageIntro,
  Section,
  SourceNote,
  StatusPill
} from "@/components/atlas-ui";
import { getDomainData, getSourceEnrichmentCounts } from "@/lib/data";
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
          summary="This page is still read-only. It exposes the current queue state without moving benchmark or enrichment decisions out of the pipeline."
        >
          <div className="hero__stack">
            <DomainBadge domain={domain} />
            <SourceNote sourceLabel={data.sourceLabel} />
          </div>
        </PageIntro>

        <DomainTabs current="review" domain={domain} />

        <MetricGrid>
          <MetricCard label="Pending enrichments" value={String(enrichmentCounts.pending)} tone="warn" />
          <MetricCard label="Reviewed enrichments" value={String(enrichmentCounts.reviewed)} tone="good" />
          <MetricCard label="Autoresearch proposals" value={String(data.proposalFile.proposalCount)} />
          <MetricCard label="Benchmark decisions" value={String(data.decisionFile.decisionCount)} />
        </MetricGrid>

        <Section title="Source-enrichment queue" subtitle="Evidence depth remains manual by design. This queue shows where better source support still matters.">
          <DataTable
            columns={["Status", "Priority", "Paper", "DOI", "Rationale", "Excerpts"]}
            rows={data.sourceEnrichment.records.map((record) => [
              <StatusPill key={`${record.paperId}-status`} tone={record.status === "reviewed" ? "good" : "warn"}>
                {record.status}
              </StatusPill>,
              record.priority,
              record.title,
              record.doi ?? "n/a",
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
