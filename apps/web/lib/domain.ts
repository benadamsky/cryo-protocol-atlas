import { getDomain, listDomains } from "../../../packages/shared/src/domains";
import { ALL_DOMAINS, DomainIdSchema, type DomainId } from "../../../packages/shared/src/schema";

export const DOMAIN_ORDER: DomainId[] = [...ALL_DOMAINS];

export type DomainMeta = {
  label: string;
  shortLabel: string;
  strapline: string;
  accent: string;
  accentSoft: string;
  plainWedgeSummary?: string;
  commercialSignalBonus: number;
};

function metaFor(domain: DomainId): DomainMeta {
  const definition = getDomain(domain);
  return {
    label: definition.label,
    shortLabel: definition.console.shortLabel,
    strapline: definition.console.strapline,
    accent: definition.console.accent,
    accentSoft: definition.console.accentSoft,
    plainWedgeSummary: definition.console.plainWedgeSummary,
    commercialSignalBonus: definition.research.commercialSignalBonus
  };
}

export const DOMAIN_META: Record<DomainId, DomainMeta> = Object.fromEntries(
  listDomains().map((definition) => [definition.id, metaFor(definition.id as DomainId)])
) as Record<DomainId, DomainMeta>;

export function parseDomainId(value: string): DomainId {
  return DomainIdSchema.parse(value);
}

export function getDomainMeta(domain: DomainId) {
  return DOMAIN_META[domain];
}

export function staticDomainParams() {
  return DOMAIN_ORDER.map((domain) => ({ domain }));
}
