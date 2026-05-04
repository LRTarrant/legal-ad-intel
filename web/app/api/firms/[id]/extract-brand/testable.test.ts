/**
 * Unit tests for /api/firms/[id]/extract-brand pure helpers.
 *
 * Focus areas (validation, prompt assembly, response sanitization,
 * social-handle filtering, array dedup/cap behavior). The route
 * handler itself is exercised against the live OpenAI/Supabase stack
 * via Vercel preview \u2014 we don't mock either of those here.
 */

import type { ExtractedPage } from "@/lib/firms/url-extractor";
import {
  ARRAY_CAPS,
  BRAND_EXTRACT_SYSTEM_PROMPT,
  ENTRY_MAX_CHARS,
  TAGLINE_MAX_CHARS,
  buildExtractionUserPrompt,
  stripJSONWrapper,
  validateBrandExtractRequest,
  validateExtractedBrandProfile,
  type ExtractedPageWithUrl,
} from "./testable";

/* ── Fixtures ───────────────────────────────────────────────────────────── */

function emptyPage(): ExtractedPage {
  return {
    title: null,
    metaDescription: null,
    og: { title: null, description: null, siteName: null, image: null },
    headings: [],
    paragraphs: [],
    socialLinks: {
      facebook: null,
      x: null,
      linkedin: null,
      instagram: null,
      youtube: null,
      tiktok: null,
    },
    phoneNumbers: [],
    wordCount: 0,
  };
}

function richPage(): ExtractedPageWithUrl {
  return {
    finalUrl: "https://smithjones.com/",
    page: {
      title: "Smith & Jones — Personal Injury Attorneys in Birmingham",
      metaDescription:
        "Birmingham personal injury law firm with 30+ years of experience. Free consultations.",
      og: {
        title: "Smith & Jones — Personal Injury Attorneys",
        description: "30 years fighting for Alabama families.",
        siteName: "Smith & Jones LLP",
        image: "https://smithjones.com/og.jpg",
      },
      headings: [
        "Birmingham's Trusted Injury Attorneys",
        "We Fight For You",
        "Free Case Review",
        "Areas We Serve",
      ],
      paragraphs: [
        "For more than three decades, Smith & Jones has represented Alabama families injured in car accidents, truck wrecks, and workplace incidents.",
        "Founded by John Smith and Sarah Jones in 1992, we believe every client deserves direct attorney access \u2014 no paralegal handoffs.",
        "We don't get paid unless you do.",
      ],
      socialLinks: {
        facebook: "https://facebook.com/smithjones",
        x: "https://twitter.com/smithjoneslaw",
        linkedin: "https://linkedin.com/company/smith-jones",
        instagram: null,
        youtube: null,
        tiktok: null,
      },
      phoneNumbers: ["(205) 555-1212"],
      wordCount: 412,
    },
  };
}

/* ── validateBrandExtractRequest ────────────────────────────────────────── */

test("validateBrandExtractRequest: accepts empty/null body", () => {
  const a = validateBrandExtractRequest(null);
  expect(a.ok).toBe(true);
  if (a.ok) expect(a.value).toEqual({});

  const b = validateBrandExtractRequest({});
  expect(b.ok).toBe(true);
  if (b.ok) expect(b.value).toEqual({});
});

test("validateBrandExtractRequest: rejects non-object body", () => {
  const r = validateBrandExtractRequest([]);
  expect(r.ok).toBe(false);
});

test("validateBrandExtractRequest: accepts http/https website_url", () => {
  const r = validateBrandExtractRequest({ website_url: "https://example.com" });
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.value.website_url).toBe("https://example.com");
});

test("validateBrandExtractRequest: rejects javascript:/file: schemes", () => {
  const a = validateBrandExtractRequest({ website_url: "javascript:alert(1)" });
  expect(a.ok).toBe(false);
  const b = validateBrandExtractRequest({ website_url: "file:///etc/passwd" });
  expect(b.ok).toBe(false);
});

test("validateBrandExtractRequest: rejects malformed URL", () => {
  const r = validateBrandExtractRequest({ website_url: "not a url" });
  expect(r.ok).toBe(false);
});

