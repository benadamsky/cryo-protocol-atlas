# islets benchmark evaluation

Seed benchmark for the islets atlas. Reviewed entries come from explicit curation decisions; seeded entries are carried from the resolved atlas and should be upgraded to reviewed over time.

Benchmark entries: 53
All gates passed: yes

## all subset
- entries: 53
- expected included entries: 46
- inclusion: accuracy=1 precision=1 recall=1 f1=1
- exact accuracy: paperType=1 protocolFamily=1
- set macro F1: species=1 specimen=1 outcomes=0.867 stepPhases=1
- field coverage: paperType=1 protocolFamily=0.826 species=0.826 specimen=0.826 outcomes=0.283 stepPhases=0.413
- confidence: expectedIncluded=0.825 correctIncluded=0.825 incorrectIncluded=n/a

## reviewed subset
- entries: 49
- expected included entries: 42
- inclusion: accuracy=1 precision=1 recall=1 f1=1
- exact accuracy: paperType=1 protocolFamily=1
- set macro F1: species=1 specimen=1 outcomes=1 stepPhases=1
- field coverage: paperType=1 protocolFamily=0.81 species=0.81 specimen=0.81 outcomes=0.262 stepPhases=0.357
- confidence: expectedIncluded=0.819 correctIncluded=0.819 incorrectIncluded=n/a

## seeded subset
- entries: 4
- expected included entries: 4
- inclusion: accuracy=1 precision=1 recall=1 f1=1
- exact accuracy: paperType=1 protocolFamily=1
- set macro F1: species=1 specimen=1 outcomes=0.5 stepPhases=1
- field coverage: paperType=1 protocolFamily=1 species=1 specimen=1 outcomes=0.5 stepPhases=1
- confidence: expectedIncluded=0.89 correctIncluded=0.89 incorrectIncluded=n/a

## Gates
- reviewed inclusion F1: pass (actual=1 >= threshold=0.9)
  Guard against gaming the corpus by excluding reviewed in-scope papers.
- reviewed inclusion precision: pass (actual=1 >= threshold=0.9)
  Guard against keeping clearly excluded reviewed papers in the atlas.
- reviewed protocol family accuracy: pass (actual=1 >= threshold=0.85)
  Reviewed family labels should stay stable before autonomous updates are trusted.
- reviewed paper type accuracy: pass (actual=1 >= threshold=0.85)
  Paper-type drift is a common failure mode when extraction gets too eager.
- reviewed specimen macro F1: pass (actual=1 >= threshold=0.75)
  Specimen context must remain anchored to the ovarian-tissue slice.
- reviewed species macro F1: pass (actual=1 >= threshold=0.75)
  Species leakage is another easy way for the system to look cleaner than it is.

## Reviewed depth
- reviewed outcome coverage: 0.262
- reviewed step-phase coverage: 0.357
- reviewed minimum-depth ready: no

## Baseline vs resolved
- reviewed inclusion F1 delta: 0.077
- reviewed protocol family accuracy delta: 0.824
- reviewed paper type accuracy delta: 1
- reviewed species macro F1 delta: 0.049
- reviewed specimen macro F1 delta: 0.016
- reviewed outcome coverage delta: 0
- reviewed step-phase coverage delta: 0
- gate pass count delta: 3

## Baseline reviewed subset
- inclusion: precision=0.857 recall=1 f1=0.923
- exact: paperType=0 protocolFamily=0.176
- set macro F1: species=0.951 specimen=0.984
- coverage: outcomes=0.262 stepPhases=0.357

## Reviewed depth gaps
- reviewed entries missing outcome labels: 31
- reviewed entries missing step-phase labels: 27

