import {
  NormalizedConditionSchema,
  NormalizedMeasurementSchema,
  NormalizedProtocolSnapshotSchema,
  type NormalizedCondition,
  type ExtractionSnapshot,
  type NormalizedMeasurement,
  type NormalizedMeasurementKind,
  type NormalizedProtocol,
  type NormalizedProtocolSnapshot,
  type ProtocolExtraction,
  type ProtocolPhase,
  type ProtocolStep
} from "../../shared/src/schema.js";

type MeasurementMatch = {
  value: number;
  unit: string;
};

type StructuralStep = {
  step: ProtocolStep;
  structural: boolean;
  normalizedStep: NormalizedProtocol["normalizedSteps"][number];
};

type ChemicalAliasMap = Map<string, string[]>;

const AUTOFILL_STEP_PATTERN = /^reviewed benchmark autofill accepted for protocol phase:/i;
const PROCEDURAL_SIGNAL_PATTERN =
  /\b(expos(?:e|ed)|equilibrat(?:e|ed|ion)|load(?:ed|ing)?|perfus(?:e|ed|ion)|cool(?:ed|ing)?|freez(?:e|ing)|super-?cool(?:ed|ing)?|nucleat(?:e|ed|ion)|plung(?:e|ed|ing)|store(?:d|age)?|cryopreserv(?:e|ed|ation)|vitrif(?:y|ied|ication)|warm(?:ed|ing)?|thaw(?:ed|ing)?|rewarm(?:ed|ing)?|wash(?:ed|ing)?|dilut(?:e|ed|ion)|unload(?:ed|ing)?|incubat(?:e|ed|ion)|cultured?|transferred?|suspended?|added?)\b/i;
const OUTCOME_SIGNAL_PATTERN =
  /\b(result|conclusion|discussion|viabil(?:ity|ities)|morpholog(?:y|ical)|histolog(?:y|ical)|ultrastructur(?:e|al)|apoptosis|survival|function(?:al|ality)?|follicular mortality|hormonal secretion|glucose-stimulated|insulin secretion|insulin release|comparable|decrease[sd]?|increase[sd]?|improv(?:e|ed|ement)|preserv(?:e|ed|ation)|well preserved|main outcome|objective)\b/i;
const BACKBONE_PHASES = new Set<ProtocolPhase>([
  "equilibration",
  "loading",
  "cooling",
  "storage",
  "warming",
  "unloading",
  "perfusion",
  "culture"
]);
const CONDITION_PHASES = new Set<ProtocolPhase>([
  "equilibration",
  "loading",
  "cooling",
  "warming",
  "unloading",
  "perfusion"
]);

function canonicalizeConcentrationUnit(unit: string): string {
  const normalized = unit.trim().toLowerCase();
  if (normalized === "%" || normalized === "percent") {
    return "%";
  }
  if (normalized === "m" || normalized === "mol/l") {
    return "M";
  }
  if (normalized === "mm" || normalized === "mmol/l") {
    return "mM";
  }
  if (normalized === "mg/ml") {
    return "mg/mL";
  }
  if (normalized === "ug/ml" || normalized === "µg/ml") {
    return "ug/mL";
  }
  if (normalized === "g/l") {
    return "g/L";
  }
  if (normalized === "v/v" || normalized === "w/v") {
    return normalized;
  }
  return unit.trim();
}

function canonicalizeTemperatureUnit(unit: string): string {
  return unit.trim().replace(/°/g, "").toUpperCase();
}

function canonicalizeDurationUnit(unit: string): string {
  const normalized = unit.trim().toLowerCase();
  if (normalized === "s" || normalized === "sec" || normalized === "secs" || normalized === "second" || normalized === "seconds") {
    return "sec";
  }
  if (normalized === "m" || normalized === "min" || normalized === "mins" || normalized === "minute" || normalized === "minutes") {
    return "min";
  }
  if (normalized === "h" || normalized === "hr" || normalized === "hrs" || normalized === "hour" || normalized === "hours") {
    return "hour";
  }
  if (normalized === "d" || normalized === "day" || normalized === "days") {
    return "day";
  }
  if (normalized === "week" || normalized === "weeks") {
    return "week";
  }
  return unit.trim();
}

