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
  ScoreBar,
  Section,
  SourceNote,
  StatusPill
} from "@/components/atlas-ui";
import { formatDateTime, getDomainData } from "@/lib/data";
import { getDomainMeta, parseDomainId } from "@/lib/domain";

export default async function DomainPage({
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
          eyebrow={`${meta.label} Summary`}
          title={data.callPacket.bestWedge.title}
          summary={`${data.wedgeBrief.focusQuestion} The summary stays tied to benchmarked artifacts so the route into review, benchmark, and debug is always explicit.`}
        >
          <div className="hero__stack">
            <DomainBadge domain={domain} />
            <SourceNote sourceLabel={data.sourceLabel} />
            <StatusPill tone={data.batchSummary.minimumDepthReady ? "good" : "warn"}>
              {data.batchSummary.minimumDepthReady ? "minimum depth ready" : "depth still pending"}
            </StatusPill>
            <QuickFacts
              items={[
                {
                  label: "Benchmark snapshot",
                  value: formatDateTime(data.benchmarkSummary.generatedAt)
                },
                {
                  label: "Normalized protocols",
                  value: data.batchSummary.normalizedProtocolCount
                },
                {
                  label: "Pending enrichments",
                  value: data.batchSummary.pendingSourceEnrichmentCount
                },
                {
                  label: "Read path",
                  value: data.sourceLabel
                }
              ]}
            />
          </div>
        </PageIntro>

        <DomainTabs current="overview" domain={domain} />

        <Section
          title="Cross-page entry points"
          subtitle="Use these routes to move from the summary into comparison, review, or paper-level provenance."
        >
          <div className="split-grid">
            <article className="surface">
              <div className="surface__header">
                <h3>Validated atlas</h3>
                <StatusPill tone="neutral">print-friendly summary</StatusPill>
              </div>
              <p>
                Use this when you want the stable wedge story, family distribution, and current literature shape.
              </p>
              <Link href={`/domains/${domain}/atlas`}>Open atlas</Link>
            </article>

            <article className="surface">
              <div className="surface__header">
                <h3>Benchmarking</h3>
                <StatusPill tone="good">baseline vs resolved</StatusPill>
              </div>
              <p>
                Use this when you need gate checks, reviewed-depth deltas, and a direct comparison of what changed.
              </p>
              <Link href={`/domains/${domain}/benchmark`}>Open benchmark</Link>
            </article>

            <article className="surface">
              <div className="surface__header">
                <h3>Debug and provenance</h3>
                <StatusPill tone="warn">paper-level trace</StatusPill>
              </div>
              <p>
                Use this when you need representative conditions, normalization warnings, and line-by-line evidence.
              </p>
              <Link href={`/domains/${domain}/debug`}>Open debug</Link>
            </article>
          </div>
        </Section>

        <MetricGrid>
          <MetricCard
            label="Reviewed outcome coverage"
            value={`${Math.round(data.batchSummary.reviewedOutcomeCoverage * 100)}%`}
            detail="Reviewed in-scope rows with explicit outcome labels."
            tone={data.batchSummary.reviewedOutcomeCoverage >= 0.4 ? "good" : "warn"}
          />
          <MetricCard
            label="Reviewed step coverage"
            value={`${Math.round(data.batchSummary.reviewedStepPhaseCoverage * 100)}%`}
            detail="Reviewed in-scope rows with explicit protocol step phases."
            tone={data.batchSummary.reviewedStepPhaseCoverage >= 0.4 ? "good" : "warn"}
          />
          <MetricCard
            label="Normalized protocols"
            value={String(data.batchSummary.normalizedProtocolCount)}
            detail="Protocols represented in the normalized comparison layer."
          />
          <MetricCard
            label="Pending enrichments"
            value={String(data.batchSummary.pendingSourceEnrichmentCount)}
            detail="Reviewed evidence gaps still waiting on curated enrichment."
            tone={data.batchSummary.pendingSourceEnrichmentCount > 0 ? "warn" : "good"}
          />
        </MetricGrid>

        <Section title="Executive read" subtitle={data.callPacket.executiveSummary[0]}>
          <div className="split-grid">
            <article className="surface">
              <div className="surface__header">
                <h3>Current wedge</h3>
                <StatusPill tone="good">{data.callPacket.bestWedge.category}</StatusPill>
              </div>
              <p>{data.callPacket.bestWedge.whyThisWedge}</p>
              <p className="surface__detail">{data.callPacket.bestWedge.firstExperiment}</p>
              <QuickFacts
                items={[
                  {
                    label: "Pain point",
                    value: data.callPacket.bestWedge.currentPainPoint
                  },
                  {
                    label: "Why now",
                    value: data.callPacket.bestWedge.whyNow
                  }
                ]}
              />
            </article>

            <article className="surface">
              <div className="surface__header">
                <h3>Standard pattern</h3>
                <StatusPill tone="neutral">{data.callPacket.standardOfCareView.dominantProtocolFamily}</StatusPill>
              </div>
              <p>{data.callPacket.standardOfCareView.summary}</p>
              <div className="chip-row">
                {data.callPacket.standardOfCareView.dominantChemicals.map((chemical) => (
                  <span className="data-chip" key={chemical}>
                    {chemical}
                  </span>
                ))}
              </div>
              <div className="chip-row">
                {data.callPacket.standardOfCareView.representativeConditions.length > 0 ? (
                  data.callPacket.standardOfCareView.representativeConditions.map((condition) => (
                    <span className="data-chip data-chip--strong" key={condition}>
                      {condition}
                    </span>
                  ))
                ) : (
                  <span className="data-chip">No representative condition surfaced</span>
                )}
              </div>
            </article>
          </div>
        </Section>

        <Section title="Evidence posture" subtitle="These are the metrics that make the wedge story credible or fragile.">
          <div className="split-grid">
            <article className="surface">
              <h3>Benchmark signal</h3>
              <ScoreBar
                label="Outcome coverage"
                value={data.wedgeBrief.evidenceQuality.reviewedOutcomeCoverage}
                tone="teal"
              />
              <ScoreBar
                label="Step coverage"
                value={data.wedgeBrief.evidenceQuality.reviewedStepPhaseCoverage}
                tone="amber"
              />
              <QuickFacts
                items={[
                  {
                    label: "Normalization warnings",
                    value: data.wedgeBrief.evidenceQuality.protocolsWithNormalizationWarnings
                  },
                  {
                    label: "Missing outcomes",
                    value: data.wedgeBrief.evidenceQuality.missingOutcomeCount
                  },
                  {
                    label: "Missing step phases",
                    value: data.wedgeBrief.evidenceQuality.missingStepPhaseCount
                  },
                  {
                    label: "Reviewed primary-supported",
                    value: data.callPacket.benchmarkSnapshot.reviewedPrimarySupportedCount
                  },
                  {
                    label: "Reviewed secondary-supported",
                    value: data.callPacket.benchmarkSnapshot.reviewedSecondarySupportedCount
                  }
                ]}
              />
            </article>

            <article className="surface">
              <h3>Market bridge</h3>
              <p>{data.callPacket.marketBridge.whyOptimizationMightMatter}</p>
              <p className="surface__detail">{data.callPacket.marketBridge.likelyBuyerOrUser}</p>
              <div className="callout-box">
                <strong>Current read</strong>
                <p>{data.callPacket.wedgeValidation.currentRead}</p>
              </div>
            </article>
          </div>
        </Section>

        <Section title="Protocol families" subtitle="Top family-level slices currently driving the domain interpretation.">
          <div className="family-grid">
            {data.wedgeBrief.protocolFamilies.map((family) => (
              <article className="family-card" key={family.family}>
                <div className="family-card__header">
                  <h3>{family.family}</h3>
                  <StatusPill tone="neutral">{family.paperCount} papers</StatusPill>
                </div>
                <p>{family.interpretation}</p>
                <div className="chip-row">
                  {family.topChemicals.map((chemical) => (
                    <span className="data-chip" key={chemical}>
                      {chemical}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </Section>

        <Section title="High-confidence papers" actions={<Link href={`/domains/${domain}/atlas`}>Open full atlas</Link>}>
          <DataTable
            columns={["Paper", "Family", "Confidence", "Chemicals", "Phases"]}
            rows={data.atlasSummary.highConfidencePapers.slice(0, 6).map((paper) => [
              paper.title,
              paper.protocolFamily,
              paper.extractionConfidence.toFixed(2),
              paper.chemicals.join(", ") || "none",
              paper.stepPhases.join(", ") || "none"
            ])}
          />
        </Section>

        <div className="split-grid">
          <Section
            title="Resolved vs baseline"
            subtitle="This comparison shows how the resolved pass changes the slice without hiding difficult papers."
          >
            <DataTable
              columns={["Signal", "Baseline", "Resolved", "Delta"]}
              rows={[
                [
                  "Total papers",
                  data.atlasAnalysis.baselineSummary.totalPapers,
                  data.atlasAnalysis.resolvedSummary.totalPapers,
                  data.atlasAnalysis.resolvedSummary.totalPapers - data.atlasAnalysis.baselineSummary.totalPapers
                ],
                [
                  "Unknown protocol families",
                  data.atlasAnalysis.baselineSummary.qualitySignals?.unknownProtocolFamilyCount ?? 0,
                  data.atlasAnalysis.resolvedSummary.qualitySignals?.unknownProtocolFamilyCount ?? 0,
                  data.atlasAnalysis.overrideImpact.unknownProtocolFamiliesResolved
                ],
                [
                  "Unknown step phases",
                  data.atlasAnalysis.baselineSummary.qualitySignals?.unknownStepPhaseCount ?? 0,
                  data.atlasAnalysis.resolvedSummary.qualitySignals?.unknownStepPhaseCount ?? 0,
                  data.atlasAnalysis.overrideImpact.unknownStepPhaseDelta
                ],
                [
                  "Contradictions",
                  data.atlasAnalysis.baselineSummary.qualitySignals?.contradictionCount ?? 0,
                  data.atlasAnalysis.resolvedSummary.qualitySignals?.contradictionCount ?? 0,
                  (data.atlasAnalysis.resolvedSummary.qualitySignals?.contradictionCount ?? 0) -
                    (data.atlasAnalysis.baselineSummary.qualitySignals?.contradictionCount ?? 0)
                ]
              ]}
            />
            <QuickFacts
              items={[
                {
                  label: "Overrides applied",
                  value: data.atlasAnalysis.overrideImpact.overridesApplied
                },
                {
                  label: "Excluded papers",
                  value: data.atlasAnalysis.overrideImpact.excludedPaperCount
                },
                {
                  label: "Families resolved",
                  value: data.atlasAnalysis.overrideImpact.unknownProtocolFamiliesResolved
                }
              ]}
            />
          </Section>

          <Section title="Artifact ledger" subtitle="Exactly which generated artifacts back this domain page, including the comparison inputs.">
            <ArtifactLedger artifacts={data.artifacts.slice(0, 8)} />
          </Section>
        </div>
      </>
    );
  } catch {
    notFound();
  }
}
