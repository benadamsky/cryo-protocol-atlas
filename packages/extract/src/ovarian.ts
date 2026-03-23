import {
  EvidenceSnippetSchema,
  OutcomeMentionSchema,
  ProtocolPhaseSchema,
  ProtocolExtractionSchema,
  PaperTypeSchema,
  ProtocolStepSchema,
  type CryoPaper,
  type DomainPaper,
  type EvidenceSnippet,
  type OutcomeClass,
  type OutcomeStrength,
  type PaperType,
  type ProtocolPhase,
  type ProtocolExtraction,
  type ProtocolFamily,
  type ProtocolStep,
  type SourceEnrichmentRecord
} from "../../shared/src/schema.js";
import {
  buildAugmentedSourceText,
  enrichmentEvidenceSnippets,
  summarizeEvidenceAuthority
} from "./enrichment.js";

type ChemicalAliasEntry = {
  canonicalName: string;
  aliases: string[];
};

type SpecimenPatternEntry = {
  label: string;
  pattern: RegExp;
  weight: number;
};

const CHEMICAL_ALIASES: ChemicalAliasEntry[] = [
  { canonicalName: "Dimethyl Sulfoxide", aliases: ["dmso", "me2so", "dimethyl sulfoxide", "dimethyl sulphoxide"] },
  { canonicalName: "Ethylene Glycol", aliases: ["eg", "ethylene glycol"] },
  { canonicalName: "Propylene Glycol", aliases: ["proh", "propylene glycol", "1,2-propanediol", "1,2 propanediol"] },
  { canonicalName: "Glycerol", aliases: ["glycerol"] },
  { canonicalName: "Sucrose", aliases: ["sucrose"] },
  { canonicalName: "Trehalose", aliases: ["trehalose"] },
  { canonicalName: "Polyvinylpyrrolidone", aliases: ["polyvinylpyrrolidone", "pvp"] },
  { canonicalName: "Ficoll", aliases: ["ficoll"] },
  { canonicalName: "Raffinose", aliases: ["raffinose"] },
  { canonicalName: "Ringer-Acetate", aliases: ["ringer-acetate", "ringer acetate"] }
];

const SPECIMEN_PATTERNS: SpecimenPatternEntry[] = [
  { label: "whole ovary", pattern: /\bwhole ovary\b/i, weight: 3 },
  { label: "ovarian tissue", pattern: /\bovarian tissue\b/i, weight: 3 },
  { label: "ovarian cortex", pattern: /\bovarian cortical?(?: pieces?| strips?| blocks?)?\b/i, weight: 3 },
  { label: "follicles", pattern: /\bfollicles?\b/i, weight: 2 },
  { label: "oocytes", pattern: /\boocytes?\b/i, weight: 1 },
  { label: "embryos", pattern: /\bembryos?\b/i, weight: 1 }
];

const SPECIES_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "human", pattern: /\bhuman\b/i },
  { label: "sheep", pattern: /\bsheep\b|\bovine\b/i },
  { label: "pig", pattern: /\bpig\b|\bporcine\b/i },
  { label: "mouse", pattern: /\bmouse\b|\bmurine\b/i },
  { label: "rat", pattern: /\brat\b/i },
  { label: "cat", pattern: /\bcat\b|\bfeline\b/i },
  { label: "goat", pattern: /\bgoat\b|\bcaprine\b/i },
  { label: "turkey", pattern: /\bturkey\b/i },
  { label: "peccary", pattern: /\bpeccary\b/i },
  { label: "primate", pattern: /\bprimate\b/i }
];

