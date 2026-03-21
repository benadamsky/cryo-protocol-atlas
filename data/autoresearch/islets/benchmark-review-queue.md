# islets benchmark review queue

Source proposal set: 2026-03-21T03:09:23.749Z
Benchmark proposals: 4

## Decision status
- pending: 4
- accept: 0
- reject: 0
- defer: 0

## Policy recommendation
- accept: 2
- defer: 2
- none: 0

## Proposals
- [pending] Isolation and Long Term Preservation of Pancreatic Islets from Mouse, Rat and Guinea Pig | fields=stepPhases | confidence=0.87
  proposalId=benchmark-depth-autofill:6e4ea940-2dbd-4790-b848-c453f6a0f42a:stepPhases
  recommendation=accept | policyConfidence=0.92
  recommendationReasons=extraction confidence is below high-trust threshold || meets conservative accept threshold || protocol steps include multiple explicit procedural phases || single-field patch is lower-risk to review
  rationale=Reviewed in-scope paper is missing benchmark depth labels, but the resolved extraction has explicit protocol/outcome structure that can be promoted for review.
  evidence=step: culture | Rattus norvegicus; Pancreas; Pancreatic islet; rat; pancreas; pancreatic islets Storage in Liquid Nitrogen — 10% DMSO + 10% fetal calf serum, 5°C/min then liquid N2 with post-thaw 14–24 h culture (rat pancreatic islets). || step: storage | Rattus norvegicus; Pancreas; Pancreatic islet; rat; pancreas; pancreatic islets Storage in Liquid Nitrogen — 10% DMSO + 10% fetal calf serum, 5°C/min then liquid N2 with post-thaw 14–24 h culture (rat pancreatic islets). || step: warming | Rattus norvegicus; Pancreas; Pancreatic islet; rat; pancreas; pancreatic islets Storage in Liquid Nitrogen — 10% DMSO + 10% fetal calf serum, 5°C/min then liquid N2 with post-thaw 14–24 h culture (rat pancreatic islets).
  expectedStepPhases=culture, storage, warming
- [pending] Pancreatic islets from non-heart-beating donor pig: Two-layer preservation method in an in vitro porcine model | fields=stepPhases | confidence=0.86
  proposalId=benchmark-depth-autofill:e61a3868-8fcf-4024-96f7-eb4ae8a9456a:stepPhases
  recommendation=accept | policyConfidence=0.91
  recommendationReasons=extraction confidence is below high-trust threshold || meets conservative accept threshold || protocol steps include multiple explicit procedural phases || single-field patch is lower-risk to review
  rationale=Reviewed in-scope paper is missing benchmark depth labels, but the resolved extraction has explicit protocol/outcome structure that can be promoted for review.
  evidence=step: loading | Cryopreserved using DMSO added at 10% in sequential stages to reduce temperature, then transferred into liquid nitrogen at -196°C. || step: storage | Cryopreserved using DMSO added at 10% in sequential stages to reduce temperature, then transferred into liquid nitrogen at -196°C.
  expectedStepPhases=loading, storage
- [pending] Curcumin treatment enhances islet recovery by induction of heat shock response proteins, Hsp70 and heme oxygenase-1, during cryopreservation | fields=stepPhases | confidence=0.815
  proposalId=benchmark-depth-autofill:0008fd20-cb99-4666-b48d-c24bd4abd4d1:stepPhases
  recommendation=defer | policyConfidence=0.785
  recommendationReasons=below conservative accept threshold || extraction confidence is below high-trust threshold || single-field patch is lower-risk to review || step-phase evidence is sparse and should stay manual-review first
  rationale=Reviewed in-scope paper is missing benchmark depth labels, but the resolved extraction has explicit protocol/outcome structure that can be promoted for review.
  evidence=step: warming | Mus musculus; Pancreas; Islets of langerhans; 6–8 week old; Swiss Albino mouse; pancreas; islets of Langerhans; ≈150 µm diameter Cryopreservation and thawing — 10% DMSO + 10 µM curcumin cryomix; no curcumin post-thaw (Swiss Albino mouse pancreatic islets). || step: warming | Mus musculus; Pancreas; Islets of langerhans; 6–8 week old; Swiss Albino mouse; pancreas; islets of Langerhans; ≈150 µm diameter Cryopreservation and thawing — 10% DMSO cryomix, no curcumin; 10 µM curcumin post-thaw (Swiss Albino mouse pancreatic islets). || step: warming | Mus musculus; Pancreas; Islets of langerhans; 6–8 week old; Swiss Albino mouse; pancreas; islets of Langerhans; ≈150 µm diameter Cryopreservation and thawing — 10% DMSO cryomix, no curcumin; no curcumin post-thaw (Swiss Albino mouse pancreatic islets).
  expectedStepPhases=warming
- [pending] Polyvinyl Pyrrolidone: A Novel Cryoprotectant in Islet Cell Cryopreservation | fields=stepPhases | confidence=0.813
  proposalId=benchmark-depth-autofill:4056fdf9-3483-40ce-9ef4-ccd534962039:stepPhases
  recommendation=defer | policyConfidence=0.783
  recommendationReasons=below conservative accept threshold || extraction confidence is below high-trust threshold || single-field patch is lower-risk to review || step-phase evidence is sparse and should stay manual-review first
  rationale=Reviewed in-scope paper is missing benchmark depth labels, but the resolved extraction has explicit protocol/outcome structure that can be promoted for review.
  evidence=step: warming | Rattus norvegicus; Pancreas; Pancreatic islet; Adult; Sprague-Dawley rat; pancreas; islet; adult Cryopreservation and Thawing of Islets — 2 M DMSO (Sprague-Dawley rat pancreatic islets). || step: warming | Rattus norvegicus; Pancreas; Pancreatic islet; Adult; Sprague-Dawley rat; pancreas; islet; adult Cryopreservation and Thawing of Islets — 3 M glycerol (Sprague-Dawley rat pancreatic islets).
  expectedStepPhases=warming
