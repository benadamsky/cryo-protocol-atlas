import { ArtifactList, Facts, PageHeader, Section, Table } from "@/components/atlas-ui";
import { formatPercent, formatSignedScore, getHistoryData } from "@/lib/data";
import { INTERNAL_DEBUG_ENABLED } from "@/lib/runtime-flags";
import { humanizeSystemState, shortDate } from "@/lib/ui-copy";

function shortHash(value: string) {
  return value.slice(0, 8);
}

export default async function HistoryPage() {
  const data = await getHistoryData();
  const totalCycles = data.domains.reduce((total, domain) => total + domain.cyclesCompleted, 0);
  const totalBacklog = data.domains.reduce(
    (total, domain) => total + domain.pendingSourceEnrichmentCount + domain.pendingBenchmarkProposalCount,
    0
  );

  return (
    <>
      <PageHeader note="Recent cycles: what changed and what still blocks progress." title="History" />

      <Facts
        items={[
          { label: "Domains", value: data.domains.length },
          { label: "Cycles", value: totalCycles },
          { label: "Backlog", value: totalBacklog },
          { label: "State", value: humanizeSystemState(data.overallState) }
        ]}
      />

      <Section label="Cycle ledger" first>
        <Table
          columns={[
            "Domain",
            { label: "Cycle", className: "num" },
            { label: "State", className: "tag" },
            { label: "Proposals", className: "mono" },
            { label: "Backlog", className: "num" },
            { label: "Outcome", className: "num" },
            { label: "Step", className: "num" },
            { label: "Hash", className: "mono nowrap" },
            { label: "Apply", className: "tag" }
          ]}
          rows={data.domains.flatMap((domain) =>
            domain.cycles.map((cycle) => [
              domain.label,
              cycle.cycle,
              cycle.autonomousStateChanged ? "changed" : "steady",
              `${cycle.proposalCount}/${cycle.overrideProposalCount}/${cycle.benchmarkProposalCount}`,
              cycle.pendingSourceEnrichmentCount + cycle.pendingBenchmarkProposalCount,
              formatPercent(cycle.reviewedOutcomeCoverage),
              formatPercent(cycle.reviewedStepPhaseCoverage),
              `${shortHash(cycle.beforeBenchmarkHash)} → ${shortHash(cycle.afterBenchmarkHash)}`,
              cycle.autoApplySafe ? "safe" : "manual"
            ])
          )}
        />
      </Section>

      <Section label="Quality deltas">
        <Table
          columns={[
            "Domain",
            { label: "Inclusion F1", className: "num" },
            { label: "Family acc.", className: "num" },
            { label: "Paper type", className: "num" },
            { label: "Gate passes", className: "num" },
            { label: "Outcome cov.", className: "num" },
            { label: "Step cov.", className: "num" },
            { label: "Depth", className: "tag" }
          ]}
          rows={data.domains.map((domain) => [
            domain.label,
            formatSignedScore(domain.reviewedInclusionF1Delta),
            formatSignedScore(domain.reviewedProtocolFamilyAccuracyDelta),
            formatSignedScore(domain.reviewedPaperTypeAccuracyDelta),
            domain.gatePassCountDelta > 0 ? `+${domain.gatePassCountDelta}` : String(domain.gatePassCountDelta),
            formatPercent(domain.reviewedOutcomeCoverage),
            formatPercent(domain.reviewedStepPhaseCoverage),
            domain.reviewedMinimumDepthReady ? "ready" : "not ready"
          ])}
        />
      </Section>

      <Section label="Backlog">
        <Table
          columns={["Domain", { label: "Pending", className: "num" }, { label: "Missing outcomes", className: "num" }, { label: "Missing steps", className: "num" }, { label: "Stop reason", className: "tag" }, { label: "Latest run", className: "tag nowrap" }]}
          rows={data.domains.map((domain) => [
            domain.label,
            domain.pendingSourceEnrichmentCount + domain.pendingBenchmarkProposalCount,
            domain.missingOutcomeCount,
            domain.missingStepPhaseCount,
            domain.stopReason,
            shortDate(domain.latestRunGeneratedAt)
          ])}
        />
      </Section>

      <Section label="Recommendations">
        <ul>
          {data.recommendations.map((recommendation) => (
            <li key={recommendation}>{recommendation}</li>
          ))}
        </ul>
      </Section>

      {INTERNAL_DEBUG_ENABLED ? (
        <Section label="Artifacts">
          <ArtifactList artifacts={data.artifacts} />
        </Section>
      ) : null}
    </>
  );
}
