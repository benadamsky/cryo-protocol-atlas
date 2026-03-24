import {
  type ActiveWedge,
  type Contradiction,
  type ExtractionSnapshot,
  WedgeDecisionContradictionReportSchema,
  type WedgeDecisionContradictionReport
} from "../../shared/src/schema.js";

function relevantContradictions(contradictions: Contradiction[], activeWedge: ActiveWedge): Contradiction[] {
  const titleSet = new Set(activeWedge.supportingPaperTitles);

  const directMatches = contradictions.filter(
    (entry) => titleSet.has(entry.paperA.title) || titleSet.has(entry.paperB.title)
  );
  if (directMatches.length > 0) {
    return directMatches;
  }

  return contradictions.filter((entry) =>
    entry.sharedContext.chemicals.some((chemical) => activeWedge.dominantPatterns.chemicals.includes(chemical))
  );
}

function likelyConfoundsFor(
  contradiction: Contradiction,
  extractionByTitle: Map<string, ExtractionSnapshot["extractions"][number]>
): string[] {
  const paperA = extractionByTitle.get(contradiction.paperA.title);
  const paperB = extractionByTitle.get(contradiction.paperB.title);
  const confounds: string[] = [];

  const speciesA = new Set(paperA?.speciesMentions ?? []);
  const speciesB = new Set(paperB?.speciesMentions ?? []);
  const sharedSpecies = [...speciesA].filter((species) => speciesB.has(species));

  if (speciesA.size > 0 && speciesB.size > 0 && sharedSpecies.length === 0) {
    confounds.push("species mismatch");
  }
  if (
    (paperA?.outcomeMentions.length ?? 0) > 0 &&
    (paperB?.outcomeMentions.length ?? 0) > 0 &&
    JSON.stringify(contradiction.paperA.outcomeClasses) !== JSON.stringify(contradiction.paperB.outcomeClasses)
  ) {
    confounds.push("endpoint mismatch");
  }
  if ((paperA?.protocolSteps.length ?? 0) <= 1 || (paperB?.protocolSteps.length ?? 0) <= 1) {
    confounds.push("sparse protocol detail");
  }

  return confounds.length > 0 ? confounds : ["preservation family disagreement under similar context"];
}

function decisionImpactFor(confounds: string[], activeWedge: ActiveWedge): "high" | "medium" | "low" {
  if (
    activeWedge.category === "benchmark" &&
    !confounds.includes("species mismatch") &&
    !confounds.includes("endpoint mismatch")
  ) {
    return "high";
  }
  if (confounds.includes("sparse protocol detail")) {
    return "medium";
  }
  return "low";
}

export function buildWedgeDecisionContradictionReport(input: {
  snapshot: ExtractionSnapshot;
  activeWedge: ActiveWedge;
  contradictions: Contradiction[];
}): WedgeDecisionContradictionReport {
  const extractionByTitle = new Map(input.snapshot.extractions.map((extraction) => [extraction.paper.title, extraction]));

  return WedgeDecisionContradictionReportSchema.parse({
    generatedAt: new Date().toISOString(),
    domain: input.snapshot.domain,
    wedgeId: input.activeWedge.wedgeId,
    contradictions: relevantContradictions(input.contradictions, input.activeWedge)
      .slice(0, 8)
      .map((entry) => {
        const likelyConfounds = likelyConfoundsFor(entry, extractionByTitle);
        const decisionImpact = decisionImpactFor(likelyConfounds, input.activeWedge);
        return {
          topic: entry.topic,
          paperA: entry.paperA.title,
          paperB: entry.paperB.title,
          sharedContext: entry.sharedContext,
          reason: entry.reason,
          likelyConfounds,
          decisionImpact,
          resolutionPath:
            decisionImpact === "high"
              ? "Resolve this before making a hard wedge call or running a definitive benchmark."
              : "Carry this as an explicit caveat in wedge and experiment artifacts until better evidence arrives.",
          confidence: entry.confidence
        };
      })
  });
}

export function renderWedgeDecisionContradictionReportMarkdown(
  report: WedgeDecisionContradictionReport
): string {
  const lines: string[] = [];
  lines.push(`# ${report.domain} wedge contradiction report`);
  lines.push("");
  if (report.contradictions.length === 0) {
    lines.push("- No wedge-relevant contradictions are currently surfaced.");
    lines.push("");
    return lines.join("\n");
  }

  for (const contradiction of report.contradictions) {
    lines.push(
      `- ${contradiction.topic} | impact=${contradiction.decisionImpact} | confidence=${contradiction.confidence}`
    );
    lines.push(`  papers=${contradiction.paperA} vs ${contradiction.paperB}`);
    lines.push(`  reason=${contradiction.reason}`);
    lines.push(`  likely confounds=${contradiction.likelyConfounds.join(", ")}`);
    lines.push(`  resolution=${contradiction.resolutionPath}`);
  }
  lines.push("");
  return lines.join("\n");
}
