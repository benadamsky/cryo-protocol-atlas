# Optimizer loop report

- generated at: 2026-03-24T00:23:24.367Z
- strategy path: /Users/benadamsky/Documents/Building/Cryo/cryo-protocol-atlas/.worktrees/optimizer-lane/packages/optimizer/program.md
- domains: islets, ovarian-tissue
- baseline objective: 0.5525
- final objective: 0.5865
- accepted mutations: 3

## Attempts
- attempt 1: weights.bias -0.4 -> -0.2 | accepted=yes | objective=0.5525 -> 0.5801
  rationale=kept because objective improved without violating the promote-precision guardrail
- attempt 2: weights.bias -0.4 -> -0.6 | accepted=no | objective=0.5801 -> 0.5087
  rationale=reverted because the objective did not improve enough
- attempt 3: weights.retrievalScore 2.2 -> 2.4 | accepted=no | objective=0.5801 -> 0.7252
  rationale=reverted because promote precision fell below the guardrail
- attempt 4: weights.retrievalScore 2.2 -> 2 | accepted=no | objective=0.5801 -> 0.565
  rationale=reverted because the objective did not improve enough
- attempt 5: weights.matchedKeywordCount 1 -> 1.15 | accepted=no | objective=0.5801 -> 0.7252
  rationale=reverted because promote precision fell below the guardrail
- attempt 6: weights.matchedKeywordCount 1 -> 0.85 | accepted=no | objective=0.5801 -> 0.5671
  rationale=reverted because the objective did not improve enough
- attempt 7: weights.titleProtocolHits 0.8 -> 0.95 | accepted=yes | objective=0.5801 -> 0.5821
  rationale=kept because objective improved without violating the promote-precision guardrail
- attempt 8: weights.titleProtocolHits 0.8 -> 0.65 | accepted=no | objective=0.5821 -> 0.5748
  rationale=reverted because the objective did not improve enough
- attempt 9: weights.titleExperimentalHits 0.9 -> 1.05 | accepted=no | objective=0.5821 -> 0.7289
  rationale=reverted because promote precision fell below the guardrail
- attempt 10: weights.titleExperimentalHits 0.9 -> 0.75 | accepted=no | objective=0.5821 -> 0.5817
  rationale=reverted because the objective did not improve enough
- attempt 11: weights.abstractProtocolHits 0.65 -> 0.8 | accepted=no | objective=0.5821 -> 0.7357
  rationale=reverted because promote precision fell below the guardrail
- attempt 12: weights.abstractProtocolHits 0.65 -> 0.5 | accepted=no | objective=0.5821 -> 0.5676
  rationale=reverted because the objective did not improve enough
- attempt 13: weights.abstractOutcomeHits 0.45 -> 0.6 | accepted=no | objective=0.5821 -> 0.5803
  rationale=reverted because the objective did not improve enough
- attempt 14: weights.abstractOutcomeHits 0.45 -> 0.3 | accepted=no | objective=0.5821 -> 0.5712
  rationale=reverted because the objective did not improve enough
- attempt 15: weights.negativeSignalHits -1.3 -> -1.1 | accepted=no | objective=0.5821 -> 0.5821
  rationale=reverted because the objective did not improve enough
- attempt 16: weights.negativeSignalHits -1.3 -> -1.5 | accepted=no | objective=0.5821 -> 0.5821
  rationale=reverted because the objective did not improve enough
- attempt 17: weights.doiPresent 0.3 -> 0.4 | accepted=no | objective=0.5821 -> 0.7262
  rationale=reverted because promote precision fell below the guardrail
- attempt 18: weights.doiPresent 0.3 -> 0.2 | accepted=no | objective=0.5821 -> 0.5607
  rationale=reverted because the objective did not improve enough
- attempt 19: weights.journalPresent 0.2 -> 0.3 | accepted=no | objective=0.5821 -> 0.7262
  rationale=reverted because promote precision fell below the guardrail
- attempt 20: weights.journalPresent 0.2 -> 0.1 | accepted=no | objective=0.5821 -> 0.5607
  rationale=reverted because the objective did not improve enough
- attempt 21: weights.recentYear 0.15 -> 0.25 | accepted=no | objective=0.5821 -> 0.5781
  rationale=reverted because the objective did not improve enough
- attempt 22: weights.recentYear 0.15 -> 0.05 | accepted=yes | objective=0.5821 -> 0.5865
  rationale=kept because objective improved without violating the promote-precision guardrail
- attempt 23: thresholds.promote 3.6 -> 3.75 | accepted=no | objective=0.5865 -> 0.5865
  rationale=reverted because the objective did not improve enough
- attempt 24: thresholds.promote 3.6 -> 3.45 | accepted=no | objective=0.5865 -> 0.7306
  rationale=reverted because promote precision fell below the guardrail
