import type { DomainId, TranslationalSignal } from "../../../packages/shared/src/schema";
import type { ConfidenceBand, WedgeClass } from "./decision-data";

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function shortConfidenceLabel(value: ConfidenceBand) {
  return `${capitalize(value)} ordering confidence`;
}

export function confidenceLabel(value: ConfidenceBand) {
  return `${capitalize(value)} confidence in wedge recommendation`;
}

export function confidenceDetail(value: ConfidenceBand) {
  if (value === "high") {
    return "The current literature is strong enough to support the wedge ordering, even though key uncertainties remain.";
  }

  if (value === "medium") {
    return "Atlas can recommend a wedge today, but the ranking could still move with a well-chosen experiment or better reviewed sources.";
  }

  return "Atlas can frame the wedge, but the current ranking should still be treated as provisional.";
}

export function translationalSignalLabel(value: TranslationalSignal) {
  switch (value) {
    case "clinically adjacent":
      return "Transplant-adjacent evidence";
    case "transplant relevant":
      return "Transplant-relevant evidence";
    case "preclinical":
      return "Preclinical only";
    default:
      return "Research only";
  }
}

export function translationalSignalDetail(value: TranslationalSignal) {
  switch (value) {
    case "clinically adjacent":
      return "Human or near-clinical evidence exists in the current reviewed slice, but this is still not a clinical claim.";
    case "transplant relevant":
      return "Transplantation-style outcomes exist in the current reviewed slice, which makes the wedge more decision-relevant.";
    case "preclinical":
      return "The current reviewed slice has directionally useful experimental support, but not enough translational grounding yet.";
    default:
      return "The current reviewed slice is still mainly useful for research framing and early protocol comparison.";
  }
}

export function recommendationTone(recommendation: string): "good" | "warn" | "neutral" {
  if (recommendation === "promote") {
    return "good";
  }

  if (recommendation === "review") {
    return "warn";
  }

  return "neutral";
}

export function wedgeClassNarrative(wedgeClass: WedgeClass, domainLabel: string) {
  if (wedgeClass === "plausible first company wedge") {
    return `${domainLabel} is the strongest current candidate for a first company wedge, but it still needs benchmark pressure-testing.`;
  }

  if (wedgeClass === "long-term platform wedge") {
    return `${domainLabel} looks broad enough to matter at the platform level, but Atlas still needs stronger proof before presenting it that way.`;
  }

  if (wedgeClass === "watchlist") {
    return `${domainLabel} stays in the watchlist until the literature supports a cleaner decision.`;
  }

  return `${domainLabel} is the current proving ground for learning and experiment design. Atlas is not yet calling it the first company wedge.`;
}

export function wedgeClassLabel(wedgeClass: WedgeClass) {
  if (wedgeClass === "proving ground") {
    return "Strong proving ground";
  }

  if (wedgeClass === "plausible first company wedge") {
    return "Plausible first company wedge";
  }

  if (wedgeClass === "long-term platform wedge") {
    return "Long-term platform wedge";
  }

  return "Watchlist";
}

export function plainEnglishWedgeSummary(domain: DomainId, title: string, claim: string) {
  if (domain === "islets") {
    return "Use islets as the current proving ground to test whether additive changes improve recovery more than changing the base cryomix.";
  }

  if (domain === "ovarian-tissue") {
    return "Use ovarian tissue to run a cleaner head-to-head DMSO-centered benchmark before treating it as a company wedge.";
  }

  return claim || title;
}

export function presentDayUtilityItems() {
  return [
    "Identify the best current cryopreservation wedge.",
    "Compare protocol families across fragmented literature.",
    "Show which evidence gaps actually matter for the decision.",
    "Turn literature into concrete next-experiment packets.",
    "Bridge literature review into wet-lab planning."
  ];
}

export function strategicSignificance(domain: DomainId) {
  if (domain === "islets") {
    return "A positive result would support a focused post-thaw recovery wedge before broader CPA reformulation.";
  }

  if (domain === "ovarian-tissue") {
    return "A positive result would clarify whether ovarian tissue can support a sharper benchmark wedge instead of staying a broad proving ground.";
  }

  return "A positive result would strengthen Atlas's current wedge recommendation and improve the next optimization step.";
}

export function systemMapStages(nextExperimentTitle?: string) {
  return [
    {
      label: "Literature mapping",
      state: "Available now",
      detail: "Atlas maps fragmented cryopreservation literature into comparable protocol families, benchmark rows, and wedge-relevant evidence."
    },
    {
      label: "Wedge recommendation",
      state: "Current output",
      detail: "Atlas recommends the current lead wedge and explains why it wins on the reviewed slice."
    },
    {
      label: "Evidence gaps and contradictions",
      state: "Available now",
      detail: "Atlas shows what still blocks conviction, what conflicts matter, and what evidence work would move the call."
    },
    {
      label: "Experiment packet generation",
      state: "Current output",
      detail: `Atlas turns the current read into a concrete next experiment${nextExperimentTitle ? `: ${nextExperimentTitle}` : ""}.`
    },
    {
      label: "Discovery workflow",
      state: "Downstream queue",
      detail: "Discovery queues and review packets are fed by Atlas outputs, but they are not current wedge truth."
    },
    {
      label: "Proprietary data feedback",
      state: "Future input",
      detail: "Wet-lab results would feed back into Atlas and increase recommendation quality over time."
    }
  ];
}

