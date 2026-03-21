import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  DomainIdSchema,
  ResearchHypothesisSchema,
  type DomainId,
  type ResearchHypothesis
} from "../packages/shared/src/schema.js";
import { buildAtlasSummary } from "../packages/research/src/atlas.js";
import { applyProtocolOverrides, parseOverrideFile } from "../packages/normalize/src/overrides.js";
import { ExtractionSnapshotSchema } from "../packages/shared/src/schema.js";

type ResearchAgenda = {
  generatedAt: string;
  domains: DomainId[];
  hypotheses: ResearchHypothesis[];
};

function renderAgendaMarkdown(agenda: ResearchAgenda): string {
  const lines: string[] = [];
  lines.push("# research agenda");
  lines.push("");
  lines.push(`Domains: ${agenda.domains.join(", ")}`);
  lines.push("");

  for (const hypothesis of agenda.hypotheses) {
    lines.push(
      `- [${hypothesis.domain}] ${hypothesis.title} | category=${hypothesis.category} | priority=${hypothesis.scores.priorityScore} | evidence=${hypothesis.scores.evidenceScore} | uncertainty=${hypothesis.scores.uncertaintyScore} | actionability=${hypothesis.scores.actionabilityScore}`
    );
    lines.push(`  claim=${hypothesis.claim}`);
    lines.push(
      `  evidence=papers:${hypothesis.evidence.totalPaperCount}, experimental:${hypothesis.evidence.experimentalPaperCount}, comparative:${hypothesis.evidence.comparativePaperCount}, species:${hypothesis.evidence.distinctSpeciesCount}, strong-outcomes:${hypothesis.evidence.strongOutcomePaperCount}, transplantation:${hypothesis.evidence.transplantationPaperCount}, contradictions:${hypothesis.evidence.contradictionCount}, sparse-protocols:${hypothesis.evidence.sparseProtocolPaperCount}`
    );
    if (hypothesis.blockers.length > 0) {
      lines.push(`  blockers=${hypothesis.blockers.join(" | ")}`);
    }
    lines.push(`  proposed-experiment=${hypothesis.proposedExperiment}`);
  }

  lines.push("");
  return lines.join("\n");
}

async function loadHypotheses(domain: DomainId): Promise<ResearchHypothesis[]> {
  const processedDir = join(process.cwd(), "data", "processed", domain);
  const curatedDir = join(process.cwd(), "data", "curated", domain);
  const extractionPath = join(processedDir, "extraction-snapshot.json");
  const extractionFile = await readFile(extractionPath, "utf8");
  const extractionSnapshot = ExtractionSnapshotSchema.parse(JSON.parse(extractionFile));

  let resolvedSnapshot = extractionSnapshot;
  try {
    const overrideFile = await readFile(join(curatedDir, "protocol-overrides.json"), "utf8");
    resolvedSnapshot = applyProtocolOverrides(extractionSnapshot, parseOverrideFile(JSON.parse(overrideFile)));
  } catch {
    resolvedSnapshot = extractionSnapshot;
  }

  const summary = buildAtlasSummary(resolvedSnapshot);
  return summary.researchHypotheses.map((entry) => ResearchHypothesisSchema.parse(entry));
}

async function main(): Promise<void> {
  const domains = DomainIdSchema.options;
  const hypotheses = (await Promise.all(domains.map((domain) => loadHypotheses(domain)))).flat();
  const agenda: ResearchAgenda = {
    generatedAt: new Date().toISOString(),
    domains,
    hypotheses: hypotheses.sort((left, right) => right.scores.priorityScore - left.scores.priorityScore)
  };

  const processedDir = join(process.cwd(), "data", "processed");
  await writeFile(join(processedDir, "research-agenda.json"), JSON.stringify(agenda, null, 2), "utf8");
  await writeFile(join(processedDir, "research-agenda.md"), renderAgendaMarkdown(agenda), "utf8");
  console.log(JSON.stringify(agenda, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
