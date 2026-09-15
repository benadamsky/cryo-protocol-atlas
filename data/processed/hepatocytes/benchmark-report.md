# hepatocytes benchmark evaluation

Seed benchmark for the hepatocytes atlas. Reviewed entries come from explicit curation decisions; seeded entries are carried from the resolved atlas and should be upgraded to reviewed over time.

Benchmark entries: 306
All gates passed: no

## all subset
- entries: 306
- expected included entries: 306
- inclusion: accuracy=1 precision=1 recall=1 f1=1
- exact accuracy: paperType=1 protocolFamily=1
- set macro F1: species=0.843 specimen=1 outcomes=0.824 stepPhases=0.301
- field coverage: paperType=1 protocolFamily=1 species=0.843 specimen=1 outcomes=0.824 stepPhases=0.301
- confidence: expectedIncluded=0.726 correctIncluded=0.726 incorrectIncluded=n/a

## reviewed subset
- entries: 0
- expected included entries: 0
- inclusion: accuracy=0 precision=0 recall=0 f1=0
- exact accuracy: paperType=0 protocolFamily=0
- set macro F1: species=0 specimen=0 outcomes=0 stepPhases=0
- field coverage: paperType=0 protocolFamily=0 species=0 specimen=0 outcomes=0 stepPhases=0
- confidence: expectedIncluded=n/a correctIncluded=n/a incorrectIncluded=n/a

## seeded subset
- entries: 306
- expected included entries: 306
- inclusion: accuracy=1 precision=1 recall=1 f1=1
- exact accuracy: paperType=1 protocolFamily=1
- set macro F1: species=0.843 specimen=1 outcomes=0.824 stepPhases=0.301
- field coverage: paperType=1 protocolFamily=1 species=0.843 specimen=1 outcomes=0.824 stepPhases=0.301
- confidence: expectedIncluded=0.726 correctIncluded=0.726 incorrectIncluded=n/a

## Gates
- reviewed inclusion F1: fail (actual=0 >= threshold=0.9)
  Guard against gaming the corpus by excluding reviewed in-scope papers.
- reviewed inclusion precision: fail (actual=0 >= threshold=0.9)
  Guard against keeping clearly excluded reviewed papers in the atlas.
- reviewed protocol family accuracy: fail (actual=0 >= threshold=0.85)
  Reviewed family labels should stay stable before autonomous updates are trusted.
- reviewed paper type accuracy: fail (actual=0 >= threshold=0.85)
  Paper-type drift is a common failure mode when extraction gets too eager.
- reviewed specimen macro F1: fail (actual=0 >= threshold=0.75)
  Specimen context must remain anchored to the domain slice.
- reviewed species macro F1: fail (actual=0 >= threshold=0.75)
  Species leakage is another easy way for the system to look cleaner than it is.

## Reviewed depth
- reviewed outcome coverage: 0
- reviewed step-phase coverage: 0
- reviewed minimum-depth ready: no

## Baseline vs resolved
- reviewed inclusion F1 delta: 0
- reviewed protocol family accuracy delta: 0
- reviewed paper type accuracy delta: 0
- reviewed species macro F1 delta: 0
- reviewed specimen macro F1 delta: 0
- reviewed outcome coverage delta: 0
- reviewed step-phase coverage delta: 0
- gate pass count delta: 0

## Baseline reviewed subset
- inclusion: precision=0 recall=0 f1=0
- exact: paperType=0 protocolFamily=0
- set macro F1: species=0 specimen=0
- coverage: outcomes=0 stepPhases=0

## Reviewed depth gaps
- reviewed entries missing outcome labels: 0
- reviewed entries missing step-phase labels: 0
- missing outcome evidence audit: extractor-gap=0 ambiguous-evidence=0 evidence-thin=0
