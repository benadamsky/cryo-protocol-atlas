import { readFile } from "node:fs/promises";
import { ALL_DOMAINS, DomainIdSchema } from "../../shared/src/schema.js";
import { OptimizerProgramSchema, type OptimizerProgram } from "./schema.js";

const DEFAULT_PROGRAM: OptimizerProgram = {
  domains: [...ALL_DOMAINS],
  maxAttempts: 40,
  maxAcceptedMutations: 4,
  minimumScoreDelta: 0.001,
  minimumPromotePrecision: 0.75,
  minimumPromoteRecall: 0.02
};

function parseLineValue(content: string, label: string): string | null {
  const match = content.match(new RegExp(`^- ${label}:\\s+(.+)$`, "im"));
  return match?.[1]?.trim() ?? null;
}

export async function readOptimizerProgram(path: string): Promise<OptimizerProgram> {
  const content = await readFile(path, "utf8");
  const domainsValue = parseLineValue(content, "domains");
  const domains = domainsValue
    ? domainsValue.split(",").map((domain) => DomainIdSchema.parse(domain.trim()))
    : DEFAULT_PROGRAM.domains;

  return OptimizerProgramSchema.parse({
    domains,
    maxAttempts: Number.parseInt(parseLineValue(content, "max attempts") ?? `${DEFAULT_PROGRAM.maxAttempts}`, 10),
    maxAcceptedMutations: Number.parseInt(
      parseLineValue(content, "max accepted mutations") ?? `${DEFAULT_PROGRAM.maxAcceptedMutations}`,
      10
    ),
    minimumScoreDelta: Number.parseFloat(
      parseLineValue(content, "minimum score delta") ?? `${DEFAULT_PROGRAM.minimumScoreDelta}`
    ),
    minimumPromotePrecision: Number.parseFloat(
      parseLineValue(content, "minimum promote precision") ?? `${DEFAULT_PROGRAM.minimumPromotePrecision}`
    ),
    minimumPromoteRecall: Number.parseFloat(
      parseLineValue(content, "minimum promote recall") ?? `${DEFAULT_PROGRAM.minimumPromoteRecall}`
    )
  });
}
