import { getDomain, type SuggestionContext } from "../../shared/src/domains/index.js";
import {
  ExperimentSuggestionSchema,
  type ExperimentSuggestion,
  type ExtractionSnapshot
} from "../../shared/src/schema.js";

const MAX_SUGGESTIONS = 5;

/**
 * Hypotheses come from the domain's suggestion templates: each template keeps
 * its copy and confidence fixed and decides from the extraction results whether
 * it applies and which papers, chemicals, and families support it.
 */
export function buildExperimentSuggestions(snapshot: ExtractionSnapshot): ExperimentSuggestion[] {
  const context: SuggestionContext = {
    snapshot,
    extractions: snapshot.extractions,
    experimental: snapshot.extractions.filter((extraction) => extraction.paperType === "experimental")
  };

  const suggestions: ExperimentSuggestion[] = [];
  for (const template of getDomain(snapshot.domain).suggestionTemplates) {
    const candidate = template.select(context);
    if (!candidate) {
      continue;
    }

    suggestions.push(
      ExperimentSuggestionSchema.parse({
        title: template.title,
        category: template.category,
        hypothesis: template.hypothesis,
        rationale: template.rationale,
        supportingContext: candidate,
        confidence: template.confidence
      })
    );
  }

  return suggestions.slice(0, MAX_SUGGESTIONS);
}
