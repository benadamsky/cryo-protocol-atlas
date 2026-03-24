import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DomainIdSchema, type DomainId } from "../packages/shared/src/schema.js";
import {
  buildOptimizerBenchmark,
  evaluateOptimizerPolicy,
  optimizerPolicy,
  renderEvaluationMarkdown
} from "../packages/optimizer/src/index.js";

function parseDomains(argv: string[]): DomainId[] {
  const rawDomains = argv
    .slice(2)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
  return rawDomains.length > 0
    ? rawDomains.map((domain) => DomainIdSchema.parse(domain))
    : [DomainIdSchema.enum.islets, DomainIdSchema.enum["ovarian-tissue"]];
}

async function main() {
  const domains = parseDomains(process.argv);
  const outputDir = join(process.cwd(), "data", "optimizer");
  const benchmark = await buildOptimizerBenchmark({
    rootDir: process.cwd(),
    domains,
    policy: optimizerPolicy
  });
  const evaluation = evaluateOptimizerPolicy({
    benchmark,
    policy: optimizerPolicy
  });

  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, "benchmark.json"), JSON.stringify(benchmark, null, 2), "utf8");
  await writeFile(join(outputDir, "evaluation.json"), JSON.stringify(evaluation, null, 2), "utf8");
  await writeFile(join(outputDir, "evaluation.md"), renderEvaluationMarkdown({ benchmark, evaluation }), "utf8");

  console.log(
    JSON.stringify(
      {
        domains,
        candidateCount: evaluation.aggregate.candidateCount,
        promoteCount: evaluation.aggregate.promoteCount,
        reviewCount: evaluation.aggregate.reviewCount,
        deferCount: evaluation.aggregate.deferCount,
        rankingAccuracy: evaluation.aggregate.rankingAccuracy,
        promotePrecision: evaluation.aggregate.promotePrecision,
        reviewOrPromoteRecall: evaluation.aggregate.reviewOrPromoteRecall,
        objective: evaluation.aggregate.objective
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
