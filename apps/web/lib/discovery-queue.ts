import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { DomainId } from "../../../packages/shared/src/schema";

const QueueSchema = z.object({
  decisions: z.array(
    z.object({
      dedupeKey: z.string(),
      title: z.string(),
      doi: z.string().nullable().optional(),
      pmid: z.string().nullable().optional(),
      pmcid: z.string().nullable().optional(),
      recommendation: z.string(),
      rankingScore: z.number().optional().default(0),
      fullTextAvailability: z.string().optional().default("unknown"),
      matchedKeywords: z.array(z.string()).optional().default([])
    })
  )
});

export type DiscoveryQueueRow = z.output<typeof QueueSchema>["decisions"][number];

function repoRoots() {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const worktreeRoot = path.resolve(moduleDir, "../../..");
  const parent = path.dirname(worktreeRoot);
  return path.basename(parent) === ".worktrees" ? [worktreeRoot, path.dirname(parent)] : [worktreeRoot];
}

/** Full ranked promotion queue for one domain, highest ranking score first. */
export async function getDiscoveryQueueRows(domain: DomainId): Promise<DiscoveryQueueRow[]> {
  const relativePath = `data/discovery/${domain}/promotion-queue.json`;

  for (const root of repoRoots()) {
    try {
      const raw = await readFile(path.join(root, relativePath), "utf8");
      const parsed = QueueSchema.parse(JSON.parse(raw));
      return [...parsed.decisions].sort(
        (left, right) => right.rankingScore - left.rankingScore || right.title.localeCompare(left.title)
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        continue;
      }

      throw error;
    }
  }

  throw new Error(`Missing artifact ${relativePath}`);
}
