import { type FullTextAvailability } from "../../shared/src/schema.js";
import {
  OptimizerFeatureVectorSchema,
  type OptimizerFeatureVector,
  type OptimizerPolicy
} from "./schema.js";

const DISCOVERY_REASON_THRESHOLDS = {
  strongAuthority: 0.5,
  moderateAuthority: 0.2,
  highRelevance: 8 / 15,
  mediumRelevance: 5 / 15,
  strongSourceDiversity: 0.5
} as const;

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").toLowerCase();
}

function countSignalHits(text: string, signals: string[]): number {
  let hitCount = 0;
  for (const signal of signals) {
    if (text.includes(signal.toLowerCase())) {
      hitCount += 1;
    }
  }
  return hitCount;
}

function clampUnit(value: number, max: number): number {
  if (max <= 0) {
    return 0;
  }
  return Number(Math.max(0, Math.min(1, value / max)).toFixed(4));
}

function normalizeYear(year: number | null | undefined): number {
  if (!year) {
    return 0;
  }
  return Number(Math.max(0, Math.min(1, (year - 1990) / 40)).toFixed(4));
}

export function buildOptimizerFeatureVector(
  input: {
    title: string;
    abstract?: string | null;
    doi?: string | null;
    journal?: string | null;
    publishedYear?: number | null;
    matchedKeywords: string[];
    retrievalScore?: number;
    discoveryRankingScore?: number;
    discoveryRelevanceScore?: number;
    authorityScore?: number;
    sourceDiversityScore?: number;
    sourceCount?: number;
    fullTextAvailability?: FullTextAvailability;
  },
  policy: OptimizerPolicy
): OptimizerFeatureVector {
  const title = normalizeText(input.title);
  const abstract = normalizeText(input.abstract);
  const fullTextAvailability = input.fullTextAvailability ?? "unknown";

  return OptimizerFeatureVectorSchema.parse({
    retrievalScore: Number((input.retrievalScore ?? 0).toFixed(4)),
    matchedKeywordCount: clampUnit(input.matchedKeywords.length, 10),
    titleProtocolHits: clampUnit(countSignalHits(title, policy.heuristics.protocolSignals), 5),
    titleExperimentalHits: clampUnit(countSignalHits(title, policy.heuristics.experimentalSignals), 5),
    abstractProtocolHits: clampUnit(countSignalHits(abstract, policy.heuristics.protocolSignals), 6),
    abstractOutcomeHits: clampUnit(countSignalHits(abstract, policy.heuristics.outcomeSignals), 6),
    negativeSignalHits: clampUnit(
      countSignalHits(`${title} ${abstract}`, policy.heuristics.negativeSignals),
      4
    ),
    doiPresent: input.doi ? 1 : 0,
    journalPresent: input.journal ? 1 : 0,
    recentYear: normalizeYear(input.publishedYear),
    discoveryRankingScore: clampUnit(input.discoveryRankingScore ?? 0, 15),
    discoveryRelevanceScore: clampUnit(input.discoveryRelevanceScore ?? 0, 15),
    authorityScore: clampUnit(input.authorityScore ?? 0, 1),
    sourceDiversityScore: clampUnit(input.sourceDiversityScore ?? 0, 1),
    multiSourceEvidence: (input.sourceCount ?? 0) >= 2 ? 1 : 0,
    fullTextLink:
      fullTextAvailability === "open-access-full-text" || fullTextAvailability === "full-text-link" ? 1 : 0,
    openAccessFullText: fullTextAvailability === "open-access-full-text" ? 1 : 0
  });
}

export function explainDiscoveryFeatureVector(featuresInput: OptimizerFeatureVector): string[] {
  const features = OptimizerFeatureVectorSchema.parse(featuresInput);
  const reasons: string[] = [];

  if (features.multiSourceEvidence >= 1) {
    reasons.push("candidate appears in multiple discovery sources");
  }
  if (features.openAccessFullText >= 1) {
    reasons.push("open-access full text is available");
  } else if (features.fullTextLink >= 1) {
    reasons.push("full-text landing page is available");
  }
  if (features.authorityScore >= DISCOVERY_REASON_THRESHOLDS.strongAuthority) {
    reasons.push("authority score is high enough to justify direct promotion review");
  } else if (features.authorityScore >= DISCOVERY_REASON_THRESHOLDS.moderateAuthority) {
    reasons.push("authority score is directionally promising");
  }
  if (features.discoveryRelevanceScore >= DISCOVERY_REASON_THRESHOLDS.highRelevance) {
    reasons.push("domain relevance score is high");
  } else if (features.discoveryRelevanceScore >= DISCOVERY_REASON_THRESHOLDS.mediumRelevance) {
    reasons.push("domain relevance score is non-trivial");
  }
  if (features.sourceDiversityScore >= DISCOVERY_REASON_THRESHOLDS.strongSourceDiversity) {
    reasons.push("source diversity is strong enough to reduce single-provider bias");
  }

  return reasons;
}
