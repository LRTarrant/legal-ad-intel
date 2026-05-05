/**
 * Unit tests for lib/voice/pronunciation.ts.
 *
 * Coverage:
 *   - looksLikeIpa: detects IPA characters; ignores plain ASCII
 *   - validatePronunciationOverrides: shape, caps, dedup, missing fields
 *   - applyPronunciationOverrides:
 *       - plain respelling substitution
 *       - IPA <phoneme> wrapping
 *       - whole-word matching (no partial matches)
 *       - case-insensitive matching with original-case fallback inside tag
 *       - longest-phrase-first ordering
 *       - non-recursion (a `spoken` value containing another `written` is
 *         not re-substituted)
 *       - HTML escaping in the IPA `ph` attribute
 *       - empty inputs / no overrides
 *       - dollar-sign safety in the spoken value
 */

import {
  applyPronunciationOverrides,
  looksLikeIpa,
  PRONUNCIATION_LIMITS,
  validatePronunciationOverrides,
  type PronunciationOverride,
} from "./pronunciation";

/* ── looksLikeIpa ──────────────────────────────────────────────────────── */

test("looksLikeIpa detects classic IPA stress + vowel marks", () => {
  expect(looksLikeIpa("ˈbɝː.mɪŋ.hæm")).toBe(true);
});

test("looksLikeIpa accepts isolated IPA chars", () => {
  expect(looksLikeIpa("təˈmɑːtoʊ")).toBe(true);
});

test("looksLikeIpa returns false for plain respelling", () => {
  expect(looksLikeIpa("BURR ming ham")).toBe(false);
  expect(looksLikeIpa("toh-MAY-toh")).toBe(false);
  expect(looksLikeIpa("Bir-Ming-Ham")).toBe(false);
});

test("looksLikeIpa returns false for empty / pure ASCII", () => {
  expect(looksLikeIpa("")).toBe(false);
  expect(looksLikeIpa("hello world")).toBe(false);
});

/* ── validatePronunciationOverrides ────────────────────────────────────── */

test("validate accepts a clean array", () => {
  const result = validatePronunciationOverrides([
    { written: "Birmingham", spoken: "BURR ming ham" },
    { written: "Tarrant", spoken: "ˈtærənt" },
  ]);
  expect(result.ok).toBe(true);
  if (result.ok) expect(result.value.length).toBe(2);
});

test("validate rejects non-array input", () => {
  const result = validatePronunciationOverrides("nope");
  expect(result.ok).toBe(false);
});

test("validate trims whitespace on both fields", () => {
  const result = validatePronunciationOverrides([
    { written: "  Birmingham  ", spoken: "  BURR ming ham  " },
  ]);
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value[0].written).toBe("Birmingham");
    expect(result.value[0].spoken).toBe("BURR ming ham");
  }
});

test("validate rejects rows missing written or spoken", () => {
  const result = validatePronunciationOverrides([
    { written: "", spoken: "abc" },
    { written: "abc", spoken: "" },
  ]);
  expect(result.ok).toBe(false);
});

test("validate dedupes case-insensitively on written", () => {
  const result = validatePronunciationOverrides([
    { written: "Birmingham", spoken: "a" },
    { written: "BIRMINGHAM", spoken: "b" },
  ]);
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.errors.some((e) => e.includes("duplicate"))).toBe(true);
  }
});

test("validate enforces maxOverrides cap", () => {
  const tooMany = Array.from(
    { length: PRONUNCIATION_LIMITS.maxOverrides + 1 },
    (_, i) => ({ written: `word${i}`, spoken: `s${i}` }),
  );
  const result = validatePronunciationOverrides(tooMany);
  expect(result.ok).toBe(false);
});

test("validate rejects oversize written / spoken", () => {
  const longWritten = "x".repeat(PRONUNCIATION_LIMITS.maxWrittenChars + 1);
  const r1 = validatePronunciationOverrides([
    { written: longWritten, spoken: "ok" },
  ]);
  expect(r1.ok).toBe(false);

  const longSpoken = "x".repeat(PRONUNCIATION_LIMITS.maxSpokenChars + 1);
  const r2 = validatePronunciationOverrides([
    { written: "ok", spoken: longSpoken },
  ]);
  expect(r2.ok).toBe(false);
});

