import { ArtifactList, Facts, PageHeader, Section, Table } from "@/components/atlas-ui";
import { formatPercent, formatScore, getOptimizerData } from "@/lib/data";
import { INTERNAL_DEBUG_ENABLED } from "@/lib/runtime-flags";

export default async function OptimizerPage() {
  const data = await getOptimizerData();
  const weightRows = Object.entries(data.policy.weights)
    .sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]))
    .slice(0, 8);

  return (
    <>
      <PageHeader note="The discovery policy, its latest evaluation, and the last optimizer run." title="Optimizer" />

      <Facts
        items={[
          { label: "Promote threshold", value: <span className="mono">{formatScore(data.policy.thresholds.promote)}</span> },
          { label: "Review threshold", value: <span className="mono">{formatScore(data.policy.thresholds.review)}</span> },
          { label: "Protocol signals", value: data.policy.heuristics.protocolSignals.length },
          { label: "Negative signals", value: data.policy.heuristics.negativeSignals.length }
        ]}
      />

      {!data.available ? (
        <Section label="Artifacts missing" first>
          <p>
            The policy file is present, but local evaluation artifacts have not been generated. Run{" "}
            <code>bun run optimizer:evaluate</code> and <code>bun run optimizer:loop</code>, then <code>bun run web</code>.
          </p>
        </Section>
      ) : null}

      <Section label="Policy weights" first={data.available}>
        <Table columns={[{ label: "Weight", className: "mono" }, { label: "Value", className: "num" }]} rows={weightRows.map(([key, value]) => [key, formatScore(value)])} />
      </Section>

      {data.evaluation ? (
        <Section label="Evaluation">
          <p className="small muted">
            Objective {formatScore(data.evaluation.aggregate.objective)}; promote precision{" "}
            {formatPercent(data.evaluation.aggregate.promotePrecision)}, recall {formatPercent(data.evaluation.aggregate.promoteRecall)};{" "}
            {data.evaluation.aggregate.candidateCount} candidates, ranking accuracy {formatPercent(data.evaluation.aggregate.rankingAccuracy)},
            negative promote rate {formatPercent(data.evaluation.aggregate.negativePromoteRate)}.
          </p>
          <Table
            columns={["Domain", { label: "Objective", className: "num" }, { label: "Precision", className: "num" }, { label: "Recall", className: "num" }, { label: "Promote", className: "num" }]}
            rows={data.evaluation.byDomain.map((domain) => [
              domain.domain,
              formatScore(domain.objective),
              formatPercent(domain.promotePrecision),
              formatPercent(domain.promoteRecall),
              domain.promoteCount
            ])}
          />
        </Section>
      ) : null}

      {data.loopRun ? (
        <Section label="Loop run">
          <p className="small muted">
            Baseline {formatScore(data.loopRun.baselineObjective)} to final {formatScore(data.loopRun.finalObjective)};{" "}
            {data.loopRun.acceptedMutationCount} accepted of {data.loopRun.attempts.length} attempts.
          </p>
          <Table
            columns={[{ label: "Attempt", className: "num" }, { label: "Mutation", className: "mono" }, { label: "Accepted", className: "tag" }, { label: "Objective after", className: "num" }]}
            rows={data.loopRun.attempts
              .slice(-5)
              .reverse()
              .map((attempt) => [
                attempt.attempt,
                `${attempt.mutation.path} ${formatScore(attempt.mutation.from)} → ${formatScore(attempt.mutation.to)}`,
                attempt.accepted ? "yes" : "no",
                formatScore(attempt.objectiveAfter)
              ])}
          />
        </Section>
      ) : null}

      {INTERNAL_DEBUG_ENABLED ? (
        <Section label="Artifacts">
          <ArtifactList artifacts={data.artifacts} />
        </Section>
      ) : null}
    </>
  );
}
