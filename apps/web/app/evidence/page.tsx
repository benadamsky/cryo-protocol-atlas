import Link from "next/link";
import { PageHeader, PaperLink, Section, Table } from "@/components/atlas-ui";
import { Truncated } from "@/components/truncated";
import { getEvidencePageData } from "@/lib/decision-data";
import { paperHrefById, paperHrefByTitle } from "@/lib/paper-links";
import { formatCount } from "@/lib/ui-copy";

const LIMIT = 10;

export default async function EvidencePage() {
  const data = await getEvidencePageData();
  const gaps = data.evidenceGaps;

  return (
    <>
      <PageHeader
        note="What could move the wedge ranking or sharpen the next experiment, ordered by impact."
        title="Evidence gaps"
      />

      <div className="summary">
        <span>
          <span className="mono">{formatCount(gaps.length)}</span> {gaps.length === 1 ? "gap" : "gaps"}
        </span>
        <span>
          <span className="mono">{formatCount(data.sourceEnrichments.length)}</span> source{" "}
          {data.sourceEnrichments.length === 1 ? "follow-up" : "follow-ups"}
        </span>
        <span>
          <span className="mono">{formatCount(data.contradictions.length)}</span>{" "}
          {data.contradictions.length === 1 ? "contradiction" : "contradictions"}
        </span>
      </div>

      <Truncated limit={LIMIT} total={gaps.length}>
        <Table
          columns={[
            { label: "Domain", className: "tag" },
            "Paper",
            { label: "Impact", className: "mono nowrap" },
            { label: "Authority", className: "tag" },
            { label: "Missing", className: "tag" },
            { label: "Action", className: "small" }
          ]}
          empty="No ranked evidence gaps."
          rowClassName={(index) => (index >= LIMIT ? "is-extra" : undefined)}
          rows={gaps.map((gap) => {
            const domainData = data.domains.find((domain) => domain.domain === gap.domain)?.domainData;

            return [
              <Link href={`/domains/${gap.domain}/review`} key={`${gap.domain}-${gap.paperId}`}>
                {gap.domainLabel}
              </Link>,
              <PaperLink href={domainData ? paperHrefById(domainData, gap.paperId) : null} key={gap.paperId} title={gap.title} />,
              gap.decisionImpact,
              gap.authorityProfile,
              gap.missingFields.join(", "),
              gap.recommendedAction
            ];
          })}
        />
      </Truncated>

      <Section label="Contradiction">
        {data.contradictions.length === 0 ? (
          <p className="empty">No unresolved contradictions in the current reviewed slice.</p>
        ) : (
          <ul>
            {data.contradictions.map((item) => {
              const domainData = data.domains.find((domain) => domain.domain === item.domain)?.domainData;

              return (
                <li key={`${item.domain}-${item.topic}-${item.paperA}`}>
                  <PaperLink href={domainData ? paperHrefByTitle(domainData, item.paperA) : null} title={item.paperA} /> vs{" "}
                  <PaperLink href={domainData ? paperHrefByTitle(domainData, item.paperB) : null} title={item.paperB} />{" "}
                  ({item.domainLabel.toLowerCase()}): {item.reason.toLowerCase()}; likely confound{" "}
                  {item.likelyConfounds.join(", ") || "unspecified"}. {item.resolutionPath}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </>
  );
}
