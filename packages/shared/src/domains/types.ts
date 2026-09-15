import type {
  ExtractionSnapshot,
  OutcomeClass,
  OutcomeStrength,
  ProposalField,
  ProtocolExtraction,
  ProtocolFamily
} from "../schema.js";

/** A labelled concept matched by any of its phrases (word-bounded, case-insensitive). */
export type KeywordConcept = {
  label: string;
  phrases: string[];
};

/** Discovery lane configuration; the discovery package turns this into provider queries and scoring. */
export type DiscoveryDomainInput = {
  queryDescription: string;
  cryodbQuery: string;
  liveQueryAnchors: string[];
  anchorConcepts: KeywordConcept[];
  contextualSupportingConcepts: KeywordConcept[];
  extraRequiredSupportingConcepts?: KeywordConcept[];
  titleMethodConcepts?: KeywordConcept[];
  blockedTitleConcepts?: KeywordConcept[];
  minimumTitleRequiredSupportingMatches?: number;
  minimumTitleMethodMatches?: number;
};

/** CryoDB ingest: a paper matches the domain when at least one anchor keyword appears. */
export type IngestKeywords = {
  anchorKeywords: string[];
  supportingKeywords: string[];
};

export type ChemicalAlias = {
  canonicalName: string;
  aliases: string[];
};

export type SpecimenPattern = {
  label: string;
  pattern: RegExp;
  weight: number;
};

export type OutcomeRule = {
  outcomeClass: OutcomeClass;
  strength: OutcomeStrength;
  patterns: RegExp[];
};

/** Everything the shared extractor needs to know about a domain. */
export type ExtractionProfile = {
  /** Leads the augmented source text, e.g. "Islet source context". */
  sourceContextPrefix: string;
  /** Appended to the shared chemical alias list. */
  extraChemicalAliases?: ChemicalAlias[];
  specimenPatterns: SpecimenPattern[];
  outcomeRules: OutcomeRule[];
  /** Domain terms that mark a sentence as reporting a study outcome (joined with the shared list). */
  outcomeSentenceTerms?: RegExp;
  /** Extra assessment-phase cues (e.g. insulin secretion). */
  assessmentPatterns?: RegExp[];
  paperType?: {
    extraReviewPatterns?: RegExp[];
    extraMethodsPatterns?: RegExp[];
    extraExperimentalAbstractPatterns?: RegExp[];
    /** Fallback experimental classifiers over lower-cased title + abstract. */
    extraExperimentalRules?: Array<(text: string) => boolean>;
  };
};

export type SuggestionCategory = "benchmark" | "endpoint-upgrade" | "workflow-gap" | "scale-up";

export type SuggestionCandidate = {
  chemicals: string[];
  specimenTypes: string[];
  protocolFamilies: ProtocolFamily[];
  paperTitles: string[];
};

export type SuggestionContext = {
  snapshot: ExtractionSnapshot;
  extractions: ProtocolExtraction[];
  experimental: ProtocolExtraction[];
};

/** A hypothesis template: fixed copy plus a selector that says whether the corpus supports it and with what. */
export type SuggestionTemplate = {
  title: string;
  category: SuggestionCategory;
  hypothesis: string;
  rationale: string;
  confidence: number;
  select: (context: SuggestionContext) => SuggestionCandidate | null;
};

export type RegressionMutation =
  | { kind: "remove-override"; paperId: string }
  | { kind: "replace-override"; paperId: string; patch: Record<string, unknown> };

/** A benchmark-repair regression: corrupt a curated override and expect the loop to propose the fix. */
export type RegressionScenario = {
  id: string;
  description: string;
  mutation: RegressionMutation;
  expectedPaperId: string;
  expectedFields: ProposalField[];
  minReviewedInclusionF1Delta?: number;
  minReviewedProtocolFamilyAccuracyDelta?: number;
  minReviewedPaperTypeAccuracyDelta?: number;
  minReviewedOutcomeMacroF1Delta?: number;
  minReviewedStepPhaseMacroF1Delta?: number;
};

export type ResearchProfile = {
  /** When set, the active wedge prefers the hypothesis whose title matches. */
  preferredWedgeTitle?: RegExp;
  /** Domain-specific focus question for the active wedge; falls back to category copy. */
  focusQuestion?: string;
  /** Benchmark hypotheses are blocked until both vitrification and slow-freezing evidence exist. */
  benchmarkNeedsBothFamilies: boolean;
  /** Specimen labels too generic to count as shared context in contradiction detection. */
  genericSpecimenTypes: string[];
  likelyBuyers: string;
  packetTranslationalRationale: { benchmark: string; default: string };
  commercialWhyNow: { benchmark?: string; endpoint?: string; scale?: string; default: string };
  /** Resolution-queue priority bumps for domain-defining specimen labels. */
  resolutionPriorityBonus: Array<{ specimenType: string; bonus: number }>;
  /** Hand-set prior added to the console's commercial score. */
  commercialSignalBonus: number;
};

export type ConsoleProfile = {
  shortLabel: string;
  strapline: string;
  accent: string;
  accentSoft: string;
  /** One-sentence plain-English read of the current wedge; falls back to the wedge claim. */
  plainWedgeSummary?: string;
};

export type DomainDefinition<Id extends string = string> = {
  id: Id;
  label: string;
  ingest: IngestKeywords;
  discovery: DiscoveryDomainInput;
  extraction: ExtractionProfile;
  suggestionTemplates: SuggestionTemplate[];
  research: ResearchProfile;
  console: ConsoleProfile;
  regressionScenarios: RegressionScenario[];
};
