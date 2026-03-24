import { OptimizerPolicySchema, type OptimizerPolicy } from "./schema.js";

export const optimizerPolicy: OptimizerPolicy = OptimizerPolicySchema.parse(
{
  "weights": {
    "bias": -0.2,
    "retrievalScore": 2.2,
    "matchedKeywordCount": 1,
    "titleProtocolHits": 0.95,
    "titleExperimentalHits": 0.9,
    "abstractProtocolHits": 0.65,
    "abstractOutcomeHits": 0.45,
    "negativeSignalHits": -1.3,
    "doiPresent": 0.3,
    "journalPresent": 0.2,
    "recentYear": 0.05
  },
  "thresholds": {
    "promote": 3.6,
    "review": 2.3
  },
  "heuristics": {
    "protocolSignals": [
      "cryopreservation",
      "cryopreserved",
      "vitrification",
      "vitrified",
      "freeze",
      "freezing",
      "frozen",
      "warming",
      "thaw",
      "preservation"
    ],
    "experimentalSignals": [
      "effect",
      "effects",
      "evaluation",
      "compare",
      "comparison",
      "improves",
      "improved",
      "viability",
      "function",
      "functional",
      "morphology",
      "survival",
      "ultrastructure"
    ],
    "outcomeSignals": [
      "viability",
      "function",
      "functional",
      "morphology",
      "survival",
      "fertility",
      "follicle",
      "follicular",
      "insulin",
      "transplant"
    ],
    "negativeSignals": [
      "review",
      "mini-review",
      "commentary",
      "book chapter",
      "editorial",
      "opinion",
      "freeze-all",
      "fibroblast"
    ]
  }
}
);

export default optimizerPolicy;
