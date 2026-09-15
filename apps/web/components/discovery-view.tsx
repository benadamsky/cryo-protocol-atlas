import { DomainTabs, PageHeader, PaperLink, Status, Table, Tag } from "@/components/atlas-ui";
import { Truncated } from "@/components/truncated";
import type { DiscoveryData } from "@/lib/data";
import type { DiscoveryQueueRow } from "@/lib/discovery-queue";
import { paperHrefFromIds } from "@/lib/paper-links";
import { accessLabel, formatCount, shortDate } from "@/lib/ui-copy";
import type { DomainId } from "../../../packages/shared/src/schema";

const LIMIT = 10;

function recommendationCell(value: string) {
  if (value === "promote") {
    return <Status tone="ok">promote</Status>;
  }

  if (value === "review") {
    return <Status tone="warn">review</Status>;
  }

  return value;
}

export function DiscoveryView(props: {
  data: DiscoveryData;
  rows: DiscoveryQueueRow[];
  domain: DomainId;
  tabs: Array<{ label: string; href: string; active: boolean }>;
}) {
  const lane = props.data.domains.find((entry) => entry.domain === props.domain);

  if (!lane) {
    return null;
  }

  return (
    <>
      <PageHeader
        note="Candidate papers from the broader search, ranked as inputs to review rather than as the current recommendation."
        title="Discovery"
      />

      <DomainTabs tabs={props.tabs} />

      <div className="summary">
        <span>
          <span className="mono">{formatCount(lane.novelCandidateCount)}</span> novel
        </span>
        <Status tone="ok">
          <span className="mono">{formatCount(lane.promoteCount)}</span> promote
        </Status>
        <Status tone="warn">
          <span className="mono">{formatCount(lane.reviewCount)}</span> review
        </Status>
        <span>
          <span className="mono">{formatCount(lane.reviewItemCount)}</span> in packet
        </span>
        <span className="muted">snapshot {shortDate(lane.snapshotGeneratedAt)}</span>
      </div>
      <Tag>
        {lane.providerSummaries
          .map((provider) => `${provider.source} ${provider.acceptedCount}/${provider.fetchedCount}${provider.failed ? " failed" : ""}`)
          .join(" · ")}
      </Tag>

      <Truncated limit={LIMIT} total={props.rows.length}>
        <Table
          columns={[
            { label: "#", className: "mono muted" },
            "Paper",
            { label: "Access", className: "tag nowrap" },
            { label: "Score", className: "num" },
            "Status"
          ]}
          empty="No ranked candidates for this domain yet."
          rowClassName={(index) => (index >= LIMIT ? "is-extra" : undefined)}
          rows={props.rows.map((row, index) => [
            index + 1,
            <span key={row.dedupeKey}>
              <PaperLink href={paperHrefFromIds(row)} title={row.title} />
              {row.matchedKeywords.length > 0 ? <Tag>{row.matchedKeywords.slice(0, 4).join(", ")}</Tag> : null}
            </span>,
            accessLabel(row.fullTextAvailability),
            row.rankingScore.toFixed(3),
            recommendationCell(row.recommendation)
          ])}
        />
      </Truncated>
    </>
  );
}
