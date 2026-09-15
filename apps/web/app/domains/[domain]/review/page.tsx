import { notFound } from "next/navigation";
import { Facts, PageHeader, PaperLink, Section, Table } from "@/components/atlas-ui";
import { DomainCrumbs } from "@/components/domain-crumbs";
import { getDecisionDomainData } from "@/lib/decision-data";
import { parseDomainId, staticDomainParams } from "@/lib/domain";
import { paperHrefById, paperHrefByTitle } from "@/lib/paper-links";

export const dynamicParams = false;

export function generateStaticParams() {
  return staticDomainParams();
}

export default async function DomainEvidencePage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain: rawDomain } = await params;
  let domain;

  try {
    domain = parseDomainId(rawDomain);
  } catch {
    notFound();
  }

  const data = await getDecisionDomainData(domain);

  return (
    <>
      <PageHeader note={`Evidence work that could change confidence in ${data.title.toLowerCase()}.`} title={`${data.label} evidence`} />
      <DomainCrumbs current="review" domain={domain} />

      <Facts
        items={[
          { label: "Top gap impact", value: data.topEvidenceGap?.decisionImpact ?? "none" },
          { label: "Pending follow-ups", value: data.sourceEnrichmentQueue.length },
          { label: "Missing outcomes", value: data.runHealth.missingOutcomeCount },
          { label: "Missing step phases", value: data.runHealth.missingStepPhaseCount }
        ]}
      />

      <Section label="Evidence gaps" first>
        <Table
          columns={[
            "Paper",
            { label: "Impact", className: "mono nowrap" },
            { label: "Authority", className: "tag" },
            { label: "Missing", className: "tag" },
            { label: "Rationale", className: "small" },
            { label: "Action", className: "small" }
          ]}
          empty="No ranked evidence gaps for this wedge."
          rows={data.evidenceGapQueue.map((gap) => [
            <PaperLink href={paperHrefById(data.domainData, gap.paperId)} key={gap.paperId} title={gap.title} />,
            gap.decisionImpact,
            gap.authorityProfile,
            gap.missingFields.join(", "),
            gap.rationale,
            gap.recommendedAction
          ])}
        />
      </Section>

      <Section label="Source follow-ups">
        <Table
          columns={["Paper", { label: "Priority", className: "tag" }, { label: "Status", className: "tag" }, { label: "Rationale", className: "small" }, { label: "Excerpts", className: "num" }]}
          empty="No pending source follow-ups for this wedge."
          rows={data.sourceEnrichmentQueue.map((record) => [
            <PaperLink href={record.paperUrl ?? paperHrefById(data.domainData, record.paperId)} key={record.paperId} title={record.title} />,
            record.priority,
            record.status,
            record.rationale,
            record.excerpts.length
          ])}
        />
      </Section>

      <Section label="Contradiction">
        {data.contradictionReport.contradictions.length === 0 ? (
          <p className="empty">No unresolved contradictions for this wedge.</p>
        ) : (
          <ul>
            {data.contradictionReport.contradictions.map((item) => (
              <li key={`${item.topic}-${item.paperA}`}>
                <PaperLink href={paperHrefByTitle(data.domainData, item.paperA)} title={item.paperA} /> vs{" "}
                <PaperLink href={paperHrefByTitle(data.domainData, item.paperB)} title={item.paperB} />: {item.reason.toLowerCase()};
                likely confound {item.likelyConfounds.join(", ") || "unspecified"}; {item.decisionImpact} impact. {item.resolutionPath}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section label="Coverage">
        <p>
          Outcome coverage {Math.round(data.runHealth.reviewedOutcomeCoverage * 100)}%, step coverage{" "}
          {Math.round(data.runHealth.reviewedStepPhaseCoverage * 100)}%.{" "}
          {data.topEvidenceGap
            ? `Resolving ${data.topEvidenceGap.title} would most directly change the wedge read.`
            : "The next meaningful change now comes from experiment quality rather than more extraction."}
        </p>
      </Section>
    </>
  );
}
