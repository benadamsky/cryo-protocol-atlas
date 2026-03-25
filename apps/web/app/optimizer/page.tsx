import Link from "next/link";
import {
  ArtifactLedger,
  DataTable,
  MetricCard,
  MetricGrid,
  PageIntro,
  Section,
  SourceNote,
  StatusPill
} from "@/components/atlas-ui";
import { formatPercent, formatScore, getOptimizerData } from "@/lib/data";

export default async function OptimizerPage() {
  const data = await getOptimizerData();
  const weightRows = Object.entries(data.policy.weights)
    .sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]))
    .slice(0, 8);

  return (
    <>
      <PageIntro
        eyebrow="Optimizer Lane"
        title="Policy tuning, eval metrics, and keep/revert loop state"
        summary="This view is downstream from the trusted atlas. It surfaces the single mutable discovery-policy file, the latest deterministic evaluation, and the bounded mutation loop outputs when they exist."
      >
        <div className="hero__stack">
          <SourceNote sourceLabel={data.sourceLabel} />
          <StatusPill tone={data.available ? "good" : "warn"}>
            {data.available ? "artifacts loaded" : "run optimizer scripts"}
          </StatusPill>
          <div className="chip-row">
            <Link className="data-chip data-chip--strong" href="/discovery">
              Discovery
            </Link>
            <Link className="data-chip data-chip--strong" href="/">
              Overview
            </Link>
          </div>
        </div>
      </PageIntro>

      <MetricGrid>
        <MetricCard label="Promote threshold" value={formatScore(data.policy.thresholds.promote)} />
        <MetricCard label="Review threshold" value={formatScore(data.policy.thresholds.review)} />
        <MetricCard label="Protocol signals" value={String(data.policy.heuristics.protocolSignals.length)} />
        <MetricCard label="Negative signals" value={String(data.policy.heuristics.negativeSignals.length)} />
        {data.evaluation ? (
          <>
            <MetricCard label="Objective" value={formatScore(data.evaluation.aggregate.objective)} tone="good" />
            <MetricCard label="Promote precision" value={formatPercent(data.evaluation.aggregate.promotePrecision)} />
            <MetricCard label="Promote recall" value={formatPercent(data.evaluation.aggregate.promoteRecall)} />
            <MetricCard label="Promote count" value={String(data.evaluation.aggregate.promoteCount)} />
          </>
        ) : null}
      </MetricGrid>

      {!data.available ? (
        <Section title="Runtime artifacts missing" subtitle="The policy file is present, but local eval artifacts have not been generated yet.">
          <div className="split-grid">
            <article className="surface">
              <h3>Run locally</h3>
              <ul className="feature-list">
                <li><code>bun run optimizer:evaluate</code></li>
                <li><code>bun run optimizer:loop</code></li>
                <li><code>bun run web</code></li>
              </ul>
            </article>
            <article className="surface">
              <h3>What this page reads</h3>
              <p className="surface__detail">
                The UI reads <code>packages/optimizer/src/policy.ts</code> directly and will also surface
                <code> data/optimizer/evaluation.json</code> and <code>data/optimizer/loop-results.json</code> when present.
              </p>
            </article>
          </div>
        </Section>
      ) : null}

      <Section title="Policy weights" subtitle="The highest-magnitude parameters in the current mutable policy file.">
        <DataTable
          columns={["Weight", "Value"]}
          rows={weightRows.map(([key, value]) => [key, formatScore(value)])}
        />
      </Section>

      {data.evaluation ? (
        <Section title="Evaluation" subtitle="Latest deterministic optimizer benchmark results.">
          <div className="split-grid">
            <article className="surface">
              <h3>Aggregate</h3>
              <div className="quick-facts">
                <div className="inline-stat">
                  <span>Candidates</span>
                  <strong>{data.evaluation.aggregate.candidateCount}</strong>
                </div>
                <div className="inline-stat">
                  <span>Ranking accuracy</span>
                  <strong>{formatPercent(data.evaluation.aggregate.rankingAccuracy)}</strong>
                </div>
                <div className="inline-stat">
                  <span>Review or promote recall</span>
                  <strong>{formatPercent(data.evaluation.aggregate.reviewOrPromoteRecall)}</strong>
                </div>
                <div className="inline-stat">
                  <span>Negative promote rate</span>
                  <strong>{formatPercent(data.evaluation.aggregate.negativePromoteRate)}</strong>
                </div>
              </div>
            </article>
            <article className="surface">
              <h3>By domain</h3>
              <DataTable
                columns={["Domain", "Objective", "Promote precision", "Promote recall", "Promote count"]}
                rows={data.evaluation.byDomain.map((domain) => [
                  domain.domain,
                  formatScore(domain.objective),
                  formatPercent(domain.promotePrecision),
                  formatPercent(domain.promoteRecall),
                  domain.promoteCount
                ])}
              />
            </article>
          </div>
        </Section>
      ) : null}

      {data.loopRun ? (
        <Section title="Loop run" subtitle="Latest bounded mutation run against the current policy file.">
          <div className="split-grid">
            <article className="surface">
              <h3>Run summary</h3>
              <div className="quick-facts">
                <div className="inline-stat">
                  <span>Baseline</span>
                  <strong>{formatScore(data.loopRun.baselineObjective)}</strong>
                </div>
                <div className="inline-stat">
                  <span>Final</span>
                  <strong>{formatScore(data.loopRun.finalObjective)}</strong>
                </div>
                <div className="inline-stat">
                  <span>Accepted mutations</span>
                  <strong>{data.loopRun.acceptedMutationCount}</strong>
                </div>
                <div className="inline-stat">
                  <span>Attempts</span>
                  <strong>{data.loopRun.attempts.length}</strong>
                </div>
              </div>
            </article>
            <article className="surface">
              <h3>Latest attempts</h3>
              <DataTable
                columns={["Attempt", "Mutation", "Accepted", "Objective after"]}
                rows={data.loopRun.attempts.slice(-5).reverse().map((attempt) => [
                  attempt.attempt,
                  `${attempt.mutation.path} ${formatScore(attempt.mutation.from)} → ${formatScore(attempt.mutation.to)}`,
                  attempt.accepted ? "yes" : "no",
                  formatScore(attempt.objectiveAfter)
                ])}
              />
            </article>
          </div>
        </Section>
      ) : null}

      <Section title="Artifact ledger" subtitle="These are the exact optimizer files the web app is reading right now.">
        <ArtifactLedger artifacts={data.artifacts} />
      </Section>
    </>
  );
}
