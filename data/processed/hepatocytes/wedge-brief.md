# hepatocytes wedge brief

Focus question: What is the strongest first cryopreservation wedge in hepatocytes, and what evidence would justify a real entry point?

## Active wedge
- title: Additive-assisted hepatocyte attachment and function benchmark on a fixed base cryomix
- category: benchmark
- scientific relevance: 0.944
- company relevance: 0.92
- evidence confidence: 0.087
- translational potential: 1
- current read: Best current wedge, but still better treated as a proving ground than a committed entry point.
- recommended next step: Run a fixed-backbone additive benchmark with Trehalose, Alginate, Fetal Bovine Serum, University of Wisconsin Solution on a DMSO-centered base mix, using post-thaw function as the primary readout.

## Standard pattern
- dominant family: unknown
- dominant chemicals: Dimethyl Sulfoxide, Fetal Bovine Serum, University of Wisconsin Solution
- dominant specimen types: hepatocytes, human hepatocytes
- normalized transitions: warming -> culture, storage -> warming, cooling -> storage
- representative conditions: Dimethyl Sulfoxide 300 mM, Dimethyl Sulfoxide 5 mM, Dimethyl Sulfoxide 1.8 M
- interpretation: Current default literature center of gravity is unknown, usually built around Dimethyl Sulfoxide, Fetal Bovine Serum, University of Wisconsin Solution in hepatocytes, human hepatocytes workflows. Normalized workflow signal is warming -> culture, storage -> warming, cooling -> storage, with repeated condition mentions such as Dimethyl Sulfoxide 300 mM, Dimethyl Sulfoxide 5 mM, Dimethyl Sulfoxide 1.8 M.

## Protocol families
- unknown: papers=287 | chemicals=Dimethyl Sulfoxide, Fetal Bovine Serum, University of Wisconsin Solution | outcomes=function, viability, transplantation
  normalized transitions=warming -> culture, storage -> warming, cooling -> storage
  Family labeling is still diffuse here, which is a sign of either broad legacy literature or evidence that remains too abstract-level to classify safely.
- vitrification: papers=15 | chemicals=Ethylene Glycol, Sucrose, Dimethyl Sulfoxide | outcomes=viability, function, transplantation
  Smaller but sharper cluster, often tied to Ethylene Glycol, Sucrose, Dimethyl Sulfoxide. This is the likely optimization frontier if post-warm outcomes can be made more comparable.
- slow-freezing: papers=4 | chemicals=Dimethyl Sulfoxide, Fetal Bovine Serum, University of Wisconsin Solution | outcomes=function, viability, morphology
  Most common preserved workflow in-slice, centered on Dimethyl Sulfoxide, Fetal Bovine Serum, University of Wisconsin Solution. Outcome emphasis is function, viability, morphology, suggesting this is the baseline to beat rather than the frontier.

## Dominant CPA patterns
- unknown + Dimethyl Sulfoxide + hepatocytes | papers=71 | outcomes=transplantation, viability, function, morphology
- unknown + Dimethyl Sulfoxide + human hepatocytes | papers=23 | outcomes=transplantation, viability, function, morphology
- unknown + Dimethyl Sulfoxide + primary hepatocytes | papers=20 | outcomes=transplantation, viability, function, morphology
- unknown + Fetal Bovine Serum + hepatocytes | papers=19 | outcomes=transplantation, function, viability, morphology
- unknown + University of Wisconsin Solution + hepatocytes | papers=13 | outcomes=function, viability, transplantation, morphology
- unknown + Alginate + hepatocytes | papers=12 | outcomes=transplantation, function, viability, morphology

## Contradictions
- Dimethyl Sulfoxide, Fetal Bovine Serum in hepatocytes
  papers=Biochemical functionality and recovery of hepatocytes after deep freezing storage vs Drug metabolism and viability studies in cryopreserved rat hepatocytes
  why it matters=Comparable species/context with shared outcome readout but different preservation families. Likely confounds: endpoint mismatch, sparse protocol detail.
- Dimethyl Sulfoxide in hepatocytes
  papers=Biochemical functionality and recovery of hepatocytes after deep freezing storage vs Influence of cell culture configuration on the post-cryopreservation viability of primary rat hepatocytes
  why it matters=Comparable species/context with shared outcome readout but different preservation families. Likely confounds: endpoint mismatch, sparse protocol detail.

