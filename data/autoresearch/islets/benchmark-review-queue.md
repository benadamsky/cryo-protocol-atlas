# islets benchmark review queue

Source proposal set: 2026-03-23T03:25:21.713Z
Benchmark proposals: 1

## Decision status
- pending: 1
- accept: 0
- reject: 0
- defer: 0

## Policy recommendation
- accept: 0
- defer: 1
- none: 0

## Proposals
- [pending] Successful Cryopreservation of Fetal Porcine Proislets | fields=outcomeClasses | confidence=0.804
  proposalId=benchmark-depth-autofill:a24a1702-5dad-4428-b962-27cd59e2e6e8:outcomeClasses
  recommendation=defer | policyConfidence=0.854
  recommendationReasons=below conservative accept threshold || extraction confidence is below high-trust threshold || outcome classes come from an experimental paper with non-weak outcome evidence || single-field patch is lower-risk to review
  rationale=Reviewed in-scope paper is missing benchmark depth labels, but the resolved extraction has explicit protocol/outcome structure that can be promoted for review.
  evidence=outcome: function (strong) | Conservatively, that supports post-thaw survival or viability, but it does not by itself establish functional or transplantation outcomes. || outcome: transplantation (strong) | Conservatively, that supports post-thaw survival or viability, but it does not by itself establish functional or transplantation outcomes. || outcome: viability (moderate) | viability review note: The title explicitly frames the protocol as successful cryopreservation of fetal porcine proislets.
  expectedOutcomeClasses=function, transplantation, viability
