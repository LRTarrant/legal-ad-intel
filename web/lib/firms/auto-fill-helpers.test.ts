/**
 * Unit tests for the auto-fill UI helpers.
 *
 * Covers default field selection, PATCH building, change summarization,
 * and the edge cases the UI cares about (no-op writes, "select all",
 * social handles).
 */

import type { Firm } from "./types";
import {
  ALL_FIELDS,
  buildApplyPatch,
  defaultFieldSelections,
  summarizeFieldChange,
  type FieldSelections,
  type ProposedBrandProfile,
} from "./auto-fill-helpers";

/* ── Fixtures ───────────────────────────────────────────────────────────── */

function emptyFirm(): Pick<
  Firm,
  | "tagline"
  | "voice_descriptors"
  | "differentiators"
  | "partner_names"
  | "signature_phrases"
  | "service_areas"
  | "social_handles"
> {
  return {
    tagline: null,
    voice_descriptors: [],
    differentiators: [],
    partner_names: [],
    signature_phrases: [],
    service_areas: [],
    social_handles: {},
  };
}

function emptyProposed(): ProposedBrandProfile {
  return {
    tagline: null,
    voice_descriptors: [],
    differentiators: [],
    partner_names: [],
    signature_phrases: [],
    service_areas: [],
    social_handles: {},
    rationale: "Nothing found.",
  };
}

function richProposed(): ProposedBrandProfile {
  return {
    tagline: "We fight for what's right.",
    voice_descriptors: ["compassionate", "experienced"],
    differentiators: ["30 years"],
    partner_names: ["John Smith"],
    signature_phrases: ["No fee unless we win."],
    service_areas: ["car accidents"],
    social_handles: { facebook: "https://facebook.com/x" },
    rationale: "Inferred from headlines.",
  };
}

function allSelected(): FieldSelections {
  return {
    tagline: true,
    voice_descriptors: true,
    differentiators: true,
    partner_names: true,
    signature_phrases: true,
    service_areas: true,
    social_handles: true,
  };
}

/* ── defaultFieldSelections ────────────────────────────────────────────── */

test("default selections: empty proposed gives all-false", () => {
  const sel = defaultFieldSelections(emptyProposed(), emptyFirm());
  for (const f of ALL_FIELDS) {
    expect(sel[f]).toBe(false);
  }
});

test("default selections: rich proposed against empty firm = all true", () => {
  const sel = defaultFieldSelections(richProposed(), emptyFirm());
  for (const f of ALL_FIELDS) {
    expect(sel[f]).toBe(true);
  }
});

test("default selections: identical fields are unchecked", () => {
  const proposed = richProposed();
  const current = {
    ...emptyFirm(),
    voice_descriptors: ["compassionate", "experienced"],
    partner_names: ["John Smith"],
  };
  const sel = defaultFieldSelections(proposed, current);
  expect(sel.voice_descriptors).toBe(false);
  expect(sel.partner_names).toBe(false);
  // Other fields still differ, so still checked
  expect(sel.tagline).toBe(true);
  expect(sel.differentiators).toBe(true);
});

test("default selections: case-insensitive array dedup match", () => {
  const proposed = {
    ...emptyProposed(),
    voice_descriptors: ["Compassionate", "EXPERIENCED"],
  };
  const current = {
    ...emptyFirm(),
    voice_descriptors: ["compassionate", "experienced"],
  };
  const sel = defaultFieldSelections(proposed, current);
  expect(sel.voice_descriptors).toBe(false);
});

test("default selections: empty tagline against existing is unchecked", () => {
  // We don't auto-clear existing fields; user must opt in via manual edit.
  const proposed = { ...emptyProposed(), tagline: "" };
  const current = { ...emptyFirm(), tagline: "Existing tagline" };
  const sel = defaultFieldSelections(proposed, current);
  expect(sel.tagline).toBe(false);
});

test("default selections: social_handles diff by URL value too", () => {
  const proposed = {
    ...emptyProposed(),
    social_handles: { facebook: "https://facebook.com/new" },
  };
  const current = {
    ...emptyFirm(),
    social_handles: { facebook: "https://facebook.com/old" },
  };
  const sel = defaultFieldSelections(proposed, current);
  expect(sel.social_handles).toBe(true);
});

/* ── buildApplyPatch ────────────────────────────────────────────────────── */

test("buildApplyPatch: returns null when nothing selected", () => {
  const sel: FieldSelections = {
    tagline: false,
    voice_descriptors: false,
    differentiators: false,
    partner_names: false,
    signature_phrases: false,
    service_areas: false,
    social_handles: false,
  };
  const patch = buildApplyPatch(richProposed(), sel, "https://example.com/");
  expect(patch).toBeNull();
});

