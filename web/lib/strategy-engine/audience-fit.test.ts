/** Run with: npx tsx --test lib/strategy-engine/audience-fit.test.ts */
import test from "node:test";
import assert from "node:assert/strict";
import { deriveDemographicNote, type DemographicMix } from "./audience-fit";

function mix(over: Partial<DemographicMix["race"]> = {}): DemographicMix {
  return {
    race: { black: 0.2, white: 0.6, hispanic: 0.1, asian: 0.03, ...over },
    age: { "18_29": 0.2, "25_54": 0.4, "50_plus": 0.3, "65_plus": 0.15 },
  };
}

test("flags a high-Hispanic market for Spanish-language formats", () => {
  const note = deriveDemographicNote(mix({ hispanic: 0.42, white: 0.4 }));
  assert.ok(note && /hispanic/i.test(note) && /spanish/i.test(note));
});

test("flags a high-Black market for urban formats", () => {
  const note = deriveDemographicNote(mix({ black: 0.45, white: 0.4 }));
  assert.ok(note && /(black|urban)/i.test(note));
});

test("returns null for a market with no over-indexing signal", () => {
  assert.equal(deriveDemographicNote(mix()), null);
});
