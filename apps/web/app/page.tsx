import Link from "next/link";
import {
  DataTable,
  MetricCard,
  MetricGrid,
  PageIntro,
  ProvenanceCallout,
  Section,
  SourceNote,
  StatusPill
} from "@/components/atlas-ui";
import { formatDateTime } from "@/lib/data";
import { getRecommendationPageData, type DecisionDomainData } from "@/lib/decision-data";
import {
  compoundingMoatItems,
  confidenceDetail,
  currentLimitsItems,
  discoveryBridgeStages,
  experimentBridgeLabel,
  humanizeSystemState,
  learningFlywheelItems,
  plainEnglishWedgeSummary,
  presentDayValueCards,
  shortConfidenceLabel,
  strategicSignificance,
  systemMapStages,
  translationalSignalDetail,
  translationalSignalLabel,
  truthBoundaryItems,
  wedgeClassLabel,
  wedgeClassNarrative
} from "@/lib/ui-copy";

function whatAtlasCanSay(domain: DecisionDomainData) {
  return [domain.currentVerdict, ...domain.domainData.callPacket.wedgeValidation.whatAtlasCanSay].slice(0, 3);
}

function whatAtlasCannotConclude(domain: DecisionDomainData) {
  return [
    `Atlas is not yet claiming ${domain.domain === "islets" ? "a winning adjunct" : "a locked-in company wedge"}.`,
    ...domain.activeWedge.keyUncertainties,
    ...domain.domainData.callPacket.wedgeValidation.missingEvidence
  ].slice(0, 3);
}

function whatWouldChange(domain: DecisionDomainData) {
  const items = [
    domain.topEvidenceGap
      ? `${domain.topEvidenceGap.title}: ${domain.topEvidenceGap.recommendedAction}.`
      : null,
    domain.nextExperiment
      ? `Run ${domain.nextExperiment.title.toLowerCase()} to answer: ${domain.nextExperiment.decisionQuestion}`
      : null,
    domain.contradictionReport.contradictions[0]?.resolutionPath ?? null,
    domain.sourceEnrichmentQueue[0]
      ? `Review fuller-source evidence for ${domain.sourceEnrichmentQueue[0].title}.`
      : null
  ].filter((item): item is string => Boolean(item));

  return items.slice(0, 3);
}

function whyLeadBeatsDomain(current: DecisionDomainData, runner: DecisionDomainData) {
  const reasons: string[] = [];

  if (
    current.activeWedge.authoritySummary.primarySupportedPaperCount >
    runner.activeWedge.authoritySummary.primarySupportedPaperCount
  ) {
    reasons.push("More primary-supported evidence already anchors this wedge.");
  }

  if (current.runHealth.reviewedOutcomeCoverage > runner.runHealth.reviewedOutcomeCoverage) {
    reasons.push("Outcome coverage is more complete, so the benchmark path is less confounded.");
  }

  if (current.confidenceScore > runner.confidenceScore) {
    reasons.push("Atlas has higher confidence in the current wedge ordering.");
  }

  if (current.sourceEnrichmentQueue.length < runner.sourceEnrichmentQueue.length) {
    reasons.push("Fewer reviewed-source gaps are still blocking the next decision.");
  }

  reasons.push("The current lead also produces the clearest immediate experiment packet.");

  return reasons.slice(0, 3);
}

function notClaimingYet(domain: DecisionDomainData) {
  if (domain.wedgeClass === "plausible first company wedge") {
    return "Atlas is not yet calling this a scaled company entry wedge without benchmark proof.";
  }

  if (domain.wedgeClass === "long-term platform wedge") {
    return "Atlas is not yet calling this a platform claim.";
  }

  if (domain.wedgeClass === "watchlist") {
    return "Atlas is not yet calling this decision-ready.";
  }

  return "Atlas is not yet calling this the first company wedge.";
}

