# islets discovery promotion queue

- source snapshot: 2026-03-24T16:13:53.635Z
- total discovery candidates: 57
- already tracked in current slice: 53
- novel candidates requiring review: 4
- degraded refresh: yes
- degradation reasons: live-provider-failures:openalex,crossref,europe-pmc

## Decision status
- pending: 4
- promote: 0
- defer: 0
- reject: 0

## Novel candidates
- [pending] Pancreatic islet cryopreservation by vitrification achieves high viability, function, recovery and clinical scalability for transplantation | recommendation=promote | ranking=9.038
  dedupeKey=doi:10.1038/s41591-022-01718-1
  sources=pubmed | sourceCount=1 | recordCount=1
  relevance=8.571 authority=0.3 diversity=0.167
  reasons=optimizer score 7.112215 cleared the promote threshold 5.2 || open-access full text is available || authority score is directionally promising || domain relevance score is high
  doi=10.1038/s41591-022-01718-1
- [pending] Reviving hope: unlocking pancreatic islet immortality by optimizing a trehalose-based cryopreservation media and cell-penetrating peptide | recommendation=promote | ranking=6.724
  dedupeKey=doi:10.1186/s13287-025-04168-x
  sources=pubmed | sourceCount=1 | recordCount=1
  relevance=6.257 authority=0.3 diversity=0.167
  reasons=optimizer score 5.656115 cleared the promote threshold 5.2 || open-access full text is available || authority score is directionally promising || domain relevance score is non-trivial
  doi=10.1186/s13287-025-04168-x
- [pending] The effect of hydroxyethyl starch as a cryopreservation agent during freezing of mouse pancreatic islets | recommendation=promote | ranking=5.91
  dedupeKey=doi:10.1016/j.bbrep.2024.101658
  sources=pubmed | sourceCount=1 | recordCount=1
  relevance=5.443 authority=0.3 diversity=0.167
  reasons=optimizer score 5.60492 cleared the promote threshold 5.2 || open-access full text is available || authority score is directionally promising || domain relevance score is non-trivial
  doi=10.1016/j.bbrep.2024.101658
- [pending] Nanowarming of vitrified pancreatic islets as a cryopreservation technology for transplantation | recommendation=promote | ranking=5.91
  dedupeKey=doi:10.1002/btm2.10416
  sources=pubmed | sourceCount=1 | recordCount=1
  relevance=5.443 authority=0.3 diversity=0.167
  reasons=optimizer score 5.61242 cleared the promote threshold 5.2 || open-access full text is available || authority score is directionally promising || domain relevance score is non-trivial
  doi=10.1002/btm2.10416

## Provider status
- provider failures: 3
- cryodb: fetched=53 accepted=53 total=53
- openalex: fetched=0 accepted=0 error=fetch failed
- crossref: fetched=0 accepted=0 error=fetch failed
- europe-pmc: fetched=0 accepted=0 error=fetch failed
- pubmed: fetched=4 accepted=4 label=imported-source-records.json