test("validateBrandExtractRequest: empty website_url means use stored", () => {
  const r = validateBrandExtractRequest({ website_url: "   " });
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.value.website_url).toBeUndefined();
});

test("validateBrandExtractRequest: dry_run must be boolean", () => {
  const a = validateBrandExtractRequest({ dry_run: true });
  expect(a.ok).toBe(true);
  if (a.ok) expect(a.value.dry_run).toBe(true);

  const b = validateBrandExtractRequest({ dry_run: "yes" });
  expect(b.ok).toBe(false);
});

/* ── buildExtractionUserPrompt ──────────────────────────────────────────── */

test("buildExtractionUserPrompt: includes URL", () => {
  const out = buildExtractionUserPrompt(richPage());
  expect(out).toContain("URL: https://smithjones.com/");
});

test("buildExtractionUserPrompt: includes title and meta", () => {
  const out = buildExtractionUserPrompt(richPage());
  expect(out).toContain("Title: Smith & Jones");
  expect(out).toContain("Meta description: Birmingham personal injury");
});

test("buildExtractionUserPrompt: skips OG title when same as title", () => {
  const input: ExtractedPageWithUrl = {
    finalUrl: "https://example.com/",
    page: {
      ...emptyPage(),
      title: "Same Title",
      og: {
        title: "Same Title",
        description: null,
        siteName: null,
        image: null,
      },
    },
  };
  const out = buildExtractionUserPrompt(input);
  // First "Same Title" line should be from Title:, not from OG title:
  const ogLines = out
    .split("\n")
    .filter((l) => l.startsWith("OG title:"));
  expect(ogLines.length).toBe(0);
});

test("buildExtractionUserPrompt: includes headings up to 8", () => {
  const input: ExtractedPageWithUrl = {
    finalUrl: "https://example.com/",
    page: {
      ...emptyPage(),
      headings: Array.from({ length: 12 }, (_, i) => `Heading ${i + 1}`),
    },
  };
  const out = buildExtractionUserPrompt(input);
  expect(out).toContain("Heading 1");
  expect(out).toContain("Heading 8");
  expect(out).not.toContain("Heading 9");
});

test("buildExtractionUserPrompt: includes paragraphs up to 12", () => {
  const input: ExtractedPageWithUrl = {
    finalUrl: "https://example.com/",
    page: {
      ...emptyPage(),
      paragraphs: Array.from({ length: 20 }, (_, i) => `Paragraph ${i + 1}.`),
    },
  };
  const out = buildExtractionUserPrompt(input);
  expect(out).toContain("Paragraph 1.");
  expect(out).toContain("Paragraph 12.");
  expect(out).not.toContain("Paragraph 13.");
});

test("buildExtractionUserPrompt: only renders non-null social links", () => {
  const out = buildExtractionUserPrompt(richPage());
  expect(out).toContain("- facebook: https://facebook.com/smithjones");
  expect(out).toContain("- x: https://twitter.com/smithjoneslaw");
  expect(out).toContain("- linkedin: https://linkedin.com/company/smith-jones");
  expect(out).not.toContain("- instagram:");
  expect(out).not.toContain("- youtube:");
});

test("buildExtractionUserPrompt: includes phones when present", () => {
  const out = buildExtractionUserPrompt(richPage());
  expect(out).toContain("Phones detected: (205) 555-1212");
});

test("buildExtractionUserPrompt: warns when wordCount < 50", () => {
  const input: ExtractedPageWithUrl = {
    finalUrl: "https://example.com/",
    page: { ...emptyPage(), title: "Tiny Page", wordCount: 12 },
  };
  const out = buildExtractionUserPrompt(input);
  expect(out).toContain("only 12 words extracted");
  expect(out).toContain("conservative");
});

test("buildExtractionUserPrompt: no warning when wordCount >= 50", () => {
  const out = buildExtractionUserPrompt(richPage());
  expect(out).not.toContain("words extracted");
});

test("buildExtractionUserPrompt: includes JSON instruction at end", () => {
  const out = buildExtractionUserPrompt(richPage());
  expect(out).toContain("Return JSON with");
  expect(out).toContain("voice_descriptors");
  expect(out).toContain("partner_names");
});

