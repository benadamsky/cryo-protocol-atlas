import {
  EvidenceSnippetSchema,
  OutcomeMentionSchema,
  ProtocolExtractionSchema,
  PaperTypeSchema,
  ProtocolStepSchema,
  type CryoPaper,
  type DomainPaper,
  type EvidenceSnippet,
  type OutcomeClass,
  type OutcomeStrength,
  type PaperType,
  type ProtocolExtraction,
  type ProtocolFamily
} from "../../shared/src/schema.js";

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
  { canonicalName: "Alginate", aliases: ["alginate"] },
  { canonicalName: "Ficoll", aliases: ["ficoll"] },
  { canonicalName: "Raffinose", aliases: ["raffinose"] }
];

const SPECIMEN_PATTERNS: SpecimenPatternEntry[] = [
  { label: "pancreatic islets", pattern: /\bpancreatic islets?\b/i, weight: 3 },
  { label: "islets", pattern: /\bislets?\b/i, weight: 3 },
  { label: "islet cells", pattern: /\bislet cells?\b/i, weight: 2 },
  { label: "encapsulated islets", pattern: /\bencapsulated islets?\b/i, weight: 3 },
  { label: "islet grafts", pattern: /\bislet grafts?\b/i, weight: 2 },
  { label: "beta cells", pattern: /\bbeta cells?\b/i, weight: 1 }
];

const SPECIES_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "human", pattern: /\bhuman\b/i },
  { label: "mouse", pattern: /\bmouse\b|\bmurine\b/i },
  { label: "rat", pattern: /\brat\b/i },
  { label: "pig", pattern: /\bpig\b|\bporcine\b/i },
  { label: "dog", pattern: /\bdog\b|\bcanine\b/i },
  { label: "primate", pattern: /\bprimate\b|\bmonkey\b/i }
];

const OUTCOME_RULES: Array<{
  outcomeClass: OutcomeClass;
  strength: OutcomeStrength;
  patterns: RegExp[];
}> = [
  {
    outcomeClass: "transplantation",
    strength: "strong",
    patterns: [/\btransplant(?:ation|ed)?\b/i, /\bgraft(?:ed|s)?\b/i]
  },
  {
    outcomeClass: "function",
    strength: "strong",
    patterns: [
      /\bfunction(?:al|ality)?\b/i,
      /\binsulin secretion\b/i,
      /\binsulin release\b/i,
      /\bgraft function\b/i,
      /\bglucose(?:-|\s)?stimulated\b/i,
      /\bglucose control\b/i,
      /\bnormoglyc/i,
      /\beuglyc/i
    ]
  },
  {
    outcomeClass: "viability",
    strength: "moderate",
    patterns: [
      /\bviability\b/i,
      /\blive-dead assay\b/i,
      /\bcell survival\b/i,
      /\bsurvival\b/i,
      /\brecovery\b/i,
      /\byield\b/i,
      /\btoxicit/i
    ]
  },
  {
    outcomeClass: "morphology",
    strength: "moderate",
    patterns: [
      /\bmorpholog(?:y|ical)\b/i,
      /\bhistolog(?:y|ical)\b/i,
      /\bultrastruct(?:ure|ural)\b/i
    ]
  }
];

const TEMPERATURE_REGEX = /-?\d+(?:\.\d+)?\s?(?:°\s?)?C\b/gi;
const DURATION_REGEX = /\b\d+(?:\.\d+)?\s?(?:min|mins|minutes|h|hr|hrs|hours|day|days|week|weeks|month|months)\b/gi;
const CONCENTRATION_REGEX = /\b\d+(?:\.\d+)?\s?(?:M|mM|%|mol\/L)\b/g;
const COOLING_RATE_REGEX = /\b\d+(?:\.\d+)?\s?°?\s?C\s*\/\s*(?:min|hour|hr|h)\b/gi;

