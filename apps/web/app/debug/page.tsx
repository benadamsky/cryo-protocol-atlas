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
import { formatDateTime } from "@/lib/data";
import { getDebugLandingData } from "@/lib/decision-data";
import { humanizeSystemState } from "@/lib/ui-copy";

export default async function DebugPage() {
  const data = await getDebugLandingData();
  const artifacts = [
    ...data.compare.artifacts,
    ...data.history.artifacts,
    ...data.optimizer.artifacts
  ].filter(
    (artifact, index, items) =>
      items.findIndex(
        (candidate) =>
          candidate.label === artifact.label &&
          candidate.relativePath === artifact.relativePath &&
          candidate.sourceLabel === artifact.sourceLabel
      ) === index
  );

  return (
    <>
      <PageIntro
        eyebrow="Debug / Provenance"
        title="Provenance and audit view"
        summary="Use this page when you need artifact lineage, pipeline health, or access to the secondary compare, history, discovery, and optimizer views."
      >
        <div className="hero__stack">
          <SourceNote sourceLabel={data.domains[0]?.sourceLabel ?? "worktree"} />
          <StatusPill tone={data.optimizer.available ? "warn" : "neutral"}>
            {data.optimizer.available ? "Optimizer artifacts present" : "Optimizer not active"}
          </StatusPill>
        </div>
      </PageIntro>

      <MetricGrid>
        <MetricCard label="Domains" value={String(data.domains.length)} />
        <MetricCard label="History state" value={humanizeSystemState(data.history.overallState)} />
        <MetricCard label="Optimizer" value={data.optimizer.available ? "available" : "not generated"} detail="Hidden from the main nav because it is downstream from trusted Atlas decisions." />
        <MetricCard label="Artifacts" value={String(artifacts.length)} detail="Unique files currently backing the debug layer." />
      </MetricGrid>

      <Section title="Health Summary" subtitle="These signals matter, but they stay behind the main recommendation narrative.">
        <DataTable
          columns={["Domain", "Current wedge", "State", "Stop reason", "Updated", "Alerts"]}
          rows={data.domains.map((domain) => [
            <Link href={`/domains/${domain.domain}/debug`} key={`debug-${domain.domain}`}>{domain.label}</Link>,
            domain.title,
            domain.runHealth.healthState,
            domain.runHealth.stopReason,
            formatDateTime(domain.runHealth.latestRunGeneratedAt),
            domain.runHealth.alerts.join("; ")
          ])}
        />
      </Section>

      <Section title="Secondary Tools" subtitle="Useful supporting routes that sit behind the main recommendation flow.">
        <div className="split-grid">
          <article className="surface">
            <h3>Compare</h3>
            <p>Cross-domain metric deltas, corpus coverage, and benchmark posture.</p>
            <Link href="/compare">Open compare</Link>
          </article>
          <article className="surface">
            <h3>History</h3>
            <p>Cycle ledger, hash transitions, backlog changes, and autoresearch stop reasons.</p>
            <Link href="/history">Open history</Link>
          </article>
          <article className="surface">
            <h3>Discovery</h3>
            <p>Queue triage, review packet assembly, and live provider degradation state.</p>
            <Link href="/discovery">Open discovery</Link>
          </article>
          <article className="surface">
            <h3>Optimizer</h3>
            <p>Discovery-policy tuning only. This does not define wedge truth.</p>
            <Link href="/optimizer">Open optimizer</Link>
          </article>
        </div>
      </Section>

      <Section title="Artifact Ledger" subtitle="Exact file lineage backing the secondary views.">
        <ArtifactLedger artifacts={artifacts} />
      </Section>
    </>
  );
}
