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

test("ovarian discovery keeps protocol-heavy preparation papers", () => {
  assert.equal(
    shouldKeepDiscoveryCandidate(
      "Permeation of Human Ovarian Tissue with Cryoprotective Agents in Preparation for Cryopreservation",
      "Human ovarian cortex samples were equilibrated across cryoprotective agent conditions before storage.",
      "ovarian-tissue"
    ),
    true
  );
});

test("ovarian discovery rejects broad cryopreservation review titles without a second method signal", () => {
  assert.equal(
    shouldKeepDiscoveryCandidate(
      "Cryopreservation of Ovarian Tissue for Fertility Preservation in Young Female Oncological Patients",
      "Clinical overview of fertility preservation options in oncology patients.",
      "ovarian-tissue"
    ),
    false
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

test("ovarian discovery rejects review and meta-analysis titles even with cryo keywords", () => {
  assert.equal(
    shouldKeepDiscoveryCandidate(
      "Vitrification versus slow freezing for human ovarian tissue cryopreservation: a systematic review and meta-analysis",
      "Systematic review of published ovarian tissue cryopreservation studies.",
      "ovarian-tissue"
    ),
    false
  );
});

test("ovarian discovery rejects clinical outcome titles without protocol signal", () => {
  assert.equal(
    shouldKeepDiscoveryCandidate(
      "The first woman to give birth to two children following transplantation of frozen/thawed ovarian tissue",
      "Clinical outcome report following ovarian tissue transplantation.",
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

test("ovarian scoring surfaces blocked review-style titles", () => {
  const result = scoreDiscoveryText(
    "Vitrification versus slow freezing for human ovarian tissue cryopreservation: a systematic review and meta-analysis",
    "Systematic review of published ovarian tissue cryopreservation studies.",
    "ovarian-tissue"
  );
  assert.ok(result.titleMethodMatches.includes("freezing method"));
  assert.ok(result.blockedTitleMatches.includes("review style"));
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
  assert.equal(
    shouldKeepDiscoveryCandidate(
      "Whole Ovary Cryopreservation and Transplantation: A Systematic Review of Challenges and Research Developments in Animal Experiments and Humans",
      "Review of ovarian tissue cryopreservation programs and transplant experience.",
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
