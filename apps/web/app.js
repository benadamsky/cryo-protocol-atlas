const heroMeta = document.querySelector("#hero-meta");
const portfolioMetrics = document.querySelector("#portfolio-metrics");
const portfolioStatus = document.querySelector("#portfolio-status");
const domainGrid = document.querySelector("#domain-grid");
const domainTemplate = document.querySelector("#domain-template");

function formatNumber(value) {
  if (value === null || value === undefined) {
    return "n/a";
  }
  if (Number.isInteger(value)) {
    return value.toString();
  }
  return Number(value).toFixed(3).replace(/\.?0+$/, "");
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function formatDelta(value, invert = false) {
  if (value === null || value === undefined) {
    return null;
  }
  const numeric = Number(value);
  const positive = invert ? numeric < 0 : numeric > 0;
  const negative = invert ? numeric > 0 : numeric < 0;
  return {
    label: `${numeric > 0 ? "+" : ""}${formatNumber(numeric)}`,
    tone: positive ? "positive" : negative ? "negative" : "neutral"
  };
}

function metricCard(label, value) {
  const card = document.createElement("div");
  card.className = "metric-card";
  card.innerHTML = `<span class="label">${label}</span><span class="value">${value}</span>`;
  return card;
}

function statRow(label, value, delta) {
  const row = document.createElement("div");
  row.className = "stat-row";
  const deltaMarkup = delta
    ? `<span class="delta ${delta.tone}">${delta.label}</span>`
    : "";
  row.innerHTML = `<span class="label">${label}</span><span class="value">${value}${deltaMarkup}</span>`;
  return row;
}

function renderHero(data) {
  heroMeta.innerHTML = "";
  const chips = [
    `Updated ${new Date(data.generatedAt).toLocaleString()}`,
    `Overall state ${data.overallState}`,
    `${data.availableDomainCount} domains tracked`
  ];
  for (const text of chips) {
    const chip = document.createElement("span");
    chip.className = "hero-chip";
    chip.textContent = text;
    heroMeta.appendChild(chip);
  }
}

function renderPortfolio(data) {
  const healthyCount = data.domains.filter((domain) => domain.healthState === "healthy").length;
  portfolioStatus.textContent = `${healthyCount}/${data.domains.length} healthy`;
  portfolioStatus.className = `status-pill ${
    data.overallState === "healthy"
      ? "healthy"
      : data.overallState === "stalled-human-gate"
        ? "waiting-on-enrichment"
        : "unsafe-proposals"
  }`;

  portfolioMetrics.innerHTML = "";
  [
    ["Overall state", data.overallState.replaceAll("-", " ")],
    ["Available domains", formatNumber(data.availableDomainCount)],
    ["Pending enrichment", formatNumber(data.totalPendingSourceEnrichmentCount)],
    ["Pending benchmark review", formatNumber(data.totalPendingBenchmarkProposalCount)],
    ["Normalized protocols", formatNumber(data.totalNormalizedProtocolCount)],
    ["Next portfolio move", data.recommendations[0] ?? "No recommendation available"]
  ].forEach(([label, value]) => portfolioMetrics.appendChild(metricCard(label, value)));
}

function renderDomain(domain) {
  const fragment = domainTemplate.content.cloneNode(true);
  fragment.querySelector(".domain-name").textContent = domain.domain;
  fragment.querySelector(".domain-status-line").textContent =
    domain.bestWedgeTitle ?? "No wedge title available";
  fragment.querySelector(".domain-next-move").textContent =
    domain.currentRead ?? domain.likelyPainPoint ?? "No current read available.";

  const pill = fragment.querySelector(".domain-status-pill");
  pill.textContent = domain.healthState.replaceAll("-", " ");
  pill.className = `status-pill domain-status-pill ${
    domain.healthState === "healthy"
      ? "healthy"
      : domain.healthState === "stalled-human-gate"
        ? "waiting-on-enrichment"
        : "unsafe-proposals"
  }`;

  const summary = fragment.querySelector(".domain-summary");
  [
    ["Stop reason", domain.stopReason],
    ["Cycles completed", formatNumber(domain.cyclesCompleted)],
    ["Regression health", `${domain.regressionPassedCount}/${domain.regressionScenarioCount}`],
    ["Depth ready", domain.reviewedMinimumDepthReady ? "yes" : "no"]
  ].forEach(([label, value]) => summary.appendChild(metricCard(label, value)));

  const trustList = fragment.querySelector(".trust-list");
  trustList.appendChild(
    statRow(
      "Reviewed inclusion F1",
      formatNumber(domain.reviewedInclusionF1),
      formatDelta(domain.reviewedInclusionF1Delta)
    )
  );
  trustList.appendChild(
    statRow(
      "Outcome coverage",
      formatPercent(domain.reviewedOutcomeCoverage),
      formatDelta(domain.reviewedOutcomeCoverageDelta)
    )
  );
  trustList.appendChild(
    statRow(
      "Step-phase coverage",
      formatPercent(domain.reviewedStepPhaseCoverage),
      formatDelta(domain.reviewedStepPhaseCoverageDelta)
    )
  );
  trustList.appendChild(
    statRow(
      "Protocol family accuracy",
      formatPercent(domain.reviewedProtocolFamilyAccuracy),
      formatDelta(domain.reviewedProtocolFamilyAccuracyDelta)
    )
  );
  trustList.appendChild(
    statRow(
      "Paper type accuracy",
      formatPercent(domain.reviewedPaperTypeAccuracy),
      formatDelta(domain.reviewedPaperTypeAccuracyDelta)
    )
  );
  trustList.appendChild(
    statRow(
      "Normalization warnings",
      `${domain.protocolsWithNormalizationWarnings} / ${domain.normalizedProtocolCount}`,
      null
    )
  );

  const backlogList = fragment.querySelector(".backlog-list");
  backlogList.appendChild(
    statRow(
      "Pending source enrichment",
      formatNumber(domain.pendingSourceEnrichmentCount),
      null
    )
  );
  backlogList.appendChild(
    statRow(
      "Pending benchmark review",
      formatNumber(domain.pendingBenchmarkProposalCount),
      null
    )
  );
  backlogList.appendChild(
    statRow("Reviewed enrichment records", formatNumber(domain.reviewedSourceEnrichmentCount), null)
  );
  backlogList.appendChild(statRow("Missing outcomes", formatNumber(domain.missingOutcomeCount), null));
  backlogList.appendChild(statRow("Missing step phases", formatNumber(domain.missingStepPhaseCount), null));

  const progressList = fragment.querySelector(".progress-list");
  progressList.appendChild(
    statRow(
      "Normalized protocols",
      formatNumber(domain.normalizedProtocolCount),
      null
    )
  );
  progressList.appendChild(statRow("Gate pass delta", formatNumber(domain.gatePassCountDelta), null));
  progressList.appendChild(
    statRow("Latest run", new Date(domain.latestRunGeneratedAt).toLocaleString(), null)
  );
  progressList.appendChild(statRow("Likely pain point", domain.likelyPainPoint ?? "n/a", null));

  const mismatchList = fragment.querySelector(".mismatch-list");
  if (domain.alerts.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No current alerts.";
    mismatchList.appendChild(item);
  } else {
    for (const alert of domain.alerts) {
      const item = document.createElement("li");
      item.textContent = alert;
      mismatchList.appendChild(item);
    }
  }

  return fragment;
}

async function bootstrap() {
  const response = await fetch("./dashboard-data.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load dashboard data (${response.status})`);
  }

  const data = await response.json();
  renderHero(data);
  renderPortfolio(data);
  domainGrid.innerHTML = "";
  data.domains.forEach((domain) => domainGrid.appendChild(renderDomain(domain)));
}

bootstrap().catch((error) => {
  portfolioStatus.textContent = "Load failed";
  portfolioStatus.className = "status-pill unsafe-proposals";
  portfolioMetrics.innerHTML = "";
  portfolioMetrics.appendChild(metricCard("Error", error.message));
});
