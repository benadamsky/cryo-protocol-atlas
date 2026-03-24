import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  applyMutation,
  buildOptimizerBenchmark,
  evaluateOptimizerPolicy,
  listDeterministicMutations,
  optimizerPolicy,
  readOptimizerProgram,
  renderPolicyFile
} from "../packages/optimizer/src/index.js";
import { OptimizerLoopRunSchema, type OptimizerLoopAttempt } from "../packages/optimizer/src/schema.js";

function parseStrategyPath(argv: string[]): string {
  const strategyFlagIndex = argv.findIndex((value) => value === "--strategy");
  if (strategyFlagIndex >= 0 && argv[strategyFlagIndex + 1]) {
    return argv[strategyFlagIndex + 1];
  }
  const inlineFlag = argv.find((value) => value.startsWith("--strategy="));
  if (inlineFlag) {
    return inlineFlag.slice("--strategy=".length);
  }
  return join(process.cwd(), "packages", "optimizer", "program.md");
}

function renderLoopMarkdown(run: ReturnType<typeof OptimizerLoopRunSchema.parse>): string {
  const lines: string[] = [];
  lines.push("# Optimizer loop report");
  lines.push("");
  lines.push(`- generated at: ${run.generatedAt}`);
  lines.push(`- strategy path: ${run.strategyPath}`);
  lines.push(`- domains: ${run.strategySummary.domains.join(", ")}`);
  lines.push(`- baseline objective: ${run.baselineObjective}`);
  lines.push(`- final objective: ${run.finalObjective}`);
  lines.push(`- accepted mutations: ${run.acceptedMutationCount}`);
  lines.push("");
  lines.push("## Attempts");
  if (run.attempts.length === 0) {
    lines.push("- none");
  } else {
    for (const attempt of run.attempts) {
      lines.push(
        `- attempt ${attempt.attempt}: ${attempt.mutation.path} ${attempt.mutation.from} -> ${attempt.mutation.to} | accepted=${attempt.accepted ? "yes" : "no"} | objective=${attempt.objectiveBefore} -> ${attempt.objectiveAfter}`
      );
      lines.push(`  rationale=${attempt.rationale}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

async function main() {
  const strategyPath = parseStrategyPath(process.argv);
  const program = await readOptimizerProgram(strategyPath);
  const outputDir = join(process.cwd(), "data", "optimizer");
  const policyPath = join(process.cwd(), "packages", "optimizer", "src", "policy.ts");

  await mkdir(outputDir, { recursive: true });

  let currentPolicy = optimizerPolicy;
  let benchmark = await buildOptimizerBenchmark({
    rootDir: process.cwd(),
    domains: program.domains,
    policy: currentPolicy
  });
  let currentEvaluation = evaluateOptimizerPolicy({
    benchmark,
    policy: currentPolicy
  });
  const attempts: OptimizerLoopAttempt[] = [];
  let acceptedMutationCount = 0;
  const mutations = listDeterministicMutations(currentPolicy).slice(0, program.maxAttempts);

  for (const [index, mutation] of mutations.entries()) {
    const candidatePolicy = applyMutation(currentPolicy, mutation);
    const candidateBenchmark = await buildOptimizerBenchmark({
      rootDir: process.cwd(),
      domains: program.domains,
      policy: candidatePolicy
    });
    const candidateEvaluation = evaluateOptimizerPolicy({
      benchmark: candidateBenchmark,
      policy: candidatePolicy
    });
    const scoreDelta = Number(
      (candidateEvaluation.aggregate.objective - currentEvaluation.aggregate.objective).toFixed(4)
    );
    const satisfiesPromoteGuardrail =
      candidateEvaluation.aggregate.promoteCount === 0 ||
      candidateEvaluation.aggregate.promotePrecision >= program.minimumPromotePrecision;
    const accepted =
      scoreDelta >= program.minimumScoreDelta &&
      satisfiesPromoteGuardrail;
    const rationale = accepted
      ? "kept because objective improved without violating the promote-precision guardrail"
      : scoreDelta < program.minimumScoreDelta
        ? "reverted because the objective did not improve enough"
        : "reverted because promote precision fell below the guardrail";

    attempts.push({
      attempt: index + 1,
      mutation,
      objectiveBefore: currentEvaluation.aggregate.objective,
      objectiveAfter: candidateEvaluation.aggregate.objective,
      accepted,
      rationale,
      metricsAfter: candidateEvaluation.aggregate
    });

    if (!accepted) {
      continue;
    }

    currentPolicy = candidatePolicy;
    benchmark = candidateBenchmark;
    currentEvaluation = candidateEvaluation;
    acceptedMutationCount += 1;
    await writeFile(policyPath, renderPolicyFile(currentPolicy), "utf8");

    if (acceptedMutationCount >= program.maxAcceptedMutations) {
      break;
    }
  }

  const run = OptimizerLoopRunSchema.parse({
    generatedAt: new Date().toISOString(),
    strategyPath,
    strategySummary: {
      domains: program.domains,
      maxAttempts: program.maxAttempts,
      maxAcceptedMutations: program.maxAcceptedMutations,
      minimumScoreDelta: program.minimumScoreDelta,
      minimumPromotePrecision: program.minimumPromotePrecision
    },
    baselineObjective: attempts[0]?.objectiveBefore ?? currentEvaluation.aggregate.objective,
    finalObjective: currentEvaluation.aggregate.objective,
    acceptedMutationCount,
    attempts
  });

  await writeFile(join(outputDir, "benchmark.json"), JSON.stringify(benchmark, null, 2), "utf8");
  await writeFile(join(outputDir, "evaluation.json"), JSON.stringify(currentEvaluation, null, 2), "utf8");
  await writeFile(join(outputDir, "loop-results.json"), JSON.stringify(run, null, 2), "utf8");
  await writeFile(join(outputDir, "loop-report.md"), renderLoopMarkdown(run), "utf8");
  await appendFile(
    join(outputDir, "history.jsonl"),
    `${JSON.stringify({
      generatedAt: run.generatedAt,
      finalObjective: run.finalObjective,
      acceptedMutationCount: run.acceptedMutationCount,
      attempts: run.attempts.length
    })}\n`,
    "utf8"
  );

  console.log(
    JSON.stringify(
      {
        strategyPath: run.strategyPath,
        baselineObjective: run.baselineObjective,
        finalObjective: run.finalObjective,
        acceptedMutationCount: run.acceptedMutationCount,
        attempts: run.attempts.length
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