function parseConcentration(rawText: string): MeasurementMatch | null {
  const match = rawText.match(/(-?\d+(?:\.\d+)?)\s*(mM|mmol\/L|M|mol\/L|%|percent|mg\/mL|mg\/ml|ug\/mL|ug\/ml|µg\/mL|µg\/ml|g\/L|g\/l|v\/v|w\/v)\b/i);
  if (!match) {
    return null;
  }

  return {
    value: Number.parseFloat(match[1]),
    unit: canonicalizeConcentrationUnit(match[2])
  };
}

function parseTemperature(rawText: string): MeasurementMatch | null {
  const match =
    rawText.match(/(-?\d+(?:\.\d+)?)\s*(?:°\s*)?(C|F|K)\b/i) ??
    rawText.match(/(-?\d+(?:\.\d+)?)\s*degrees?\s*(C|F|K)\b/i);
  if (!match) {
    return null;
  }

  return {
    value: Number.parseFloat(match[1]),
    unit: canonicalizeTemperatureUnit(match[2])
  };
}

function parseDuration(rawText: string): MeasurementMatch | null {
  const match = rawText.match(/(\d+(?:\.\d+)?)\s*(s|sec|secs|second|seconds|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|week|weeks)\b/i);
  if (!match) {
    return null;
  }

  return {
    value: Number.parseFloat(match[1]),
    unit: canonicalizeDurationUnit(match[2])
  };
}

function parseRate(rawText: string): MeasurementMatch | null {
  const match =
    rawText.match(/(-?\d+(?:\.\d+)?)\s*(?:°\s*)?(C|F|K)\s*(?:\/|per)\s*(sec|second|seconds|min|minute|minutes|h|hr|hour|hours)\b/i) ??
    rawText.match(/(-?\d+(?:\.\d+)?)\s*(?:°\s*)?(C|F|K)\s*(?:\/)\s*(s|m|h)\b/i);
  if (!match) {
    return null;
  }

  return {
    value: Number.parseFloat(match[1]),
    unit: `${canonicalizeTemperatureUnit(match[2])}/${canonicalizeDurationUnit(match[3])}`
  };
}

function buildMeasurement(
  kind: NormalizedMeasurementKind,
  rawText: string,
  parsed: MeasurementMatch
): NormalizedMeasurement {
  return NormalizedMeasurementSchema.parse({
    rawText,
    kind,
    value: parsed.value,
    unit: parsed.unit,
    normalizedText: `${parsed.value} ${parsed.unit}`,
    normalizationMethod: "parsed",
    confidence: 0.9
  });
}

function pushWarning(warnings: string[], title: string, label: string, rawText: string) {
  warnings.push(`${title}: could not normalize ${label} "${rawText}"`);
}

function phaseRank(phase: ProtocolPhase): number {
  switch (phase) {
    case "equilibration":
      return 1;
    case "loading":
    case "perfusion":
      return 2;
    case "cooling":
      return 3;
    case "storage":
      return 4;
    case "warming":
    case "unloading":
      return 5;
    case "culture":
      return 6;
    case "assessment":
      return 7;
    case "unknown":
      return 99;
  }
}

function isBackbonePhase(phase: ProtocolPhase): boolean {
  return BACKBONE_PHASES.has(phase);
}

function stepText(step: ProtocolStep): string {
  return [step.summary, ...step.evidence.map((entry) => entry.text)].join(" ").trim();
}

function isAutofillStep(step: ProtocolStep): boolean {
  return AUTOFILL_STEP_PATTERN.test(step.summary);
}

function hasExplicitOperationalSignal(step: ProtocolStep): boolean {
  return (
    step.chemicals.length > 0 ||
    step.concentrations.length > 0 ||
    step.temperatures.length > 0 ||
    step.durations.length > 0 ||
    isAutofillStep(step)
  );
}

function isResultDominatedStep(step: ProtocolStep): boolean {
  const text = stepText(step);
  return OUTCOME_SIGNAL_PATTERN.test(text) && !PROCEDURAL_SIGNAL_PATTERN.test(text) && !hasExplicitOperationalSignal(step);
}

