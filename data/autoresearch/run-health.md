# Autoresearch health

- generated at: 2026-08-26T02:45:29.073Z
- overall state: stalled-human-gate
- available domains: 2
- missing domains: none
- total pending benchmark review: 0
- total pending source enrichment: 5
- total normalized protocols: 62

## Recommendations
- ovarian-tissue: next progress depends on clearing 4 pending source-enrichment records
- islets: next progress depends on clearing 1 pending source-enrichment records

## Domains
### ovarian-tissue
- state: stalled-human-gate
- latest run: 2026-03-26T03:25:34.364Z
- stop reason: converged
- cycles completed: 1
- reviewed quality: inclusionF1=1 familyAccuracy=1 paperTypeAccuracy=1
- reviewed depth: outcomes=0.429 stepPhases=0.571 minimumDepthReady=yes
- regression health: passed 5/5
- backlog: benchmarkReview=0 sourceEnrichment=4 missingOutcomes=4 missingStepPhases=3
- normalization: protocols=16 warnings=3
- baseline delta: inclusionF1=0.462 familyAccuracy=0.857 paperTypeAccuracy=0.714 outcomeCoverage=0 stepPhaseCoverage=0 gatePassCount=4
- best wedge: Head-to-head DMSO-centered ovarian tissue benchmark
- pain point: Literature looks directionally promising but still underspecified for a clean protocol decision.
- current read: Best current wedge, but still better treated as a proving ground than a committed entry point.
- alerts: human-gated source enrichment is blocking further autonomous progress | 3 normalized protocols still carry warnings | 4 reviewed papers still lack outcome labels | 3 reviewed papers still lack step phases
- artifacts: data/autoresearch/ovarian-tissue/autoresearch-cycles.md, data/autoresearch/ovarian-tissue/unattended-batch.md, data/processed/ovarian-tissue/benchmark-report.md, data/processed/ovarian-tissue/wedge-brief.md, data/processed/ovarian-tissue/call-packet.md

### Delta (vs. previous run)
- progress: **flat**
- wedge: unchanged (Head-to-head DMSO-centered ovarian tissue benchmark)
- confidence: no change
- evidence gaps: 0 high-impact (+0)
- top packet: unchanged
- enrichment: 4 pending (was 4)
- summary: No material changes detected.


### islets
- state: stalled-human-gate
- latest run: 2026-03-26T03:25:41.659Z
- stop reason: converged
- cycles completed: 1
- reviewed quality: inclusionF1=1 familyAccuracy=1 paperTypeAccuracy=1
- reviewed depth: outcomes=1 stepPhases=0.976 minimumDepthReady=yes
- regression health: passed 5/5
- backlog: benchmarkReview=0 sourceEnrichment=1 missingOutcomes=0 missingStepPhases=1
- normalization: protocols=46 warnings=5
- baseline delta: inclusionF1=0.077 familyAccuracy=0.824 paperTypeAccuracy=0.119 outcomeCoverage=0 stepPhaseCoverage=0 gatePassCount=2
- best wedge: Additive-assisted islet recovery benchmark on a fixed base cryomix
- pain point: Adjunct compounds recur in the literature, but they are not benchmarked head-to-head on a fixed base cryomix.
- current read: Best current wedge in islets. The literature is strong enough to justify a focused additive benchmark, but not strong enough to claim a winning adjunct yet.
- alerts: human-gated source enrichment is blocking further autonomous progress | 5 normalized protocols still carry warnings | 1 reviewed papers still lack step phases
- artifacts: data/autoresearch/islets/autoresearch-cycles.md, data/autoresearch/islets/unattended-batch.md, data/processed/islets/benchmark-report.md, data/processed/islets/wedge-brief.md, data/processed/islets/call-packet.md

### Delta (vs. previous run)
- progress: **flat**
- wedge: unchanged (Additive-assisted islet recovery benchmark on a fixed base cryomix)
- confidence: no change
- evidence gaps: 1 high-impact (+0)
- top packet: unchanged
- enrichment: 1 pending (was 1)
- summary: No material changes detected.

