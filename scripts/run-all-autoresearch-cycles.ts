import { execFileSync } from "node:child_process";

const forwardedArgs = process.argv.slice(2);
const domains = ["ovarian-tissue", "islets"];

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
