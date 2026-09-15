import Link from "next/link";
import { PageHeader, Table } from "@/components/atlas-ui";
import { getDecisionDomainsData } from "@/lib/decision-data";
import { confidenceSummary, translationalSignalLabel, wedgeClassLabel } from "@/lib/ui-copy";

export default async function WedgesPage() {
  const domains = await getDecisionDomainsData();

  return (
    <>
      <PageHeader note="The recommended question in each domain, lead first." title="Wedges" />

      <Table
        columns={[
          "Domain",
          "Current wedge",
          { label: "Role", className: "small" },
          { label: "Confidence", className: "mono nowrap small" },
          { label: "Signal", className: "small" },
          { label: "Main blocker", className: "small" },
          { label: "Experiment", className: "small" }
        ]}
        rows={domains.map((domain, index) => [
          <Link href={index === 0 ? "/" : `/domains/${domain.domain}`} key={domain.domain}>
            {domain.label}
          </Link>,
          domain.title,
          wedgeClassLabel(domain.wedgeClass),
          confidenceSummary(domain.confidenceScore, domain.confidenceBand),
          translationalSignalLabel(domain.translationalSignal),
          domain.biggestUncertainty,
          domain.nextExperiment?.title ?? "No packet"
        ])}
      />
    </>
  );
}
