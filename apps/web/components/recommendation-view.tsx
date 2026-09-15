import Link from "next/link";
import {
  Crumbs,
  DomainTabs,
  Facts,
  Footnote,
  Funnel,
  Kicker,
  PaperLink,
  Section,
  Tag
} from "@/components/atlas-ui";
import type { DecisionDomainData } from "@/lib/decision-data";
import { paperHrefById } from "@/lib/paper-links";
import { INTERNAL_DEBUG_ENABLED } from "@/lib/runtime-flags";
import {
  confidenceSummary,
  plainEnglishWedgeSummary,
  shortConfidenceLabel,
  shortDate,
  translationalSignalLabel,
  wedgeClassLabel
} from "@/lib/ui-copy";
import type { DomainId } from "../../../packages/shared/src/schema";

function sentence(value: string) {
  const trimmed = value.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function lowerFirst(value: string) {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

const MISSING_FIELD_LABEL: Record<string, string> = {
  outcomeClasses: "outcome classes",
  stepPhases: "step phases",
  authority: "source authority",
  protocolDetail: "protocol detail"
};

function whatWouldChange(current: DecisionDomainData) {
  const gap = current.topEvidenceGap;
  const contradiction = current.contradictionReport.contradictions[0];
  const runner = current.runnerUps[0];
  const enrichment = current.sourceEnrichmentQueue[0];

  const items = [
    gap
      ? `A reviewed extraction of ${gap.title} that fills in ${gap.missingFields
          .map((field) => MISSING_FIELD_LABEL[field] ?? field)
          .join(", ")}.`
      : null,
    runner ? `A result from ${lowerFirst(runner.title)} that outperforms the current lead.` : null,
    contradiction ? sentence(contradiction.resolutionPath) : null,
    enrichment && enrichment.paperId !== gap?.paperId ? `Fuller-source review of ${enrichment.title}.` : null
  ].filter((item): item is string => Boolean(item));

  return items.slice(0, 3);
}

export function domainTabsFor(domains: DecisionDomainData[], active: DomainId) {
  return domains.map((domain, index) => ({
    label: domain.label,
    href: index === 0 ? "/" : `/domains/${domain.domain}`,
    active: domain.domain === active
  }));
}

export function RecommendationView(props: { domains: DecisionDomainData[]; domain: DomainId }) {
  const current = props.domains.find((domain) => domain.domain === props.domain) ?? props.domains[0];
  const others = props.domains.filter((domain) => domain.domain !== current.domain);
  const gap = current.topEvidenceGap;
  const blocker = current.biggestUncertainty;
  const blockerIsGapRationale = gap ? blocker === gap.rationale : false;

  const supporting = current.topSupportingPapers.map((paper) => {
    const row = current.wedgeMatrix.rows.find((entry) => entry.paperId === paper.paperId);
    return {
      ...paper,
      authority: row?.authorityProfile ?? "unknown",
      signal: row?.translationalSignal ?? "unknown"
    };
  });

  const candidates = [
    ...current.runnerUps.map((runner) => {
      const packet = current.experimentPackets.find((entry) => entry.packetId === runner.packetId);
      return {
        key: runner.packetId,
        title: runner.title,
        tag: current.shortLabel.toLowerCase(),
        value: packet ? packet.priorityScore.toFixed(2) : "n/a"
      };
    }),
    ...others.map((other) => ({
      key: other.domain,
      title: other.nextExperiment?.title ?? other.title,
      tag: other.shortLabel.toLowerCase(),
      value: shortConfidenceLabel(other.confidenceBand),
      href: `/domains/${other.domain}`
    }))
  ];

  const detailLinks = [
    { label: "Matrix", href: `/domains/${current.domain}/atlas` },
    { label: "Benchmark", href: `/domains/${current.domain}/benchmark` },
    { label: "Evidence", href: `/domains/${current.domain}/review` },
    ...(INTERNAL_DEBUG_ENABLED ? [{ label: "Debug", href: `/domains/${current.domain}/debug` }] : [])
  ];

  return (
    <>
      <DomainTabs tabs={domainTabsFor(props.domains, current.domain)} />

      <div className="headline">
        <Kicker>Next experiment</Kicker>
        <h1>{current.nextExperiment?.title ?? current.title}</h1>
        <p>{plainEnglishWedgeSummary(current.domain, current.title, current.thesis)}</p>
      </div>

      <Facts
        items={[
          { label: "Confidence", value: confidenceSummary(current.confidenceScore, current.confidenceBand) },
          { label: "Role", value: wedgeClassLabel(current.wedgeClass) },
          { label: "Evidence", value: translationalSignalLabel(current.translationalSignal) },
          { label: "Updated", value: shortDate(current.updatedAt) }
        ]}
      />

      <Section label="How the literature narrows" first>
        <Funnel
          steps={[
            { value: current.provenanceFunnel.papersFetched, label: "papers scanned" },
            { value: current.provenanceFunnel.papersMatched, label: `matched to ${current.shortLabel.toLowerCase()}` },
            { value: current.provenanceFunnel.reviewedBenchmarkRows, label: "reviewed" },
            { value: current.provenanceFunnel.reviewedInScopeRows, label: "in scope" },
            { value: current.provenanceFunnel.activeWedgeRelevantRows, label: "drive the call" }
          ]}
        />
      </Section>

      <Section label="Supporting papers">
        {supporting.length === 0 ? (
          <p className="empty">No supporting papers recorded yet.</p>
        ) : (
          <div className="rows">
            {supporting.map((paper) => (
              <div className="row" key={paper.paperId}>
                <span>
                  <PaperLink href={paper.href} title={paper.title} />
                </span>
                <Tag>{paper.authority}</Tag>
                <Tag>{paper.signal}</Tag>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section label="What blocks it">
        <p>
          {blockerIsGapRationale ? null : <>{sentence(blocker)} </>}
          {gap ? (
            <>
              <PaperLink href={paperHrefById(current.domainData, gap.paperId)} title={gap.title} />
              {": "}
              {sentence(lowerFirst(gap.rationale))}
            </>
          ) : null}
        </p>
      </Section>

      <Section label="What would change the call">
        <ul>
          {whatWouldChange(current).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>

      <Section label="Other candidates">
        {candidates.length === 0 ? (
          <p className="empty">No other candidates queued.</p>
        ) : (
          <div className="rows">
            {candidates.map((candidate) => (
              <div className="row" key={candidate.key}>
                <span>
                  {"href" in candidate && candidate.href ? (
                    <Link href={candidate.href}>{candidate.title}</Link>
                  ) : (
                    candidate.title
                  )}
                </span>
                <Tag>{candidate.tag}</Tag>
                <span className="mono muted small">{candidate.value}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Crumbs foot items={detailLinks} />

      <Footnote>Scoped to the reviewed literature slice. Not experimental validation.</Footnote>
    </>
  );
}
