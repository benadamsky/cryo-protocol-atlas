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
  SourceNote
} from "@/components/atlas-ui";
import { getDomainData } from "@/lib/data";
import { getDomainMeta, parseDomainId } from "@/lib/domain";

export default async function AtlasPage({
  params
}: {
  params: Promise<{ domain: string }>;
}) {
  try {
    const { domain: rawDomain } = await params;
    const domain = parseDomainId(rawDomain);
    const meta = getDomainMeta(domain);
    const data = await getDomainData(domain);

    return (
      <>
        <PageIntro
          eyebrow={`${meta.label} Atlas`}
          title={`${meta.label} protocol structure`}
          summary="Literature clusters, dominant chemicals, outcomes, and high-confidence papers derived from the resolved extraction layer."
        >
          <div className="hero__stack">
            <DomainBadge domain={domain} />
            <SourceNote sourceLabel={data.sourceLabel} />
          </div>
        </PageIntro>

        <DomainTabs current="atlas" domain={domain} />

        <MetricGrid>
          <MetricCard label="Total papers" value={String(data.atlasSummary.totalPapers)} />
          <MetricCard label="Protocol families" value={String(data.atlasSummary.protocolFamilies.length)} />
          <MetricCard label="Top chemicals" value={String(data.atlasSummary.topChemicals.length)} />
          <MetricCard
            label="Unknown families resolved"
            value={String(data.atlasAnalysis.overrideImpact.unknownProtocolFamiliesResolved)}
            detail="Overrides and benchmark repairs that converted ambiguous family labels into explicit protocol structure."
          />
        </MetricGrid>

        <Section title="Protocol families" subtitle="Current literature clusters in the resolved atlas slice.">
          <DataTable
            columns={["Family", "Papers"]}
            rows={data.atlasSummary.protocolFamilies.map((entry) => [entry.label, entry.count])}
          />
        </Section>

        <Section title="Dominant CPA patterns" subtitle="These are the recurring family + chemical + specimen combinations behind the current wedge story.">
          <DataTable
            columns={["Family", "Chemical", "Specimen", "Papers", "Outcomes"]}
            rows={data.wedgeBrief.dominantCpaPatterns.map((pattern) => [
              pattern.family,
              pattern.chemical,
              pattern.specimenType,
              pattern.paperCount,
              pattern.outcomeClasses.join(", ")
            ])}
          />
        </Section>

        <div className="split-grid">
          <Section title="Top chemicals">
            <DataTable
              columns={["Chemical", "Count"]}
              rows={data.atlasSummary.topChemicals.map((entry) => [entry.label, entry.count])}
            />
          </Section>

          <Section title="Top outcomes">
            <DataTable
              columns={["Outcome", "Count"]}
              rows={data.atlasSummary.topOutcomes.map((entry) => [entry.label, entry.count])}
            />
          </Section>
        </div>

        <Section title="High-confidence papers" subtitle="Useful drill-in list for demo and literature review.">
          <DataTable
            columns={["Paper", "Type", "Family", "Confidence", "Species"]}
            rows={data.atlasSummary.highConfidencePapers.map((paper) => [
              paper.title,
              paper.paperType,
              paper.protocolFamily,
              paper.extractionConfidence.toFixed(2),
              paper.species.join(", ") || "unspecified"
            ])}
          />
        </Section>

        <Section title="Uncertainty hotspots" subtitle="Where the corpus still bunches around the same chemistry/specimen context but points to multiple outcomes.">
          <DataTable
            columns={["Family", "Chemical", "Specimen", "Papers", "Outcomes"]}
            rows={data.atlasAnalysis.resolvedSummary.uncertaintyHotspots.map((hotspot) => [
              hotspot.protocolFamily,
              hotspot.chemical,
              hotspot.specimenType,
              hotspot.paperCount,
              hotspot.outcomeClasses.join(", ")
            ])}
          />
        </Section>

        <div className="split-grid">
          <Section title="Opportunity scan" subtitle="Current high-signal questions surfaced from the wedge builder.">
            <div className="family-grid">
              {data.wedgeBrief.opportunityScan.map((item) => (
                <article className="family-card" key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.whyInteresting}</p>
                  <p className="surface__detail">{item.painPoint}</p>
                </article>
              ))}
            </div>
          </Section>

          <Section title="Artifact ledger" subtitle="Atlas views should stay traceable back to generated artifacts.">
            <ArtifactLedger
              artifacts={data.artifacts.filter((artifact) =>
                [
                  "Atlas summary",
                  "Atlas analysis",
                  "Wedge brief",
                  "Normalized protocols"
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
