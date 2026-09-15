import {
  DomainIdSchema,
  type DomainId
} from "../../../packages/shared/src/schema";

export const DOMAIN_ORDER: DomainId[] = ["ovarian-tissue", "islets"];

export const DOMAIN_META: Record<
  DomainId,
  {
    label: string;
    shortLabel: string;
    strapline: string;
    accent: string;
    accentSoft: string;
  }
> = {
  "ovarian-tissue": {
    label: "Ovarian tissue",
    shortLabel: "Ovarian",
    strapline: "Fertility-preservation tissue workflows with unresolved depth gaps.",
    accent: "#e36b4a",
    accentSoft: "rgba(227, 107, 74, 0.18)"
  },
  islets: {
    label: "Islets",
    shortLabel: "Islets",
    strapline: "Transplant-adjacent cryomix benchmarking with stronger benchmark depth.",
    accent: "#0ea5a4",
    accentSoft: "rgba(14, 165, 164, 0.18)"
  }
};

export function parseDomainId(value: string): DomainId {
  return DomainIdSchema.parse(value);
}

export function getDomainMeta(domain: DomainId) {
  return DOMAIN_META[domain];
}

export function staticDomainParams() {
  return DOMAIN_ORDER.map((domain) => ({ domain }));
}
