import type { DomainId, TranslationalSignal } from "../../../packages/shared/src/schema";
import type { ConfidenceBand, WedgeClass } from "./decision-data";
import { getDomainMeta } from "./domain";

export function shortDate(value: string | null) {
  if (!value) {
    return "n/a";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);
}

export function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function confidenceSummary(score: number, band: ConfidenceBand) {
  return `${Math.round(score * 100)}% · ${band}`;
}

export function shortConfidenceLabel(value: ConfidenceBand) {
  return `${value} conf.`;
}

export function translationalSignalLabel(value: TranslationalSignal) {
  switch (value) {
    case "clinically adjacent":
      return "Transplant-adjacent";
    case "transplant relevant":
      return "Transplant-relevant";
    case "preclinical":
      return "Preclinical";
    default:
      return "Research only";
  }
}

export function wedgeClassLabel(wedgeClass: WedgeClass) {
  if (wedgeClass === "proving ground") {
    return "Proving ground";
  }

  if (wedgeClass === "plausible first company wedge") {
    return "Company-wedge candidate";
  }

  if (wedgeClass === "long-term platform wedge") {
    return "Platform candidate";
  }

  return "Watchlist";
}

export function plainEnglishWedgeSummary(domain: DomainId, title: string, claim: string) {
  return getDomainMeta(domain).plainWedgeSummary ?? claim ?? title;
}

export function accessLabel(value: string) {
  switch (value) {
    case "open-access-full-text":
      return "open-access full text";
    case "full-text-link":
      return "full-text link";
    case "abstract-only":
      return "abstract only";
    default:
      return value.replace(/-/g, " ");
  }
}

export function humanizeSystemState(value: string) {
  const normalized = value.toLowerCase();

  if (normalized === "stalled-enrichment-gate") {
    return "waiting on source enrichment";
  }

  return value.replace(/[-_]/g, " ");
}