test("buildExtractionUserPrompt: truncates very long titles", () => {
  const input: ExtractedPageWithUrl = {
    finalUrl: "https://example.com/",
    page: { ...emptyPage(), title: "x".repeat(500) },
  };
  const out = buildExtractionUserPrompt(input);
  // Title line should not exceed 200 + "Title: " prefix + ellipsis.
  const titleLine = out.split("\n").find((l) => l.startsWith("Title:")) ?? "";
  expect(titleLine.length).toBeLessThan(220);
  expect(titleLine).toContain("…");
});

/* ── stripJSONWrapper ───────────────────────────────────────────────────── */

test("stripJSONWrapper: removes ```json fence", () => {
  const r = stripJSONWrapper('```json\n{"a":1}\n```');
  expect(r).toBe('{"a":1}');
});

test("stripJSONWrapper: removes plain ``` fence", () => {
  const r = stripJSONWrapper('```\n{"a":1}\n```');
  expect(r).toBe('{"a":1}');
});

test("stripJSONWrapper: passes through unfenced", () => {
  const r = stripJSONWrapper('  {"a":1}  ');
  expect(r).toBe('{"a":1}');
});

/* ── validateExtractedBrandProfile: shape ───────────────────────────────── */

test("validateExtractedBrandProfile: rejects non-object", () => {
  const r = validateExtractedBrandProfile("nope");
  expect(r.ok).toBe(false);
});

test("validateExtractedBrandProfile: minimal valid response", () => {
  const r = validateExtractedBrandProfile({
    tagline: null,
    voice_descriptors: [],
    differentiators: [],
    partner_names: [],
    signature_phrases: [],
    service_areas: [],
    social_handles: {},
    rationale: "Page had little content.",
  });
  expect(r.ok).toBe(true);
  if (r.ok) {
    expect(r.value.tagline).toBeNull();
    expect(r.value.voice_descriptors).toEqual([]);
    expect(r.value.rationale).toBe("Page had little content.");
  }
});

test("validateExtractedBrandProfile: full happy path", () => {
  const r = validateExtractedBrandProfile({
    tagline: "We don't get paid unless you do.",
    voice_descriptors: ["compassionate", "no-nonsense", "experienced"],
    differentiators: ["30+ years", "free home visits"],
    partner_names: ["John Smith", "Sarah Jones"],
    signature_phrases: ["We fight for you"],
    service_areas: ["car accidents", "wrongful death"],
    social_handles: {
      facebook: "https://facebook.com/smithjones",
      twitter: "https://twitter.com/smithjones",
    },
    rationale: "Inferred from headlines and the founder paragraph.",
  });
  expect(r.ok).toBe(true);
  if (r.ok) {
    expect(r.value.tagline).toBe("We don't get paid unless you do.");
    expect(r.value.partner_names).toEqual(["John Smith", "Sarah Jones"]);
    expect(r.value.social_handles.facebook).toBe(
      "https://facebook.com/smithjones",
    );
  }
});

/* ── validateExtractedBrandProfile: tagline ────────────────────────────── */

test("tagline: empty string becomes null", () => {
  const r = validateExtractedBrandProfile({
    tagline: "",
    voice_descriptors: [],
    differentiators: [],
    partner_names: [],
    signature_phrases: [],
    service_areas: [],
    social_handles: {},
    rationale: "ok",
  });
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.value.tagline).toBeNull();
});

test("tagline: whitespace-only becomes null", () => {
  const r = validateExtractedBrandProfile({
    tagline: "   ",
    voice_descriptors: [],
    differentiators: [],
    partner_names: [],
    signature_phrases: [],
    service_areas: [],
    social_handles: {},
    rationale: "ok",
  });
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.value.tagline).toBeNull();
});

test("tagline: number is rejected", () => {
  const r = validateExtractedBrandProfile({
    tagline: 42,
    voice_descriptors: [],
    differentiators: [],
    partner_names: [],
    signature_phrases: [],
    service_areas: [],
    social_handles: {},
    rationale: "ok",
  });
  expect(r.ok).toBe(false);
});

