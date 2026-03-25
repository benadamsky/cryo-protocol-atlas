# islets wedge brief

Focus question: What is the strongest first cryopreservation wedge in islets, and what evidence would justify a real entry point?

## Active wedge
- title: Additive-assisted islet recovery benchmark on a fixed base cryomix
- category: benchmark
- scientific relevance: 0.89
- company relevance: 0.786
- evidence confidence: 0.786
- translational potential: 0.733
- current read: Best current wedge in islets. The literature is strong enough to justify a focused additive benchmark, but not strong enough to claim a winning adjunct yet.
- recommended next step: Run a fixed-backbone additive benchmark with p38 MAPK inhibitor, Trehalose, Beraprost Sodium, Polyvinyl Pyrrolidone on a DMSO-centered base mix, using post-thaw function as the primary readout.

## Standard pattern
- dominant family: slow-freezing
- dominant chemicals: Dimethyl Sulfoxide, Sucrose, Ethylene Glycol
- dominant specimen types: islets, pancreatic islets
- normalized transitions: cooling -> storage, cooling -> warming, loading -> cooling
- representative conditions: Dimethyl Sulfoxide 2 M, Dimethyl Sulfoxide 1 M, Dimethyl Sulfoxide 0.67 M
- interpretation: Current default literature center of gravity is slow-freezing, usually built around Dimethyl Sulfoxide, Sucrose, Ethylene Glycol in islets, pancreatic islets workflows. Normalized workflow signal is cooling -> storage, cooling -> warming, loading -> cooling, with repeated condition mentions such as Dimethyl Sulfoxide 2 M, Dimethyl Sulfoxide 1 M, Dimethyl Sulfoxide 0.67 M.

## Protocol families
- slow-freezing: papers=39 | chemicals=Dimethyl Sulfoxide, Sucrose, Ethylene Glycol | outcomes=viability, function, transplantation
  normalized transitions=cooling -> storage, cooling -> warming, loading -> cooling
  Most common preserved workflow in-slice, centered on Dimethyl Sulfoxide, Sucrose, Ethylene Glycol. Outcome emphasis is viability, function, transplantation, suggesting this is the baseline to beat rather than the frontier.
- vitrification: papers=6 | chemicals=Dimethyl Sulfoxide, Ethylene Glycol, Sucrose | outcomes=function, viability, transplantation
  normalized transitions=loading -> storage, storage -> warming
  Smaller but sharper cluster, often tied to Dimethyl Sulfoxide, Ethylene Glycol, Sucrose. This is the likely optimization frontier if post-warm outcomes can be made more comparable.
- comparative: papers=1 | chemicals=Dimethyl Sulfoxide, Ethylene Glycol, Sucrose | outcomes=function
  Direct comparison slice is small (1 papers) but high-value because it anchors head-to-head decisions instead of isolated protocol claims.

## Dominant CPA patterns
- slow-freezing + Dimethyl Sulfoxide + islets | papers=32 | outcomes=function, viability, transplantation, morphology
- slow-freezing + Dimethyl Sulfoxide + pancreatic islets | papers=26 | outcomes=function, viability, transplantation, morphology
- slow-freezing + Sucrose + islets | papers=7 | outcomes=function, transplantation, viability
- slow-freezing + Sucrose + pancreatic islets | papers=6 | outcomes=function, transplantation, viability
- vitrification + Dimethyl Sulfoxide + islets | papers=5 | outcomes=function, viability, transplantation
- vitrification + Dimethyl Sulfoxide + pancreatic islets | papers=5 | outcomes=function, viability, transplantation

## Contradictions
- Dimethyl Sulfoxide in islets, pancreatic islets
  papers=Curcumin treatment enhances islet recovery by induction of heat shock response proteins, Hsp70 and heme oxygenase-1, during cryopreservation vs Vitrification of Mouse Islets of Langerhans: Comparison with a More Conventional Freezing Method
  why it matters=Comparable species/context with shared outcome readout but different preservation families. Likely confounds: endpoint mismatch.

## Evidence quality
- reviewed gates passing: yes
- reviewed outcome coverage: 1
- reviewed step-phase coverage: 0.976
- reviewed minimum-depth ready: yes
- normalized protocols: 46
- protocols with normalization warnings: 5
- missing reviewed outcomes: 0
- missing reviewed step phases: 1
- pending source enrichments: 1
- reviewed source enrichments: 18
- reviewed secondary-source enrichments: 2
- reviewed primary-supported rows: 42
- reviewed secondary-supported rows: 2
- reviewed manual-curation-only rows: 0

