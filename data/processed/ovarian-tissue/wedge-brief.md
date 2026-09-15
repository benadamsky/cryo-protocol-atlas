# ovarian-tissue wedge brief

Focus question: Which protocol comparison is sharp enough to anchor a first commercial cryopreservation wedge?

## Active wedge
- title: Head-to-head DMSO-centered ovarian tissue benchmark
- category: benchmark
- scientific relevance: 0.673
- company relevance: 0.82
- evidence confidence: 0.475
- translational potential: 0.8
- current read: Best current wedge, but still better treated as a proving ground than a committed entry point.
- recommended next step: DMSO appears repeatedly in ovarian tissue papers, but the corpus mixes unknown, slow-freezing, and vitrification contexts with morphology-heavy endpoints. A direct benchmark should reduce ambiguity faster than another literature pass.

## Standard pattern
- dominant family: slow-freezing
- dominant chemicals: Dimethyl Sulfoxide, Sucrose, Ethylene Glycol
- dominant specimen types: follicles, ovarian tissue
- normalized transitions: cooling -> warming
- representative conditions: Dimethyl Sulfoxide 1.5 M
- interpretation: Current default literature center of gravity is slow-freezing, usually built around Dimethyl Sulfoxide, Sucrose, Ethylene Glycol in follicles, ovarian tissue workflows. Normalized workflow signal is cooling -> warming, with repeated condition mentions such as Dimethyl Sulfoxide 1.5 M.

## Protocol families
- slow-freezing: papers=6 | chemicals=Dimethyl Sulfoxide, Sucrose, Ethylene Glycol | outcomes=morphology, viability, function
  normalized transitions=cooling -> warming
  Most common preserved workflow in-slice, centered on Dimethyl Sulfoxide, Sucrose, Ethylene Glycol. Outcome emphasis is morphology, viability, function, suggesting this is the baseline to beat rather than the frontier.
- comparative: papers=5 | chemicals=Dimethyl Sulfoxide | outcomes=morphology, transplantation, reproductive
  Direct comparison slice is small (5 papers) but high-value because it anchors head-to-head decisions instead of isolated protocol claims.
- vitrification: papers=5 | chemicals=Dimethyl Sulfoxide, Ethylene Glycol, Propylene Glycol | outcomes=morphology, viability, transplantation
  Smaller but sharper cluster, often tied to Dimethyl Sulfoxide, Ethylene Glycol, Propylene Glycol. This is the likely optimization frontier if post-warm outcomes can be made more comparable.

## Dominant CPA patterns
- slow-freezing + Dimethyl Sulfoxide + ovarian tissue | papers=3 | outcomes=viability, morphology, function
- vitrification + Dimethyl Sulfoxide + ovarian tissue | papers=3 | outcomes=morphology, viability, transplantation
- vitrification + Dimethyl Sulfoxide + follicles | papers=3 | outcomes=morphology, viability, transplantation
- vitrification + Ethylene Glycol + ovarian tissue | papers=3 | outcomes=morphology, viability, transplantation
- vitrification + Ethylene Glycol + follicles | papers=3 | outcomes=morphology, viability, transplantation
- slow-freezing + Dimethyl Sulfoxide + follicles | papers=2 | outcomes=viability, morphology

## Contradictions
- none currently surfaced

## Evidence quality
- reviewed gates passing: yes
- reviewed outcome coverage: 0.429
- reviewed step-phase coverage: 0.571
- reviewed minimum-depth ready: yes
- normalized protocols: 16
- protocols with normalization warnings: 0
- missing reviewed outcomes: 4
- missing reviewed step phases: 3
- pending source enrichments: 4
- reviewed source enrichments: 0
- reviewed secondary-source enrichments: 0
- reviewed primary-supported rows: 7
- reviewed secondary-supported rows: 0
- reviewed manual-curation-only rows: 0

## Evidence gaps
- Autologous transplantation of cryopreserved ovary induces the generation of antiovary antibodies in sheep | impact=medium | authority=abstract-only | translational=transplant relevant
  missing fields=outcomeClasses, authority
  rationale=no resolved extraction available for this reviewed paper
