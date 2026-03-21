# ovarian-tissue autoresearch regression report

## reviewed-exclusion-regression
- description: Remove a reviewed exclusion so an out-of-slice paper leaks back into the atlas.
- passed: yes
- proposal count: 1
- proposal found: yes
- matched fields: excludeFromAtlas
- reviewed inclusion F1: 0.933 -> 1
- reviewed protocol family accuracy: 1 -> 1
- reviewed paper type accuracy: 1 -> 1
- reviewed outcome macro F1: 1 -> 1
- reviewed step phase macro F1: 1 -> 1
- auto-apply safe: yes

## reviewed-family-type-regression
- description: Corrupt reviewed family/type labels for a known vitrification paper.
- passed: yes
- proposal count: 1
- proposal found: yes
- matched fields: paperType, protocolFamily
- reviewed inclusion F1: 1 -> 1
- reviewed protocol family accuracy: 0.857 -> 1
- reviewed paper type accuracy: 0.857 -> 1
- reviewed outcome macro F1: 1 -> 1
- reviewed step phase macro F1: 1 -> 1
- auto-apply safe: yes

## reviewed-specimen-regression
- description: Drop reviewed whole-ovary context from a sheep autotransplantation paper.
- passed: yes
- proposal count: 1
- proposal found: yes
- matched fields: specimenTypes
- reviewed inclusion F1: 1 -> 1
- reviewed protocol family accuracy: 1 -> 1
- reviewed paper type accuracy: 1 -> 1
- reviewed outcome macro F1: 1 -> 1
- reviewed step phase macro F1: 1 -> 1
- auto-apply safe: yes

## reviewed-outcome-regression
- description: Corrupt reviewed outcome classes for a human ovarian tissue vitrification paper.
- passed: yes
- proposal count: 1
- proposal found: yes
- matched fields: outcomeClasses
- reviewed inclusion F1: 1 -> 1
- reviewed protocol family accuracy: 1 -> 1
- reviewed paper type accuracy: 1 -> 1
- reviewed outcome macro F1: 0.667 -> 1
- reviewed step phase macro F1: 1 -> 1
- auto-apply safe: yes

## reviewed-step-phase-regression
- description: Corrupt reviewed protocol step phases for a closed-system vitrification paper.
- passed: yes
- proposal count: 1
- proposal found: yes
- matched fields: stepPhases
- reviewed inclusion F1: 1 -> 1
- reviewed protocol family accuracy: 1 -> 1
- reviewed paper type accuracy: 1 -> 1
- reviewed outcome macro F1: 1 -> 1
- reviewed step phase macro F1: 0.75 -> 1
- auto-apply safe: yes