## Evidence quality
- reviewed gates passing: no
- reviewed outcome coverage: 0
- reviewed step-phase coverage: 0
- reviewed minimum-depth ready: no
- normalized protocols: 306
- protocols with normalization warnings: 13
- missing reviewed outcomes: 0
- missing reviewed step phases: 0
- pending source enrichments: 0
- reviewed source enrichments: 0
- reviewed secondary-source enrichments: 0
- reviewed primary-supported rows: 0
- reviewed secondary-supported rows: 0
- reviewed manual-curation-only rows: 0

## Evidence gaps
- none currently prioritized

## Next experiments
- Additive-assisted hepatocyte attachment and function benchmark on a fixed base cryomix | category=benchmark
  decision question=Should Atlas prioritize "Additive-assisted hepatocyte attachment and function benchmark on a fixed base cryomix" as the main head-to-head wedge benchmark?
  primary readouts=function, viability
  comparison arms=base cryomix only | base cryomix + Trehalose | base cryomix + Alginate | base cryomix + Fetal Bovine Serum | base cryomix + University of Wisconsin Solution
  why now=Best current wedge, but still better treated as a proving ground than a committed entry point.
- Promote hepatocyte function-heavy protocols to transplantation endpoints | category=endpoint-upgrade
  decision question=Would "Promote hepatocyte function-heavy protocols to transplantation endpoints" materially sharpen the wedge decision if tested next?
  primary readouts=transplantation, function
  comparison arms=current standard protocol | top reported protocol with transplantation endpoint
  why now=This remains one of the highest-signal next experiments in the current domain slice.
- Scale-up benchmark for banked or bulk hepatocyte handling | category=scale-up
  decision question=Would "Scale-up benchmark for banked or bulk hepatocyte handling" materially sharpen the wedge decision if tested next?
  primary readouts=post-thaw recovery, workflow reproducibility
  comparison arms=current handling workflow | workflow with staged loading/unloading controls
  why now=This remains one of the highest-signal next experiments in the current domain slice.

## Opportunity scan
- Full-text protocol resolution for sparse hepatocyte thaw/loading workflows
  why interesting=A number of hepatocyte papers look relevant, but their step structure is too thin to compare fairly against the rest of the corpus. Evidence papers=6, strong outcomes=5, contradictions=0.
  pain point=A small number of promising papers still lack enough procedural detail to compare fairly.
  commercial why now=This is close enough to real hepatocyte supply and transplant workflows that better protocol evidence could matter commercially, not just academically.
- Additive-assisted hepatocyte attachment and function benchmark on a fixed base cryomix
  why interesting=Several hepatocyte papers imply that post-thaw attachment and function gains come from adjuncts added around a standard DMSO-centered mix rather than from new base CPA chemistry. Evidence papers=6, strong outcomes=6, contradictions=0.
  pain point=Adjunct compounds recur in the literature, but they are not benchmarked head-to-head on a fixed base cryomix.
  commercial why now=A cleaner benchmark wedge maps to hepatocyte supply, cell-therapy, and drug-metabolism workflows where post-thaw attachment and function still vary lot to lot.
- Promote hepatocyte function-heavy protocols to transplantation endpoints
  why interesting=Several hepatocyte protocols that look promising on attachment or in-vitro metabolic function will reorder once they are compared on engraftment or transplantation outcomes. Evidence papers=6, strong outcomes=6, contradictions=0.
  pain point=Promising protocols are still over-indexed on viability or in-vitro function rather than transplantation-grade outcomes.
  commercial why now=Moving from viability-only claims to attachment, function, and engraftment claims is what makes a hepatocyte optimization story commercially credible.
- Scale-up benchmark for banked or bulk hepatocyte handling
  why interesting=Scale-up losses in hepatocyte banking may come from handling and thaw workflow variance rather than core cryomix choice alone. Evidence papers=4, strong outcomes=4, contradictions=0.
  pain point=2 relevant papers still have unknown preservation family labels
  commercial why now=A cleaner benchmark wedge maps to hepatocyte supply, cell-therapy, and drug-metabolism workflows where post-thaw attachment and function still vary lot to lot.

## Callout
- Additive-assisted hepatocyte attachment and function benchmark on a fixed base cryomix is the explicit active wedge. Matrix rows=6, top decision-useful evidence gaps=0, and next experiments are already packetized for review.
