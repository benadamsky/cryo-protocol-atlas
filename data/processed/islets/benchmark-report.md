# islets benchmark evaluation

Seed benchmark for the islets atlas. Reviewed entries come from explicit curation decisions; seeded entries are carried from the resolved atlas and should be upgraded to reviewed over time.

Benchmark entries: 53
All gates passed: yes

## all subset
- entries: 53
- inclusion: accuracy=1 precision=1 recall=1 f1=1
- exact accuracy: paperType=1 protocolFamily=1
- set macro F1: species=1 specimen=1 outcomes=0.778 stepPhases=1
- confidence: expectedIncluded=0.828 correctIncluded=0.828 incorrectIncluded=n/a

## reviewed subset
- entries: 49
- inclusion: accuracy=1 precision=1 recall=1 f1=1
- exact accuracy: paperType=1 protocolFamily=1
- set macro F1: species=1 specimen=1 outcomes=1 stepPhases=1
- confidence: expectedIncluded=0.822 correctIncluded=0.822 incorrectIncluded=n/a

## seeded subset
- entries: 4
- inclusion: accuracy=1 precision=1 recall=1 f1=1
- exact accuracy: paperType=1 protocolFamily=1
- set macro F1: species=1 specimen=1 outcomes=0.5 stepPhases=1
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

## Baseline vs resolved
- reviewed inclusion F1 delta: 0.077
- reviewed protocol family accuracy delta: 0.875
- reviewed paper type accuracy delta: 1
- reviewed species macro F1 delta: 0.052
- reviewed specimen macro F1 delta: 0.017
- gate pass count delta: 3

## Baseline reviewed subset
- inclusion: precision=0.857 recall=1 f1=0.923
- exact: paperType=0 protocolFamily=0.125
- set macro F1: species=0.948 specimen=0.983
