# Autoresearch health

- generated at: 2026-09-15T17:05:13.628Z
- overall state: needs-attention
- available domains: 3
- missing domains: none
- total pending benchmark review: 0
- total pending source enrichment: 5
- total normalized protocols: 368

## Recommendations
- hepatocytes: investigate benchmark/regression health before expanding automation

## Domains
### ovarian-tissue
- state: stalled-enrichment-gate
- latest run: 2026-03-26T03:25:34.364Z
- stop reason: converged
- cycles completed: 1
- reviewed quality: inclusionF1=1 familyAccuracy=1 paperTypeAccuracy=1
- reviewed depth: outcomes=0.429 stepPhases=0.571 minimumDepthReady=yes
- regression health: passed 5/5
- backlog: benchmarkReview=0 sourceEnrichment=4 missingOutcomes=4 missingStepPhases=3
- normalization: protocols=16 warnings=0
- baseline delta: inclusionF1=0.462 familyAccuracy=0.857 paperTypeAccuracy=0.714 outcomeCoverage=0 stepPhaseCoverage=0 gatePassCount=4
- best wedge: Head-to-head DMSO-centered ovarian tissue benchmark
- pain point: 2 relevant papers still have sparse step structure
- current read: Best current wedge, but still better treated as a proving ground than a committed entry point.
- alerts: pending source enrichment is blocking further autonomous progress | 4 reviewed papers still lack outcome labels | 3 reviewed papers still lack step phases
- artifacts: data/autoresearch/ovarian-tissue/autoresearch-cycles.md, data/autoresearch/ovarian-tissue/unattended-batch.md, data/processed/ovarian-tissue/benchmark-report.md, data/processed/ovarian-tissue/wedge-brief.md, data/processed/ovarian-tissue/call-packet.md

### Delta (vs. previous run)
- progress: **regressed**
- wedge: unchanged (Head-to-head DMSO-centered ovarian tissue benchmark)
- confidence: evidenceConfidence -0.025
- evidence gaps: 0 high-impact (+0)
- top packet: unchanged
- enrichment: 4 pending (was 4)
- summary: No material changes detected.


### islets
- state: stalled-enrichment-gate
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
- alerts: pending source enrichment is blocking further autonomous progress | 5 normalized protocols still carry warnings | 1 reviewed papers still lack step phases
- artifacts: data/autoresearch/islets/autoresearch-cycles.md, data/autoresearch/islets/unattended-batch.md, data/processed/islets/benchmark-report.md, data/processed/islets/wedge-brief.md, data/processed/islets/call-packet.md

### Delta (vs. previous run)
- progress: **flat**
- wedge: unchanged (Additive-assisted islet recovery benchmark on a fixed base cryomix)
- confidence: no change
- evidence gaps: 1 high-impact (+0)
- top packet: unchanged
- enrichment: 1 pending (was 1)
- summary: No material changes detected.


### hepatocytes
- state: needs-attention
- latest run: 2026-09-15T16:58:12.799Z
- stop reason: converged
- cycles completed: 1
- reviewed quality: inclusionF1=0 familyAccuracy=0 paperTypeAccuracy=0
- reviewed depth: outcomes=0 stepPhases=0 minimumDepthReady=no
- regression health: passed 0/0
- backlog: benchmarkReview=0 sourceEnrichment=0 missingOutcomes=0 missingStepPhases=0
- normalization: protocols=306 warnings=13
- baseline delta: inclusionF1=0 familyAccuracy=0 paperTypeAccuracy=0 outcomeCoverage=0 stepPhaseCoverage=0 gatePassCount=0
- best wedge: Additive-assisted hepatocyte attachment and function benchmark on a fixed base cryomix
- pain point: Adjunct compounds recur in the literature, but they are not benchmarked head-to-head on a fixed base cryomix.
- current read: Best current wedge, but still better treated as a proving ground than a committed entry point.
- alerts: benchmark gates are failing | reviewed minimum-depth gate is not ready | 13 normalized protocols still carry warnings
- artifacts: data/autoresearch/hepatocytes/autoresearch-cycles.md, data/autoresearch/hepatocytes/unattended-batch.md, data/processed/hepatocytes/benchmark-report.md, data/processed/hepatocytes/wedge-brief.md, data/processed/hepatocytes/call-packet.md

### Delta (vs. previous run)
- progress: **improved** (productive)
- wedge: changed from "null" to "Additive-assisted hepatocyte attachment and function benchmark on a fixed base cryomix"
- confidence: scientificRelevance +0.944, companyRelevance +0.92, evidenceConfidence +0.087, translationalPotential +1
- evidence gaps: 0 high-impact (+0)
- top packet: changed to "Additive-assisted hepatocyte attachment and function benchmark on a fixed base cryomix"
- enrichment: 0 pending (was 0)
- summary: Wedge changed from "none" to "Additive-assisted hepatocyte attachment and function benchmark on a fixed base cryomix". Confidence improved in: scientificRelevance, companyRelevance, evidenceConfidence, translationalPotential.

