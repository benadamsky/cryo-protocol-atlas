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
  confidenceDetail,
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

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function providerLabel(source: string) {
  switch (source) {
    case "cryodb":
      return "CryoDB / CryoRepository";
    case "openalex":
      return "OpenAlex";
    case "crossref":
      return "Crossref";
    case "europe-pmc":
      return "Europe PMC";
    case "pubmed":
      return "PubMed";
    default:
      return source;
  }
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
        eyebrow="Current best next experiment"
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
            eyebrow="Why Atlas recommends this"
            title={`Atlas recommends ${current.label} as the clearest next experiment to reduce uncertainty in the current literature.`}
            summary="This is the strongest narrow question Atlas can defend today from the reviewed evidence. It is a recommendation for what to test next, not a final scientific truth claim."
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
          label="What kind of recommendation this is"
          value={wedgeClassLabel(current.wedgeClass)}
          detail="Atlas is choosing the best narrow question to test next, not claiming a final winner across all cryopreservation approaches."
          tone={current.wedgeClass === "plausible first company wedge" ? "good" : "warn"}
        />
        <MetricCard
          label="Confidence in this recommendation"
          value={shortConfidenceLabel(current.confidenceBand)}
          detail={`${Math.round(current.confidenceScore * 100)}% confidence based on the current reviewed literature slice. ${confidenceDetail(current.confidenceBand)}`}
          tone={
            current.confidenceBand === "high"
              ? "good"
              : current.confidenceBand === "medium"
                ? "default"
                : "warn"
          }
        />
        <MetricCard
          label="Why this could matter in practice"
          value={translationalSignalLabel(current.translationalSignal)}
          detail={translationalSignalDetail(current.translationalSignal)}
        />
        <MetricCard
          label="Experiment Atlas recommends"
          value={current.nextExperiment?.title ?? "No packet queued"}
          detail="The recommendation is only useful if it turns into a concrete test. This is the current lead experiment packet."
          tone="good"
        />
      </MetricGrid>

      <Section
        title="How Atlas Got Here"
        subtitle="This is the shortest path from a large literature set to one recommended next experiment."
      >
        <div className="split-grid">
          <article className="surface">
            <h3>Literature funnel</h3>
            <ul className="feature-list">
              <li><strong>Papers scanned:</strong> {formatCount(current.provenanceFunnel.papersFetched)}</li>
              <li><strong>Matched to this domain:</strong> {formatCount(current.provenanceFunnel.papersMatched)}</li>
              <li><strong>Reviewed trust rows:</strong> {formatCount(current.provenanceFunnel.reviewedBenchmarkRows)}</li>
              <li><strong>Reviewed rows in scope:</strong> {formatCount(current.provenanceFunnel.reviewedInScopeRows)}</li>
              <li><strong>Rows driving the current recommendation:</strong> {formatCount(current.provenanceFunnel.activeWedgeRelevantRows)}</li>
              <li><strong>Recommended experiment:</strong> {current.provenanceFunnel.recommendedExperimentTitle ?? "No packet queued"}</li>
            </ul>
            <details className="detail-panel">
              <summary>Show source breakdown</summary>
              <div className="detail-panel__content">
                <h4>Trusted Atlas corpus</h4>
                <ul className="feature-list">
                  <li>
                    <strong>{current.sourceBreakdown.atlasCorpus.sourceLabel}:</strong> scanned{" "}
                    {formatCount(current.sourceBreakdown.atlasCorpus.papersFetched)} papers and matched{" "}
                    {formatCount(current.sourceBreakdown.atlasCorpus.papersMatched)} into this domain.
                  </li>
                </ul>

                {current.sourceBreakdown.discoveryProviders.length > 0 ? (
                  <>
                    <h4>Broader discovery search coverage</h4>
                    <p className="surface__detail">
                      This is the wider search lane Atlas keeps alongside the trusted corpus. It is broader and more provisional than the atlas funnel above.
                    </p>
                    <ul className="feature-list">
                      {current.sourceBreakdown.discoveryQueryDescription ? (
                        <li>
                          <strong>Discovery query:</strong> {current.sourceBreakdown.discoveryQueryDescription}
                        </li>
                      ) : null}
                      {current.sourceBreakdown.discoveryTotalCandidates !== null ? (
                        <li>
                          <strong>Total discovery candidates:</strong>{" "}
                          {formatCount(current.sourceBreakdown.discoveryTotalCandidates)}
                          {current.sourceBreakdown.discoveryGeneratedAt
                            ? ` as of ${formatDateTime(current.sourceBreakdown.discoveryGeneratedAt)}`
                            : ""}
                        </li>
                      ) : null}
                      {current.sourceBreakdown.discoveryProviders.map((provider) => (
                        <li key={`${provider.source}-${provider.query ?? provider.label ?? "provider"}`}>
                          <strong>{providerLabel(provider.source)}:</strong> accepted{" "}
                          {formatCount(provider.acceptedCount)} from {formatCount(provider.fetchedCount)} fetched
                          {provider.totalHits !== null ? ` out of ${formatCount(provider.totalHits)} total hits` : ""}
                          {provider.truncated ? "; live provider returned a truncated slice" : ""}
                          {provider.failed ? `; provider failed${provider.error ? ` (${provider.error})` : ""}` : ""}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>
            </details>
          </article>

          <article className="surface">
            <h3>Why this leads to the current call</h3>
            <p>
              Atlas narrowed {formatCount(current.provenanceFunnel.papersFetched)} source papers to{" "}
              {formatCount(current.provenanceFunnel.papersMatched)} domain-matched papers, validated{" "}
              {formatCount(current.provenanceFunnel.reviewedBenchmarkRows)} reviewed trust rows, and isolated{" "}
              {formatCount(current.provenanceFunnel.activeWedgeRelevantRows)} rows that directly drive this recommendation.
            </p>
            <ul className="feature-list">
              <li>
                <strong>Top supporting papers:</strong>{" "}
                {current.topSupportingPapers.length > 0
                  ? current.topSupportingPapers.slice(0, 2).map((paper, index) => (
                      <span key={paper.paperId}>
                        {index > 0 ? "; " : null}
                        {paper.href ? (
                          <a href={paper.href} rel="noreferrer" target="_blank">
                            {paper.title}
                          </a>
                        ) : (
                          paper.title
                        )}
                      </span>
                    ))
                  : "No direct paper links recorded yet."}
              </li>
              <li><strong>Main blocker:</strong> {current.topEvidenceGap?.title ?? "No ranked blocker"}{current.topEvidenceGap ? ` - ${current.topEvidenceGap.rationale}` : ""}</li>
              <li><strong>Why this experiment:</strong> {current.nextExperiment?.decisionQuestion ?? current.decisionUnlock}</li>
            </ul>
          </article>
        </div>
      </Section>

      <Section
        title="Why Atlas Is Recommending This"
        subtitle="What Atlas sees in the literature, why this is the strongest current question to test, and what experiment follows from it."
        actions={<Link href={`/domains/${current.domain}`}>Open wedge detail</Link>}
      >
        <div className="split-grid decision-grid">
          <article className="surface emphasis-surface decision-card">
            <div className="surface__header decision-card__header">
              <div className="decision-card__header-copy">
                <span className="section-kicker">Current recommendation</span>
                <h3>{current.title}</h3>
                <p className="decision-card__lede">{plainEnglishWedgeSummary(current.domain, current.title, current.thesis)}</p>
              </div>
              <StatusPill tone={current.wedgeClass === "plausible first company wedge" ? "good" : "warn"}>
                {wedgeClassLabel(current.wedgeClass)}
              </StatusPill>
            </div>

            <ul className="feature-list decision-list">
              <li>
                <strong>Why this stands out in the literature:</strong> {current.whyInteresting}
              </li>
              <li>
                <strong>Why this matters if the result is positive:</strong> {strategicSignificance(current.domain)}
              </li>
              <li>
                <strong>What Atlas is not claiming yet:</strong> {notClaimingYet(current)}
              </li>
              <li>
                <strong>What this experiment would help decide:</strong> {current.decisionUnlock}
              </li>
            </ul>
          </article>

          <article className="surface decision-card decision-card--secondary">
            <div className="surface__header decision-card__header">
              <div className="decision-card__header-copy">
                <span className="section-kicker">Recommended next experiment</span>
                <h3>{current.nextExperiment?.title ?? "No packet queued"}</h3>
                <p className="decision-card__lede">
                  {current.nextExperiment?.proposedExperiment ?? "Atlas does not yet have a next experiment packet for this wedge."}
                </p>
              </div>
              <StatusPill tone="good">Recommended experiment</StatusPill>
            </div>

            <ul className="feature-list decision-list">
              <li>
                <strong>Why this experiment is the fastest next step:</strong> Atlas is only useful if the literature read turns into a concrete test. This experiment is the shortest path from the current evidence to a sharper decision.
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
        title="How Atlas Gets From Papers To An Experiment"
        subtitle="Atlas does not jump from literature to a recommendation. It narrows the papers, checks what it trusts, isolates the most useful question, and then turns that into an experiment."
      >
        <div className="split-grid">
          <article className="surface">
            <p className="pipeline-line">
              Scan the literature {"->"} narrow to the domain {"->"} build trusted protocol rows {"->"} choose the best next question {"->"} recommend an experiment {"->"} learn from new evidence
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
            <h3>What Atlas can do now, what comes after that, and how the system gets smarter</h3>
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
        title="Why Atlas Is Useful Before You Run The Experiment"
        subtitle="Atlas already reduces the search space, explains uncertainty, and points to the most informative next test."
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
        subtitle="Atlas is most useful when it is explicit about what the evidence supports, what it does not support yet, and what new result would change the recommendation."
        actions={<Link href="/evidence">Open evidence page</Link>}
      >
        <div className="triad-grid">
          <article className="surface">
            <span className="section-kicker">What Atlas can say now</span>
            <h3>What the evidence supports today</h3>
            <ul className="feature-list">
              {whatAtlasCanSay(current).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="surface">
            <span className="section-kicker">What Atlas cannot conclude yet</span>
            <h3>What Atlas cannot conclude yet</h3>
            <ul className="feature-list">
              {whatAtlasCannotConclude(current).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="surface">
            <span className="section-kicker">What would change the recommendation</span>
            <h3>What would change the recommendation</h3>
            <ul className="feature-list">
              {whatWouldChange(current).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </Section>

      <Section
        title="Why This Recommendation Beats The Alternatives"
        subtitle="Atlas should make the contrast explicit: why this experiment comes first, and why the other candidates come later."
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
        title="What Would Make This Recommendation Stronger"
        subtitle="Atlas gets better through better evidence, better comparisons, and eventually real lab results."
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
        title="Current Boundaries and Why Later Runs Matter"
        subtitle="This separates what Atlas can support today from what would make the system more useful over time."
      >
        <div className="split-grid">
          <article className="surface">
            <span className="section-kicker">Current boundaries</span>
            <h3>What Atlas does not claim yet</h3>
            <ul className="feature-list">
              <li>Atlas is currently operating on a narrow domain set.</li>
              <li>Recommendation confidence is scoped to the current reviewed slice.</li>
              <li>The reviewed corpus is still limited and uneven across domains.</li>
              <li>Atlas does not yet have proprietary wet-lab data.</li>
              <li>Discovery remains downstream and is not yet a validated claim.</li>
            </ul>
          </article>

          <article className="surface">
            <span className="section-kicker">Why later runs get sharper</span>
            <h3>Why the system improves instead of restarting</h3>
            <div className="moat-grid">
              <div className="bridge-step">
                <span className="section-kicker">Protocol normalization</span>
                <p>Comparable protocol structure gets more useful as Atlas sees more papers and higher-quality source review.</p>
              </div>
              <div className="bridge-step">
                <span className="section-kicker">Explicit recommendation ranking</span>
                <p>Atlas does not just collect papers. It turns them into an ordered decision surface that can be re-evaluated as new evidence arrives.</p>
              </div>
              <div className="bridge-step">
                <span className="section-kicker">Contradictions stay visible</span>
                <p>Conflicts are tracked as objects that can change the call, instead of disappearing into notes or a hidden backlog.</p>
              </div>
              <div className="bridge-step">
                <span className="section-kicker">Experiments stay linked to evidence</span>
                <p>
                  {nextExperimentTitle
                    ? `${nextExperimentTitle} shows how Atlas keeps the recommendation tied to a concrete next test.`
                    : "Atlas keeps the recommendation tied to a concrete next test."}
                </p>
              </div>
              <div className="bridge-step">
                <span className="section-kicker">Future lab results can feed back in</span>
                <p>Once proprietary wet-lab results exist, Atlas can update from those results instead of resetting on each new question.</p>
              </div>
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
