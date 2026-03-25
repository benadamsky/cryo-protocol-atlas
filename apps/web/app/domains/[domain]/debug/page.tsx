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
  RawArtifactPanel,
  Section,
  SourceNote,
  StatusPill
} from "@/components/atlas-ui";
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

  try {
    const { domain: rawDomain } = await params;
    const domain = parseDomainId(rawDomain);
    const { paper } = await searchParams;
    const meta = getDomainMeta(domain);
    const domainData = await getDomainData(domain);
    const debug = await getDebugData(domain, paper);

    if (!debug.available) {
      return (
        <>
          <PageIntro
            eyebrow={`${meta.label} Debug`}
            title="Normalized debug surface is not available yet."
            summary={debug.reason}
          >
            <div className="hero__stack">
              <DomainBadge domain={domain} />
              <SourceNote sourceLabel={debug.sourceLabel} />
            </div>
          </PageIntro>

          <DomainTabs current="debug" domain={domain} />
        </>
      );
    }

    return (
      <>
        <PageIntro
          eyebrow={`${meta.label} Debug`}
          title={debug.selected.title}
          summary="Baseline extraction, resolved extraction, and normalized protocol views aligned to the same paper. This is the page to use while iterating on representative conditions, provenance, and compare checks."
        >
          <div className="hero__stack">
            <DomainBadge domain={domain} />
            <SourceNote sourceLabel={domainData.sourceLabel} />
            <StatusPill tone={debug.selected.warnings.length > 0 ? "warn" : "good"}>
              {debug.selected.warnings.length > 0 ? "normalization warnings" : "clean normalization"}
            </StatusPill>
            <QuickFacts
              items={[
                {
                  label: "Selected paper",
                  value: debug.selectedPaperId
                },
                {
                  label: "Source path",
                  value: domainData.sourceLabel
                },
                {
                  label: "Authority",
                  value: debug.selected.resolved?.strongestAuthority ?? "n/a"
                },
                {
                  label: "Representative conditions",
                  value: debug.selected.representativeConditions.length
                }
              ]}
            />
          </div>
        </PageIntro>

        <DomainTabs current="debug" domain={domain} />

        <Section
          title="Cross-checks"
          subtitle="Use these pages to compare the selected paper against the wider atlas and the benchmark review surface."
        >
          <div className="split-grid">
            <article className="surface">
              <div className="surface__header">
                <h3>Validated atlas</h3>
                <StatusPill tone="neutral">family context</StatusPill>
              </div>
              <p>Use this to see how the selected paper fits into the broader literature structure.</p>
              <Link href={`/domains/${domain}/atlas`}>Open atlas</Link>
            </article>
            <article className="surface">
              <div className="surface__header">
                <h3>Benchmark</h3>
                <StatusPill tone="good">review deltas</StatusPill>
              </div>
              <p>Use this to compare the selected paper against the baseline/resolved benchmark path.</p>
              <Link href={`/domains/${domain}/benchmark`}>Open benchmark</Link>
            </article>
            <article className="surface">
              <div className="surface__header">
                <h3>Review</h3>
                <StatusPill tone="warn">evidence queue</StatusPill>
              </div>
              <p>Use this to see whether the paper still sits in a pending review or enrichment lane.</p>
              <Link href={`/domains/${domain}/review`}>Open review</Link>
            </article>
          </div>
        </Section>

        <MetricGrid>
          <MetricCard label="Selected family" value={debug.selected.protocolFamily} />
          <MetricCard label="Normalization confidence" value={formatScore(debug.selected.normalizationConfidence)} />
          <MetricCard label="Representative conditions" value={String(debug.selected.representativeConditions.length)} />
          <MetricCard
            label="Warnings"
            value={String(debug.selected.warnings.length)}
            tone={debug.selected.warnings.length > 0 ? "warn" : "good"}
          />
        </MetricGrid>

        <div className="debug-grid">
          <Section title="Protocol selector" subtitle="Jump between normalized papers in this domain slice.">
            <div className="selector-list">
              {debug.protocolCards.map((paperCard) => (
                <Link
                  className={paperCard.paperId === debug.selectedPaperId ? "selector-item is-active" : "selector-item"}
                  href={`/domains/${domain}/debug?paper=${paperCard.paperId}`}
                  key={paperCard.paperId}
                >
                  <strong>{paperCard.title}</strong>
                  <span>{paperCard.protocolFamily}</span>
                  <small>
                    warnings {paperCard.warningCount} · conditions {paperCard.conditionCount} · confidence{" "}
                    {formatScore(paperCard.normalizationConfidence)}
                  </small>
                </Link>
              ))}
            </div>
          </Section>

          <div className="debug-grid__main">
            <Section title="Protocol summary" subtitle="Current normalized view of the selected paper.">
              <div className="chip-row">
                {debug.selected.species.map((species) => (
                  <span className="data-chip" key={species}>
                    {species}
                  </span>
                ))}
                {debug.selected.specimenTypes.map((specimen) => (
                  <span className="data-chip data-chip--strong" key={specimen}>
                    {specimen}
                  </span>
                ))}
              </div>

              {debug.benchmarkEntry ? (
                <div className="callout-box">
                  <strong>Benchmark expectation</strong>
                  <p>
                    {debug.benchmarkEntry.reviewStatus} · {debug.benchmarkEntry.expectedInAtlas ? "in atlas" : "excluded"}
                  </p>
                </div>
              ) : null}

              {debug.enrichmentRecord ? (
                <div className="callout-box">
                  <strong>Enrichment queue</strong>
                  <p>
                    {debug.enrichmentRecord.status} · {debug.enrichmentRecord.priority}
                  </p>
                  <p>{debug.enrichmentRecord.rationale}</p>
                </div>
              ) : null}

              <div className="chip-row">
                <StatusPill tone="good">step = direct protocol-step attachment</StatusPill>
                <StatusPill tone="neutral">chemical-mention = fallback condition attachment</StatusPill>
              </div>
            </Section>

            <div className="split-grid">
              <Section title="Baseline vs resolved">
                <DataTable
                  columns={["Layer", "Confidence", "Chemicals", "Steps", "Outcomes"]}
                  rows={[
                    [
                      "baseline",
                      debug.selected.baseline ? formatScore(debug.selected.baseline.extractionConfidence) : "n/a",
                      debug.selected.baseline?.chemicalCount ?? "n/a",
                      debug.selected.baseline?.stepCount ?? "n/a",
                      debug.selected.baseline?.outcomeCount ?? "n/a"
                    ],
                    [
                      "resolved",
                      debug.selected.resolved ? formatScore(debug.selected.resolved.extractionConfidence) : "n/a",
                      debug.selected.resolved?.chemicalCount ?? "n/a",
                      debug.selected.resolved?.stepCount ?? "n/a",
                      debug.selected.resolved?.outcomeCount ?? "n/a"
                    ]
                  ]}
                />
                {debug.selected.resolved ? (
                  <div className="quick-facts">
                    <div className="inline-stat">
                      <span>Strongest authority</span>
                      <strong>{debug.selected.resolved.strongestAuthority}</strong>
                    </div>
                    <div className="inline-stat">
                      <span>Reviewed snippets</span>
                      <strong>{debug.selected.resolved.reviewedSnippetCount}</strong>
                    </div>
                    <div className="inline-stat">
                      <span>Direct snippets</span>
                      <strong>{debug.selected.resolved.directSnippetCount}</strong>
                    </div>
                  </div>
                ) : null}
              </Section>

              <Section title="Normalization warnings">
                {debug.selected.warnings.length === 0 ? (
                  <div className="empty-state">
                    <h3>No warnings surfaced</h3>
                    <p>This protocol currently normalizes without explicit warning strings.</p>
                  </div>
                ) : (
                  <ul className="warning-list">
                    {debug.selected.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>

            <Section title="Representative conditions" subtitle="This is the most important surface for the current ovarian work.">
              {debug.selected.representativeConditions.length === 0 ? (
                <div className="empty-state">
                  <h3>No representative conditions surfaced</h3>
                  <p>The normalized protocol did not produce direct condition rows for this paper.</p>
                </div>
              ) : (
                <DataTable
                  columns={["Phase", "Chemical", "Measurement", "Source", "Confidence", "Label"]}
                  rows={debug.selected.representativeConditions.map((condition) => [
                    condition.phase,
                    condition.chemical,
                    condition.measurement,
                    <StatusPill key={`${condition.label}-source`} tone={condition.source === "step" ? "good" : "neutral"}>
                      {condition.source}
                    </StatusPill>,
                    formatScore(condition.confidence),
                    condition.label
                  ])}
                />
              )}
            </Section>

            <Section title="Normalized steps" subtitle="Step-level structure the UI can use to explain where a protocol pattern came from.">
              <DataTable
                columns={["#", "Phase", "Summary", "Transition", "Concentrations", "Evidence"]}
                rows={debug.selected.steps.map((step) => [
                  step.order,
                  step.phase,
                  step.summary,
                  step.transition ?? "end",
                  step.concentrations.join(", ") || "none",
                  step.evidenceCount
                ])}
              />
            </Section>

            <div className="split-grid">
              <Section title="Raw artifact snapshots" subtitle="The debugging surface should always be auditable back to the underlying structured objects.">
                <RawArtifactPanel data={debug.selected.rawNormalized} open title="Normalized protocol JSON" />
                {debug.selected.resolved ? (
                  <RawArtifactPanel data={debug.selected.resolved.raw} title="Resolved extraction JSON" />
                ) : null}
                {debug.selected.baseline ? (
                  <RawArtifactPanel data={debug.selected.baseline.raw} title="Baseline extraction JSON" />
                ) : null}
              </Section>

              <Section title="Artifact ledger" subtitle="These files are the actual backing inputs for the debug surface.">
                <ArtifactLedger
                  artifacts={domainData.artifacts.filter((artifact) =>
                    [
                      "Extraction snapshot",
                      "Resolved extraction",
                      "Normalized protocols",
                      "Benchmark gold set",
                      "Source enrichment"
                    ].includes(artifact.label)
                  )}
                />
              </Section>
            </div>
          </div>
        </div>
      </>
    );
  } catch {
    notFound();
  }
}
