import { getDomain, listDomains, type DiscoveryDomainInput, type KeywordConcept as RegistryConcept } from "../../shared/src/domains/index.js";
import { DomainIdSchema, type DomainId, type LiveDiscoveryProvider } from "../../shared/src/schema.js";

type KeywordConcept = {
  label: string;
  patterns: RegExp[];
};

type DiscoveryDomainConfig = {
  queryDescription: string;
  providerQueries: Record<LiveDiscoveryProvider, string>;
  anchorConcepts: KeywordConcept[];
  requiredSupportingConcepts: KeywordConcept[];
  contextualSupportingConcepts: KeywordConcept[];
  titleMethodConcepts?: KeywordConcept[];
  blockedTitleConcepts?: KeywordConcept[];
  minimumTitleRequiredSupportingMatches?: number;
  minimumTitleMethodMatches?: number;
};

const DISCOVERY_SCORING = {
  anchorCoverageWeight: 7,
  requiredSupportingCoverageWeight: 5,
  contextualSupportingCoverageWeight: 2,
  minimumAnchorMatches: 1,
  minimumRequiredSupportingMatches: 1,
  minimumTitleAnchorMatches: 1,
  defaultMinimumTitleRequiredSupportingMatches: 1
} as const;

function wordPattern(value: string): RegExp {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const normalized = escaped.replace(/\s+/g, "\\s+");
  return new RegExp(`\\b${normalized}\\b`, "i");
}

function concept(label: string, phrases: string[]): KeywordConcept {
  return {
    label,
    patterns: phrases.map(wordPattern)
  };
}

function compileConcepts(concepts: RegistryConcept[] | undefined): KeywordConcept[] | undefined {
  return concepts?.map((entry) => concept(entry.label, entry.phrases));
}

const COMMON_REQUIRED_SUPPORTING_CONCEPTS = [
  concept("cryopreservation", ["cryopreservation", "cryopreserved"]),
  concept("vitrification", ["vitrification", "vitrified"]),
  concept("freezing", ["freezing", "frozen", "slow freezing", "slow cooling"]),
  concept("thaw", ["thaw", "thawed", "post-thaw"]),
  concept("cryoprotectant", ["cryoprotectant", "cryoprotective", "dmsO", "dimethyl sulfoxide", "ethylene glycol"])
];

const COMMON_LIVE_PROVIDER_SIGNAL_TERMS = [
  "cryopreservation",
  "vitrification",
  "freezing",
  "thaw",
  "cryoprotectant"
];

function quoteQueryPhrase(value: string): string {
  return `"${value}"`;
}

function buildLiveProviderQuery(anchorPhrases: string[], signalTerms: string[]): string {
  return `(${anchorPhrases.map(quoteQueryPhrase).join(" OR ")}) AND (${signalTerms.join(" OR ")})`;
}

function buildProviderQueries(cryodbQuery: string, liveQueryAnchors: string[]): Record<LiveDiscoveryProvider, string> {
  const liveQuery = buildLiveProviderQuery(liveQueryAnchors, COMMON_LIVE_PROVIDER_SIGNAL_TERMS);
  return {
    cryodb: cryodbQuery,
    openalex: liveQuery,
    crossref: liveQuery,
    "europe-pmc": liveQuery
  };
}

function buildDiscoveryDomainConfig(input: DiscoveryDomainInput): DiscoveryDomainConfig {
  return {
    queryDescription: input.queryDescription,
    providerQueries: buildProviderQueries(input.cryodbQuery, input.liveQueryAnchors),
    anchorConcepts: compileConcepts(input.anchorConcepts) ?? [],
    requiredSupportingConcepts: [
      ...COMMON_REQUIRED_SUPPORTING_CONCEPTS,
      ...(compileConcepts(input.extraRequiredSupportingConcepts) ?? [])
    ],
    contextualSupportingConcepts: compileConcepts(input.contextualSupportingConcepts) ?? [],
    titleMethodConcepts: compileConcepts(input.titleMethodConcepts),
    blockedTitleConcepts: compileConcepts(input.blockedTitleConcepts),
    minimumTitleRequiredSupportingMatches: input.minimumTitleRequiredSupportingMatches,
    minimumTitleMethodMatches: input.minimumTitleMethodMatches
  };
}

const DISCOVERY_DOMAIN_CONFIGS = new Map<DomainId, DiscoveryDomainConfig>(
  listDomains().map((definition) => [definition.id as DomainId, buildDiscoveryDomainConfig(definition.discovery)])
);