test("tagline: long string is truncated", () => {
  const long = "x".repeat(TAGLINE_MAX_CHARS + 100);
  const r = validateExtractedBrandProfile({
    tagline: long,
    voice_descriptors: [],
    differentiators: [],
    partner_names: [],
    signature_phrases: [],
    service_areas: [],
    social_handles: {},
    rationale: "ok",
  });
  expect(r.ok).toBe(true);
  if (r.ok) {
    expect(r.value.tagline?.length).toBeLessThanOrEqual(TAGLINE_MAX_CHARS);
    expect(r.value.tagline?.endsWith("…")).toBe(true);
  }
});

/* ── validateExtractedBrandProfile: array sanitization ──────────────────── */

test("array: non-string entries are dropped", () => {
  const r = validateExtractedBrandProfile({
    tagline: null,
    voice_descriptors: ["compassionate", 42, null, "experienced"],
    differentiators: [],
    partner_names: [],
    signature_phrases: [],
    service_areas: [],
    social_handles: {},
    rationale: "ok",
  });
  expect(r.ok).toBe(true);
  if (r.ok)
    expect(r.value.voice_descriptors).toEqual(["compassionate", "experienced"]);
});

test("array: empty/whitespace strings are dropped", () => {
  const r = validateExtractedBrandProfile({
    tagline: null,
    voice_descriptors: ["  ", "compassionate", "", "experienced"],
    differentiators: [],
    partner_names: [],
    signature_phrases: [],
    service_areas: [],
    social_handles: {},
    rationale: "ok",
  });
  expect(r.ok).toBe(true);
  if (r.ok)
    expect(r.value.voice_descriptors).toEqual(["compassionate", "experienced"]);
});

test("array: case-insensitive dedup", () => {
  const r = validateExtractedBrandProfile({
    tagline: null,
    voice_descriptors: ["Compassionate", "COMPASSIONATE", "experienced"],
    differentiators: [],
    partner_names: [],
    signature_phrases: [],
    service_areas: [],
    social_handles: {},
    rationale: "ok",
  });
  expect(r.ok).toBe(true);
  if (r.ok)
    expect(r.value.voice_descriptors).toEqual(["Compassionate", "experienced"]);
});

test("array: capped at ARRAY_CAPS limits", () => {
  const overflow = Array.from(
    { length: ARRAY_CAPS.voice_descriptors + 10 },
    (_, i) => `desc-${i}`,
  );
  const r = validateExtractedBrandProfile({
    tagline: null,
    voice_descriptors: overflow,
    differentiators: [],
    partner_names: [],
    signature_phrases: [],
    service_areas: [],
    social_handles: {},
    rationale: "ok",
  });
  expect(r.ok).toBe(true);
  if (r.ok)
    expect(r.value.voice_descriptors.length).toBe(ARRAY_CAPS.voice_descriptors);
});

test("array: long entries truncated to ENTRY_MAX_CHARS", () => {
  const long = "x".repeat(ENTRY_MAX_CHARS + 50);
  const r = validateExtractedBrandProfile({
    tagline: null,
    voice_descriptors: [long],
    differentiators: [],
    partner_names: [],
    signature_phrases: [],
    service_areas: [],
    social_handles: {},
    rationale: "ok",
  });
  expect(r.ok).toBe(true);
  if (r.ok) {
    expect(r.value.voice_descriptors[0].length).toBeLessThanOrEqual(
      ENTRY_MAX_CHARS,
    );
    expect(r.value.voice_descriptors[0].endsWith("…")).toBe(true);
  }
});

test("array: non-array field is rejected", () => {
  const r = validateExtractedBrandProfile({
    tagline: null,
    voice_descriptors: "compassionate",
    differentiators: [],
    partner_names: [],
    signature_phrases: [],
    service_areas: [],
    social_handles: {},
    rationale: "ok",
  });
  expect(r.ok).toBe(false);
});

