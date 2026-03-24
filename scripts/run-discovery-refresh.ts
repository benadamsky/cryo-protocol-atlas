import { execFileSync } from "node:child_process";
import { DomainIdSchema, type DomainId } from "../packages/shared/src/schema.js";

function runStep(script: string, args: string[] = []) {
  execFileSync(process.execPath, ["--import", "tsx", script, ...args], {
    cwd: process.cwd(),
    stdio: "inherit"
  });
}

function parseArgs(argv: string[]) {
  const domainArg = argv[2] ?? "all";
  const includeImports = !argv.includes("--skip-imports");
  const domains: DomainId[] =
    domainArg === "all"
      ? ["ovarian-tissue", "islets"]
      : [DomainIdSchema.parse(domainArg)];

  return {
    domains,
    includeImports
  };
}

async function main(): Promise<void> {
  const { domains, includeImports } = parseArgs(process.argv);
  for (const domain of domains) {
    if (includeImports) {
      runStep("scripts/import-discovery-exports.ts", [domain]);
    }
    runStep("scripts/discover-domain-corpus.ts", [domain]);
    runStep("scripts/build-discovery-review-queue.ts", [domain]);
    runStep("scripts/build-discovery-promotion-packet.ts", [domain]);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
});
