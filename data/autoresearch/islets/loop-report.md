# islets autoresearch loop

Proposals generated: 2
- override proposals: 0
- benchmark proposals: 2
Override auto-apply safe: no

## Benchmark state
- current reviewed inclusion F1: 1
- candidate reviewed inclusion F1: 1
- current reviewed protocol family accuracy: 1
- candidate reviewed protocol family accuracy: 1
- current reviewed paper type accuracy: 1
- candidate reviewed paper type accuracy: 1
- current reviewed outcome coverage: 0.571
- prospective reviewed outcome coverage: 0.571
- current reviewed step-phase coverage: 0.929
- prospective reviewed step-phase coverage: 0.976

## Proposals
- update-benchmark | target=benchmark source=benchmark-depth-autofill | Curcumin treatment enhances islet recovery by induction of heat shock response proteins, Hsp70 and heme oxygenase-1, during cryopreservation | fields=stepPhases | confidence=0.858
  rationale=Reviewed in-scope paper is missing benchmark depth labels, but the resolved extraction has explicit protocol/outcome structure that can be promoted for review.
  evidence=step: cooling | Islets were slow cooled in a temperature-controlled cooler (Cryobath Freeze Controller, Cryologic, Australia) to −40 °C at 0.25 °C / min and then transferred to liquid nitrogen for 7 days.. || step: storage | Islets were slow cooled in a temperature-controlled cooler (Cryobath Freeze Controller, Cryologic, Australia) to −40 °C at 0.25 °C / min and then transferred to liquid nitrogen for 7 days.. || step: warming | Mus musculus; Pancreas; Islets of langerhans; 6–8 week old; Swiss Albino mouse; pancreas; islets of Langerhans; ≈150 µm diameter Cryopreservation and thawing — 10% DMSO + 10 µM curcumin cryomix; no curcumin post-thaw (Swiss Albino mouse pancreatic islets).
  expectedImpact=increase reviewed benchmark depth coverage; create higher-signal review work without changing applied overrides
- update-benchmark | target=benchmark source=benchmark-depth-autofill | Improvement of Human Islet Cryopreservation by a p38 MAPK Inhibitor | fields=stepPhases | confidence=0.81
  rationale=Reviewed in-scope paper is missing benchmark depth labels, but the resolved extraction has explicit protocol/outcome structure that can be promoted for review.
  evidence=step: cooling | The vials were immediately transferred into a freezing compartment, chilled to 4 °C, of an automated, computer-controlled cryounit (CRF2000, Gordinier Electronics, Roseville, MI)..
  expectedImpact=increase reviewed benchmark depth coverage; create higher-signal review work without changing applied overrides
