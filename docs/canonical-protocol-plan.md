# Canonical Protocol Layer Plan

## 1. Goal

Add a canonical protocol normalization layer that turns the current evidence-backed extraction output into a stable, comparable protocol representation.

This phase should make the atlas more trustworthy, not broader. The immediate target is a reproducible canonical protocol artifact for `islets`, followed by the same layer for `ovarian-tissue`.

## 2. Why This Matters Now

- The current extraction schema preserves protocol detail mostly as free-text strings for chemicals, concentrations, temperatures, durations, and step summaries.
- The repo now has enough downstream artifacts that regeneration order and stale summaries can create false confidence.
- `islets` is already benchmark-stable enough to serve as the proving ground for a structural upgrade.
- `ovarian-tissue` still has reviewed depth gaps, which makes it the right stress test after the normalized layer is stable.

Recent repo state that motivates this phase:

- `islets` reviewed benchmark gates pass and the current autoresearch loop proposes no further changes.
- `ovarian-tissue` reviewed inclusion is stable, but reviewed outcome and step coverage are still shallow.
- Current generated artifacts are not fully dependency-safe. For example, the `islets` source-enrichment counts disagree across downstream summaries, which means the pipeline still allows stale or mismatched artifacts.

## 3. Scope

In scope:

- canonical protocol normalization
- unit normalization for concentrations, temperatures, and durations
- canonical chemical naming and synonym collapse
- explicit protocol transition modeling between steps/phases
- artifact dependency cleanup so downstream summaries read the same source state
- validation gates for normalized outputs
- rollout on `islets` first, then `ovarian-tissue`

Out of scope:

- adding a third domain
- broadening autonomy or auto-apply behavior
- new product-facing artifacts beyond what is needed to support the canonical layer
- replacing the current extraction layer as the evidence source of truth

## 4. Data Model Changes

Keep the current extraction output as the evidence-carrying layer. Add a derived normalized layer on top of it.

Planned schema additions:

- `NormalizedValue`
  - `rawText`
  - `normalizedValue`
  - `normalizedUnit`
  - `normalizationMethod`
  - `confidence`
- `NormalizedChemical`
  - `canonicalName`
  - `matchedAliases`
  - `role`
  - `normalizedConcentrations`
- `NormalizedProtocolStep`
  - `order`
  - `phase`
  - `action`
  - `inputs`
  - `outputs`
  - `temperature`
  - `duration`
  - `transitionType`
  - `sourceEvidence`
- `NormalizedProtocol`
  - `domain`
  - `paperId`
  - `paperType`
  - `protocolFamily`
  - `specimenTypes`
  - `speciesMentions`
  - `canonicalChemicals`
  - `normalizedSteps`
  - `normalizationConfidence`
  - `normalizationWarnings`

Design constraints:

- normalized artifacts must preserve traceability back to extraction evidence
- normalization must be additive, not destructive
- missing structure should remain explicit instead of being guessed away
- unit conversions should be conservative and reversible

## 5. Pipeline Changes

Add a dedicated normalization build step after extraction and override application, and make downstream artifacts depend on it explicitly.

Target dependency order:

1. `extract`
2. `analyze`
3. `evaluate`
4. `enrichment-queue`
5. `normalize-protocols`
6. `wedge`
7. `call`
8. `opportunity-scan`
9. `loop`
10. `review-benchmark`
11. `autopromote-benchmark`
12. `regress`

Rules:

- downstream artifacts must read from one canonical resolved state, not recompute counts independently
- `run-batch` should regenerate artifacts in dependency order and fail loudly when required upstream inputs are missing
- wedge/call/opportunity summaries should eventually read normalized protocol aggregates where applicable
- no artifact should report counts derived from stale pre-normalization or pre-enrichment state

## 6. Artifacts To Add Or Update

Add:

- `packages/normalize/src/canonical-protocols.ts`
- `scripts/build-normalized-protocols.ts`
- `data/processed/<domain>/normalized-protocols.json`
- `data/processed/<domain>/normalized-protocol-report.md`

Update:

- `packages/shared/src/schema.ts`
- `scripts/run-unattended-batch.ts`
- `packages/research/src/wedges.ts`
- `packages/research/src/call-packet.ts`
- any summary code that currently recomputes enrichment or protocol-pattern counts ad hoc

## 7. Validation Criteria

A normalization upgrade counts only if all of the following are true:

- reviewed benchmark gates do not regress
- normalized outputs are reproducible across a clean rerun
- downstream artifact counts agree with the current source-enrichment and benchmark state
- canonical step structure improves comparability without increasing unsupported inference
- at least one current wedge/call summary becomes more structurally precise because it reads normalized protocol data instead of raw string aggregation

Specific checks for this phase:

- `bun run typecheck`
- `bun run evaluate:islets`
- `bun run loop:islets`
- `bun run regress:islets`
- a fresh `run-batch:islets` must produce internally consistent enrichment and summary counts
- after porting, the same consistency check must hold for `ovarian-tissue`

## 8. Rollout Sequence

Phase 1: planning and dependency hardening

- add this plan
- define the normalized schema
- fix the current artifact dependency mismatch so summaries and batch outputs agree on enrichment counts

Phase 2: `islets` canonical layer

- build normalized protocol artifacts for `islets`
- keep the first version narrow: chemicals, units, temperatures, durations, and step transitions
- compare normalized outputs against current wedge and benchmark artifacts
- do not expand scope until `islets` reruns are stable

Phase 3: `ovarian-tissue` port

- port the same normalization logic with minimal domain-specific branching
- use the current ovarian reviewed depth gaps as the first serious test of whether the normalized layer improves interpretability
- only do targeted ovarian source enrichment that directly supports reviewed benchmark depth or normalization quality

## 9. Exit Criteria

This phase is complete when:

- `islets` has a stable canonical protocol artifact checked into the normal build path
- the unattended batch no longer produces contradictory downstream counts
- wedge and call artifacts can cite normalized protocol structure rather than only raw extraction aggregates
- `ovarian-tissue` runs on the same normalization layer without introducing domain-specific hacks as the default pattern
- the repo is in a state where future domain expansion would copy a stable architecture instead of copying current pipeline fragility

## 10. Non-Goals For This Phase

- no new domains
- no major benchmark-policy expansion
- no autonomous full-text acquisition
- no attempt to solve every protocol nuance in the first normalized schema

The goal of this phase is a trustworthy canonical layer, not maximal extraction ambition.
