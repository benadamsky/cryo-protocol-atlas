# islets benchmark review queue

Source proposal set: 2026-03-21T03:39:03.466Z
Benchmark proposals: 2

## Decision status
- pending: 2
- accept: 0
- reject: 0
- defer: 0

## Policy recommendation
- accept: 0
- defer: 2
- none: 0

## Proposals
- [pending] Curcumin treatment enhances islet recovery by induction of heat shock response proteins, Hsp70 and heme oxygenase-1, during cryopreservation | fields=outcomeClasses, stepPhases | confidence=0.851
  proposalId=benchmark-depth-autofill:0008fd20-cb99-4666-b48d-c24bd4abd4d1:outcomeClasses+stepPhases
  recommendation=defer | policyConfidence=0.891
  recommendationReasons=below conservative accept threshold || extraction confidence is below high-trust threshold || multi-field patch should be reviewed more conservatively || outcome classes come from an experimental paper with non-weak outcome evidence || protocol steps include multiple explicit procedural phases
  rationale=Reviewed in-scope paper is missing benchmark depth labels, but the resolved extraction has explicit protocol/outcome structure that can be promoted for review.
  evidence=outcome: viability (moderate) | Curcumin treatment enhances islet recovery by induction of heat shock response proteins, Hsp70 and heme oxygenase-1, during cryopreservation. || step: cooling | Islets were slow cooled in a temperature-controlled cooler (Cryobath Freeze Controller, Cryologic, Australia) to −40 °C at 0.25 °C / min and then transferred to liquid nitrogen for 7 days.. || step: storage | Islets were slow cooled in a temperature-controlled cooler (Cryobath Freeze Controller, Cryologic, Australia) to −40 °C at 0.25 °C / min and then transferred to liquid nitrogen for 7 days.. || step: warming | Mus musculus; Pancreas; Islets of langerhans; 6–8 week old; Swiss Albino mouse; pancreas; islets of Langerhans; ≈150 µm diameter Cryopreservation and thawing — 10% DMSO + 10 µM curcumin cryomix; no curcumin post-thaw (Swiss Albino mouse pancreatic islets).
  expectedOutcomeClasses=viability
  expectedStepPhases=cooling, storage, warming
- [pending] Improvement of Human Islet Cryopreservation by a p38 MAPK Inhibitor | fields=stepPhases | confidence=0.81
  proposalId=benchmark-depth-autofill:7cbe1db5-5f6a-4519-9713-bddca96212f7:stepPhases
  recommendation=defer | policyConfidence=0.78
  recommendationReasons=below conservative accept threshold || extraction confidence is below high-trust threshold || single-field patch is lower-risk to review || step-phase evidence is sparse and should stay manual-review first
  rationale=Reviewed in-scope paper is missing benchmark depth labels, but the resolved extraction has explicit protocol/outcome structure that can be promoted for review.
  evidence=step: cooling | The vials were immediately transferred into a freezing compartment, chilled to 4 °C, of an automated, computer-controlled cryounit (CRF2000, Gordinier Electronics, Roseville, MI)..
  expectedStepPhases=cooling
