# ovarian-tissue protocol atlas

Total papers: 16

## Quality signals
- unknown protocol families: 0
- unknown protocol family rate: 0
- unknown step phases: 7
- contradiction count: 0
- experimental papers: 9
- methods papers: 5
- review papers: 2
- commentary papers: 0

## Protocol families
- slow-freezing: 6
- comparative: 5
- vitrification: 5

## Top chemicals
- Dimethyl Sulfoxide: 7
- Ethylene Glycol: 4
- Propylene Glycol: 2
- Sucrose: 2
- Ringer-Acetate: 1

## Top specimen types
- follicles: 12
- ovarian tissue: 12
- oocytes: 4
- whole ovary: 4
- ovarian cortex: 1

## Top outcome classes
- morphology: 11
- viability: 8
- transplantation: 4
- reproductive: 3
- function: 2

## Top protocol phases
- loading: 32
- storage: 16
- cooling: 12
- culture: 9
- unknown: 7
- warming: 6
- perfusion: 5
- assessment: 4
- equilibration: 2

## High-confidence papers
- Follicular viability and morphology of sheep ovaries after exposure to cryoprotectant and cryopreservation with different freezing protocols | type=methods | family=slow-freezing | confidence=0.95 | chemicals=Dimethyl Sulfoxide, Propylene Glycol | specimen=follicles, ovarian tissue | phases=equilibration, unknown, cooling, assessment
  species=sheep
- Cat ovarian follicle ultrastructure after cryopreservation with ethylene glycol and dimethyl sulfoxide | type=experimental | family=slow-freezing | confidence=0.95 | chemicals=Dimethyl Sulfoxide, Ethylene Glycol, Sucrose | specimen=follicles, ovarian tissue | phases=storage, perfusion
  species=cat
- Vitrification of collared peccary ovarian tissue using open or closed systems and different intracellular cryoprotectants | type=experimental | family=vitrification | confidence=0.9 | chemicals=Dimethyl Sulfoxide, Ethylene Glycol | specimen=ovarian tissue, follicles | phases=loading, warming
  species=peccary
- FUNCTIONAL PRESERVATION AFTER OVARIAN TISSUE AND WHOLE OVARY VITRIFICATION AND AUTO-TRANSPLANTATION IN LARGE ANIMAL MODELS | type=experimental | family=comparative | confidence=0.83 | chemicals=none | specimen=ovarian tissue, whole ovary, follicles, oocytes | phases=loading, storage, cooling, perfusion
  species=human, sheep, pig, primate
- Cryopreservation of human ovarian tissue: Comparison of novel direct cover vitriﬁcation and conventional vitriﬁcation | type=experimental | family=vitrification | confidence=0.82 | chemicals=Dimethyl Sulfoxide, Ethylene Glycol | specimen=ovarian tissue, follicles | phases=equilibration, loading
  species=human
- Optimization of freezing and thawing protocols for human ovarian tissue cryopreservation through thermophysical characterisation of freezing medium by differential scanning calorimetry | type=methods | family=slow-freezing | confidence=0.8 | chemicals=Dimethyl Sulfoxide, Sucrose | specimen=ovarian tissue | phases=cooling, warming
  species=human
- Clinical grade vitriﬁcation of human ovarian tissue: an ultrastructural analysis of follicles and stroma in vitriﬁed tissue | type=experimental | family=vitrification | confidence=0.78 | chemicals=Dimethyl Sulfoxide, Ethylene Glycol, Propylene Glycol | specimen=ovarian tissue, follicles | phases=loading, warming, assessment
  species=human
- Viability and function of the cryopreserved whole rat ovary: comparison between slow-freezing and vitrification | type=experimental | family=comparative | confidence=0.77 | chemicals=Dimethyl Sulfoxide | specimen=follicles | phases=loading, unknown, warming, assessment, storage
  species=rat
- Vitrified sheep isolated secondary follicles are able to grow and form antrum after a short period of in vitro culture | type=experimental | family=vitrification | confidence=0.77 | chemicals=none | specimen=follicles, ovarian tissue, oocytes | phases=loading, culture
  species=sheep
- Autologous transplantation of cryopreserved ovary induces the generation of antiovary antibodies in sheep | type=experimental | family=slow-freezing | confidence=0.76 | chemicals=none | specimen=ovarian tissue, whole ovary | phases=cooling, storage, warming
  species=sheep

## Uncertainty hotspots
- slow-freezing + Dimethyl Sulfoxide + ovarian tissue | papers=3 | outcomes=viability, morphology, function
- vitrification + Dimethyl Sulfoxide + ovarian tissue | papers=3 | outcomes=morphology, viability, transplantation
- vitrification + Dimethyl Sulfoxide + follicles | papers=3 | outcomes=morphology, viability, transplantation
- vitrification + Ethylene Glycol + ovarian tissue | papers=3 | outcomes=morphology, viability, transplantation
- vitrification + Ethylene Glycol + follicles | papers=3 | outcomes=morphology, viability, transplantation
- slow-freezing + Dimethyl Sulfoxide + follicles | papers=2 | outcomes=viability, morphology
- slow-freezing + Sucrose + ovarian tissue | papers=2 | outcomes=viability, morphology, function

## Contradictions
- none detected yet

