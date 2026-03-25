import test from "node:test";
import assert from "node:assert/strict";
import { getDiscoveryDomainConfig, scoreDiscoveryText, shouldKeepDiscoveryCandidate } from "./domain.js";

test("islets discovery keeps cryopreservation protocol papers", () => {
  assert.equal(
    shouldKeepDiscoveryCandidate(
      "Development of a Cryopreservation Procedure Employing a Freezer Bag for Pancreatic Islets",
      "A cryoprotectant protocol improved post-thaw viability and recovery of pancreatic islets.",
      "islets"
    ),
    true
  );
});

test("islets discovery rejects transplantation-only papers without cryo signal", () => {
  assert.equal(
    shouldKeepDiscoveryCandidate(
      "Advances in Pancreatic Islet Transplantation Sites for the Treatment of Diabetes",
      "Review of implantation sites and graft outcomes for pancreatic islet transplantation.",
      "islets"
    ),
    false
  );
});

test("ovarian discovery keeps cryopreservation-specific literature", () => {
  assert.equal(
    shouldKeepDiscoveryCandidate(
      "Comparison between Slow Freezing and Vitrification in Terms of Ovarian Tissue Viability in a Bovine Model",
      "Ovarian tissue cryopreservation protocols were compared across freezing and vitrification conditions.",
      "ovarian-tissue"
    ),
    true
  );
});

test("ovarian discovery rejects broad fertility-preservation summaries without storage signal", () => {
  assert.equal(
    shouldKeepDiscoveryCandidate(
      "Female fertility preservation: past, present and future",
      "Broad review of reproductive options and counseling pathways.",
      "ovarian-tissue"
    ),
    false
  );
});

test("ovarian scoring separates cryo requirements from contextual cues", () => {
  const result = scoreDiscoveryText(
    "Cryopreservation/transplantation of ovarian tissue and in vitro maturation of follicles and oocytes",
    "Ovarian tissue cryopreservation and transplantation were reviewed.",
    "ovarian-tissue"
  );
  assert.ok(result.anchorMatches.includes("ovarian tissue"));
  assert.ok(result.requiredSupportingMatches.includes("cryopreservation"));
  assert.ok(result.contextualSupportingMatches.includes("transplantation"));
});

test("title-level matching is required to keep candidates", () => {
  assert.equal(
    shouldKeepDiscoveryCandidate(
      "Skin Graft Preservation",
      "This review discusses cryopreservation considerations for pancreatic islets and related cell therapies.",
      "islets"
    ),
    false
  );
  assert.equal(
    shouldKeepDiscoveryCandidate(
      "Pilot study of isolated early human follicles cultured in collagen gels for 24 hours",
      "Cryopreserved ovarian follicles were cultured after thaw for exploratory analysis.",
      "ovarian-tissue"
    ),
    false
  );
});

test("provider queries stay cryo-focused", () => {
  const islets = getDiscoveryDomainConfig("islets");
  const ovarian = getDiscoveryDomainConfig("ovarian-tissue");
  assert.ok(islets.providerQueries.openalex.includes("cryopreservation"));
  assert.ok(islets.providerQueries.openalex.includes("thaw"));
  assert.equal(islets.providerQueries.openalex.includes("transplantation"), false);
  assert.ok(ovarian.providerQueries.openalex.includes("cryopreservation"));
  assert.ok(ovarian.providerQueries.openalex.includes("cryoprotectant"));
});