### Missing reviewed outcomes
- Bulk Cryopreservation of Isolated Islets of Langerhans | family=n/a type=experimental
- CRYOGENIC STORAGE OF ISOLATED, PURIFIED PORCINE PANCREATIC ISLETS | family=n/a type=experimental
- CRYOPRESERVATION OF CHICK ISLETS | family=slow-freezing type=experimental
- Cryopreservation of Freshly Isolated Porcine Islet Cells | family=slow-freezing type=experimental
- Cryopreservation of Human Pancreatic Islets From Non-Heart-Beating Donors Using Hydroxyethyl Starch and Dimethyl Sulfoxide as Cryoprotectants | family=slow-freezing type=experimental
- Cryopreservation of Mouse Pancreatic Islets: Effects of Human Serum on Islet Survival | family=slow-freezing type=experimental
- Cryopreservation of Rat Islets of Langerhans: A Comparison of Two Techniques | family=slow-freezing type=experimental
- Curcumin treatment enhances islet recovery by induction of heat shock response proteins, Hsp70 and heme oxygenase-1, during cryopreservation | family=slow-freezing type=experimental
- Differential Freezing Tolerance of Rat Pancreatic Islets Depending on Their Size Variation | family=n/a type=experimental
- Effects of Encapsulation on In Vitro Function of Cryopreserved Rat Islets | family=n/a type=experimental
- Improved cryopreservation yield of pancreatic islets using combination of lower dose permeable cryoprotective agents | family=slow-freezing type=experimental
- Improved Recovery of Cryopreserved Canine Islets by Use of Beraprost Sodium | family=slow-freezing type=experimental
- Improvement of Human Islet Cryopreservation by a p38 MAPK Inhibitor | family=slow-freezing type=experimental
- Interaction of Cooling Rate, Warming Rate, and Extent of Permeation of Cryoprotectant in Determining Survival of Isolated Rat Islets of Langerhans During Cryopreservation | family=slow-freezing type=experimental
- Intraportal Autotransplantation of Cryopreserved Porcine Islets of Langerhans | family=slow-freezing type=experimental

### Missing reviewed step phases
- Bulk Cryopreservation of Isolated Islets of Langerhans | family=n/a type=experimental
- CRYOGENIC STORAGE OF ISOLATED, PURIFIED PORCINE PANCREATIC ISLETS | family=n/a type=experimental
- CRYOPRESERVATION OF CHICK ISLETS | family=slow-freezing type=experimental
- Cryopreservation of Freshly Isolated Porcine Islet Cells | family=slow-freezing type=experimental
- Cryopreservation of Human Pancreatic Islets From Non-Heart-Beating Donors Using Hydroxyethyl Starch and Dimethyl Sulfoxide as Cryoprotectants | family=slow-freezing type=experimental
- Cryopreservation of Mouse Pancreatic Islets: Effects of Human Serum on Islet Survival | family=slow-freezing type=experimental
- Cryopreservation of Rat Islets of Langerhans: A Comparison of Two Techniques | family=slow-freezing type=experimental
- Curcumin treatment enhances islet recovery by induction of heat shock response proteins, Hsp70 and heme oxygenase-1, during cryopreservation | family=slow-freezing type=experimental
- Differential Freezing Tolerance of Rat Pancreatic Islets Depending on Their Size Variation | family=n/a type=experimental
- Effects of Encapsulation on In Vitro Function of Cryopreserved Rat Islets | family=n/a type=experimental
- Improvement of Human Islet Cryopreservation by a p38 MAPK Inhibitor | family=slow-freezing type=experimental
- Interaction of Cooling Rate, Warming Rate, and Extent of Permeation of Cryoprotectant in Determining Survival of Isolated Rat Islets of Langerhans During Cryopreservation | family=slow-freezing type=experimental
- Intraportal Autotransplantation of Cryopreserved Porcine Islets of Langerhans | family=slow-freezing type=experimental
- Isolation and Long Term Preservation of Pancreatic Islets from Mouse, Rat and Guinea Pig | family=slow-freezing type=experimental
- Murine Islet Cryopreservation and Corticosteroids: Functional Studies | family=slow-freezing type=experimental
