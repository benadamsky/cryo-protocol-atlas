import { OptimizerPolicySchema, type OptimizerPolicy } from "./schema.js";

export function renderPolicyFile(policy: OptimizerPolicy): string {
  const stablePolicy = OptimizerPolicySchema.parse(policy);
  return [
    'import { OptimizerPolicySchema, type OptimizerPolicy } from "./schema.js";',
    "",
    "export const optimizerPolicy: OptimizerPolicy = OptimizerPolicySchema.parse(",
    `${JSON.stringify(stablePolicy, null, 2)}`,
    ");",
    "",
    "export default optimizerPolicy;",
    ""
  ].join("\n");
}
