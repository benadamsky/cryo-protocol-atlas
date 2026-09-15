import Link from "next/link";
import { notFound } from "next/navigation";
import { ArtifactList, Facts, PageHeader, RawJson, Section, Table } from "@/components/atlas-ui";
import { DomainCrumbs } from "@/components/domain-crumbs";
import { formatScore, getDebugData, getDomainData } from "@/lib/data";
import { getDomainMeta, parseDomainId, staticDomainParams } from "@/lib/domain";
import { INTERNAL_DEBUG_ENABLED } from "@/lib/runtime-flags";

export const dynamicParams = false;

export function generateStaticParams() {
  return staticDomainParams();
}

export default async function DebugPage({
  params,
  searchParams
}: {
  params: Promise<{ domain: string }>;
  searchParams: Promise<{ paper?: string }>;
}) {
  if (!INTERNAL_DEBUG_ENABLED) {
    notFound();
  }

  const { domain: rawDomain } = await params;
  let domain;

  try {
    domain = parseDomainId(rawDomain);
  } catch {
    notFound();
  }

  const { paper } = await searchParams;
  const meta = getDomainMeta(domain);
  const domainData = await getDomainData(domain);
  const debug = await getDebugData(domain, paper);

  if (!debug.available) {
    return (
      <>
        <PageHeader note={debug.reason} title={`${meta.label} debug`} />
        <DomainCrumbs current="debug" domain={domain} />
      </>
    );
  }

  const selected = debug.selected;

  return (
    <>
      <PageHeader note={selected.title} title={`${meta.label} debug`} />
      <DomainCrumbs current="debug" domain={domain} />

      <Facts
        items={[
          { label: "Family", value: selected.protocolFamily },
          { label: "Normalization", value: formatScore(selected.normalizationConfidence) },
          { label: "Conditions", value: selected.representativeConditions.length },
          { label: "Warnings", value: selected.warnings.length }
        ]}
      />

      <Section label="Protocols" first>
        <Table
          columns={["Paper", { label: "Family", className: "tag" }, { label: "Warnings", className: "num" }, { label: "Conditions", className: "num" }, { label: "Confidence", className: "num" }]}
          rows={debug.protocolCards.map((card) => [
            card.paperId === debug.selectedPaperId ? (
              <strong key={card.paperId}>{card.title}</strong>
            ) : (
              <Link href={`/domains/${domain}/debug?paper=${card.paperId}`} key={card.paperId}>
                {card.title}
              </Link>
            ),
            card.protocolFamily,
            card.warningCount,
            card.conditionCount,
            formatScore(card.normalizationConfidence)
          ])}
        />
      </Section>

      <Section label="Summary">
        <p>
          Species {selected.species.join(", ") || "unspecified"}; specimen {selected.specimenTypes.join(", ") || "unspecified"}.
          {debug.benchmarkEntry
            ? ` Benchmark: ${debug.benchmarkEntry.reviewStatus}, ${debug.benchmarkEntry.expectedInAtlas ? "in atlas" : "excluded"}.`
            : ""}
          {debug.enrichmentRecord
            ? ` Enrichment: ${debug.enrichmentRecord.status}, ${debug.enrichmentRecord.priority}. ${debug.enrichmentRecord.rationale}`
            : ""}
        </p>
      </Section>

      <Section label="Baseline vs resolved">
        <Table
          columns={["Layer", { label: "Confidence", className: "num" }, { label: "Chemicals", className: "num" }, { label: "Steps", className: "num" }, { label: "Outcomes", className: "num" }]}
          rows={[
            [
              "baseline",
              selected.baseline ? formatScore(selected.baseline.extractionConfidence) : "n/a",
              selected.baseline?.chemicalCount ?? "n/a",
              selected.baseline?.stepCount ?? "n/a",
              selected.baseline?.outcomeCount ?? "n/a"
            ],
            [
              "resolved",
              selected.resolved ? formatScore(selected.resolved.extractionConfidence) : "n/a",
              selected.resolved?.chemicalCount ?? "n/a",
              selected.resolved?.stepCount ?? "n/a",
              selected.resolved?.outcomeCount ?? "n/a"
            ]
          ]}
        />
        {selected.resolved ? (
          <p className="muted small" style={{ marginTop: 12 }}>
            Strongest authority {selected.resolved.strongestAuthority}; {selected.resolved.reviewedSnippetCount} reviewed snippets,{" "}
            {selected.resolved.directSnippetCount} direct.
          </p>
        ) : null}
      </Section>

      <Section label="Warnings">
        {selected.warnings.length === 0 ? (
          <p className="empty">No normalization warnings.</p>
        ) : (
          <ul>
            {selected.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}
      </Section>

      <Section label="Conditions">
        <Table
          columns={[{ label: "Phase", className: "tag" }, "Chemical", { label: "Measurement", className: "mono" }, { label: "Source", className: "tag" }, { label: "Confidence", className: "num" }, "Label"]}
          empty="No representative conditions surfaced."
          rows={selected.representativeConditions.map((condition) => [
            condition.phase,
            condition.chemical,
            condition.measurement,
            condition.source,
            formatScore(condition.confidence),
            condition.label
          ])}
        />
      </Section>

      <Section label="Steps">
        <Table
          columns={[{ label: "#", className: "mono muted" }, { label: "Phase", className: "tag" }, "Summary", { label: "Transition", className: "tag" }, { label: "Concentrations", className: "mono" }, { label: "Evidence", className: "num" }]}
          empty="No normalized steps."
          rows={selected.steps.map((step) => [
            step.order,
            step.phase,
            step.summary,
            step.transition ?? "end",
            step.concentrations.join(", ") || "none",
            step.evidenceCount
          ])}
        />
      </Section>

      <Section label="Raw">
        <RawJson data={selected.rawNormalized} title="Normalized protocol JSON" />
        {selected.resolved ? <RawJson data={selected.resolved.raw} title="Resolved extraction JSON" /> : null}
        {selected.baseline ? <RawJson data={selected.baseline.raw} title="Baseline extraction JSON" /> : null}
      </Section>

      <Section label="Artifacts">
        <ArtifactList
          artifacts={domainData.artifacts.filter((artifact) =>
            ["Extraction snapshot", "Resolved extraction", "Normalized protocols", "Benchmark gold set", "Source enrichment"].includes(
              artifact.label
            )
          )}
        />
      </Section>
    </>
  );
}
