import { notFound } from "next/navigation";
import { ArtifactList, Facts, PageHeader, Section, Table } from "@/components/atlas-ui";
import { DomainCrumbs } from "@/components/domain-crumbs";
import { getDomainData } from "@/lib/data";
import { getDomainMeta, parseDomainId, staticDomainParams } from "@/lib/domain";
import { INTERNAL_DEBUG_ENABLED } from "@/lib/runtime-flags";

export const dynamicParams = false;

export function generateStaticParams() {
  return staticDomainParams();
}

export default async function AtlasPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain: rawDomain } = await params;
  let domain;

  try {
    domain = parseDomainId(rawDomain);
  } catch {
    notFound();
  }

  const meta = getDomainMeta(domain);
  const data = await getDomainData(domain);
  const baseline = data.atlasAnalysis.baselineSummary.qualitySignals;
  const resolved = data.atlasAnalysis.resolvedSummary.qualitySignals;
  const countCols = ["Family", { label: "Papers", className: "num" }];

  return (
    <>
      <PageHeader
        note="Literature clusters, dominant chemicals, outcomes, and high-confidence papers from the resolved extraction layer."
        title={`${meta.label} protocol structure`}
      />
      <DomainCrumbs current="atlas" domain={domain} />

      <Facts
        items={[
          { label: "Papers", value: data.atlasSummary.totalPapers },
          { label: "Families", value: data.atlasSummary.protocolFamilies.length },
          { label: "Top chemicals", value: data.atlasSummary.topChemicals.length },
          { label: "Families resolved", value: data.atlasAnalysis.overrideImpact.unknownProtocolFamiliesResolved }
        ]}
      />

      <Section label="Protocol families" first>
        <Table columns={countCols} rows={data.atlasSummary.protocolFamilies.map((entry) => [entry.label, entry.count])} />
      </Section>

      <Section label="Dominant CPA patterns">
        <Table
          columns={["Family", "Chemical", "Specimen", { label: "Papers", className: "num" }, { label: "Outcomes", className: "tag" }]}
          rows={data.wedgeBrief.dominantCpaPatterns.map((pattern) => [
            pattern.family,
            pattern.chemical,
            pattern.specimenType,
            pattern.paperCount,
            pattern.outcomeClasses.join(", ")
          ])}
        />
      </Section>

      <Section label="Top chemicals">
        <Table columns={["Chemical", { label: "Count", className: "num" }]} rows={data.atlasSummary.topChemicals.map((entry) => [entry.label, entry.count])} />
      </Section>

      <Section label="Top outcomes">
        <Table columns={["Outcome", { label: "Count", className: "num" }]} rows={data.atlasSummary.topOutcomes.map((entry) => [entry.label, entry.count])} />
      </Section>

      <Section label="High-confidence papers">
        <Table
          columns={["Paper", { label: "Type", className: "tag" }, { label: "Family", className: "tag" }, { label: "Confidence", className: "num" }, { label: "Species", className: "tag" }]}
          rows={data.atlasSummary.highConfidencePapers.map((paper) => [
            paper.title,
            paper.paperType,
            paper.protocolFamily,
            paper.extractionConfidence.toFixed(2),
            paper.species.join(", ") || "unspecified"
          ])}
        />
      </Section>

      <Section label="Uncertainty hotspots">
        <Table
          columns={["Family", "Chemical", "Specimen", { label: "Papers", className: "num" }, { label: "Outcomes", className: "tag" }]}
          empty="No hotspots in the resolved slice."
          rows={data.atlasAnalysis.resolvedSummary.uncertaintyHotspots.map((hotspot) => [
            hotspot.protocolFamily,
            hotspot.chemical,
            hotspot.specimenType,
            hotspot.paperCount,
            hotspot.outcomeClasses.join(", ")
          ])}
        />
      </Section>

      <Section label="Resolved vs baseline">
        <Table
          columns={["Signal", { label: "Baseline", className: "num" }, { label: "Resolved", className: "num" }, { label: "Delta", className: "num" }]}
          rows={[
            [
              "Total papers",
              data.atlasAnalysis.baselineSummary.totalPapers,
              data.atlasAnalysis.resolvedSummary.totalPapers,
              data.atlasAnalysis.resolvedSummary.totalPapers - data.atlasAnalysis.baselineSummary.totalPapers
            ],
            [
              "Unknown protocol families",
              baseline?.unknownProtocolFamilyCount ?? 0,
              resolved?.unknownProtocolFamilyCount ?? 0,
              data.atlasAnalysis.overrideImpact.unknownProtocolFamiliesResolved
            ],
            [
              "Unknown step phases",
              baseline?.unknownStepPhaseCount ?? 0,
              resolved?.unknownStepPhaseCount ?? 0,
              data.atlasAnalysis.overrideImpact.unknownStepPhaseDelta
            ],
            [
              "Contradictions",
              baseline?.contradictionCount ?? 0,
              resolved?.contradictionCount ?? 0,
              (resolved?.contradictionCount ?? 0) - (baseline?.contradictionCount ?? 0)
            ],
            ["Overrides applied", "", data.atlasAnalysis.overrideImpact.overridesApplied, ""],
            ["Excluded papers", "", data.atlasAnalysis.overrideImpact.excludedPaperCount, ""]
          ]}
        />
      </Section>

      <Section label="Opportunity scan">
        <ul>
          {data.wedgeBrief.opportunityScan.map((item) => (
            <li key={item.title}>
              {item.title}. <span className="muted">{item.whyInteresting}</span>
            </li>
          ))}
        </ul>
      </Section>

      {INTERNAL_DEBUG_ENABLED ? (
        <Section label="Artifacts">
          <ArtifactList
            artifacts={data.artifacts.filter((artifact) =>
              ["Atlas summary", "Atlas analysis", "Wedge brief", "Normalized protocols"].includes(artifact.label)
            )}
          />
        </Section>
      ) : null}
    </>
  );
}