export function getDiscoveryDomainConfig(domain: DomainId): DiscoveryDomainConfig {
  DomainIdSchema.parse(domain);
  return DISCOVERY_DOMAIN_CONFIGS.get(domain) ?? buildDiscoveryDomainConfig(getDomain(domain).discovery);
}

function matchedConceptLabels(concepts: KeywordConcept[], haystack: string): string[] {
  return concepts
    .filter((entry) => entry.patterns.some((pattern) => pattern.test(haystack)))
    .map((entry) => entry.label);
}

export function scoreDiscoveryText(
  title: string,
  abstract: string | null | undefined,
  domain: DomainId
): {
  matchedKeywords: string[];
  titleAnchorMatches: string[];
  titleRequiredSupportingMatches: string[];
  titleContextualSupportingMatches: string[];
  titleMethodMatches: string[];
  blockedTitleMatches: string[];
  anchorMatches: string[];
  requiredSupportingMatches: string[];
  contextualSupportingMatches: string[];
  supportingMatches: string[];
  relevanceScore: number;
} {
  const config = getDiscoveryDomainConfig(domain);
  const titleHaystack = title.toLowerCase();
  const haystack = `${title} ${abstract ?? ""}`.toLowerCase();
  const titleAnchorMatches = matchedConceptLabels(config.anchorConcepts, titleHaystack);
  const titleRequiredSupportingMatches = matchedConceptLabels(config.requiredSupportingConcepts, titleHaystack);
  const titleContextualSupportingMatches = matchedConceptLabels(config.contextualSupportingConcepts, titleHaystack);
  const titleMethodMatches = matchedConceptLabels(config.titleMethodConcepts ?? [], titleHaystack);
  const blockedTitleMatches = matchedConceptLabels(config.blockedTitleConcepts ?? [], titleHaystack);
  const anchorMatches = matchedConceptLabels(config.anchorConcepts, haystack);
  const requiredSupportingMatches = matchedConceptLabels(config.requiredSupportingConcepts, haystack);
  const contextualSupportingMatches = matchedConceptLabels(config.contextualSupportingConcepts, haystack);
  const supportingMatches = Array.from(new Set([...requiredSupportingMatches, ...contextualSupportingMatches]));
  const matchedKeywords = Array.from(new Set([...anchorMatches, ...supportingMatches]));

  const anchorCoverage =
    config.anchorConcepts.length === 0 ? 0 : anchorMatches.length / config.anchorConcepts.length;
  const requiredSupportingCoverage =
    config.requiredSupportingConcepts.length === 0
      ? 0
      : requiredSupportingMatches.length / config.requiredSupportingConcepts.length;
  const contextualSupportingCoverage =
    config.contextualSupportingConcepts.length === 0
      ? 0
      : contextualSupportingMatches.length / config.contextualSupportingConcepts.length;
  const relevanceScore = Number(
    (
      anchorCoverage * DISCOVERY_SCORING.anchorCoverageWeight +
      requiredSupportingCoverage * DISCOVERY_SCORING.requiredSupportingCoverageWeight +
      contextualSupportingCoverage * DISCOVERY_SCORING.contextualSupportingCoverageWeight
    ).toFixed(3)
  );

  return {
    matchedKeywords,
    titleAnchorMatches,
    titleRequiredSupportingMatches,
    titleContextualSupportingMatches,
    titleMethodMatches,
    blockedTitleMatches,
    anchorMatches,
    requiredSupportingMatches,
    contextualSupportingMatches,
    supportingMatches,
    relevanceScore
  };
}

export function shouldKeepDiscoveryCandidate(
  title: string,
  abstract: string | null | undefined,
  domain: DomainId
): boolean {
  const config = getDiscoveryDomainConfig(domain);
  const {
    titleAnchorMatches,
    titleRequiredSupportingMatches,
    titleMethodMatches,
    blockedTitleMatches,
    anchorMatches,
    requiredSupportingMatches
  } = scoreDiscoveryText(title, abstract, domain);
  return (
    blockedTitleMatches.length === 0 &&
    titleAnchorMatches.length >= DISCOVERY_SCORING.minimumTitleAnchorMatches &&
    titleRequiredSupportingMatches.length >=
      (config.minimumTitleRequiredSupportingMatches ?? DISCOVERY_SCORING.defaultMinimumTitleRequiredSupportingMatches) &&
    titleMethodMatches.length >= (config.minimumTitleMethodMatches ?? 0) &&
    anchorMatches.length >= DISCOVERY_SCORING.minimumAnchorMatches &&
    requiredSupportingMatches.length >= DISCOVERY_SCORING.minimumRequiredSupportingMatches
  );
}