function isStructuralStep(step: ProtocolStep): boolean {
  if (step.phase === "unknown" || step.phase === "assessment") {
    return false;
  }

  if (!isBackbonePhase(step.phase)) {
    return false;
  }

  if (isAutofillStep(step)) {
    return true;
  }

  if (hasExplicitOperationalSignal(step)) {
    return true;
  }

  const text = stepText(step);
  if (PROCEDURAL_SIGNAL_PATTERN.test(text)) {
    return true;
  }

  if (isResultDominatedStep(step)) {
    return false;
  }

  return false;
}

function deriveTransitionToNextPhase(
  current: StructuralStep,
  index: number,
  structuralSteps: StructuralStep[]
): ProtocolPhase | undefined {
  if (!current.structural) {
    return undefined;
  }

  const currentRank = phaseRank(current.step.phase);
  if (currentRank === 99) {
    return undefined;
  }

  for (let offset = index + 1; offset < structuralSteps.length; offset += 1) {
    const candidate = structuralSteps[offset];
    if (!candidate.structural) {
      continue;
    }

    if (candidate.step.phase === current.step.phase) {
      continue;
    }

    const candidateRank = phaseRank(candidate.step.phase);
    if (candidateRank === 99 || candidateRank < currentRank) {
      continue;
    }

    return candidate.step.phase;
  }

  return undefined;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildChemicalAliasMap(extraction: ProtocolExtraction): ChemicalAliasMap {
  const aliasMap = new Map<string, string[]>();

  for (const chemical of extraction.chemicalMentions) {
    aliasMap.set(
      chemical.canonicalName,
      uniqueStrings([
        chemical.canonicalName,
        ...chemical.aliasesMatched
      ]).sort((a, b) => b.length - a.length)
    );
  }

  return aliasMap;
}

function chemicalAliasesForStepChemical(
  chemical: string,
  aliasMap: ChemicalAliasMap
): string[] {
  return aliasMap.get(chemical) ?? [chemical];
}

function measurementLinksToChemical(text: string, rawMeasurement: string, aliases: string[]): boolean {
  if (aliases.length === 0 || !rawMeasurement.trim()) {
    return false;
  }

  const escapedMeasurement = escapeRegExp(rawMeasurement.trim());
  return aliases.some((alias) => {
    const escapedAlias = escapeRegExp(alias);
    const measurementBeforeAlias = new RegExp(`${escapedMeasurement}[\\s,()/%-]{0,18}${escapedAlias}`, "i");
    const aliasBeforeMeasurement = new RegExp(`${escapedAlias}[\\s,()/%-]{0,18}${escapedMeasurement}`, "i");
    return measurementBeforeAlias.test(text) || aliasBeforeMeasurement.test(text);
  });
}

function buildNormalizedCondition(input: {
  phase: ProtocolPhase;
  chemical: string;
  measurement: NormalizedMeasurement;
  source: "step" | "chemical-mention";
  confidence: number;
}): NormalizedCondition {
  const { phase, chemical, measurement, source, confidence } = input;
  return NormalizedConditionSchema.parse({
    phase,
    chemical,
    measurement,
    label: `${chemical} ${measurement.normalizedText}`,
    source,
    confidence
  });
}

function buildRepresentativeConditionsFromStep(
  entry: StructuralStep,
  chemicalAliasMap: ChemicalAliasMap
): NormalizedCondition[] {
  if (!entry.structural || !CONDITION_PHASES.has(entry.step.phase)) {
    return [];
  }

  const chemicals = uniqueStrings(entry.normalizedStep.chemicals);
  if (chemicals.length === 0 || entry.normalizedStep.concentrations.length === 0) {
    return [];
  }
  const text = stepText(entry.step);

  if (chemicals.length === 1) {
    return entry.normalizedStep.concentrations.map((measurement) =>
      buildNormalizedCondition({
        phase: entry.step.phase,
        chemical: chemicals[0],
        measurement,
        source: "step",
        confidence: 0.9
      })
    );
  }

  const conditions: NormalizedCondition[] = [];
  for (const measurement of entry.normalizedStep.concentrations) {
    const linkedChemicals = chemicals.filter((chemical) =>
      measurementLinksToChemical(
        text,
        measurement.rawText,
        chemicalAliasesForStepChemical(chemical, chemicalAliasMap)
      )
    );

    for (const chemical of linkedChemicals) {
      conditions.push(
        buildNormalizedCondition({
          phase: entry.step.phase,
          chemical,
          measurement,
          source: "step",
          confidence: 0.82
        })
      );
    }
  }

  return dedupeRepresentativeConditions(conditions);
}

function buildRepresentativeConditionsFromChemicals(
  normalizedChemicals: NormalizedProtocol["normalizedChemicals"]
): NormalizedCondition[] {
  return normalizedChemicals.flatMap((chemical) =>
    chemical.normalizedConcentrations.map((measurement) =>
      buildNormalizedCondition({
        phase: "unknown",
        chemical: chemical.canonicalName,
        measurement,
        source: "chemical-mention",
        confidence: 0.6
      })
    )
  );
}

function dedupeRepresentativeConditions(conditions: NormalizedCondition[]): NormalizedCondition[] {
  const deduped = new Map<string, NormalizedCondition>();
  for (const condition of conditions) {
    const key = `${condition.phase}|${condition.label}|${condition.source}`;
    if (!deduped.has(key)) {
      deduped.set(key, condition);
    }
  }
  return Array.from(deduped.values());
}

function normalizeExtraction(extraction: ProtocolExtraction): NormalizedProtocol {
  const warnings: string[] = [];
  let attemptedMeasurements = 0;
  let parsedMeasurements = 0;
  const chemicalAliasMap = buildChemicalAliasMap(extraction);

  const normalizedChemicals = extraction.chemicalMentions.map((chemical) => {
    const normalizedConcentrations = chemical.concentrationMentions.flatMap((rawText) => {
      attemptedMeasurements += 1;
      const parsed = parseConcentration(rawText);
      if (!parsed) {
        pushWarning(warnings, extraction.paper.title, "chemical concentration", rawText);
        return [];
      }
      parsedMeasurements += 1;
      return [buildMeasurement("concentration", rawText, parsed)];
    });

    return {
      canonicalName: chemical.canonicalName,
      aliasesMatched: chemical.aliasesMatched,
      normalizedConcentrations
    };
  });

  const structuralSteps = extraction.protocolSteps.map((step) => {
    const concentrations = step.concentrations.flatMap((rawText) => {
      attemptedMeasurements += 1;
      const parsed = parseConcentration(rawText);
      if (!parsed) {
        pushWarning(warnings, extraction.paper.title, "step concentration", rawText);
        return [];
      }
      parsedMeasurements += 1;
      return [buildMeasurement("concentration", rawText, parsed)];
    });

    const temperatures = step.temperatures.flatMap((rawText) => {
      attemptedMeasurements += 1;
      const parsed = parseTemperature(rawText);
      if (!parsed) {
        pushWarning(warnings, extraction.paper.title, "temperature", rawText);
        return [];
      }
      parsedMeasurements += 1;
      return [buildMeasurement("temperature", rawText, parsed)];
    });

    const durations = step.durations.flatMap((rawText) => {
      attemptedMeasurements += 1;
      const parsed = parseDuration(rawText);
      if (!parsed) {
        pushWarning(warnings, extraction.paper.title, "duration", rawText);
        return [];
      }
      parsedMeasurements += 1;
      return [buildMeasurement("duration", rawText, parsed)];
    });

    const rates = [step.summary, ...step.temperatures].flatMap((rawText) => {
      const parsed = parseRate(rawText);
      if (!parsed) {
        return [];
      }
      attemptedMeasurements += 1;
      parsedMeasurements += 1;
      const kind: NormalizedMeasurementKind =
        step.phase === "warming" || parsed.value > 0 ? "warming-rate" : "cooling-rate";
      return [buildMeasurement(kind, rawText, parsed)];
    });

    return {
      step,
      structural: isStructuralStep(step),
      normalizedStep: {
        order: step.order,
        phase: step.phase,
        summary: step.summary,
        chemicals: step.chemicals,
        concentrations,
        temperatures,
        durations,
        rates,
        transitionToNextPhase: undefined,
        evidence: step.evidence
      }
    };
  });

  const normalizedSteps = structuralSteps.map((entry, index, steps) => ({
    ...entry.normalizedStep,
    transitionToNextPhase: deriveTransitionToNextPhase(entry, index, steps)
  }));
  const stepRepresentativeConditions = dedupeRepresentativeConditions(
    structuralSteps.flatMap((entry) => buildRepresentativeConditionsFromStep(entry, chemicalAliasMap))
  );
  const representativeConditions =
    stepRepresentativeConditions.length > 0
      ? stepRepresentativeConditions
      : dedupeRepresentativeConditions(buildRepresentativeConditionsFromChemicals(normalizedChemicals));

  const normalizationConfidence =
    attemptedMeasurements === 0
      ? 0.7
      : Number((parsedMeasurements / attemptedMeasurements).toFixed(3));

  if (structuralSteps.every((entry) => !entry.structural) && extraction.protocolSteps.length > 0) {
    warnings.push(`${extraction.paper.title}: no structural workflow steps survived normalization filters`);
  }

  return {
    domain: extraction.domain,
    paperId: extraction.paper.id,
    paperTitle: extraction.paper.title,
    paperType: extraction.paperType,
    protocolFamily: extraction.protocolFamily,
    speciesMentions: extraction.speciesMentions,
    specimenTypes: extraction.specimenTypes,
    normalizedChemicals,
    representativeConditions,
    normalizedSteps,
    normalizationWarnings: warnings,
    normalizationConfidence
  };
}

export function buildNormalizedProtocolSnapshot(snapshot: ExtractionSnapshot): NormalizedProtocolSnapshot {
  const protocols = snapshot.extractions.map(normalizeExtraction);

  return NormalizedProtocolSnapshotSchema.parse({
    generatedAt: new Date().toISOString(),
    domain: snapshot.domain,
    totalProtocols: protocols.length,
    protocols
  });
}

export function renderNormalizedProtocolReport(snapshot: NormalizedProtocolSnapshot): string {
  const protocolsWithWarnings = snapshot.protocols.filter((protocol) => protocol.normalizationWarnings.length > 0);
  const lines: string[] = [];
  const totalSteps = snapshot.protocols.reduce((count, protocol) => count + protocol.normalizedSteps.length, 0);
  const totalChemicals = snapshot.protocols.reduce(
    (count, protocol) => count + protocol.normalizedChemicals.length,
    0
  );
  const totalRepresentativeConditions = snapshot.protocols.reduce(
    (count, protocol) => count + protocol.representativeConditions.length,
    0
  );
  const totalMeasurements = snapshot.protocols.reduce(
    (count, protocol) =>
      count +
      protocol.normalizedChemicals.reduce(
        (chemicalCount, chemical) => chemicalCount + chemical.normalizedConcentrations.length,
        0
      ) +
      protocol.normalizedSteps.reduce(
        (stepCount, step) =>
          stepCount +
          step.concentrations.length +
          step.temperatures.length +
          step.durations.length +
          step.rates.length,
        0
      ),
    0
  );

  lines.push(`# ${snapshot.domain} normalized protocols`);
  lines.push("");
  lines.push(`- total protocols: ${snapshot.totalProtocols}`);
  lines.push(`- total normalized chemicals: ${totalChemicals}`);
  lines.push(`- total normalized steps: ${totalSteps}`);
  lines.push(`- total representative conditions: ${totalRepresentativeConditions}`);
  lines.push(`- total normalized measurements: ${totalMeasurements}`);
  lines.push(`- protocols with warnings: ${protocolsWithWarnings.length}`);
  lines.push("");
  lines.push("## Warning audit");

  if (protocolsWithWarnings.length === 0) {
    lines.push("- none");
  } else {
    for (const protocol of protocolsWithWarnings.slice(0, 12)) {
      lines.push(
        `- ${protocol.paperTitle} | confidence=${protocol.normalizationConfidence} | warnings=${protocol.normalizationWarnings.length}`
      );
    }
  }

  lines.push("");
  return lines.join("\n");
}
