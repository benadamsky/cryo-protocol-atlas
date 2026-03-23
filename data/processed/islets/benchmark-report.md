# islets benchmark evaluation

Seed benchmark for the islets atlas. Reviewed entries come from explicit curation decisions; seeded entries are carried from the resolved atlas and should be upgraded to reviewed over time.

Benchmark entries: 53
All gates passed: yes

## all subset
- entries: 53
- expected included entries: 46
- inclusion: accuracy=1 precision=1 recall=1 f1=1
- exact accuracy: paperType=1 protocolFamily=1
- set macro F1: species=1 specimen=1 outcomes=0.926 stepPhases=0.947
- field coverage: paperType=1 protocolFamily=0.826 species=0.826 specimen=0.826 outcomes=0.696 stepPhases=0.978
- confidence: expectedIncluded=0.85 correctIncluded=0.85 incorrectIncluded=n/a

## reviewed subset
- entries: 49
- expected included entries: 42
- inclusion: accuracy=1 precision=1 recall=1 f1=1
- exact accuracy: paperType=1 protocolFamily=1
- set macro F1: species=1 specimen=1 outcomes=0.983 stepPhases=0.995
- field coverage: paperType=1 protocolFamily=0.81 species=0.81 specimen=0.81 outcomes=0.714 stepPhases=0.976
- confidence: expectedIncluded=0.845 correctIncluded=0.845 incorrectIncluded=n/a

## seeded subset
- entries: 4
- expected included entries: 4
- inclusion: accuracy=1 precision=1 recall=1 f1=1
- exact accuracy: paperType=1 protocolFamily=1
- set macro F1: species=1 specimen=1 outcomes=0.5 stepPhases=0.45
- field coverage: paperType=1 protocolFamily=1 species=1 specimen=1 outcomes=0.5 stepPhases=1
- confidence: expectedIncluded=0.902 correctIncluded=0.902 incorrectIncluded=n/a

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
- reviewed outcome coverage: 0.714
- reviewed step-phase coverage: 0.976
- reviewed minimum-depth ready: yes

## Baseline vs resolved
- reviewed inclusion F1 delta: 0.077
- reviewed protocol family accuracy delta: 0.824
- reviewed paper type accuracy delta: 0.119
- reviewed species macro F1 delta: 0.049
- reviewed specimen macro F1 delta: 0.01
- reviewed outcome coverage delta: 0
- reviewed step-phase coverage delta: 0
- gate pass count delta: 2

## Baseline reviewed subset
- inclusion: precision=0.857 recall=1 f1=0.923
- exact: paperType=0.881 protocolFamily=0.176
- set macro F1: species=0.951 specimen=0.99
- coverage: outcomes=0.714 stepPhases=0.976

## Reviewed depth gaps
- reviewed entries missing outcome labels: 12
- reviewed entries missing step-phase labels: 1
- missing outcome evidence audit: extractor-gap=0 ambiguous-evidence=6 evidence-thin=6

### Missing reviewed outcomes
- CRYOGENIC STORAGE OF ISOLATED, PURIFIED PORCINE PANCREATIC ISLETS | family=n/a type=experimental evidence=evidence-thin
- CRYOPRESERVATION OF CHICK ISLETS | family=slow-freezing type=experimental evidence=evidence-thin
- Cryopreservation of Freshly Isolated Porcine Islet Cells | family=slow-freezing type=experimental evidence=evidence-thin
- Cryopreservation of Rat Islets of Langerhans: A Comparison of Two Techniques | family=slow-freezing type=experimental evidence=ambiguous-evidence
- Differential Freezing Tolerance of Rat Pancreatic Islets Depending on Their Size Variation | family=n/a type=experimental evidence=evidence-thin
- Isolation and Long Term Preservation of Pancreatic Islets from Mouse, Rat and Guinea Pig | family=slow-freezing type=experimental evidence=ambiguous-evidence
- Nylon Mesh Device for Vitriﬁcation of Large Quantities of Rat Pancreatic Islets | family=vitrification type=experimental evidence=evidence-thin
- Pancreatic islets from non-heart-beating donor pig: Two-layer preservation method in an in vitro porcine model | family=slow-freezing type=experimental evidence=ambiguous-evidence
- Prolonged Cryopreservation of Purified Human Pancreatic Islets | family=n/a type=experimental evidence=ambiguous-evidence
- Successful Cryopreservation of Fetal Porcine Proislets | family=slow-freezing type=experimental evidence=ambiguous-evidence
- Successful Long-Term Cryopreservation of Highly Purified Canine Islets | family=n/a type=experimental evidence=ambiguous-evidence
- USE OF POLYETHYLENEGLYCOL FOR PORCINE ISLET CRYOPRESERVATION | family=slow-freezing type=experimental evidence=evidence-thin

### Missing reviewed step phases
- Effects of Encapsulation on In Vitro Function of Cryopreserved Rat Islets | family=n/a type=experimental