## Ranked hypotheses
- Promote morphology-heavy protocols to viability endpoints | category=endpoint-upgrade | priority=0.623 | evidence=0.867 | uncertainty=0 | actionability=0.8
  claim=Several ovarian tissue protocols that currently look acceptable on morphology alone will reshuffle once they are compared on viability or functional endpoints.
  evidence=papers:6, experimental:4, comparative:2, species:5, strong-outcomes:1, transplantation:2, contradictions:0, sparse-protocols:0
  proposed-experiment=The current corpus is still dominated by morphology outcomes. Running the same preservation conditions with viability-focused readouts is likely higher signal than inventing a new formulation immediately.
- Head-to-head DMSO-centered ovarian tissue benchmark | category=benchmark | priority=0.54 | evidence=0.583 | uncertainty=0 | actionability=0.84
  claim=A matched-species ovarian tissue benchmark will separate protocol-family effects from paper-to-paper noise in DMSO-centered preservation.
  evidence=papers:6, experimental:4, comparative:0, species:4, strong-outcomes:0, transplantation:1, contradictions:0, sparse-protocols:0
  proposed-experiment=DMSO appears repeatedly in ovarian tissue papers, but the corpus mixes unknown, slow-freezing, and vitrification contexts with morphology-heavy endpoints. A direct benchmark should reduce ambiguity faster than another literature pass.
- Same-species DMSO + EG vitrification benchmark | category=benchmark | priority=0.517 | evidence=0.517 | uncertainty=0 | actionability=0.84
  claim=The apparent promise of DMSO + ethylene glycol in ovarian tissue is currently species-confounded and should be tested within one species and one specimen format.
  evidence=papers:4, experimental:4, comparative:0, species:3, strong-outcomes:0, transplantation:1, contradictions:0, sparse-protocols:0
  proposed-experiment=The corpus shows DMSO + EG in ovarian tissue, but the strongest papers are spread across different species. A same-species benchmark would tell us whether the signal is chemistry-driven or model-driven.
- Whole-ovary perfusion and rewarming workflow benchmark | category=scale-up | priority=0.48 | evidence=0.55 | uncertainty=0 | actionability=0.72
  claim=Whole-ovary success is currently limited more by perfusion/loading workflow quality than by entirely new chemistry.
  evidence=papers:2, experimental:1, comparative:1, species:4, strong-outcomes:1, transplantation:1, contradictions:0, sparse-protocols:0
  proposed-experiment=Whole-ovary papers are sparse but repeatedly mention perfusion, controlled gradients, and rewarming. A workflow benchmark around loading/unloading plus perfusion measurements is a plausible scale-up experiment.

## Suggested next experiments
- Head-to-head DMSO-centered ovarian tissue benchmark | category=benchmark | confidence=0.84
  hypothesis=A matched-species ovarian tissue benchmark will separate protocol-family effects from paper-to-paper noise in DMSO-centered preservation.
  rationale=DMSO appears repeatedly in ovarian tissue papers, but the corpus mixes unknown, slow-freezing, and vitrification contexts with morphology-heavy endpoints. A direct benchmark should reduce ambiguity faster than another literature pass.
  context=chemicals:Dimethyl Sulfoxide | specimen:ovarian tissue | families:slow-freezing, vitrification
- Same-species DMSO + EG vitrification benchmark | category=benchmark | confidence=0.79
  hypothesis=The apparent promise of DMSO + ethylene glycol in ovarian tissue is currently species-confounded and should be tested within one species and one specimen format.
  rationale=The corpus shows DMSO + EG in ovarian tissue, but the strongest papers are spread across different species. A same-species benchmark would tell us whether the signal is chemistry-driven or model-driven.
  context=chemicals:Dimethyl Sulfoxide, Ethylene Glycol | specimen:ovarian tissue, follicles | families:slow-freezing, vitrification
- Promote morphology-heavy protocols to viability endpoints | category=endpoint-upgrade | confidence=0.82
  hypothesis=Several ovarian tissue protocols that currently look acceptable on morphology alone will reshuffle once they are compared on viability or functional endpoints.
  rationale=The current corpus is still dominated by morphology outcomes. Running the same preservation conditions with viability-focused readouts is likely higher signal than inventing a new formulation immediately.
  context=chemicals:Dimethyl Sulfoxide, Propylene Glycol, Ethylene Glycol, Sucrose | specimen:ovarian tissue, follicles | families:comparative, slow-freezing, vitrification
- Whole-ovary perfusion and rewarming workflow benchmark | category=scale-up | confidence=0.76
  hypothesis=Whole-ovary success is currently limited more by perfusion/loading workflow quality than by entirely new chemistry.
  rationale=Whole-ovary papers are sparse but repeatedly mention perfusion, controlled gradients, and rewarming. A workflow benchmark around loading/unloading plus perfusion measurements is a plausible scale-up experiment.
  context=chemicals:Ringer-Acetate | specimen:whole ovary | families:comparative, slow-freezing

## Override impact
- overrides applied: 19
- excluded papers: 12
- unknown protocol families resolved: 15
- unknown protocol family rate delta: 0.54
- unknown step phase delta: 15
- experimental paper delta: -1
- methods paper delta: -3
- review paper delta: -1
- commentary paper delta: 0

## Baseline vs resolved quality
- unknown protocol families: 15 -> 0
- unknown step phases: 22 -> 7
- contradictions: 0 -> 0
- experimental papers: 10 -> 9
- methods papers: 8 -> 5
- review papers: 3 -> 2
- commentary papers: 0 -> 0
