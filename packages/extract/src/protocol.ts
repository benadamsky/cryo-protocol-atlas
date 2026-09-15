import { getDomain, type ChemicalAlias, type ExtractionProfile } from "../../shared/src/domains/index.js";
import {
  EvidenceSnippetSchema,
  OutcomeMentionSchema,
  ProtocolExtractionSchema,
  PaperTypeSchema,
  ProtocolStepSchema,
  type CryoPaper,
  type DomainId,
  type DomainPaper,
  type EvidenceSnippet,
  type PaperType,
  type ProtocolExtraction,
  type ProtocolFamily,
  type SourceEnrichmentRecord
} from "../../shared/src/schema.js";
import {
  buildAugmentedSourceText,
  enrichmentEvidenceSnippets,
  summarizeEvidenceAuthority
} from "./enrichment.js";

/**
 * Heuristic title/abstract extraction shared by every domain. The domain
 * registry supplies specimen patterns, outcome rules, and classifier hints;
 * everything else (chemistry, species, phases, measurements) is common.
 */

const SHARED_CHEMICAL_ALIASES: ChemicalAlias[] = [
  { canonicalName: "Dimethyl Sulfoxide", aliases: ["dmso", "me2so", "dimethyl sulfoxide", "dimethyl sulphoxide"] },
  { canonicalName: "Ethylene Glycol", aliases: ["eg", "ethylene glycol"] },
  { canonicalName: "Propylene Glycol", aliases: ["proh", "propylene glycol", "1,2-propanediol", "1,2 propanediol"] },
  { canonicalName: "Glycerol", aliases: ["glycerol"] },
  { canonicalName: "Sucrose", aliases: ["sucrose"] },
  { canonicalName: "Trehalose", aliases: ["trehalose"] },
  { canonicalName: "Curcumin", aliases: ["curcumin"] },
  { canonicalName: "Beraprost Sodium", aliases: ["beraprost sodium", "beraprost"] },
  { canonicalName: "Hydroxyethyl Starch", aliases: ["hydroxyethyl starch", "hes"] },
  { canonicalName: "Polyvinyl Pyrrolidone", aliases: ["polyvinyl pyrrolidone", "polyvinylpyrrolidone", "pvp"] },
  { canonicalName: "Polyethylene Glycol", aliases: ["polyethylene glycol", "peg"] },
  {
    canonicalName: "Carboxylated epsilon-poly-L-lysine",
    aliases: ["carboxylated ε-poly-l-lysine", "carboxylated e-poly-l-lysine", "epsilon-poly-l-lysine"]
  },
  { canonicalName: "Alginate", aliases: ["alginate"] },
  { canonicalName: "Ficoll", aliases: ["ficoll"] },
  { canonicalName: "Raffinose", aliases: ["raffinose"] }
];

const SPECIES_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "human", pattern: /\bhuman\b/i },
  { label: "mouse", pattern: /\bmouse\b|\bmurine\b/i },
  { label: "rat", pattern: /\brat\b/i },
  { label: "sheep", pattern: /\bsheep\b|\bovine\b/i },
  { label: "pig", pattern: /\bpig\b|\bporcine\b/i },
  { label: "dog", pattern: /\bdog\b|\bcanine\b/i },
  { label: "cat", pattern: /\bcat\b|\bfeline\b/i },
  { label: "goat", pattern: /\bgoat\b|\bcaprine\b/i },
  { label: "turkey", pattern: /\bturkey\b/i },
  { label: "peccary", pattern: /\bpeccary\b/i },
  { label: "primate", pattern: /\bprimate\b|\bmonkey\b/i }
];

const TEMPERATURE_REGEX = /-?\d+(?:\.\d+)?\s?(?:°\s?)?C\b/gi;
const DURATION_REGEX = /\b\d+(?:\.\d+)?\s?(?:min|mins|minutes|h|hr|hrs|hours|day|days|week|weeks|month|months)\b/gi;
const CONCENTRATION_REGEX = /\b\d+(?:\.\d+)?\s?(?:M|mM|%|mol\/L)\b/g;
const COOLING_RATE_REGEX = /\b\d+(?:\.\d+)?\s?°?\s?C\s*\/\s*(?:min|hour|hr|h)\b/gi;

