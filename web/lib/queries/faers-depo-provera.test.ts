/**
 * Tests for the Depo-Provera FAERS config (faers-depo-provera.ts).
 *
 * Config-only guard tests: the brand map is the single exact string verified
 * in the live dataset, and the meningioma PT list is non-empty, duplicate-free,
 * and excludes the known false positives (Meningitis, generic Brain neoplasm).
 *
 * Uses node:test + node:assert. Run with a TypeScript-aware Node.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  DEPO_BRAND_MAP,
  MENINGIOMA_REACTION_PTS,
} from "./faers-depo-provera";

test("DEPO_BRAND_MAP: single brand, single exact medicinalproduct string", () => {
  assert.deepEqual(Object.keys(DEPO_BRAND_MAP), ["Depo-Provera"]);
  assert.deepEqual(DEPO_BRAND_MAP["Depo-Provera"], ["DEPO-PROVERA"]);
});

test("MENINGIOMA_REACTION_PTS: non-empty, duplicate-free meningioma spectrum", () => {
  assert.ok(MENINGIOMA_REACTION_PTS.length > 0);
  assert.equal(
    new Set(MENINGIOMA_REACTION_PTS).size,
    MENINGIOMA_REACTION_PTS.length,
    "duplicate PTs",
  );
  // every PT is a meningioma term ...
  for (const pt of MENINGIOMA_REACTION_PTS) {
    assert.ok(/meningioma/i.test(pt), `"${pt}" is not a meningioma PT`);
  }
  // ... and the documented false positives are excluded.
  for (const excluded of ["Brain neoplasm", "Meningitis", "Meningitis viral", "Glioma"]) {
    assert.ok(
      !MENINGIOMA_REACTION_PTS.includes(excluded),
      `"${excluded}" should be excluded`,
    );
  }
});