export function truthBoundaryItems(nextExperimentTitle?: string) {
  return [
    {
      label: "Reviewed evidence",
      detail: "Directly grounded in the reviewed source and benchmark artifacts."
    },
    {
      label: "Atlas recommendation",
      detail: "Atlas's current wedge ordering across that reviewed slice."
    },
    {
      label: "Downstream queue",
      detail: nextExperimentTitle
        ? `${nextExperimentTitle} and the discovery queue are structured next steps, not validated truth yet.`
        : "Experiment packets and the discovery queue are structured next steps, not validated truth yet."
    }
  ];
}

export function presentDayValueCards(nextExperimentTitle?: string) {
  return [
    {
      title: "Chooses the best current wedge",
      detail: "Atlas does not stop at summarizing papers. It ranks the current wedge and makes a clear decision."
    },
    {
      title: "Shows why the wedge wins",
      detail: "The system contrasts the lead against alternatives so the rationale is explicit instead of implied."
    },
    {
      title: "Makes uncertainty useful",
      detail: "Atlas reveals exactly what still blocks conviction and where truth currently ends."
    },
    {
      title: "Ranks the evidence work that matters",
      detail: "Evidence gaps and contradictions are prioritized by impact on the actual decision."
    },
    {
      title: "Outputs the next experiment",
      detail: nextExperimentTitle
        ? `The current recommendation already turns into ${nextExperimentTitle}.`
        : "The current recommendation already turns into a concrete next experiment packet."
    },
    {
      title: "Avoids wasted wet-lab cycles",
      detail: "Better framing means fewer poorly chosen experiments and a faster path to real signal."
    }
  ];
}

export function learningFlywheelItems(domain: DomainId, nextExperimentTitle?: string) {
  const domainSpecificResult =
    domain === "islets"
      ? "Results from the additive benchmark itself."
      : "Results from the matched benchmark itself.";

  return [
    {
      title: "Reviewed source enrichment",
      detail: "Higher-authority source review reduces ambiguity and improves recommendation quality."
    },
    {
      title: "Cleaner endpoint-standardized evidence",
      detail: "Comparable outcome classes make wedge ranking more trustworthy and less confounded."
    },
    {
      title: "Matched-species comparison data",
      detail: "Better matched comparisons make it easier to separate true protocol effects from model noise."
    },
    {
      title: nextExperimentTitle ?? "Lead experiment results",
      detail: domainSpecificResult
    },
    {
      title: "First proprietary wet-lab replications",
      detail: "Once Atlas can learn from proprietary results, it becomes more than a literature-facing system."
    }
  ];
}

export function currentLimitsItems() {
  return [
    "Atlas is currently operating on a narrow domain set.",
    "Recommendation confidence is scoped to the current reviewed slice.",
    "The reviewed corpus is still limited and uneven across domains.",
    "Atlas does not yet have proprietary wet-lab data.",
    "Discovery remains downstream and is not yet a validated claim."
  ];
}

export function compoundingMoatItems(nextExperimentTitle?: string) {
  return [
    {
      title: "Literature normalization",
      detail: "Comparable protocol structure is hard to build and gets more useful as the corpus grows."
    },
    {
      title: "Explicit wedge ranking",
      detail: "Atlas does not just store evidence. It converts it into an ordered decision surface."
    },
    {
      title: "Contradiction-aware recommendation",
      detail: "Conflicts are tracked as decision objects instead of being buried in notes."
    },
    {
      title: "Experiment packet generation",
      detail: nextExperimentTitle
        ? `${nextExperimentTitle} shows how Atlas turns analysis into action.`
        : "Atlas turns analysis into action by generating concrete next experiments."
    },
    {
      title: "Future proprietary feedback",
      detail: "Once wet-lab results feed back in, the system compounds instead of resetting on each new question."
    }
  ];
}

export function experimentBridgeLabel(nextExperimentTitle?: string) {
  return nextExperimentTitle
    ? `Linked experiment: ${nextExperimentTitle}.`
    : "Linked experiment: next experiment packet.";
}

export function discoveryBridgeStages() {
  return [
    {
      label: "Today",
      title: "Atlas structures literature into decisions",
      detail:
        "Atlas already benchmarks wedges, shows uncertainty, and turns the current literature into specific experiment packets."
    },
    {
      label: "Next",
      title: "Those packets feed a more formal discovery workflow",
      detail:
        "Discovery stays downstream and provisional. It uses what Atlas learned from wedge ranking and experiment design to refresh and triage candidate evidence."
    },
    {
      label: "Later",
      title: "Wet-lab results can compound into a discovery platform",
      detail:
        "Once proprietary experiment results exist, Atlas can pair them with the literature layer to support a real discovery system."
    }
  ];
}

export function humanizeSystemState(value: string) {
  const normalized = value.toLowerCase();

  if (normalized === "stalled-human-gate") {
    return "Waiting on reviewed source evidence";
  }

  if (normalized === "healthy") {
    return "Healthy";
  }

  if (normalized === "degraded") {
    return "Degraded";
  }

  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => capitalize(part))
    .join(" ");
}
