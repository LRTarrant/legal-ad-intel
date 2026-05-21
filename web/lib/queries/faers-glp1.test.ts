/**
 * Tests for the GLP-1 FAERS config (faers-glp1.ts).
 *
 * faers-glp1.ts is now config-only -- the brand map and the per-page MedDRA
 * preferred-term lists. The shared shaping/fetch machinery is tested in
 * faers-shared.test.ts. These tests guard the data-shape constants: every
 * brand maps to at least one exact `medicinalproduct` string, and the
 * reaction-PT lists are non-empty and free of duplicates.
 *
 * Uses node:test + node:assert. Run with a TypeScript-aware Node.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  GLP1_BRANDS,
  GLP1_BRAND_MAP,
  GASTROPARESIS_REACTION_PTS,
  VISION_LOSS_REACTION_PTS,
} from "./faers-glp1";

test("GLP1_BRAND_MAP: every brand maps to a non-empty exact-string array", () => {
  assert.deepEqual(Object.keys(GLP1_BRAND_MAP).sort(), [...GLP1_BRANDS].sort());
  for (const [brand, products] of Object.entries(GLP1_BRAND_MAP)) {
    assert.ok(products.length > 0, `${brand} has no medicinalproduct strings`);
    for (const p of products) {
      assert.equal(p, p.toUpperCase(), `${brand}: "${p}" is not upper-case`);
      assert.equal(p.trim(), p, `${brand}: "${p}" has surrounding whitespace`);
    }
  }
});

test("reaction-PT lists are non-empty and contain no duplicates", () => {
  for (const [name, pts] of [
    ["GASTROPARESIS_REACTION_PTS", GASTROPARESIS_REACTION_PTS],
    ["VISION_LOSS_REACTION_PTS", VISION_LOSS_REACTION_PTS],
  ] as const) {
    assert.ok(pts.length > 0, `${name} is empty`);
    assert.equal(new Set(pts).size, pts.length, `${name} has duplicate PTs`);
  }
});
