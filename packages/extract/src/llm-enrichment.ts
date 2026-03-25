import Anthropic from "@anthropic-ai/sdk";
import {
  type DecisionImpactScore,
  type LlmDraft,
  type ProtocolExtraction,
  type SourceEnrichmentExcerpt,
  type SourceEnrichmentRecord
} from "../../shared/src/schema.js";

const MAX_LLM_CALLS_PER_BATCH = 10;
const AUTO_TRIAGE_CONFIDENCE_THRESHOLD = 0.85;

// Auto-triage is disabled until validate-llm-enrichment.ts confirms
// that LLM drafts clear the 0.85 F1 threshold on reviewed records.
// Set ENABLE_LLM_AUTO_TRIAGE=true to enable after validation passes.
const AUTO_TRIAGE_ENABLED = process.env.ENABLE_LLM_AUTO_TRIAGE === "true";

type SafetyTier = "draftable" | "review-required" | "decision-changing";

type LlmEnrichmentInput = {
  record: SourceEnrichmentRecord;
  extraction: ProtocolExtraction | undefined;
  decisionImpactScore: DecisionImpactScore | undefined;
};

type LlmEnrichmentResult = {
  paperId: string;
  draft: LlmDraft;
  autoTriageApplied: boolean;
};

function determineSafetyTier(input: {
  priority: string;
  decisionImpactScore: number | undefined;
}): SafetyTier {
  // Decision-changing: high-impact papers where enrichment could alter wedge ordering
  if (input.decisionImpactScore !== undefined && input.decisionImpactScore > 0.6) {
    return "decision-changing";
  }

  // Draftable: low-impact, extractor-gap records where the info likely exists in the abstract
  if (input.priority === "extractor-gap" && (input.decisionImpactScore === undefined || input.decisionImpactScore < 0.3)) {
    return "draftable";
  }

  return "review-required";
}

function buildPrompt(record: SourceEnrichmentRecord, extraction: ProtocolExtraction | undefined): string {
  const abstractText = extraction?.paper.abstract ?? extraction?.paper.title ?? record.title;
  const existingExcerpts = record.excerpts.length > 0
    ? `\nExisting excerpts:\n${record.excerpts.map((e) => `- [${e.label}] ${e.text}`).join("\n")}`
    : "";

  return `You are a cryopreservation research analyst. Analyze this paper and extract structured enrichment excerpts.

Paper title: ${record.title}
Paper ID: ${record.paperId}
Priority: ${record.priority}
Current rationale: ${record.rationale}
${existingExcerpts}

Abstract/source text:
${abstractText}

${extraction ? `Extraction context:
- Protocol family: ${extraction.protocolFamily}
- Paper type: ${extraction.paperType}
- Species: ${extraction.speciesMentions.join(", ") || "not detected"}
- Specimens: ${extraction.specimenTypes.join(", ") || "not detected"}
- Chemicals: ${extraction.chemicalMentions.map((c) => c.canonicalName).join(", ") || "not detected"}
- Outcomes: ${extraction.outcomeMentions.map((o) => `${o.outcomeClass} (${o.strength})`).join(", ") || "not detected"}
- Steps: ${extraction.protocolSteps.map((s) => `${s.phase}: ${s.summary}`).join("; ") || "not detected"}` : ""}

Extract 1-3 enrichment excerpts. Each excerpt should:
1. Quote or closely paraphrase specific claims from the abstract
2. Focus on protocol details, outcomes, or methodological specifics
3. Be useful for understanding whether this paper supports or contradicts cryopreservation claims

Respond with a JSON array of excerpts, each with:
- "label": a short descriptive label (e.g., "outcome note", "protocol detail", "comparison note")
- "text": the excerpt text (quote or close paraphrase from the abstract)
- "confidence": 0-1 how confident you are this excerpt is accurate

Only include excerpts supported by the text above. Do not invent claims.
Respond ONLY with the JSON array, no other text.`;
}

function parseExcerpts(response: string, paperId: string): SourceEnrichmentExcerpt[] {
  try {
    const cleaned = response.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Array<{
      label: string;
      text: string;
      confidence: number;
    }>;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item) => item.label && item.text && typeof item.confidence === "number")
      .map((item, index) => ({
        id: `llm-${paperId}-${index}`,
        label: `[llm-draft] ${item.label}`,
        text: item.text,
        source: "manual-note" as const,
        confidence: Math.min(1, Math.max(0, item.confidence)),
        reviewed: false
      }));
  } catch {
    return [];
  }
}

export async function draftEnrichments(inputs: LlmEnrichmentInput[]): Promise<LlmEnrichmentResult[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log("ANTHROPIC_API_KEY not set — skipping LLM enrichment drafting.");
    return [];
  }

  const client = new Anthropic({ apiKey });
  const toProcess = inputs.slice(0, MAX_LLM_CALLS_PER_BATCH);
  const results: LlmEnrichmentResult[] = [];

  for (const input of toProcess) {
    const safetyTier = determineSafetyTier({
      priority: input.record.priority,
      decisionImpactScore: input.decisionImpactScore?.score
    });

    try {
      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{ role: "user", content: buildPrompt(input.record, input.extraction) }]
      });

      const responseText = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");

      const excerpts = parseExcerpts(responseText, input.record.paperId);
      if (excerpts.length === 0) {
        continue;
      }

      const avgConfidence = excerpts.reduce((sum, e) => sum + (e.confidence ?? 0), 0) / excerpts.length;

      const draft: LlmDraft = {
        excerpts,
        safetyTier,
        draftConfidence: Number(avgConfidence.toFixed(3)),
        draftedAt: new Date().toISOString()
      };

      // Auto-triage ONLY when explicitly enabled, for draftable tier with high confidence.
      // Disabled by default until validate-llm-enrichment.ts confirms field-level agreement.
      const autoTriageApplied =
        AUTO_TRIAGE_ENABLED &&
        safetyTier === "draftable" &&
        avgConfidence >= AUTO_TRIAGE_CONFIDENCE_THRESHOLD &&
        input.record.priority === "extractor-gap";

      results.push({
        paperId: input.record.paperId,
        draft,
        autoTriageApplied
      });
    } catch (error) {
      console.error(`LLM enrichment failed for ${input.record.paperId}:`, error);
    }
  }

  return results;
}