test("buildApplyPatch: only includes selected fields", () => {
  const sel: FieldSelections = {
    tagline: true,
    voice_descriptors: false,
    differentiators: false,
    partner_names: true,
    signature_phrases: false,
    service_areas: false,
    social_handles: false,
  };
  const patch = buildApplyPatch(richProposed(), sel, "https://example.com/");
  expect(patch !== null).toBe(true);
  if (!patch) return;
  expect(patch.tagline).toBe("We fight for what's right.");
  expect(patch.partner_names).toEqual(["John Smith"]);
  expect(patch.voice_descriptors).toBeUndefined();
  expect(patch.differentiators).toBeUndefined();
  expect(patch.signature_phrases).toBeUndefined();
  expect(patch.service_areas).toBeUndefined();
  expect(patch.social_handles).toBeUndefined();
});

test("buildApplyPatch: pins website_url", () => {
  const sel = allSelected();
  const patch = buildApplyPatch(richProposed(), sel, "https://example.com/firm");
  if (!patch) throw new Error("expected patch");
  expect(patch.website_url).toBe("https://example.com/firm");
});

test("buildApplyPatch: extraction_source=auto when all selected", () => {
  const sel = allSelected();
  const patch = buildApplyPatch(richProposed(), sel, "https://example.com/");
  if (!patch) throw new Error("expected patch");
  expect(patch.extraction_source).toBe("auto");
});

test("buildApplyPatch: extraction_source=hybrid when partial", () => {
  const sel = { ...allSelected(), differentiators: false };
  const patch = buildApplyPatch(richProposed(), sel, "https://example.com/");
  if (!patch) throw new Error("expected patch");
  expect(patch.extraction_source).toBe("hybrid");
});

test("buildApplyPatch: includes extracted_at ISO timestamp", () => {
  const sel = allSelected();
  const patch = buildApplyPatch(richProposed(), sel, "https://example.com/");
  if (!patch) throw new Error("expected patch");
  expect(typeof patch.extracted_at).toBe("string");
  // Must parse as a valid date
  const parsed = patch.extracted_at ? Date.parse(patch.extracted_at) : NaN;
  expect(Number.isNaN(parsed)).toBe(false);
});

test("buildApplyPatch: null tagline becomes empty string", () => {
  const proposed = { ...richProposed(), tagline: null };
  const sel = { ...allSelected(), tagline: true };
  const patch = buildApplyPatch(proposed, sel, "https://example.com/");
  if (!patch) throw new Error("expected patch");
  expect(patch.tagline).toBe("");
});

/* ── summarizeFieldChange ──────────────────────────────────────────────── */

test("summarize tagline: set new", () => {
  const r = summarizeFieldChange("tagline", "We fight.", null);
  expect(r).toContain("Set:");
  expect(r).toContain("We fight.");
});

test("summarize tagline: replace existing", () => {
  const r = summarizeFieldChange("tagline", "New line", "Old line");
  expect(r).toContain("Replace:");
  expect(r).toContain("Old line");
  expect(r).toContain("New line");
});

test("summarize tagline: clear", () => {
  const r = summarizeFieldChange("tagline", "", "Old line");
  expect(r).toContain("Clear");
});

test("summarize string array: additions", () => {
  const r = summarizeFieldChange(
    "voice_descriptors",
    ["calm", "local", "experienced"],
    [],
  );
  expect(r).toContain("Adding 3");
  expect(r).toContain("calm");
});

test("summarize string array: cap displayed names at 3", () => {
  const r = summarizeFieldChange(
    "voice_descriptors",
    ["a", "b", "c", "d", "e"],
    [],
  );
  expect(r).toContain("Adding 5");
  // The names listed should be a, b, c then ellipsis
  expect(r).toContain("\u2026");
});

test("summarize string array: removals when proposed has fewer", () => {
  const r = summarizeFieldChange(
    "voice_descriptors",
    ["calm"],
    ["calm", "local", "experienced"],
  );
  expect(r).toContain("Removing 2");
});

test("summarize string array: nothing extracted", () => {
  const r = summarizeFieldChange("voice_descriptors", [], []);
  expect(r).toContain("Nothing extracted");
});

test("summarize string array: no change when sets match", () => {
  const r = summarizeFieldChange(
    "voice_descriptors",
    ["calm", "local"],
    ["LOCAL", "calm"],
  );
  expect(r).toContain("No change");
});

test("summarize social_handles: new platforms", () => {
  const r = summarizeFieldChange(
    "social_handles",
    { facebook: "https://fb.com/x", twitter: "https://twitter.com/x" },
    {},
  );
  expect(r).toContain("+2 new");
});

test("summarize social_handles: updated URL", () => {
  const r = summarizeFieldChange(
    "social_handles",
    { facebook: "https://fb.com/new" },
    { facebook: "https://fb.com/old" },
  );
  expect(r).toContain("~1 updated");
});

test("summarize social_handles: no change", () => {
  const r = summarizeFieldChange(
    "social_handles",
    { facebook: "https://fb.com/x" },
    { facebook: "https://fb.com/x" },
  );
  expect(r).toContain("No change");
});

/* ── ALL_FIELDS sanity ─────────────────────────────────────────────────── */

test("ALL_FIELDS: contains all 7 selectable fields", () => {
  expect(ALL_FIELDS.length).toBe(7);
  expect(ALL_FIELDS).toContain("tagline");
  expect(ALL_FIELDS).toContain("social_handles");
});
