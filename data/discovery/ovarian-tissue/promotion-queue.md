# ovarian-tissue discovery promotion queue

- source snapshot: 2026-03-24T16:13:53.625Z
- total discovery candidates: 30
- already tracked in current slice: 28
- novel candidates requiring review: 2
- degraded refresh: yes
- degradation reasons: live-provider-failures:openalex,crossref,europe-pmc

## Decision status
- pending: 2
- promote: 0
- defer: 0
- reject: 0

## Novel candidates
- [pending] A dual-drug strategy to enhance the function of cryopreserved ovaries by promoting revascularization and inhibiting follicle over-activation | recommendation=review | ranking=8.55
  dedupeKey=doi:10.1186/s12958-025-01422-y
  sources=pubmed | sourceCount=1 | recordCount=1
  relevance=8.233 authority=0.15 diversity=0.167
  reasons=optimizer score 5.168925 cleared the review threshold 2.2 but stayed below promote 5.2 || full-text landing page is available || domain relevance score is high
  staleEvidence=evidence or recommendation changed since the previous review state
  doi=10.1186/s12958-025-01422-y
- [pending] A retrospective study of ovarian tissue cryopreservation in female patients with hematological diseases for fertility preservation | recommendation=review | ranking=3.684
  dedupeKey=doi:10.1007/s00404-024-07484-4
  sources=pubmed | sourceCount=1 | recordCount=1
  relevance=3.367 authority=0.15 diversity=0.167
  reasons=optimizer score 3.295805 cleared the review threshold 2.2 but stayed below promote 5.2 || full-text landing page is available
  doi=10.1007/s00404-024-07484-4

## Provider status
- provider failures: 3
- cryodb: fetched=28 accepted=28 total=28
- openalex: fetched=0 accepted=0 error=fetch failed
- crossref: fetched=0 accepted=0 error=fetch failed
- europe-pmc: fetched=0 accepted=0 error=fetch failed
- pubmed: fetched=2 accepted=2 label=imported-source-records.json
