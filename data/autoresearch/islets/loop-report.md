# islets autoresearch loop

Proposals generated: 4
- override proposals: 0
- benchmark proposals: 4
Override auto-apply safe: no

## Benchmark state
- current reviewed inclusion F1: 1
- candidate reviewed inclusion F1: 1
- current reviewed protocol family accuracy: 1
- candidate reviewed protocol family accuracy: 1
- current reviewed paper type accuracy: 1
- candidate reviewed paper type accuracy: 1
- current reviewed outcome coverage: 0.333
- prospective reviewed outcome coverage: 0.333
- current reviewed step-phase coverage: 0.762
- prospective reviewed step-phase coverage: 0.857

## Proposals
- update-benchmark | target=benchmark source=benchmark-depth-autofill | Isolation and Long Term Preservation of Pancreatic Islets from Mouse, Rat and Guinea Pig | fields=stepPhases | confidence=0.87
  rationale=Reviewed in-scope paper is missing benchmark depth labels, but the resolved extraction has explicit protocol/outcome structure that can be promoted for review.
  evidence=step: culture | Rattus norvegicus; Pancreas; Pancreatic islet; rat; pancreas; pancreatic islets Storage in Liquid Nitrogen — 10% DMSO + 10% fetal calf serum, 5°C/min then liquid N2 with post-thaw 14–24 h culture (rat pancreatic islets). || step: storage | Rattus norvegicus; Pancreas; Pancreatic islet; rat; pancreas; pancreatic islets Storage in Liquid Nitrogen — 10% DMSO + 10% fetal calf serum, 5°C/min then liquid N2 with post-thaw 14–24 h culture (rat pancreatic islets). || step: warming | Rattus norvegicus; Pancreas; Pancreatic islet; rat; pancreas; pancreatic islets Storage in Liquid Nitrogen — 10% DMSO + 10% fetal calf serum, 5°C/min then liquid N2 with post-thaw 14–24 h culture (rat pancreatic islets).
  expectedImpact=increase reviewed benchmark depth coverage; create higher-signal review work without changing applied overrides
- update-benchmark | target=benchmark source=benchmark-depth-autofill | Pancreatic islets from non-heart-beating donor pig: Two-layer preservation method in an in vitro porcine model | fields=stepPhases | confidence=0.86
  rationale=Reviewed in-scope paper is missing benchmark depth labels, but the resolved extraction has explicit protocol/outcome structure that can be promoted for review.
  evidence=step: loading | Cryopreserved using DMSO added at 10% in sequential stages to reduce temperature, then transferred into liquid nitrogen at -196°C. || step: storage | Cryopreserved using DMSO added at 10% in sequential stages to reduce temperature, then transferred into liquid nitrogen at -196°C.
  expectedImpact=increase reviewed benchmark depth coverage; create higher-signal review work without changing applied overrides
- update-benchmark | target=benchmark source=benchmark-depth-autofill | Curcumin treatment enhances islet recovery by induction of heat shock response proteins, Hsp70 and heme oxygenase-1, during cryopreservation | fields=stepPhases | confidence=0.815
  rationale=Reviewed in-scope paper is missing benchmark depth labels, but the resolved extraction has explicit protocol/outcome structure that can be promoted for review.
  evidence=step: warming | Mus musculus; Pancreas; Islets of langerhans; 6–8 week old; Swiss Albino mouse; pancreas; islets of Langerhans; ≈150 µm diameter Cryopreservation and thawing — 10% DMSO + 10 µM curcumin cryomix; no curcumin post-thaw (Swiss Albino mouse pancreatic islets). || step: warming | Mus musculus; Pancreas; Islets of langerhans; 6–8 week old; Swiss Albino mouse; pancreas; islets of Langerhans; ≈150 µm diameter Cryopreservation and thawing — 10% DMSO cryomix, no curcumin; 10 µM curcumin post-thaw (Swiss Albino mouse pancreatic islets). || step: warming | Mus musculus; Pancreas; Islets of langerhans; 6–8 week old; Swiss Albino mouse; pancreas; islets of Langerhans; ≈150 µm diameter Cryopreservation and thawing — 10% DMSO cryomix, no curcumin; no curcumin post-thaw (Swiss Albino mouse pancreatic islets).
  expectedImpact=increase reviewed benchmark depth coverage; create higher-signal review work without changing applied overrides
- update-benchmark | target=benchmark source=benchmark-depth-autofill | Polyvinyl Pyrrolidone: A Novel Cryoprotectant in Islet Cell Cryopreservation | fields=stepPhases | confidence=0.813
  rationale=Reviewed in-scope paper is missing benchmark depth labels, but the resolved extraction has explicit protocol/outcome structure that can be promoted for review.
  evidence=step: warming | Rattus norvegicus; Pancreas; Pancreatic islet; Adult; Sprague-Dawley rat; pancreas; islet; adult Cryopreservation and Thawing of Islets — 2 M DMSO (Sprague-Dawley rat pancreatic islets). || step: warming | Rattus norvegicus; Pancreas; Pancreatic islet; Adult; Sprague-Dawley rat; pancreas; islet; adult Cryopreservation and Thawing of Islets — 3 M glycerol (Sprague-Dawley rat pancreatic islets).
  expectedImpact=increase reviewed benchmark depth coverage; create higher-signal review work without changing applied overrides