const OUTCOME_RULES: Array<{
  outcomeClass: OutcomeClass;
  strength: OutcomeStrength;
  patterns: RegExp[];
}> = [
  {
    outcomeClass: "reproductive",
    strength: "strong",
    patterns: [/\blive births?\b/i, /\bpregnancy\b/i, /\bfertilizable oocytes?\b/i]
  },
  {
    outcomeClass: "transplantation",
    strength: "strong",
    patterns: [/\btransplant(?:ation|ed)?\b/i, /\bauto-?transplantation\b/i, /\borthotopic(?:ally)?\b/i]
  },
  {
    outcomeClass: "function",
    strength: "moderate",
    patterns: [/\bhormone function\b/i, /\bhormones? (?:were )?restored\b/i, /\bcyclic ovarian activity\b/i]
  },
  {
    outcomeClass: "viability",
    strength: "moderate",
    patterns: [/\bviability\b/i, /\blive-dead assay\b/i, /\bmortality rates?\b/i]
  },
  {
    outcomeClass: "morphology",
    strength: "weak",
    patterns: [/\bmorpholog(?:y|ical)\b/i, /\bultrastruct(?:ure|ural)\b/i, /\bhistolog(?:y|ical)\b/i]
  }
];

const TEMPERATURE_REGEX = /-?\d+(?:\.\d+)?\s?(?:°\s?)?C\b/gi;
const DURATION_REGEX = /\b\d+(?:\.\d+)?\s?(?:min|mins|minutes|h|hr|hrs|hours|day|days|month|months)\b/gi;
const CONCENTRATION_REGEX = /\b\d+(?:\.\d+)?\s?(?:M|mM|%|mol\/L)\b/g;

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

function classifyPaperType(paper: CryoPaper): PaperType {
  const title = paper.title.toLowerCase();
  const abstract = (paper.abstract ?? "").toLowerCase();
  const text = `${title} ${abstract}`;

  if (
    /\breview\b|\bmini-review\b|\bperspective\b|\bfuture potential\b|\bprospects?\b|\bthis paper selectively reviews\b|\bthis review summarizes\b/.test(
      text
    )
  ) {
    return PaperTypeSchema.parse("review");
  }

  if (/\bprotocol\b|\bthermophysical\b|\bdifferential scanning calorimetry\b|\bcharacterisation\b/.test(text)) {
    return PaperTypeSchema.parse("methods");
  }

  if (/\bcommentary\b|\beditorial\b/.test(text)) {
    return PaperTypeSchema.parse("commentary");
  }

  if (
    /\bthis study\b|\bwe evaluated\b|\bwe used\b|\bwere compared\b|\bresult\(s\)\b|\bmethods\b|\bafter warming\b|\bafter thaw/i.test(
      paper.abstract ?? ""
    )
  ) {
    return PaperTypeSchema.parse("experimental");
  }

  return PaperTypeSchema.parse("unknown");
}

function isProtocolContext(sentence: string): boolean {
  return /(cryopreserv|vitrif|slow freezing|slow cooling|transplant|warming|thaw|perfus|culture|cryoprotectant)/i.test(
    sentence
  );
}