## Evidence gaps
- Improvement of Human Islet Cryopreservation by a p38 MAPK Inhibitor | impact=high | authority=primary-backed | translational=clinically adjacent
  missing fields=protocolDetail
  rationale=title/abstract suggests a positive result but does not state a concrete benchmark-safe outcome class
- Polyvinyl Pyrrolidone: A Novel Cryoprotectant in Islet Cell Cryopreservation | impact=medium | authority=primary-backed | translational=preclinical
  missing fields=authority
  rationale=title/abstract suggests a positive result but does not state a concrete benchmark-safe outcome class
- Effects of Encapsulation on In Vitro Function of Cryopreserved Rat Islets | impact=medium | authority=abstract-only | translational=preclinical
  missing fields=stepPhases, authority, protocolDetail
  rationale=Step phases for "Effects of Encapsulation on In Vitro Function of Cryopreserved Rat Islets" still require manual or fuller-source confirmation before benchmark promotion.

## Next experiments
- Additive-assisted islet recovery benchmark on a fixed base cryomix | category=benchmark
  decision question=Should Atlas prioritize "Additive-assisted islet recovery benchmark on a fixed base cryomix" as the main head-to-head wedge benchmark?
  primary readouts=function, viability
  comparison arms=base cryomix only | base cryomix + p38 MAPK inhibitor | base cryomix + Trehalose | base cryomix + Beraprost Sodium | base cryomix + Polyvinyl Pyrrolidone
  why now=Best current wedge in islets. The literature is strong enough to justify a focused additive benchmark, but not strong enough to claim a winning adjunct yet.
- Matched-species islet vitrification vs slow-freezing benchmark | category=benchmark
  decision question=Would "Matched-species islet vitrification vs slow-freezing benchmark" materially sharpen the wedge decision if tested next?
  primary readouts=function, viability
  comparison arms=slow-freezing arm | vitrification arm
  why now=This remains one of the highest-signal next experiments in the current domain slice.
- Promote islet function-heavy protocols to transplantation endpoints | category=endpoint-upgrade
  decision question=Would "Promote islet function-heavy protocols to transplantation endpoints" materially sharpen the wedge decision if tested next?
  primary readouts=transplantation, function
  comparison arms=current standard protocol | top reported protocol with transplantation endpoint
  why now=This remains one of the highest-signal next experiments in the current domain slice.

## Opportunity scan
- Matched-species islet vitrification vs slow-freezing benchmark
  why interesting=The current islet corpus overweights slow-freezing, so a matched-species comparison is needed to separate real vitrification gains from endpoint and species confounding. Evidence papers=6, strong outcomes=4, contradictions=20.
  pain point=Vitrification and slow-freezing remain confounded by species and endpoint differences.
  commercial why now=A cleaner benchmark wedge maps to transplant and cell-banking workflows where protocol uncertainty still blocks standardization.
- Promote islet function-heavy protocols to transplantation endpoints
  why interesting=Several islet protocols that look promising on insulin secretion or in-vitro function will reorder once they are compared on graft or transplantation outcomes. Evidence papers=6, strong outcomes=4, contradictions=10.
  pain point=Promising protocols are still over-indexed on viability or in-vitro function rather than transplantation-grade outcomes.
  commercial why now=Moving from viability-only claims to transplantation/function claims is what makes an optimization story commercially credible.
- Full-text protocol resolution for sparse islet thaw/loading workflows
  why interesting=A small number of islet papers still look interesting, but their step structure is too thin to compare fairly against the rest of the corpus. Evidence papers=6, strong outcomes=3, contradictions=1.
  pain point=A small number of promising papers still lack enough procedural detail to compare fairly.
  commercial why now=This is close enough to real preservation workflows that better protocol evidence could matter commercially, not just academically.
- Scale-up benchmark for banked or bulk islet handling
  why interesting=Scale-up losses in islet banking may come from handling and thaw workflow variance rather than core cryomix choice alone. Evidence papers=3, strong outcomes=3, contradictions=10.
  pain point=10 unresolved contradictions remain in the relevant evidence slice
  commercial why now=A cleaner benchmark wedge maps to transplant and cell-banking workflows where protocol uncertainty still blocks standardization.

## Callout
- Additive-assisted islet recovery benchmark on a fixed base cryomix is the explicit active wedge. Matrix rows=6, top decision-useful evidence gaps=1, and next experiments are already packetized for review.