function stateTone(state: string) {
  if (state === "Available now" || state === "Current output") {
    return "good" as const;
  }

  if (state === "Downstream queue") {
    return "warn" as const;
  }

  return "neutral" as const;
}

export default async function RecommendationPage() {
  const data = await getRecommendationPageData();
  const current = data.current;
  const domainRunner = data.runnersUp[0] ?? null;
  const packetRunners = current.runnerUps.slice(0, 2);
  const nextExperimentTitle = current.nextExperiment?.title;

  return (
    <>
      <PageIntro
        eyebrow="Current Recommendation"
        title={current.title}
        summary={plainEnglishWedgeSummary(current.domain, current.title, current.thesis)}
      >
        <div className="hero__stack">
          <SourceNote sourceLabel={current.sourceLabel} />
          <div className="chip-row">
            <StatusPill tone={current.wedgeClass === "plausible first company wedge" ? "good" : "warn"}>
              {wedgeClassLabel(current.wedgeClass)}
            </StatusPill>
            <StatusPill
              tone={
                current.confidenceBand === "high"
                  ? "good"
                  : current.confidenceBand === "medium"
                    ? "neutral"
                    : "warn"
              }
            >
              {shortConfidenceLabel(current.confidenceBand)}
            </StatusPill>
            <StatusPill tone="neutral">{translationalSignalLabel(current.translationalSignal)}</StatusPill>
          </div>
          <ProvenanceCallout
            eyebrow="Current Decision"
            title={`Atlas recommends ${current.label} as the current proving ground for learning and experiment design.`}
            summary={wedgeClassNarrative(current.wedgeClass, current.label)}
            items={[
              { label: "Updated", value: formatDateTime(current.updatedAt) },
              { label: "Evidence state", value: humanizeSystemState(data.overallState) },
              { label: "Next experiment", value: current.nextExperiment?.title ?? "No packet queued" }
            ]}
          />
        </div>
      </PageIntro>

      <MetricGrid>
        <MetricCard
          label="Role in Atlas"
          value={wedgeClassLabel(current.wedgeClass)}
          detail={wedgeClassNarrative(current.wedgeClass, current.label)}
          tone={current.wedgeClass === "plausible first company wedge" ? "good" : "warn"}
        />
        <MetricCard
          label="Confidence in current wedge ordering"
          value={shortConfidenceLabel(current.confidenceBand)}
          detail={`${Math.round(current.confidenceScore * 100)}% evidence confidence on the current reviewed slice. ${confidenceDetail(current.confidenceBand)}`}
          tone={
            current.confidenceBand === "high"
              ? "good"
              : current.confidenceBand === "medium"
                ? "default"
                : "warn"
          }
        />
        <MetricCard
          label="Translational signal in current reviewed slice"
          value={translationalSignalLabel(current.translationalSignal)}
          detail={translationalSignalDetail(current.translationalSignal)}
        />
        <MetricCard
          label="Linked experiment"
          value={current.nextExperiment?.title ?? "No packet queued"}
          detail={experimentBridgeLabel(current.nextExperiment?.title)}
          tone="good"
        />
      </MetricGrid>

      <Section
        title="Current Decision"
        subtitle="Technical wedge title, plain-English explanation, strategic significance, and the concrete next experiment it already produces."
        actions={<Link href={`/domains/${current.domain}`}>Open wedge detail</Link>}
      >
        <div className="split-grid decision-grid">
          <article className="surface emphasis-surface decision-card">
            <div className="surface__header decision-card__header">
              <div className="decision-card__header-copy">
                <span className="section-kicker">Lead wedge</span>
                <h3>{current.title}</h3>
                <p className="decision-card__lede">{plainEnglishWedgeSummary(current.domain, current.title, current.thesis)}</p>
              </div>
              <StatusPill tone={current.wedgeClass === "plausible first company wedge" ? "good" : "warn"}>
                {wedgeClassLabel(current.wedgeClass)}
              </StatusPill>
            </div>

            <ul className="feature-list decision-list">
              <li>
                <strong>Why Atlas is prioritizing this now:</strong> {current.whyInteresting}
              </li>
              <li>
                <strong>Strategic significance:</strong> {strategicSignificance(current.domain)}
              </li>
              <li>
                <strong>Not claiming yet:</strong> {notClaimingYet(current)}
              </li>
              <li>
                <strong>Decision this unlocks:</strong> {current.decisionUnlock}
              </li>
            </ul>
          </article>

          <article className="surface decision-card decision-card--secondary">
            <div className="surface__header decision-card__header">
              <div className="decision-card__header-copy">
                <span className="section-kicker">Experiment packet</span>
                <h3>{current.nextExperiment?.title ?? "No packet queued"}</h3>
                <p className="decision-card__lede">
                  {current.nextExperiment?.proposedExperiment ?? "Atlas does not yet have a next experiment packet for this wedge."}
                </p>
              </div>
              <StatusPill tone="good">Lead experiment packet</StatusPill>
            </div>

            <ul className="feature-list decision-list">
              <li>
                <strong>Why this matters:</strong> Atlas is actionable because the recommendation already outputs into a next experiment.
              </li>
              <li>
                <strong>Decision being tested:</strong> {current.nextExperiment?.decisionQuestion ?? current.decisionUnlock}
              </li>
              <li>
                <strong>Minimum viable experiment:</strong>{" "}
                {current.nextExperiment
                  ? `${current.nextExperiment.comparisonArms.slice(0, 3).join(" vs ")} on ${current.nextExperiment.primaryReadouts.join(", ")}.`
                  : "No minimum viable experiment has been framed yet."}
              </li>
              <li>
                <strong>Expected upside if positive:</strong> {current.nextExperiment?.translationalRationale ?? current.translationalRationale}
              </li>
            </ul>
          </article>
        </div>

        <div className="truth-strip">
          {truthBoundaryItems(nextExperimentTitle).map((item) => (
            <article className="truth-card" key={item.label}>
              <span className="section-kicker">{item.label}</span>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section
        title="How Atlas Works"
        subtitle="This product is a pipeline architecture, not a disconnected set of pages."
      >
        <div className="split-grid">
          <article className="surface">
            <p className="pipeline-line">
              Literature mapping {"->"} Wedge recommendation {"->"} Evidence gaps / contradictions {"->"} Experiment packet {"->"} Discovery workflow {"->"} Proprietary data feedback
            </p>
            <div className="system-map-grid">
              {systemMapStages(nextExperimentTitle).map((stage, index) => (
                <article className="system-step" key={stage.label}>
                  <div className="surface__header">
                    <div>
                      <span className="section-kicker">Stage {index + 1}</span>
                      <h3>{stage.label}</h3>
                    </div>
                    <StatusPill tone={stateTone(stage.state)}>{stage.state}</StatusPill>
                  </div>
                  <p>{stage.detail}</p>
                </article>
              ))}
            </div>
          </article>

          <article className="surface">
            <span className="section-kicker">Progression</span>
            <h3>What Atlas does today, what comes next, and what this becomes later</h3>
            <div className="bridge-stack">
              {discoveryBridgeStages().map((stage) => (
                <div className="bridge-step" key={stage.label}>
                  <span className="section-kicker">{stage.label}</span>
                  <h3>{stage.title}</h3>
                  <p>{stage.detail}</p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </Section>

      <Section
        title="Why Atlas Is Already Valuable"
        subtitle="The present-day value is not abstract. Atlas already narrows decisions, surfaces blocker work, and converts the read into the next experiment."
      >
        <div className="value-grid">
          {presentDayValueCards(nextExperimentTitle).map((item) => (
            <article className="capability-card" key={item.title}>
              <span className="capability-card__eyebrow">Current value</span>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section
        title="What Atlas Knows, What It Cannot Say Yet, and What Would Change the Call"
        subtitle="Truth-seeking means making uncertainty explicit, scoped, and decision-relevant."
        actions={<Link href="/evidence">Open evidence page</Link>}
      >
        <div className="triad-grid">
          <article className="surface">
            <span className="section-kicker">What Atlas can say now</span>
            <h3>Reviewed evidence plus recommendation</h3>
            <ul className="feature-list">
              {whatAtlasCanSay(current).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="surface">
            <span className="section-kicker">What Atlas cannot conclude yet</span>
            <h3>Truth boundary</h3>
            <ul className="feature-list">
              {whatAtlasCannotConclude(current).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="surface">
            <span className="section-kicker">What would change the recommendation</span>
            <h3>Recommendation-quality inputs</h3>
            <ul className="feature-list">
              {whatWouldChange(current).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </Section>

      <Section
        title="Why This Wedge Wins Right Now"
        subtitle="Atlas should force a clear contrast against the next-best alternatives instead of making viewers infer it."
        actions={<Link href="/wedges">See all wedges</Link>}
      >
        <div className="family-grid">
          {domainRunner ? (
            <article className="family-card" key={domainRunner.domain}>
              <span className="section-kicker">Versus {domainRunner.label}</span>
              <h3>{current.label} is ahead as the current wedge</h3>
              <p>{domainRunner.title} is still useful, but it is not the lead call today.</p>
              <ul className="feature-list">
                {whyLeadBeatsDomain(current, domainRunner).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ) : null}

          {packetRunners.map((runner) => (
            <article className="family-card" key={runner.packetId}>
              <span className="section-kicker">Versus {runner.category}</span>
              <h3>{runner.title}</h3>
              <p>{runner.whyInteresting}</p>
              <ul className="feature-list">
                <li>
                  <strong>Why not first:</strong> {runner.notFirstReason}
                </li>
                <li>
                  <strong>Strategic significance:</strong> Useful after the lead benchmark is clearer, not before.
                </li>
              </ul>
            </article>
          ))}
        </div>
      </Section>

      <Section
        title="What Would Make Atlas Smarter Over Time"
        subtitle="Atlas improves through better evidence, better comparisons, better experiment results, and eventually proprietary data."
        actions={<Link href="/experiments">Open experiment packets</Link>}
      >
        <div className="value-grid">
          {learningFlywheelItems(current.domain, nextExperimentTitle).map((item) => (
            <article className="capability-card" key={item.title}>
              <span className="capability-card__eyebrow">Recommendation input</span>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section
        title="Current Limits and Why This Compounds"
        subtitle="The limits are explicit because Atlas is disciplined. The compounding path is credible because the architecture already exists."
      >
        <div className="split-grid">
          <article className="surface">
            <span className="section-kicker">Current limits</span>
            <h3>Trust features, not marketing problems</h3>
            <ul className="feature-list">
              {currentLimitsItems().map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="surface">
            <span className="section-kicker">Why this compounds</span>
            <h3>Hard to copy because the layers reinforce each other</h3>
            <div className="moat-grid">
              {compoundingMoatItems(nextExperimentTitle).map((item) => (
                <div className="bridge-step" key={item.title}>
                  <span className="section-kicker">{item.title}</span>
                  <p>{item.detail}</p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </Section>

      <Section
        title="Atlas-Wide Slate"
        subtitle="The current lead still sits inside a broader cryo wedge portfolio."
      >
        <DataTable
          columns={[
            "Domain",
            "Role",
            "Confidence",
            "Translational signal",
            "Main blocker",
            "Next experiment"
          ]}
          rows={data.domains.map((domain) => [
            <Link href={`/domains/${domain.domain}`} key={domain.domain}>
              {domain.label}
            </Link>,
            wedgeClassLabel(domain.wedgeClass),
            shortConfidenceLabel(domain.confidenceBand),
            translationalSignalLabel(domain.translationalSignal),
            domain.biggestUncertainty,
            domain.nextExperiment?.title ?? "No packet"
          ])}
        />
      </Section>
    </>
  );
}
