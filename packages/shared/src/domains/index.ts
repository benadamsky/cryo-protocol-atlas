import { islets } from "./islets.js";
import { ovarianTissue } from "./ovarian-tissue.js";
import type { DomainDefinition } from "./types.js";

export type * from "./types.js";

/**
 * The domain registry. Adding a domain is adding one file next to these and
 * listing it here; every id-keyed schema, script, workflow, and console tab
 * derives from this list.
 */
const DOMAIN_LIST = [ovarianTissue, islets] as const;

export type DomainId = (typeof DOMAIN_LIST)[number]["id"];

export const DOMAIN_IDS = DOMAIN_LIST.map((definition) => definition.id) as [DomainId, ...DomainId[]];

const DOMAIN_BY_ID = new Map<string, DomainDefinition>(
  DOMAIN_LIST.map((definition): [string, DomainDefinition] => [definition.id, definition])
);

export function isDomainId(value: string): value is DomainId {
  return DOMAIN_BY_ID.has(value);
}

export function getDomain(id: DomainId): DomainDefinition {
  const definition = DOMAIN_BY_ID.get(id);
  if (!definition) {
    throw new Error(`Unknown domain: ${id}`);
  }
  return definition;
}

export function listDomains(): DomainDefinition[] {
  return [...DOMAIN_LIST];
}

/** Parses a CLI domain argument, failing loudly instead of defaulting to a domain. */
export function parseDomainArg(value: string | undefined, usage = "<script> <domain>"): DomainId {
  if (value && isDomainId(value)) {
    return value;
  }
  throw new Error(`Usage: ${usage}. Known domains: ${DOMAIN_IDS.join(", ")}. Got: ${value ?? "nothing"}`);
}