test("array: undefined/null fields default to []", () => {
  const r = validateExtractedBrandProfile({
    tagline: null,
    // voice_descriptors omitted
    differentiators: null,
    partner_names: undefined,
    signature_phrases: [],
    service_areas: [],
    social_handles: {},
    rationale: "ok",
  });
  expect(r.ok).toBe(true);
  if (r.ok) {
    expect(r.value.voice_descriptors).toEqual([]);
    expect(r.value.differentiators).toEqual([]);
    expect(r.value.partner_names).toEqual([]);
  }
});

/* ── validateExtractedBrandProfile: social_handles ──────────────────────── */

test("social: only known platforms are kept", () => {
  const r = validateExtractedBrandProfile({
    tagline: null,
    voice_descriptors: [],
    differentiators: [],
    partner_names: [],
    signature_phrases: [],
    service_areas: [],
    social_handles: {
      facebook: "https://facebook.com/x",
      myspace: "https://myspace.com/x",
      tiktok: "https://tiktok.com/@x",
    },
    rationale: "ok",
  });
  expect(r.ok).toBe(true);
  if (r.ok) {
    expect(r.value.social_handles.facebook).toBe("https://facebook.com/x");
    expect(r.value.social_handles.tiktok).toBe("https://tiktok.com/@x");
    expect("myspace" in r.value.social_handles).toBe(false);
  }
});

test("social: non-http URLs are dropped", () => {
  const r = validateExtractedBrandProfile({
    tagline: null,
    voice_descriptors: [],
    differentiators: [],
    partner_names: [],
    signature_phrases: [],
    service_areas: [],
    social_handles: {
      facebook: "https://facebook.com/ok",
      twitter: "javascript:alert(1)",
      linkedin: "ftp://nope",
    },
    rationale: "ok",
  });
  expect(r.ok).toBe(true);
  if (r.ok) {
    expect(r.value.social_handles.facebook).toBe("https://facebook.com/ok");
    expect("twitter" in r.value.social_handles).toBe(false);
    expect("linkedin" in r.value.social_handles).toBe(false);
  }
});

test("social: malformed URLs are dropped silently", () => {
  const r = validateExtractedBrandProfile({
    tagline: null,
    voice_descriptors: [],
    differentiators: [],
    partner_names: [],
    signature_phrases: [],
    service_areas: [],
    social_handles: {
      facebook: "not a url",
      instagram: "https://instagram.com/x",
    },
    rationale: "ok",
  });
  expect(r.ok).toBe(true);
  if (r.ok) {
    expect("facebook" in r.value.social_handles).toBe(false);
    expect(r.value.social_handles.instagram).toBe("https://instagram.com/x");
  }
});

test("social: non-object is rejected", () => {
  const r = validateExtractedBrandProfile({
    tagline: null,
    voice_descriptors: [],
    differentiators: [],
    partner_names: [],
    signature_phrases: [],
    service_areas: [],
    social_handles: ["https://facebook.com/x"],
    rationale: "ok",
  });
  expect(r.ok).toBe(false);
});

/* ── validateExtractedBrandProfile: rationale ──────────────────────────── */

test("rationale: missing gets default message", () => {
  const r = validateExtractedBrandProfile({
    tagline: null,
    voice_descriptors: [],
    differentiators: [],
    partner_names: [],
    signature_phrases: [],
    service_areas: [],
    social_handles: {},
  });
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.value.rationale).toBe("Auto-extracted from website content.");
});

test("rationale: long is truncated", () => {
  const r = validateExtractedBrandProfile({
    tagline: null,
    voice_descriptors: [],
    differentiators: [],
    partner_names: [],
    signature_phrases: [],
    service_areas: [],
    social_handles: {},
    rationale: "y".repeat(2000),
  });
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.value.rationale.length).toBeLessThanOrEqual(600);
});

/* ── System prompt sanity ──────────────────────────────────────────────── */

test("system prompt: forbids fabrication", () => {
  expect(BRAND_EXTRACT_SYSTEM_PROMPT).toContain("Never invent facts");
});

test("system prompt: requires JSON output", () => {
  expect(BRAND_EXTRACT_SYSTEM_PROMPT).toContain("STRICT JSON");
});