const REVIEW_PATTERNS = [/\breview\b|\bmini-review\b|\bperspective\b|\bprospects?\b|\bthis review\b|\brecent advances\b/];
const METHODS_PATTERNS = [/\bprotocol\b|\boptimization\b|\bthermophysical\b|\bcharacterization\b|\bcharacterisation\b/];
const COMMENTARY_PATTERNS = [/\bcommentary\b|\beditorial\b/];
const EXPERIMENTAL_ABSTRACT_PATTERNS = [
  /\bthis study\b|\bwe evaluated\b|\bwe used\b|\bwere compared\b|\bafter thaw\b|\bafter warming\b|\bafter transplantation\b/i
];

const STUDY_OUTCOME_TERMS =
  /(result|found|observed|showed|demonstrated|improved|restored|viability|survival|recovery|yield|toxicit|function|functional|functionality|morpholog|histolog|ultrastruct)/i;

type PhaseRule = { phase: ProtocolExtraction["protocolSteps"][number]["phase"]; patterns: RegExp[] };

function phaseRulesFor(profile: ExtractionProfile): PhaseRule[] {
  return [
    { phase: "perfusion", patterns: [/\bperfus/i] },
    { phase: "equilibration", patterns: [/\bequilibr/i, /\bstepwise equilibration\b/i] },
    {
      phase: "loading",
      patterns: [/\bloading\b/i, /\bcryoprotectant(?:s)? added\b/i, /\badded at \d+(?:\.\d+)?%/i, /\bpreincubat/i]
    },
    {
      phase: "cooling",
      patterns: [/\bcool/i, /\bfreez/i, /\bcooling rate\b/i, /\b0\.\d+\s?°?\s?c\/min\b/i]
    },
    { phase: "storage", patterns: [/\bstor/i, /\bliquid nitrogen/i, /\b-196\s?°?\s?c\b/i] },
    { phase: "warming", patterns: [/\bwarm/i, /\bthaw/i, /\brewarm/i] },
    { phase: "culture", patterns: [/\bculture/i, /\bincubat/i] },
    {
      phase: "assessment",
      patterns: [/\bassess/i, /\bmorpholog/i, /\bviability/i, /\bfunction/i, ...(profile.assessmentPatterns ?? [])]
    }
  ];
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function dedupeStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function makeSnippet(kind: EvidenceSnippet["kind"], text: string, confidence: number): EvidenceSnippet {
  return EvidenceSnippetSchema.parse({
    kind,
    text: text.trim(),
    confidence,
    sourceType: "title-or-abstract",
    authorityTier: "primary-indirect",
    explicitness: "direct",
    reviewed: false
  });
}

function containsRegex(sentence: string, pattern: RegExp): boolean {
  const clone = new RegExp(pattern.source, pattern.flags);
  return clone.test(sentence);
}

function collectMatches(sentence: string, pattern: RegExp): string[] {
  const clone = new RegExp(pattern.source, pattern.flags);
  return sentence.match(clone) ?? [];
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function inferProtocolFamily(text: string, title: string): {
  protocolFamily: ProtocolFamily;
  evidence: EvidenceSnippet[];
} {
  const haystack = `${title}. ${text}`;
  const evidence: EvidenceSnippet[] = [];
  const hasVitrification = /\bvitrif/i.test(haystack);
  const hasSlowFreezing = /\bslow freezing\b/i.test(haystack) || /\bslow cooling\b/i.test(haystack);

  if (hasVitrification) {
    const sentence = splitSentences(haystack).find((entry) => /\bvitrif/i.test(entry));
    if (sentence) {
      evidence.push(makeSnippet("protocol-family", sentence, 0.9));
    }
  }

  if (hasSlowFreezing) {
    const sentence = splitSentences(haystack).find(
      (entry) => /\bslow freezing\b/i.test(entry) || /\bslow cooling\b/i.test(entry)
    );
    if (sentence) {
      evidence.push(makeSnippet("protocol-family", sentence, 0.9));
    }
  }

  if (hasVitrification && hasSlowFreezing) {
    return { protocolFamily: "comparative", evidence };
  }
  if (hasVitrification) {
    return { protocolFamily: "vitrification", evidence };
  }
  if (hasSlowFreezing) {
    return { protocolFamily: "slow-freezing", evidence };
  }
  return { protocolFamily: "unknown", evidence };
}

function classifyPaperType(paper: CryoPaper, profile: ExtractionProfile): PaperType {
  const title = paper.title.toLowerCase();
  const abstract = (paper.abstract ?? "").toLowerCase();
  const text = `${title} ${abstract}`;
  const hints = profile.paperType ?? {};

  if ([...REVIEW_PATTERNS, ...(hints.extraReviewPatterns ?? [])].some((pattern) => pattern.test(text))) {
    return PaperTypeSchema.parse("review");
  }

  if ([...METHODS_PATTERNS, ...(hints.extraMethodsPatterns ?? [])].some((pattern) => pattern.test(text))) {
    return PaperTypeSchema.parse("methods");
  }

  if (COMMENTARY_PATTERNS.some((pattern) => pattern.test(text))) {
    return PaperTypeSchema.parse("commentary");
  }

  if (
    [...EXPERIMENTAL_ABSTRACT_PATTERNS, ...(hints.extraExperimentalAbstractPatterns ?? [])].some((pattern) =>
      pattern.test(paper.abstract ?? "")
    )
  ) {
    return PaperTypeSchema.parse("experimental");
  }

  if ((hints.extraExperimentalRules ?? []).some((rule) => rule(text))) {
    return PaperTypeSchema.parse("experimental");
  }

  return PaperTypeSchema.parse("unknown");
}

function isProtocolContext(sentence: string): boolean {
  return /(cryopreserv|vitrif|slow freezing|slow cool(?:ing|ed)?|cool(?:ing|ed)?|freez(?:ing|e|en)?|warm(?:ing|ed)?|thaw(?:ing|ed)?|rewarm|stor(?:age|ed)?|liquid nitrogen|perfus|culture|cryoprotectant|equilibrat|loaded?)/i.test(
    sentence
  );
}

function extractSpecimenTypes(title: string, sentences: string[], profile: ExtractionProfile) {
  const scores = new Map<string, number>();
  const evidence: EvidenceSnippet[] = [];
  const loweredTitle = title.toLowerCase();

  for (const { label, pattern, weight } of profile.specimenPatterns) {
    if (containsRegex(loweredTitle, pattern)) {
      scores.set(label, (scores.get(label) ?? 0) + weight + 2);
      evidence.push(makeSnippet("specimen", title, 0.9));
    }

    for (const sentence of sentences) {
      if (!containsRegex(sentence, pattern)) {
        continue;
      }

      let score = weight;
      if (isProtocolContext(sentence)) {
        score += 1;
      }

      scores.set(label, (scores.get(label) ?? 0) + score);
      evidence.push(makeSnippet("specimen", sentence, 0.8));
    }
  }

  const ranked = Array.from(scores.entries()).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  const specimenTypes = ranked.filter(([, score]) => score >= 2.5).map(([label]) => label);

  return {
    specimenTypes: specimenTypes.length > 0 ? specimenTypes : ranked.slice(0, 2).map(([label]) => label),
    evidence
  };
}

function extractSpecies(title: string, sentences: string[]) {
  const speciesMentions: string[] = [];
  const evidence: EvidenceSnippet[] = [];
  const titleAndSentences = [title, ...sentences];

  for (const { label, pattern } of SPECIES_PATTERNS) {
    const sentence = titleAndSentences.find((entry) => containsRegex(entry, pattern));
    if (!sentence) {
      continue;
    }

    speciesMentions.push(label);
    evidence.push(makeSnippet("specimen", sentence, sentence === title ? 0.9 : 0.8));
  }

  return {
    speciesMentions: dedupeStrings(speciesMentions),
    evidence
  };
}

function aliasMatches(sentence: string, alias: string): boolean {
  return containsRegex(sentence, new RegExp(`\\b${escapeRegex(alias)}\\b`, "i"));
}

function extractChemicals(sentences: string[], chemicalAliases: ChemicalAlias[]) {
  return chemicalAliases.flatMap((entry) => {
    const matchedSentences = sentences.filter((sentence) => entry.aliases.some((alias) => aliasMatches(sentence, alias)));

    if (matchedSentences.length === 0) {
      return [];
    }

    const aliasesMatched = dedupeStrings(
      matchedSentences.flatMap((sentence) => entry.aliases.filter((alias) => aliasMatches(sentence, alias)))
    );

    const concentrationMentions = dedupeStrings(
      matchedSentences.flatMap((sentence) => sentence.match(CONCENTRATION_REGEX) ?? [])
    );

    return [
      {
        canonicalName: entry.canonicalName,
        aliasesMatched,
        concentrationMentions,
        evidence: matchedSentences.map((sentence) => makeSnippet("chemical", sentence, 0.85))
      }
    ];
  });
}

function extractMentions(sentences: string[], regex: RegExp, kind: EvidenceSnippet["kind"]) {
  const mentions = dedupeStrings(sentences.flatMap((sentence) => collectMatches(sentence, regex)));
  const evidence = sentences
    .filter((sentence) => containsRegex(sentence, regex))
    .map((sentence) => makeSnippet(kind, sentence, 0.7));

  return { mentions, evidence };
}

function extractOutcomes(sentences: string[], profile: ExtractionProfile) {
  const domainTerms = profile.outcomeSentenceTerms;
  const candidateSentences = sentences.filter(
    (sentence) =>
      STUDY_OUTCOME_TERMS.test(sentence) ||
      (domainTerms ? containsRegex(sentence, domainTerms) : false) ||
      /\benhances?\b|\bpreserves?\b|\bpreservation\b|\bsurvival\b|\brecovery\b|\bfunction\b/i.test(sentence)
  );
  return profile.outcomeRules.flatMap((rule) => {
    const matchedSentences = candidateSentences.filter((sentence) =>
      rule.patterns.some((pattern) => containsRegex(sentence, pattern))
    );

    if (matchedSentences.length === 0) {
      return [];
    }

    const uniqueSentences = dedupeStrings(matchedSentences);
    return [
      OutcomeMentionSchema.parse({
        outcomeClass: rule.outcomeClass,
        strength: rule.strength,
        summary: uniqueSentences[0],
        evidence: uniqueSentences.map((sentence) => makeSnippet("outcome", sentence, 0.8))
      })
    ];
  });
}

function sentenceHasProceduralDetail(sentence: string, phaseRules: PhaseRule[]): boolean {
  return (
    phaseRules.some((rule) => rule.patterns.some((pattern) => containsRegex(sentence, pattern))) &&
    (containsRegex(sentence, CONCENTRATION_REGEX) ||
      containsRegex(sentence, TEMPERATURE_REGEX) ||
      containsRegex(sentence, DURATION_REGEX) ||
      containsRegex(sentence, COOLING_RATE_REGEX) ||
      /\bstepwise\b|\bsequential/i.test(sentence))
  );
}

function phasesForSentence(sentence: string, phaseRules: PhaseRule[]) {
  return phaseRules
    .filter((rule) => rule.patterns.some((pattern) => containsRegex(sentence, pattern)))
    .map((rule) => rule.phase);
}

function buildProtocolSteps(sentences: string[], chemicalAliases: ChemicalAlias[], phaseRules: PhaseRule[]) {
  const candidates = sentences.filter(
    (sentence) => isProtocolContext(sentence) && sentenceHasProceduralDetail(sentence, phaseRules)
  );
  const seen = new Set<string>();
  const steps: ProtocolExtraction["protocolSteps"] = [];

  for (const sentence of candidates) {
    const phases = phasesForSentence(sentence, phaseRules);
    const strongProceduralSentence =
      phases.length >= 2 &&
      (containsRegex(sentence, CONCENTRATION_REGEX) ||
        containsRegex(sentence, TEMPERATURE_REGEX) ||
        containsRegex(sentence, COOLING_RATE_REGEX));
    for (const phase of phases) {
      const dedupeKey = `${phase}:${sentence}`;
      if (seen.has(dedupeKey)) {
        continue;
      }
      seen.add(dedupeKey);
      steps.push(
        ProtocolStepSchema.parse({
          order: steps.length,
          phase,
          summary: sentence,
          chemicals: dedupeStrings(
            chemicalAliases.flatMap((entry) =>
              entry.aliases.some((alias) => aliasMatches(sentence, alias)) ? [entry.canonicalName] : []
            )
          ),
          concentrations: collectMatches(sentence, CONCENTRATION_REGEX),
          temperatures: dedupeStrings([
            ...collectMatches(sentence, TEMPERATURE_REGEX),
            ...collectMatches(sentence, COOLING_RATE_REGEX)
          ]),
          durations: collectMatches(sentence, DURATION_REGEX),
          evidence: [
            makeSnippet(
              "protocol-family",
              sentence,
              phase === "assessment" ? 0.72 : strongProceduralSentence ? 0.9 : 0.82
            )
          ]
        })
      );
    }
  }

  return steps;
}

export function extractProtocol(
  domain: DomainId,
  domainPaper: DomainPaper,
  sourceEnrichment?: SourceEnrichmentRecord
): ProtocolExtraction {
  const profile = getDomain(domain).extraction;
  const chemicalAliases = [...SHARED_CHEMICAL_ALIASES, ...(profile.extraChemicalAliases ?? [])];
  const phaseRules = phaseRulesFor(profile);
  const paper = domainPaper.paper;
  const sourceText = buildAugmentedSourceText(domain, paper, sourceEnrichment);
  const sentences = splitSentences(sourceText);
  const paperType = classifyPaperType(paper, profile);
  const protocolFamilyResult = inferProtocolFamily(paper.abstract ?? "", paper.title);
  const specimen = extractSpecimenTypes(paper.title, sentences, profile);
  const species = extractSpecies(paper.title, sentences);
  const chemicalMentions = extractChemicals(sentences, chemicalAliases);
  const temperatureMentions = extractMentions(sentences, TEMPERATURE_REGEX, "temperature");
  const durationMentions = extractMentions(sentences, DURATION_REGEX, "duration");
  const outcomeMentions = extractOutcomes(sentences, profile);
  const protocolSteps = buildProtocolSteps(sentences, chemicalAliases, phaseRules);
  const uniqueProceduralPhases = dedupeStrings(
    protocolSteps
      .map((step) => step.phase)
      .filter((phase) => phase !== "unknown" && phase !== "assessment" && phase !== "culture")
  );
  const explicitStepCount = protocolSteps.filter(
    (step) =>
      step.phase !== "unknown" &&
      (step.chemicals.length > 0 || step.concentrations.length > 0 || step.temperatures.length > 0)
  ).length;

  const evidenceSnippets = dedupeStrings(
    [
      ...protocolFamilyResult.evidence.map((entry) => JSON.stringify(entry)),
      ...specimen.evidence.map((entry) => JSON.stringify(entry)),
      ...species.evidence.map((entry) => JSON.stringify(entry)),
      ...chemicalMentions.flatMap((entry) => entry.evidence.map((snippet) => JSON.stringify(snippet))),
      ...temperatureMentions.evidence.map((entry) => JSON.stringify(entry)),
      ...durationMentions.evidence.map((entry) => JSON.stringify(entry)),
      ...outcomeMentions.flatMap((entry) => entry.evidence.map((snippet) => JSON.stringify(snippet))),
      ...enrichmentEvidenceSnippets(sourceEnrichment).map((entry) =>
        JSON.stringify(
          EvidenceSnippetSchema.parse({
            kind: "source-enrichment",
            text: entry.text,
            confidence: entry.confidence,
            sourceType: entry.sourceType,
            authorityTier: entry.authorityTier,
            explicitness: entry.explicitness,
            reviewed: entry.reviewed
          })
        )
      )
    ]
  ).map((value) => EvidenceSnippetSchema.parse(JSON.parse(value)));

  const confidenceSignals = [
    protocolFamilyResult.protocolFamily !== "unknown",
    specimen.specimenTypes.length > 0,
    species.speciesMentions.length > 0,
    chemicalMentions.length > 0,
    outcomeMentions.length > 0,
    protocolSteps.length > 0
  ].filter(Boolean).length;

  const extractionConfidence = Math.min(
    0.42 +
      confidenceSignals * 0.07 +
      (paperType === "experimental" ? 0.08 : 0) +
      (uniqueProceduralPhases.length >= 2 ? 0.07 : 0) +
      (uniqueProceduralPhases.length >= 3 ? 0.04 : 0) +
      (explicitStepCount >= 2 ? 0.05 : 0),
    0.95
  );

  return ProtocolExtractionSchema.parse({
    domain,
    paper,
    paperType,
    protocolFamily: protocolFamilyResult.protocolFamily,
    speciesMentions: species.speciesMentions,
    specimenTypes: specimen.specimenTypes,
    chemicalMentions,
    protocolSteps,
    temperatureMentions: temperatureMentions.mentions,
    durationMentions: durationMentions.mentions,
    outcomeMentions,
    evidenceSnippets,
    evidenceAuthority: summarizeEvidenceAuthority(evidenceSnippets),
    extractionConfidence: Number(extractionConfidence.toFixed(2))
  });
}
