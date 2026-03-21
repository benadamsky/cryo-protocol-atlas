# MVP Boundary

## Source layer

CryoRepository remains the source of truth for:

- chemicals
- papers
- formulations
- chemical properties

## MVP layer

This repo owns the layer above that:

- domain curation
- protocol extraction
- outcome normalization
- contradiction surfacing
- next-experiment suggestions
- benchmark/evaluation infrastructure

## First domain

- ovarian tissue

## Second scaffolded domain

- islets

## First useful output

A protocol atlas that answers:

- what protocol families recur in the literature?
- where do papers disagree?
- what protocol variables appear most sensitive?
- what next experiments are highest signal?

And an evaluation harness that answers:

- does a change improve reviewed inclusion/exclusion accuracy?
- does it preserve protocol-family and paper-type labels on reviewed papers?
- is the system improving because it learned something, or because it excluded hard papers?

## Current implementation status

- domain ingestion: implemented
- evidence-backed extraction from title/abstract: implemented
- contradiction detection: implemented (heuristic)
- protocol clustering: partial via atlas summaries
- next-experiment suggestions: implemented (heuristic)
- manual resolution queue for unknown-family papers: implemented
- seed benchmark generation: implemented
- baseline vs resolved benchmark scoring: implemented
- conservative benchmark-backed autoresearch loop: implemented
- islet ingestion/extraction/analyze scaffold: implemented

## Benchmark policy

- `reviewed` benchmark entries are the main quality gate.
- `seeded` benchmark entries provide broader regression coverage, but should not be treated as equally strong truth targets.
- Future autoresearch loops should optimize against reviewed gates first, then improve seeded coverage without rewriting the benchmark itself.
- The current loop is intentionally narrow: it auto-applies only reviewed benchmark-backed override repairs, while any benchmark depth expansion stays review-only.
- Benchmark depth proposals are only generated when the resolved extraction already contains explicit outcome/step structure for a reviewed in-scope paper.
- The ovarian and islet slices now both support ingest -> curate -> benchmark -> repair-loop regression testing.
