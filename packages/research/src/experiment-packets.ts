import type { AtlasSummary } from "./atlas.js";
import { getDomain } from "../../shared/src/domains/index.js";
import {
  ExperimentPacketFileSchema,
  type ActiveWedge,
  type DomainId,
  type ExperimentPacketFile,
  type ResearchHypothesis
} from "../../shared/src/schema.js";

function packetIdFor(domain: string, hypothesis: ResearchHypothesis): string {
  return `${domain}:${hypothesis.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

function primaryReadoutsFor(hypothesis: ResearchHypothesis): string[] {
  if (/additive-assisted/i.test(hypothesis.title)) {
    return ["function", "viability"];
  }
  if (/matched-species/i.test(hypothesis.title)) {
    return ["function", "viability"];
  }
  if (hypothesis.category === "endpoint-upgrade") {
    return ["transplantation", "function"];
  }
  if (hypothesis.category === "scale-up") {
    return ["post-thaw recovery", "workflow reproducibility"];
  }
  return hypothesis.evidence.transplantationPaperCount > 0
    ? ["transplantation", "function"]
    : ["function", "viability"];
}

function secondaryReadoutsFor(hypothesis: ResearchHypothesis): string[] {
  if (/additive-assisted/i.test(hypothesis.title)) {
    return ["yield", "transplantation"];
  }
  if (/matched-species/i.test(hypothesis.title)) {
    return ["transplantation", "yield", "morphology"];
  }
  if (hypothesis.category === "scale-up") {
    return ["viability", "yield", "handling loss"];
  }
  return ["viability", "yield", "morphology"];
}

function comparisonArmsFor(hypothesis: ResearchHypothesis, preferredChemicals?: string[]): string[] {
  const protocolFamilies = hypothesis.supportingContext.protocolFamilies.filter((family) => family !== "unknown");
  if (/additive-assisted/i.test(hypothesis.title)) {
    const additiveArms = (preferredChemicals ?? hypothesis.supportingContext.chemicals)
      .filter((chemical) =>
        !["Dimethyl Sulfoxide", "Ethylene Glycol", "Sucrose", "Glycerol", "Polyethylene Glycol"].includes(chemical)
      )
      .slice(0, 4)
      .map((chemical) => `base cryomix + ${chemical}`);
    return ["base cryomix only", ...additiveArms];
  }
  if (/matched-species/i.test(hypothesis.title)) {
    return ["slow-freezing arm", "vitrification arm"];
  }
  if (hypothesis.category === "endpoint-upgrade") {
    return ["current standard protocol", "top reported protocol with transplantation endpoint"];
  }
  if (hypothesis.category === "scale-up") {
    return ["current handling workflow", "workflow with staged loading/unloading controls"];
  }
  return protocolFamilies.length > 0 ? protocolFamilies.map((family) => `${family} arm`) : ["benchmark arm A", "benchmark arm B"];
}

function fixedVariablesFor(hypothesis: ResearchHypothesis): string[] {
  const fixedVariables = ["assessment window", "specimen handling", "post-thaw evaluation rubric"];
  if (hypothesis.category === "benchmark") {
    fixedVariables.unshift("species", "specimen format");
  }
  if (/additive-assisted/i.test(hypothesis.title)) {
    fixedVariables.unshift("base CPA backbone");
  }
  return fixedVariables;
}

function translationalRationaleFor(domain: DomainId, hypothesis: ResearchHypothesis): string {
  const rationale = getDomain(domain).research.packetTranslationalRationale;
  return hypothesis.category === "benchmark" ? rationale.benchmark : rationale.default;
}

export function buildExperimentPacketFile(input: {
  domain: DomainId;
  activeWedge: ActiveWedge;
  atlas: AtlasSummary;
}): ExperimentPacketFile {
  const candidateHypotheses = input.atlas.researchHypotheses
    .filter((hypothesis) => hypothesis.category !== "workflow-gap")
    .sort((left, right) => {
      if (left.id === input.activeWedge.selectedHypothesisId) {
        return -1;
      }
      if (right.id === input.activeWedge.selectedHypothesisId) {
        return 1;
      }
      return right.scores.priorityScore - left.scores.priorityScore;
    })
    .slice(0, 3);

  return ExperimentPacketFileSchema.parse({
    generatedAt: new Date().toISOString(),
    domain: input.domain,
    wedgeId: input.activeWedge.wedgeId,
    packets: candidateHypotheses.map((hypothesis) => ({
      packetId: packetIdFor(input.domain, hypothesis),
      hypothesisId: hypothesis.id,
      title: hypothesis.title,
      category: hypothesis.category,
      decisionQuestion:
        hypothesis.id === input.activeWedge.selectedHypothesisId
          ? input.activeWedge.decisionQuestion
          : `Would "${hypothesis.title}" materially sharpen the wedge decision if tested next?`,
      whyNow:
        hypothesis.id === input.activeWedge.selectedHypothesisId
          ? input.activeWedge.currentRead
          : "This remains one of the highest-signal next experiments in the current domain slice.",
      claim: hypothesis.claim,
      proposedExperiment:
        hypothesis.id === input.activeWedge.selectedHypothesisId
          ? input.activeWedge.recommendedNextStep
          : hypothesis.proposedExperiment,
      fixedVariables: fixedVariablesFor(hypothesis),
      comparisonArms: comparisonArmsFor(
        hypothesis,
        hypothesis.id === input.activeWedge.selectedHypothesisId
          ? input.activeWedge.dominantPatterns.chemicals
          : undefined
      ),
      primaryReadouts: primaryReadoutsFor(hypothesis),
      secondaryReadouts: secondaryReadoutsFor(hypothesis),
      supportingPaperTitles: hypothesis.supportingContext.paperTitles,
      keyUncertainties: hypothesis.blockers,
      authorityNotes: [
        `supporting papers=${hypothesis.evidence.totalPaperCount}`,
        `strong outcomes=${hypothesis.evidence.strongOutcomePaperCount}`,
        `contradictions=${hypothesis.evidence.contradictionCount}`,
        `transplantation papers=${hypothesis.evidence.transplantationPaperCount}`
      ],
      translationalRationale: translationalRationaleFor(input.domain, hypothesis),
      priorityScore: hypothesis.scores.priorityScore
    }))
  });
}

export function renderExperimentPacketFileMarkdown(file: ExperimentPacketFile): string {
  const lines: string[] = [];
  lines.push(`# ${file.domain} experiment packets`);
  lines.push("");
  file.packets.forEach((packet, index) => {
    lines.push(`## ${index === 0 ? "Primary recommendation" : "Alternative"}: ${packet.title}`);
    lines.push(`- decision this answers: ${packet.decisionQuestion}`);
    lines.push(`- why this is worth running: ${packet.whyNow}`);
    lines.push(`- core claim: ${packet.claim}`);
    lines.push(`- proposed test: ${packet.proposedExperiment}`);
    lines.push(`- keep fixed: ${packet.fixedVariables.join(", ")}`);
    lines.push(`- compare: ${packet.comparisonArms.join(" | ")}`);
    lines.push(`- primary readouts: ${packet.primaryReadouts.join(", ")}`);
    lines.push(`- secondary readouts: ${packet.secondaryReadouts.join(", ")}`);
    lines.push(`- strongest supporting papers: ${packet.supportingPaperTitles.slice(0, 4).join(" | ")}`);
    lines.push(`- evidence read: ${packet.authorityNotes.join(" | ")}`);
    if (packet.keyUncertainties.length > 0) {
      lines.push(`- main watch-outs: ${packet.keyUncertainties.join(" | ")}`);
    }
    lines.push(`- translational value: ${packet.translationalRationale}`);
    lines.push("");
  });
  return lines.join("\n");
}
