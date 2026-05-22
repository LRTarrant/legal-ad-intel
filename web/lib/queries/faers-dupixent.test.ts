/**
 * Tests for the Dupixent FAERS config (faers-dupixent.ts).
 *
 * Config-only guard tests: the brand map is exactly the two exact strings
 * verified in the live dataset (brand + single-source INN), and the CTCL PT
 * list is non-empty, duplicate-free, and excludes the known false positives
 * (bare Lymphoma, B-cell terms, non-cutaneous T-cell lymphomas).
 *
 * Uses node:test + node:assert. Run with a TypeScript-aware Node.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  DUPIXENT_BRAND_MAP,
  CTCL_REACTION_PTS,
} from "./faers-dupixent";

test("DUPIXENT_BRAND_MAP: single brand, brand + single-source INN", () => {
  assert.deepEqual(Object.keys(DUPIXENT_BRAND_MAP), ["Dupixent"]);
  assert.deepEqual(DUPIXENT_BRAND_MAP["Dupixent"], ["DUPIXENT", "DUPILUMAB"]);
});

test("CTCL_REACTION_PTS: non-empty, duplicate-free CTCL spectrum", () => {
  assert.ok(CTCL_REACTION_PTS.length > 0);
  assert.equal(
    new Set(CTCL_REACTION_PTS).size,
    CTCL_REACTION_PTS.length,
    "duplicate PTs",
  );
  // every PT is a lymphoma-spectrum term ...
  for (const pt of CTCL_REACTION_PTS) {
    assert.ok(/lymphoma/i.test(pt), `"${pt}" is not a lymphoma PT`);
  }
  // ... and the documented false positives are excluded.
  for (const excluded of [
    "Lymphoma",
    "B-cell lymphoma",
    "Diffuse large B-cell lymphoma",
    "Non-Hodgkin^s lymphoma",
    "Angioimmunoblastic T-cell lymphoma",
    "Pseudolymphoma",
  ]) {
    assert.ok(
      !CTCL_REACTION_PTS.includes(excluded),
      `"${excluded}" should be excluded`,
    );
  }
});