function extractSpecimenTypes(title: string, sentences: string[]): {
  specimenTypes: string[];
  evidence: EvidenceSnippet[];
} {
  const scores = new Map<string, number>();
  const evidence: EvidenceSnippet[] = [];
  const loweredTitle = title.toLowerCase();

  for (const { label, pattern, weight } of SPECIMEN_PATTERNS) {
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

function extractChemicals(sentences: string[]) {
  const mentions = CHEMICAL_ALIASES.flatMap((entry) => {
    const matchedSentences = sentences.filter((sentence) =>
      entry.aliases.some((alias) => containsRegex(sentence, new RegExp(`\\b${escapeRegex(alias)}\\b`, "i")))
    );

    if (matchedSentences.length === 0) {
      return [];
    }

    const aliasesMatched = dedupeStrings(
      matchedSentences.flatMap((sentence) =>
        entry.aliases.filter((alias) => containsRegex(sentence, new RegExp(`\\b${escapeRegex(alias)}\\b`, "i")))
      )
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

  return mentions;
}

function extractMentions(sentences: string[], regex: RegExp, kind: EvidenceSnippet["kind"]) {
  const mentions = dedupeStrings(sentences.flatMap((sentence) => collectMatches(sentence, regex)));
  const evidence = sentences
    .filter((sentence) => containsRegex(sentence, regex))
    .map((sentence) => makeSnippet(kind, sentence, 0.7));

  return { mentions, evidence };
}

function extractOutcomes(sentences: string[]) {
  const candidateSentences = sentences.filter(isStudyOutcomeSentence);
  const outcomes = OUTCOME_RULES.flatMap((rule) => {
    const matchedSentences = candidateSentences.filter((sentence) =>
      rule.patterns.some((pattern) => containsRegex(sentence, pattern))
    );

    if (matchedSentences.length === 0) {
      return [];
    }

    return [
      OutcomeMentionSchema.parse({
        outcomeClass: rule.outcomeClass,
        strength: rule.strength,
        summary: matchedSentences[0],
        evidence: matchedSentences.map((sentence) => makeSnippet("outcome", sentence, 0.8))
      })
    ];
  });

  return outcomes;
}

function isStudyOutcomeSentence(sentence: string): boolean {
  const lowered = sentence.toLowerCase();

  if (
    /globally|in the u\.s\. alone|has become|offers the only hope|is a promising technique|is a promising method|future potential|further work is needed/.test(
      lowered
    )
  ) {
    return false;
  }

  if (
    /\bwe\b|\bour\b|\bthis study\b|\bresult\b|\bafter warming\b|\bafter thaw(?:ing)?\b|\bwere restored\b|\bwas higher\b|\bwas lower\b|\bshowed\b|\bshowing\b|\bproduced\b|\bcompared\b|\bcompared to\b|\bachievement\b/.test(
      lowered
    )
  ) {
    return true;
  }

  return /\bpregnancy\b|\blive births?\b|\bviability\b|\bmorpholog(?:y|ical)\b|\bultrastruct(?:ure|ural)\b/.test(
    lowered
  );
}

function inferPhase(sentence: string): ProtocolPhase {
  const lowered = sentence.toLowerCase();

  if (/(perfus|pressure|gradient)/i.test(lowered)) {
    return ProtocolPhaseSchema.parse("perfusion");
  }

  if (/(equilibrat|exposure to cryoprotectant|exposed to cryoprotectant)/i.test(lowered)) {
    return ProtocolPhaseSchema.parse("equilibration");
  }

  if (/(vitrif|cryoprotectants?\.?.*used|containing .*cryoprotectants?|loaded|perfused with)/i.test(lowered)) {
    return ProtocolPhaseSchema.parse("loading");
  }

  if (/(slow freezing|slow cooling|frozen|freezing protocol|seeding)/i.test(lowered)) {
    return ProtocolPhaseSchema.parse("cooling");
  }

  if (/(stored|cryopreservation|after 45 days of cryopreservation)/i.test(lowered)) {
    return ProtocolPhaseSchema.parse("storage");
  }

  if (/(warmed|rewarm|thaw|thawing)/i.test(lowered)) {
    return ProtocolPhaseSchema.parse("warming");
  }

  if (/(delivering\/removing cryoprotectants|removing cryoprotectants|washout|dilution)/i.test(lowered)) {
    return ProtocolPhaseSchema.parse("unloading");
  }

  if (/(culture|cultured|in vitro)/i.test(lowered)) {
    return ProtocolPhaseSchema.parse("culture");
  }

  if (/(assessed|evaluated|histolog|ultrastruct|viability|morpholog)/i.test(lowered)) {
    return ProtocolPhaseSchema.parse("assessment");
  }

  return ProtocolPhaseSchema.parse("unknown");
}

function extractProtocolSteps(sentences: string[], chemicalMentions: Array<{ canonicalName: string; aliasesMatched: string[] }>) {
  const stepSentences = sentences.filter((sentence) => {
    const lowered = sentence.toLowerCase();
    return (
      /vitrif|slow freezing|slow cooling|cryopreserv|freezing protocol|thaw|warmed|rewarm|perfus|cryoprotectant|equilibrat|seeding|culture/i.test(
        lowered
      ) ||
      containsRegex(sentence, TEMPERATURE_REGEX) ||
      containsRegex(sentence, DURATION_REGEX) ||
      containsRegex(sentence, CONCENTRATION_REGEX)
    );
  });

  const steps: ProtocolStep[] = [];
  for (const [index, sentence] of stepSentences.entries()) {
    const temperatures = dedupeStrings(collectMatches(sentence, TEMPERATURE_REGEX));
    const durations = dedupeStrings(collectMatches(sentence, DURATION_REGEX));
    const concentrations = dedupeStrings(collectMatches(sentence, CONCENTRATION_REGEX));

    const chemicals = dedupeStrings(
      chemicalMentions
        .filter((entry) =>
          entry.aliasesMatched.some((alias) => containsRegex(sentence, new RegExp(`\\b${escapeRegex(alias)}\\b`, "i")))
        )
        .map((entry) => entry.canonicalName)
    );

    steps.push(
      ProtocolStepSchema.parse({
        order: index,
        phase: inferPhase(sentence),
        summary: sentence,
        chemicals,
        concentrations,
        temperatures,
        durations,
        evidence: [makeSnippet("protocol-family", sentence, 0.75)]
      })
    );
  }

  return steps;
}

function scoreExtractionConfidence(extraction: Omit<ProtocolExtraction, "extractionConfidence">): number {
  let score = 0.1;

  if (extraction.protocolFamily !== "unknown") {
    score += 0.2;
  }

  score += Math.min(extraction.specimenTypes.length * 0.08, 0.16);
  score += Math.min(extraction.chemicalMentions.length * 0.08, 0.24);
  score += Math.min(extraction.protocolSteps.length * 0.04, 0.16);
  score += Math.min(extraction.temperatureMentions.length * 0.03, 0.09);
  score += Math.min(extraction.durationMentions.length * 0.03, 0.09);
  score += Math.min(extraction.outcomeMentions.length * 0.06, 0.18);

  return Math.min(Number(score.toFixed(2)), 0.95);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractOvarianProtocol(
  domainPaper: DomainPaper,
  sourceEnrichment?: SourceEnrichmentRecord
): ProtocolExtraction {
  const paper: CryoPaper = domainPaper.paper;
  const text = buildAugmentedSourceText("ovarian-tissue", paper, sourceEnrichment).trim();
  const sentences = splitSentences(text);
  const paperType = classifyPaperType(paper);

  const { protocolFamily, evidence: protocolEvidence } = inferProtocolFamily(text, paper.title);
  const { speciesMentions, evidence: speciesEvidence } = extractSpecies(paper.title, sentences);
  const { specimenTypes, evidence: specimenEvidence } = extractSpecimenTypes(paper.title, sentences);
  const chemicalMentions = extractChemicals(sentences);
  const { mentions: temperatureMentions, evidence: temperatureEvidence } = extractMentions(
    sentences,
    TEMPERATURE_REGEX,
    "temperature"
  );
  const { mentions: durationMentions, evidence: durationEvidence } = extractMentions(
    sentences,
    DURATION_REGEX,
    "duration"
  );
  const outcomeMentions = extractOutcomes(sentences);
  const protocolSteps = extractProtocolSteps(sentences, chemicalMentions);

  const evidenceSnippets = [
    ...protocolEvidence,
    ...speciesEvidence,
    ...specimenEvidence,
    ...chemicalMentions.flatMap((entry) => entry.evidence),
    ...protocolSteps.flatMap((step) => step.evidence),
    ...temperatureEvidence,
    ...durationEvidence,
    ...outcomeMentions.flatMap((entry) => entry.evidence),
    ...enrichmentEvidenceSnippets(sourceEnrichment).map((entry) =>
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
  ];

  const dedupedEvidenceSnippets = dedupeEvidence(evidenceSnippets);

  const extractionBase = {
    domain: domainPaper.domain,
    paper,
    paperType,
    protocolFamily,
    speciesMentions,
    specimenTypes,
    chemicalMentions,
    protocolSteps,
    temperatureMentions,
    durationMentions,
    outcomeMentions,
    evidenceSnippets: dedupedEvidenceSnippets,
    evidenceAuthority: summarizeEvidenceAuthority(dedupedEvidenceSnippets)
  };

  return ProtocolExtractionSchema.parse({
    ...extractionBase,
    extractionConfidence: scoreExtractionConfidence(extractionBase)
  });
}

function dedupeEvidence(snippets: EvidenceSnippet[]): EvidenceSnippet[] {
  const seen = new Set<string>();
  const deduped: EvidenceSnippet[] = [];

  for (const snippet of snippets) {
    const key = `${snippet.kind}:${snippet.text}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(snippet);
  }

  return deduped;
}
