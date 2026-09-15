# ovarian-tissue benchmark evaluation

Seed benchmark for the ovarian-tissue atlas. Reviewed entries come from explicit curation decisions; seeded entries are carried from the resolved atlas and should be upgraded to reviewed over time.

Benchmark entries: 28
All gates passed: yes

## all subset
- entries: 28
- expected included entries: 16
- inclusion: accuracy=1 precision=1 recall=1 f1=1
- exact accuracy: paperType=0.938 protocolFamily=1
- set macro F1: species=1 specimen=1 outcomes=0.956 stepPhases=0.518
- field coverage: paperType=1 protocolFamily=1 species=1 specimen=1 outcomes=0.75 stepPhases=0.813
- confidence: expectedIncluded=0.799 correctIncluded=0.799 incorrectIncluded=n/a

## reviewed subset
- entries: 19
- expected included entries: 7
- inclusion: accuracy=1 precision=1 recall=1 f1=1
- exact accuracy: paperType=1 protocolFamily=1
- set macro F1: species=1 specimen=1 outcomes=1 stepPhases=1
- field coverage: paperType=1 protocolFamily=1 species=1 specimen=1 outcomes=0.429 stepPhases=0.571
- confidence: expectedIncluded=0.76 correctIncluded=0.76 incorrectIncluded=n/a

## seeded subset
- entries: 9
- expected included entries: 9
- inclusion: accuracy=1 precision=1 recall=1 f1=1
- exact accuracy: paperType=0.889 protocolFamily=1
- set macro F1: species=1 specimen=1 outcomes=0.941 stepPhases=0.304
- field coverage: paperType=1 protocolFamily=1 species=1 specimen=1 outcomes=1 stepPhases=1
- confidence: expectedIncluded=0.83 correctIncluded=0.83 incorrectIncluded=n/a

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
  Specimen context must remain anchored to the domain slice.
- reviewed species macro F1: pass (actual=1 >= threshold=0.75)
  Species leakage is another easy way for the system to look cleaner than it is.

## Reviewed depth
- reviewed outcome coverage: 0.429
- reviewed step-phase coverage: 0.571
- reviewed minimum-depth ready: yes

## Baseline vs resolved
- reviewed inclusion F1 delta: 0.462
- reviewed protocol family accuracy delta: 0.857
- reviewed paper type accuracy delta: 0.714
- reviewed species macro F1 delta: 0.048
- reviewed specimen macro F1 delta: 0.124
- reviewed outcome coverage delta: 0
- reviewed step-phase coverage delta: 0
- gate pass count delta: 4

## Baseline reviewed subset
- inclusion: precision=0.368 recall=1 f1=0.538
- exact: paperType=0.286 protocolFamily=0.143
- set macro F1: species=0.952 specimen=0.876
- coverage: outcomes=0.429 stepPhases=0.571

## Reviewed depth gaps
- reviewed entries missing outcome labels: 4
- reviewed entries missing step-phase labels: 3
- missing outcome evidence audit: extractor-gap=0 ambiguous-evidence=0 evidence-thin=4

### Missing reviewed outcomes
- Autologous transplantation of cryopreserved ovary induces the generation of antiovary antibodies in sheep | family=slow-freezing type=experimental evidence=evidence-thin
- Cryopreservation and in vitro culture of caprine preantral follicles | family=comparative type=review evidence=evidence-thin
- Effect of cryoprotectants on the survival of follicles in frozen mouse ovaries | family=slow-freezing type=experimental evidence=evidence-thin
- Ovarian and oocyte cryopreservation | family=comparative type=review evidence=evidence-thin

### Missing reviewed step phases
- Cryopreservation and in vitro culture of caprine preantral follicles | family=comparative type=review
- Effect of cryoprotectants on the survival of follicles in frozen mouse ovaries | family=slow-freezing type=experimental
- Ovarian and oocyte cryopreservation | family=comparative type=review
