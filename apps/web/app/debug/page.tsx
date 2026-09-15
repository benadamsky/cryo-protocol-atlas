import Link from "next/link";
import { notFound } from "next/navigation";
import { ArtifactList, Facts, PageHeader, Section, Table } from "@/components/atlas-ui";
import { getDebugLandingData } from "@/lib/decision-data";
import { INTERNAL_DEBUG_ENABLED } from "@/lib/runtime-flags";
import { humanizeSystemState, shortDate } from "@/lib/ui-copy";

export default async function DebugPage() {
  if (!INTERNAL_DEBUG_ENABLED) {
    notFound();
  }

  const data = await getDebugLandingData();
  const artifacts = [...data.compare.artifacts, ...data.history.artifacts, ...data.optimizer.artifacts].filter(
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
      <PageHeader note="Artifact lineage, pipeline health, and the compare, history, and optimizer views." title="Debug" />

      <Facts
        items={[
          { label: "Domains", value: data.domains.length },
          { label: "History state", value: humanizeSystemState(data.history.overallState) },
          { label: "Optimizer", value: data.optimizer.available ? "available" : "not generated" },
          { label: "Artifacts", value: artifacts.length }
        ]}
      />

      <Section label="Health" first>
        <Table
          columns={["Domain", "Current wedge", { label: "State", className: "tag" }, { label: "Stop reason", className: "tag" }, { label: "Updated", className: "tag nowrap" }, { label: "Alerts", className: "small" }]}
          rows={data.domains.map((domain) => [
            <Link href={`/domains/${domain.domain}/debug`} key={domain.domain}>
              {domain.label}
            </Link>,
            domain.title,
            domain.runHealth.healthState,
            domain.runHealth.stopReason,
            shortDate(domain.runHealth.latestRunGeneratedAt),
            domain.runHealth.alerts.join("; ") || "none"
          ])}
        />
      </Section>

      <Section label="Secondary views">
        <ul>
          <li>
            <Link href="/compare">Compare</Link>: cross-domain metric deltas, corpus coverage, and benchmark posture.
          </li>
          <li>
            <Link href="/history">History</Link>: cycle ledger, hash transitions, backlog changes, and stop reasons.
          </li>
          <li>
            <Link href="/optimizer">Optimizer</Link>: discovery-policy tuning only; it does not define wedge truth.
          </li>
        </ul>
      </Section>

      <Section label="Artifacts">
        <ArtifactList artifacts={artifacts} />
      </Section>
    </>
  );
}
