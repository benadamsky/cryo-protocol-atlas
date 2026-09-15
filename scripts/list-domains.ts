import { ALL_DOMAINS } from "../packages/shared/src/schema.js";

// One registered domain id per line, for shell loops in workflows.
for (const domain of ALL_DOMAINS) {
  console.log(domain);
}