const PHASE_RULES: Array<{
  phase: ProtocolExtraction["protocolSteps"][number]["phase"];
  patterns: RegExp[];
}> = [
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
    patterns: [/\bassess/i, /\bmorpholog/i, /\bviability/i, /\bfunction/i, /\binsulin secretion/i]
  }
];

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
    confidence
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
    /\breview\b|\bmini-review\b|\bperspective\b|\bprospects?\b|\bthis review\b|\brecent advances\b/.test(text)
  ) {
    return PaperTypeSchema.parse("review");
  }

  if (/\bprotocol\b|\boptimization\b|\bthermophysical\b|\bcharacterization\b|\bcharacterisation\b/.test(text)) {
    return PaperTypeSchema.parse("methods");
  }

  if (/\bcommentary\b|\beditorial\b/.test(text)) {
    return PaperTypeSchema.parse("commentary");
  }

  if (
    /\bthis study\b|\bwe evaluated\b|\bwe used\b|\bwere compared\b|\bafter thaw\b|\bafter warming\b|\bafter transplantation\b/i.test(
      paper.abstract ?? ""
    )
  ) {
    return PaperTypeSchema.parse("experimental");
  }

  if (
    /\bcryopreserv/i.test(text) &&
    /\bislet/i.test(text) &&
    (/\bcomparison\b|\btechnique\b|\bsurvival\b|\brecovery\b|\bfunction\b|\byield\b|\bstorage\b|\btransplant/i.test(
      text
    ) ||
      /\bmouse\b|\brat\b|\bporcine\b|\bpig\b|\bcanine\b|\bhuman\b/i.test(text))
  ) {
    return PaperTypeSchema.parse("experimental");
  }

  if (
    /\bcryogenic\b|\bfreez(?:ing)?\b|\bfrozen-thawed\b|\bthaw(?:ing)?\b/i.test(text) &&
    /\bislet/i.test(text) &&
    /\bporcine\b|\bpig\b|\brat\b|\bmouse\b|\bcanine\b|\bhuman\b|\bchick\b/i.test(text)
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

function extractSpecimenTypes(title: string, sentences: string[]) {
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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractChemicals(sentences: string[]) {
  return CHEMICAL_ALIASES.flatMap((entry) => {
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
}

function extractMentions(sentences: string[], regex: RegExp, kind: EvidenceSnippet["kind"]) {
  const mentions = dedupeStrings(sentences.flatMap((sentence) => collectMatches(sentence, regex)));
  const evidence = sentences
    .filter((sentence) => containsRegex(sentence, regex))
    .map((sentence) => makeSnippet(kind, sentence, 0.7));

  return { mentions, evidence };
}

function isStudyOutcomeSentence(sentence: string): boolean {
  return /(result|found|observed|showed|demonstrated|improved|restored|viability|survival|recovery|yield|toxicit|function|functional|functionality|insulin|glucose|graft|transplant|morpholog|histolog|ultrastruct)/i.test(
    sentence
  );
}

function extractOutcomes(sentences: string[]) {
  const candidateSentences = sentences.filter(
    (sentence) =>
      isStudyOutcomeSentence(sentence) ||
      /\benhances?\b|\bpreserves?\b|\bpreservation\b|\bsurvival\b|\brecovery\b|\bfunction\b/i.test(sentence)
  );
  return OUTCOME_RULES.flatMap((rule) => {
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

function sentenceHasProceduralDetail(sentence: string): boolean {
  return (
    PHASE_RULES.some((rule) => rule.patterns.some((pattern) => containsRegex(sentence, pattern))) &&
    (containsRegex(sentence, CONCENTRATION_REGEX) ||
      containsRegex(sentence, TEMPERATURE_REGEX) ||
      containsRegex(sentence, DURATION_REGEX) ||
      containsRegex(sentence, COOLING_RATE_REGEX) ||
      /\bstepwise\b|\bsequential/i.test(sentence))
  );
}

function phasesForSentence(sentence: string) {
  return PHASE_RULES.filter((rule) => rule.patterns.some((pattern) => containsRegex(sentence, pattern))).map(
    (rule) => rule.phase
  );
}

function buildProtocolSteps(sentences: string[]) {
  const candidates = sentences.filter(
    (sentence) => isProtocolContext(sentence) && sentenceHasProceduralDetail(sentence)
  );
  const seen = new Set<string>();
  const steps: ProtocolExtraction["protocolSteps"] = [];

  for (const sentence of candidates) {
    const phases = phasesForSentence(sentence);
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
            CHEMICAL_ALIASES.flatMap((entry) =>
              entry.aliases.some((alias) =>
                containsRegex(sentence, new RegExp(`\\b${escapeRegex(alias)}\\b`, "i"))
              )
                ? [entry.canonicalName]
                : []
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

export function extractIsletProtocol(domainPaper: DomainPaper): ProtocolExtraction {
  const paper = domainPaper.paper;
  const sentences = splitSentences(`${paper.title}. ${paper.abstract ?? ""}`);
  const paperType = classifyPaperType(paper);
  const protocolFamilyResult = inferProtocolFamily(paper.abstract ?? "", paper.title);
  const specimen = extractSpecimenTypes(paper.title, sentences);
  const species = extractSpecies(paper.title, sentences);
  const chemicalMentions = extractChemicals(sentences);
  const temperatureMentions = extractMentions(sentences, TEMPERATURE_REGEX, "temperature");
  const durationMentions = extractMentions(sentences, DURATION_REGEX, "duration");
  const outcomeMentions = extractOutcomes(sentences);
  const protocolSteps = buildProtocolSteps(sentences);
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
      ...outcomeMentions.flatMap((entry) => entry.evidence.map((snippet) => JSON.stringify(snippet)))
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
    domain: "islets",
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
    extractionConfidence: Number(extractionConfidence.toFixed(2))
  });
}
