import { OptimizerPolicySchema, type OptimizerMutation, type OptimizerPolicy } from "./schema.js";

const MUTATION_SPECS = [
  { path: "weights.bias", step: 0.2, min: -3, max: 3 },
  { path: "weights.retrievalScore", step: 0.2, min: -1, max: 5 },
  { path: "weights.matchedKeywordCount", step: 0.15, min: -1, max: 4 },
  { path: "weights.titleProtocolHits", step: 0.15, min: -2, max: 4 },
  { path: "weights.titleExperimentalHits", step: 0.15, min: -2, max: 4 },
  { path: "weights.abstractProtocolHits", step: 0.15, min: -2, max: 4 },
  { path: "weights.abstractOutcomeHits", step: 0.15, min: -2, max: 4 },
  { path: "weights.negativeSignalHits", step: 0.2, min: -5, max: 1 },
  { path: "weights.doiPresent", step: 0.1, min: -1, max: 2 },
  { path: "weights.journalPresent", step: 0.1, min: -1, max: 2 },
  { path: "weights.recentYear", step: 0.1, min: -2, max: 2 },
  { path: "thresholds.promote", step: 0.15, min: 0, max: 8 },
  { path: "thresholds.review", step: 0.15, min: 0, max: 8 }
] as const;

function getNumericValue(policy: OptimizerPolicy, path: string): number {
  const [section, key] = path.split(".") as [keyof OptimizerPolicy, string];
  const container = policy[section] as Record<string, number>;
  return container[key];
}

function setNumericValue(policy: OptimizerPolicy, path: string, value: number): OptimizerPolicy {
  const [section, key] = path.split(".") as [keyof OptimizerPolicy, string];
  const nextPolicy = structuredClone(policy);
  (nextPolicy[section] as Record<string, number>)[key] = Number(value.toFixed(4));
  return OptimizerPolicySchema.parse(nextPolicy);
}

export function listDeterministicMutations(policyInput: OptimizerPolicy): OptimizerMutation[] {
  const policy = OptimizerPolicySchema.parse(policyInput);
  const mutations: OptimizerMutation[] = [];

  for (const spec of MUTATION_SPECS) {
    const currentValue = getNumericValue(policy, spec.path);
    for (const direction of [1, -1] as const) {
      const nextValue = Number((currentValue + spec.step * direction).toFixed(4));
      if (nextValue < spec.min || nextValue > spec.max) {
        continue;
      }
      mutations.push({
        path: spec.path,
        from: currentValue,
        to: nextValue,
        delta: Number((nextValue - currentValue).toFixed(4))
      });
    }
  }

  return mutations;
}

export function mutationSignature(mutation: OptimizerMutation): string {
  return `${mutation.path}:${mutation.from}:${mutation.to}`;
}

export function applyMutation(policyInput: OptimizerPolicy, mutation: OptimizerMutation): OptimizerPolicy {
  const currentValue = getNumericValue(policyInput, mutation.path);
  if (currentValue !== mutation.from) {
    throw new Error(
      `Mutation baseline mismatch for ${mutation.path}: expected ${mutation.from}, received ${currentValue}`
    );
  }
  return setNumericValue(policyInput, mutation.path, mutation.to);
}
