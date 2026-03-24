import { mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import {
  applyMutation,
  buildOptimizerBenchmark,
  evaluateOptimizerPolicy,
  listDeterministicMutations,
  mutationSignature,
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

async function readOptionalFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

async function atomicWriteFile(path: string, content: string): Promise<void> {
  const tempPath = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempPath, content, "utf8");
  await rename(tempPath, path);
}

async function acquireLoopLock(lockPath: string) {
  const handle = await open(lockPath, "wx");
  await handle.writeFile(JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }), "utf8");
  return handle;
}

async function main() {
  const strategyPath = parseStrategyPath(process.argv);
  const relativeStrategyPath = relative(process.cwd(), strategyPath);
  const program = await readOptimizerProgram(strategyPath);
  const outputDir = join(process.cwd(), "data", "optimizer");
  const policyPath = join(process.cwd(), "packages", "optimizer", "src", "policy.ts");
  const lockPath = join(outputDir, ".loop.lock");

  await mkdir(outputDir, { recursive: true });
  const lockHandle = await acquireLoopLock(lockPath);

  try {
    let currentPolicy = optimizerPolicy;
    const benchmark = await buildOptimizerBenchmark({
      rootDir: process.cwd(),
      domains: program.domains,
      policy: currentPolicy
    });
    let currentEvaluation = evaluateOptimizerPolicy({
      benchmark,
      policy: currentPolicy
    });
    const baselineObjective = currentEvaluation.aggregate.objective;
    const attempts: OptimizerLoopAttempt[] = [];
    let acceptedMutationCount = 0;
    const triedMutations = new Set<string>();

    while (
      attempts.length < program.maxAttempts &&
      acceptedMutationCount < program.maxAcceptedMutations
    ) {
      const nextMutation = listDeterministicMutations(currentPolicy).find(
        (mutation) => !triedMutations.has(mutationSignature(mutation))
      );
      if (!nextMutation) {
        break;
      }

      triedMutations.add(mutationSignature(nextMutation));
      const candidatePolicy = applyMutation(currentPolicy, nextMutation);
      const candidateEvaluation = evaluateOptimizerPolicy({
        benchmark,
        policy: candidatePolicy
      });
      const scoreDelta = Number(
        (candidateEvaluation.aggregate.objective - currentEvaluation.aggregate.objective).toFixed(4)
      );
      const benchmarkHasPositives = candidateEvaluation.aggregate.positiveCount > 0;
      const satisfiesPromotePrecision =
        !benchmarkHasPositives ||
        (candidateEvaluation.aggregate.promoteCount > 0 &&
          candidateEvaluation.aggregate.promotePrecision >= program.minimumPromotePrecision);
      const satisfiesPromoteRecall =
        !benchmarkHasPositives ||
        candidateEvaluation.aggregate.promoteRecall >= program.minimumPromoteRecall;
      const accepted =
        scoreDelta >= program.minimumScoreDelta &&
        satisfiesPromotePrecision &&
        satisfiesPromoteRecall;
      const rationale = accepted
        ? "kept because objective improved while preserving promotion precision and recall guardrails"
        : scoreDelta < program.minimumScoreDelta
          ? "reverted because the objective did not improve enough"
          : !satisfiesPromotePrecision
            ? "reverted because promote precision fell below the guardrail"
            : "reverted because promote recall fell below the guardrail";

      attempts.push({
        attempt: attempts.length + 1,
        mutation: nextMutation,
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
      currentEvaluation = candidateEvaluation;
      acceptedMutationCount += 1;
    }

    const run = OptimizerLoopRunSchema.parse({
      generatedAt: new Date().toISOString(),
      strategyPath: relativeStrategyPath,
      strategySummary: {
        domains: program.domains,
        maxAttempts: program.maxAttempts,
        maxAcceptedMutations: program.maxAcceptedMutations,
        minimumScoreDelta: program.minimumScoreDelta,
        minimumPromotePrecision: program.minimumPromotePrecision,
        minimumPromoteRecall: program.minimumPromoteRecall
      },
      baselineObjective,
      finalObjective: currentEvaluation.aggregate.objective,
      acceptedMutationCount,
      attempts
    });

    const historyPath = join(outputDir, "history.jsonl");
    const previousHistory = await readOptionalFile(historyPath);
    const nextHistory = `${previousHistory ?? ""}${JSON.stringify({
      generatedAt: run.generatedAt,
      finalObjective: run.finalObjective,
      acceptedMutationCount: run.acceptedMutationCount,
      attempts: run.attempts.length
    })}\n`;

    await atomicWriteFile(join(outputDir, "benchmark.json"), JSON.stringify(benchmark, null, 2));
    await atomicWriteFile(join(outputDir, "evaluation.json"), JSON.stringify(currentEvaluation, null, 2));
    await atomicWriteFile(join(outputDir, "loop-results.json"), JSON.stringify(run, null, 2));
    await atomicWriteFile(join(outputDir, "loop-report.md"), renderLoopMarkdown(run));
    await atomicWriteFile(historyPath, nextHistory);
    if (acceptedMutationCount > 0) {
      await atomicWriteFile(policyPath, renderPolicyFile(currentPolicy));
    }

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
  } finally {
    await lockHandle.close();
    await unlink(lockPath).catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