- Effect of cryoprotectants on the survival of follicles in frozen mouse ovaries | impact=medium | authority=abstract-only | translational=research only
  missing fields=outcomeClasses, stepPhases, authority, protocolDetail
  rationale=no resolved extraction available for this reviewed paper
- Cryopreservation and in vitro culture of caprine preantral follicles | impact=medium | authority=abstract-only | translational=research only
  missing fields=outcomeClasses, stepPhases, authority, protocolDetail
  rationale=no resolved extraction available for this reviewed paper
- Ovarian and oocyte cryopreservation | impact=medium | authority=abstract-only | translational=transplant relevant
  missing fields=outcomeClasses, stepPhases, authority, protocolDetail
  rationale=no resolved extraction available for this reviewed paper

## Next experiments
- Head-to-head DMSO-centered ovarian tissue benchmark | category=benchmark
  decision question=Should Atlas prioritize "Head-to-head DMSO-centered ovarian tissue benchmark" as the main head-to-head wedge benchmark?
  primary readouts=transplantation, function
  comparison arms=slow-freezing arm | vitrification arm
  why now=Best current wedge, but still better treated as a proving ground than a committed entry point.
- Promote morphology-heavy protocols to viability endpoints | category=endpoint-upgrade
  decision question=Would "Promote morphology-heavy protocols to viability endpoints" materially sharpen the wedge decision if tested next?
  primary readouts=transplantation, function
  comparison arms=current standard protocol | top reported protocol with transplantation endpoint
  why now=This remains one of the highest-signal next experiments in the current domain slice.
- Whole-ovary perfusion and rewarming workflow benchmark | category=scale-up
  decision question=Would "Whole-ovary perfusion and rewarming workflow benchmark" materially sharpen the wedge decision if tested next?
  primary readouts=post-thaw recovery, workflow reproducibility
  comparison arms=current handling workflow | workflow with staged loading/unloading controls
  why now=This remains one of the highest-signal next experiments in the current domain slice.

## Opportunity scan
- Promote morphology-heavy protocols to viability endpoints
  why interesting=Several ovarian tissue protocols that currently look acceptable on morphology alone will reshuffle once they are compared on viability or functional endpoints. Evidence papers=6, strong outcomes=3, contradictions=0.
  pain point=Promising protocols are still over-indexed on viability or in-vitro function rather than transplantation-grade outcomes.
  commercial why now=Commercial relevance depends on whether better protocol evidence can bridge into organ banking, fertility, or transplant-adjacent workflows.
- Whole-ovary perfusion and rewarming workflow benchmark
  why interesting=Whole-ovary success is currently limited more by perfusion/loading workflow quality than by entirely new chemistry. Evidence papers=4, strong outcomes=3, contradictions=0.
  pain point=A small number of promising papers still lack enough procedural detail to compare fairly.
  commercial why now=Commercial relevance depends on whether better protocol evidence can bridge into organ banking, fertility, or transplant-adjacent workflows.
- Head-to-head DMSO-centered ovarian tissue benchmark
  why interesting=A matched-species ovarian tissue benchmark will separate protocol-family effects from paper-to-paper noise in DMSO-centered preservation. Evidence papers=6, strong outcomes=0, contradictions=0.
  pain point=2 relevant papers still have sparse step structure
  commercial why now=Commercial relevance depends on whether better protocol evidence can bridge into organ banking, fertility, or transplant-adjacent workflows.
- Same-species DMSO + EG vitrification benchmark
  why interesting=The apparent promise of DMSO + ethylene glycol in ovarian tissue is currently species-confounded and should be tested within one species and one specimen format. Evidence papers=4, strong outcomes=0, contradictions=0.
  pain point=1 relevant papers still have sparse step structure
  commercial why now=Commercial relevance depends on whether better protocol evidence can bridge into organ banking, fertility, or transplant-adjacent workflows.

## Callout
- Head-to-head DMSO-centered ovarian tissue benchmark is the explicit active wedge. Matrix rows=6, top decision-useful evidence gaps=0, and next experiments are already packetized for review.
