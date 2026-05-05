/**
 * Tests for pronunciation-dictionary.ts (the merge logic).
 * The DB fetch path is covered by integration tests / manual QA;
 * unit-level we just pin the merge precedence rules.
 */

import { mergePronunciationLayers } from "./pronunciation-dictionary";

test("merge: empty firm + empty global = empty", () => {
  expect(mergePronunciationLayers([], [])).toEqual([]);
});

test("merge: null firm overrides treated as empty", () => {
  const global = [{ written: "Talc", spoken: "TALK" }];
  expect(mergePronunciationLayers(null, global)).toEqual(global);
  expect(mergePronunciationLayers(undefined, global)).toEqual(global);
});

test("merge: firm overrides take precedence over global on same written key", () => {
  const firm = [{ written: "Birmingham", spoken: "BIR-ming-um" }]; // British
  const global = [{ written: "Birmingham", spoken: "BURR-ming-ham" }]; // US
  const merged = mergePronunciationLayers(firm, global);
  expect(merged.length).toBe(1);
  expect(merged[0].spoken).toBe("BIR-ming-um");
});

test("merge: precedence is case-insensitive on written key", () => {
  const firm = [{ written: "DEPO-PROVERA", spoken: "fancy" }];
  const global = [{ written: "Depo-Provera", spoken: "DEP-oh proh-VEH-rah" }];
  const merged = mergePronunciationLayers(firm, global);
  expect(merged.length).toBe(1);
  expect(merged[0].spoken).toBe("fancy");
});

test("merge: non-overlapping rows are concatenated firm-first", () => {
  const firm = [{ written: "Tarrant", spoken: "TARE-ant" }];
  const global = [
    { written: "Depo-Provera", spoken: "DEP-oh proh-VEH-rah" },
    { written: "Paraquat", spoken: "PAIR-uh-kwat" },
  ];
  const merged = mergePronunciationLayers(firm, global);
  expect(merged.length).toBe(3);
  expect(merged[0].written).toBe("Tarrant");
  expect(merged.map((m) => m.written)).toContain("Depo-Provera");
  expect(merged.map((m) => m.written)).toContain("Paraquat");
});

test("merge: dedupes within firm overrides themselves (defensive)", () => {
  // Shouldn't normally happen since validatePronunciationOverrides
  // would reject these, but the merge fn shouldn't crash if it sees them.
  const firm = [
    { written: "X", spoken: "first" },
    { written: "x", spoken: "second" },
  ];
  const merged = mergePronunciationLayers(firm, []);
  expect(merged.length).toBe(1);
  expect(merged[0].spoken).toBe("first");
});
