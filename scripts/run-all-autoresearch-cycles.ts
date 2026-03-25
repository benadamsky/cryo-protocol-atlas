import { execFileSync } from "node:child_process";
import { ALL_DOMAINS } from "../packages/shared/src/schema.js";

const forwardedArgs = process.argv.slice(2);
const domains = [...ALL_DOMAINS];

for (const domain of domains) {
  execFileSync(
    process.execPath,
    ["--import", "tsx", "scripts/run-autoresearch-cycles.ts", domain, ...forwardedArgs],
    {
      cwd: process.cwd(),
      stdio: "inherit"
    }
  );
}

execFileSync(
  process.execPath,
  ["--import", "tsx", "scripts/build-run-health-report.ts"],
  {
    cwd: process.cwd(),
    stdio: "inherit"
  }
);
