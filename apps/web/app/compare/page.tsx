import { ArtifactList, Facts, PageHeader, Section, Table } from "@/components/atlas-ui";
import { formatPercent, formatScore, formatSignedPercent, formatSignedScore, getCompareData } from "@/lib/data";
import { INTERNAL_DEBUG_ENABLED } from "@/lib/runtime-flags";
import { shortDate } from "@/lib/ui-copy";

export default async function ComparePage() {
  const data = await getCompareData();

  return (
    <>
      <PageHeader note="Readiness, evidence quality, and corpus size for each domain side by side." title="Compare" />

      <Facts
        items={[
          { label: "Domains", value: data.runHealth.availableDomainCount },
          { label: "Ready", value: data.overview.readyDomainCount },
          { label: "Pending enrichment", value: data.runHealth.totalPendingSourceEnrichmentCount },
          { label: "Normalized protocols", value: data.runHealth.totalNormalizedProtocolCount }
        ]}
      />

      <Section label="Scores" first>
        <Table
          columns={[
            "Domain",
            { label: "Readiness", className: "num" },
            { label: "Evidence", className: "num" },
            { label: "Commercial", className: "num" },
            { label: "Inclusion F1", className: "num" },
            { label: "Family acc.", className: "num" },
            { label: "Paper type", className: "num" },
            { label: "Depth", className: "tag" }
          ]}
          rows={data.domains.map((domain) => [
            domain.label,
            formatScore(domain.readinessScore),
            formatScore(domain.evidenceScore),
            formatScore(domain.commercialScore),
            formatScore(domain.reviewedInclusionF1),
            formatScore(domain.reviewedProtocolFamilyAccuracy),
            formatScore(domain.reviewedPaperTypeAccuracy),
            domain.reviewedMinimumDepthReady ? "ready" : "depth gap"
          ])}
        />
      </Section>

      <Section label="Wedge posture">
        <Table
          columns={["Domain", "Current wedge", { label: "Pain point", className: "small" }, { label: "State", className: "tag" }]}
          rows={data.domains.map((domain) => [domain.label, domain.bestWedgeTitle, domain.likelyPainPoint, `${domain.healthState} · ${domain.stopReason}`])}
        />
      </Section>

      <Section label="Benchmark deltas">
        <Table
          columns={[
            "Domain",
            { label: "Inclusion F1", className: "num" },
            { label: "Family acc.", className: "num" },
            { label: "Paper type", className: "num" },
            { label: "Outcome cov.", className: "num" },
            { label: "Step cov.", className: "num" },
            { label: "Gate passes", className: "num" }
          ]}
          rows={data.domains.map((domain) => [
            domain.label,
            formatSignedScore(domain.reviewedInclusionF1Delta),
            formatSignedScore(domain.reviewedProtocolFamilyAccuracyDelta),
            formatSignedScore(domain.reviewedPaperTypeAccuracyDelta),
            formatSignedPercent(domain.reviewedOutcomeCoverageDelta),
            formatSignedPercent(domain.reviewedStepPhaseCoverageDelta),
            domain.gatePassCountDelta > 0 ? `+${domain.gatePassCountDelta}` : String(domain.gatePassCountDelta)
          ])}
        />
      </Section>

      <Section label="Corpus">
        <Table
          columns={["Domain", { label: "Fetched", className: "num" }, { label: "Matched", className: "num" }, { label: "Match rate", className: "num" }, "Top snapshot paper", { label: "Latest run", className: "tag nowrap" }]}
          rows={data.domains.map((domain) => [
            domain.label,
            domain.totalFetched,
            domain.totalMatched,
            formatPercent(domain.matchRate),
            domain.topSnapshotTitle,
            shortDate(domain.latestRunGeneratedAt)
          ])}
        />
      </Section>

      {INTERNAL_DEBUG_ENABLED ? (
        <Section label="Artifacts">
          <ArtifactList artifacts={data.artifacts} />
        </Section>
      ) : null}
    </>
  );
}