/* ── applyPronunciationOverrides ───────────────────────────────────────── */

test("apply: empty text returns empty", () => {
  expect(applyPronunciationOverrides("", [])).toBe("");
});

test("apply: null/undefined overrides leaves text alone", () => {
  expect(applyPronunciationOverrides("hello", null)).toBe("hello");
  expect(applyPronunciationOverrides("hello", undefined)).toBe("hello");
  expect(applyPronunciationOverrides("hello", [])).toBe("hello");
});

test("apply: plain respelling substitutes whole word, case-insensitive", () => {
  const overrides: PronunciationOverride[] = [
    { written: "Birmingham", spoken: "BURR ming ham" },
  ];
  expect(
    applyPronunciationOverrides("Hurt in a Birmingham wreck?", overrides),
  ).toBe("Hurt in a BURR ming ham wreck?");
  expect(
    applyPronunciationOverrides("birmingham city", overrides),
  ).toBe("BURR ming ham city");
});

test("apply: plain respelling does NOT match partial words", () => {
  const overrides: PronunciationOverride[] = [
    { written: "York", spoken: "YORK" },
  ];
  // "Yorkshire" should not match
  expect(applyPronunciationOverrides("Yorkshire pudding", overrides)).toBe(
    "Yorkshire pudding",
  );
  // Standalone "York" should match
  expect(applyPronunciationOverrides("New York City", overrides)).toBe(
    "New YORK City",
  );
});

test("apply: IPA produces a <phoneme> tag with original-case fallback", () => {
  const overrides: PronunciationOverride[] = [
    { written: "Birmingham", spoken: "ˈbɝː.mɪŋ.hæm" },
  ];
  const out = applyPronunciationOverrides(
    "Hurt in a Birmingham wreck?",
    overrides,
  );
  expect(out).toContain('<phoneme alphabet="ipa"');
  expect(out).toContain('ph="ˈbɝː.mɪŋ.hæm"');
  // The fallback inside the tag preserves the original casing
  expect(out).toContain(">Birmingham</phoneme>");
});

test("apply: longer phrases take precedence over substrings", () => {
  const overrides: PronunciationOverride[] = [
    { written: "New York", spoken: "noo YORK" },
    { written: "New York City", spoken: "noo YORK SITTY" },
  ];
  // "New York City" should win even though "New York" is also defined.
  expect(applyPronunciationOverrides("Visit New York City today.", overrides))
    .toBe("Visit noo YORK SITTY today.");
});

test("apply: replacement is non-recursive (no infinite loop)", () => {
  // 'spoken' contains another 'written' — should NOT trigger another replacement.
  const overrides: PronunciationOverride[] = [
    { written: "ABC", spoken: "XYZ ABC" },
  ];
  expect(applyPronunciationOverrides("call ABC for help", overrides)).toBe(
    "call XYZ ABC for help",
  );
});

test("apply: IPA path escapes & and quotes in the ph attribute", () => {
  const overrides: PronunciationOverride[] = [
    // Synthetic — real IPA doesn't have & or ", but we escape defensively.
    { written: "Foo", spoken: 'ɝ"&' },
  ];
  const out = applyPronunciationOverrides("Foo", overrides);
  expect(out).toContain('ph="ɝ&quot;&amp;"');
});

test("apply: plain respelling allows literal $ in spoken value", () => {
  // String.replace treats $1, $&, etc. as backreferences; we use a callback
  // so the spoken string is taken literally.
  const overrides: PronunciationOverride[] = [
    { written: "money", spoken: "$5 cash" },
  ];
  expect(applyPronunciationOverrides("show me the money", overrides)).toBe(
    "show me the $5 cash",
  );
});

test("apply: multi-occurrence in same line all get replaced", () => {
  const overrides: PronunciationOverride[] = [
    { written: "Birmingham", spoken: "BURR" },
  ];
  expect(
    applyPronunciationOverrides("Birmingham, Birmingham, Birmingham", overrides),
  ).toBe("BURR, BURR, BURR");
});

test("apply: punctuation around match is preserved", () => {
  const overrides: PronunciationOverride[] = [
    { written: "Birmingham", spoken: "BURR" },
  ];
  expect(applyPronunciationOverrides('"Birmingham!" he said.', overrides))
    .toBe('"BURR!" he said.');
});
