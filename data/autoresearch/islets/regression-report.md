# islets autoresearch regression report

## reviewed-exclusion-regression
- description: Remove a reviewed exclusion so a non-primary methods paper leaks back into the islet atlas.
- passed: yes
- proposal count: 11
- proposal found: yes
- matched fields: excludeFromAtlas
- reviewed inclusion F1: 0.988 -> 1
- reviewed protocol family accuracy: 1 -> 1
- reviewed paper type accuracy: 1 -> 1
- reviewed outcome macro F1: 1 -> 1
- reviewed step phase macro F1: 1 -> 1
- auto-apply safe: yes

## reviewed-family-type-regression
- description: Corrupt reviewed family/type labels for a known comparative islet preservation paper.
- passed: yes
- proposal count: 11
- proposal found: yes
- matched fields: paperType, protocolFamily
- reviewed inclusion F1: 1 -> 1
- reviewed protocol family accuracy: 0.971 -> 1
- reviewed paper type accuracy: 0.976 -> 1
- reviewed outcome macro F1: 1 -> 1
- reviewed step phase macro F1: 1 -> 1
- auto-apply safe: yes

## reviewed-specimen-regression
- description: Drop reviewed encapsulated-islet context from a graft-function study.
- passed: yes
- proposal count: 11
- proposal found: yes
- matched fields: specimenTypes
- reviewed inclusion F1: 1 -> 1
- reviewed protocol family accuracy: 1 -> 1
- reviewed paper type accuracy: 1 -> 1
- reviewed outcome macro F1: 1 -> 1
- reviewed step phase macro F1: 1 -> 1
- auto-apply safe: yes

## reviewed-outcome-regression
- description: Corrupt reviewed outcome classes for a cryostored encapsulated-islet graft study.
- passed: yes
- proposal count: 11
- proposal found: yes
- matched fields: outcomeClasses
- reviewed inclusion F1: 1 -> 1
- reviewed protocol family accuracy: 1 -> 1
- reviewed paper type accuracy: 1 -> 1
- reviewed outcome macro F1: 0.929 -> 1
- reviewed step phase macro F1: 1 -> 1
- auto-apply safe: yes

## reviewed-step-phase-regression
- description: Corrupt reviewed protocol step phases for a vitrification-versus-freezing comparison paper.
- passed: yes
- proposal count: 11
- proposal found: yes
- matched fields: stepPhases
- reviewed inclusion F1: 1 -> 1
- reviewed protocol family accuracy: 1 -> 1
- reviewed paper type accuracy: 1 -> 1
- reviewed outcome macro F1: 1 -> 1
- reviewed step phase macro F1: 0.964 -> 1
- auto-apply safe: yes
