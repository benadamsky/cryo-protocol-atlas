# islets autoresearch loop

Proposals generated: 4
- override proposals: 3
- benchmark proposals: 1
Override auto-apply safe: yes

## Benchmark state
- current reviewed inclusion F1: 1
- candidate reviewed inclusion F1: 1
- current reviewed protocol family accuracy: 1
- candidate reviewed protocol family accuracy: 1
- current reviewed paper type accuracy: 1
- candidate reviewed paper type accuracy: 1
- current reviewed outcome coverage: 0.738
- prospective reviewed outcome coverage: 0.762
- current reviewed step-phase coverage: 0.976
- prospective reviewed step-phase coverage: 0.976

## Proposals
- update-benchmark | target=benchmark source=benchmark-depth-autofill | Successful Cryopreservation of Fetal Porcine Proislets | fields=outcomeClasses | confidence=0.804
  rationale=Reviewed in-scope paper is missing benchmark depth labels, but the resolved extraction has explicit protocol/outcome structure that can be promoted for review.
  evidence=outcome: function (strong) | Conservatively, that supports post-thaw survival or viability, but it does not by itself establish functional or transplantation outcomes. || outcome: transplantation (strong) | Conservatively, that supports post-thaw survival or viability, but it does not by itself establish functional or transplantation outcomes. || outcome: viability (moderate) | viability review note: The title explicitly frames the protocol as successful cryopreservation of fetal porcine proislets.
  expectedImpact=increase reviewed benchmark depth coverage; create higher-signal review work without changing applied overrides
- update-override | target=override source=reviewed-benchmark-repair | Cryopreservation of Human Pancreatic Islets From Non-Heart-Beating Donors Using Hydroxyethyl Starch and Dimethyl Sulfoxide as Cryoprotectants | fields=outcomeClasses | confidence=1
  rationale=Resolved output diverges from reviewed benchmark labels for this paper.
  expectedImpact=improve reviewed field accuracy; preserve reviewed benchmark alignment
- update-override | target=override source=reviewed-benchmark-repair | Polyvinyl Pyrrolidone: A Novel Cryoprotectant in Islet Cell Cryopreservation | fields=stepPhases | confidence=1
  rationale=Resolved output diverges from reviewed benchmark labels for this paper.
  expectedImpact=improve reviewed field accuracy; preserve reviewed benchmark alignment
- update-override | target=override source=reviewed-benchmark-repair | Successful Long-Term Cryopreservation of Highly Purified Canine Islets | fields=outcomeClasses | confidence=1
  rationale=Resolved output diverges from reviewed benchmark labels for this paper.
  expectedImpact=improve reviewed field accuracy; preserve reviewed benchmark alignment
