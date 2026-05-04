/**
 * Pure helpers for /api/firms/[id]/extract-brand.
 *
 * Kept separate from route.ts so we can unit-test prompt assembly,
 * response validation, and JSON-wrapper stripping without spinning up
 * Next request/response or mocking OpenAI / Supabase.
 *
 * Phase 3.1 of the PI feature parity project. The route this module
 * supports takes a firm_id, fetches the firm's website_url via the
 * Phase 3.0 url-extractor, sends the cleaned signal to gpt-4o, parses
 * a brand-profile-shaped JSON response, and writes it to the firms
 * table with extraction_source='auto'.
 *
 * Design notes:
 *   - We pre-extract HTML signal (title, og tags, headings, paragraphs)
 *     so the LLM gets clean text instead of raw HTML. This keeps token
 *     usage predictable and avoids leaking script/style noise into the
 *     prompt.
 *   - The LLM is asked for STRICT JSON via response_format=json_object.
 *     We still defensively validate shape because gpt-4o JSON mode
 *     guarantees parseability, not schema conformance.
 *   - All extracted-array fields are capped at the same limits as the
 *     manual validateCreateFirm so we never produce a row that the
 *     existing PATCH would reject. Caps mirror web/lib/firms/types.ts.
 *   - The model is allowed to leave any field null/empty. A homepage
 *     that doesn't surface partner names just gets [], not a
 *     hallucinated list.
 */

import type { ExtractedPage } from "@/lib/firms/url-extractor";

/**
 * Wrapper passed to the prompt builder so we can include the final
 * (post-redirect) URL alongside the extracted page content. The
 * url-extractor returns these as separate fields on ExtractFromUrlResult;
 * we recombine them here to keep buildExtractionUserPrompt's signature
 * tight.
 */
export interface ExtractedPageWithUrl {
  finalUrl: string;
  page: ExtractedPage;
}

/* ── Request / response shapes ──────────────────────────────────────────── */

/**
 * Optional caller overrides. The route resolves website_url from the
 * firm row by default; this lets a future "preview before saving" UI
 * pass an alternate URL without mutating the firm.
 */
export interface BrandExtractRequest {
  /** Optional override URL. If absent, route uses the firm's website_url. */
  website_url?: string;
  /**
   * If true, skip the database write and just return the proposed
   * brand fields. Used by Phase 3.2's "preview" UI.
   */
  dry_run?: boolean;
}

/**
 * Shape the LLM is asked to produce. Mirrors the manual brand profile
 * fields so the response can drop straight into UpdateFirmInput.
 *
 * All fields are nullable / empty-array tolerant. The LLM should leave
 * them blank rather than guess.
 */
export interface ExtractedBrandProfile {
  tagline: string | null;
  voice_descriptors: string[];
  differentiators: string[];
  partner_names: string[];
  signature_phrases: string[];
  service_areas: string[];
  social_handles: Record<string, string>;
  /**
   * Free-text rationale, 1-2 sentences. Not persisted to firms; only
   * surfaced in the API response for the UI to show "here's why we
   * picked these descriptors". Helps the user trust auto-fill.
   */
  rationale: string;
}

/* ── Caps (must mirror validateCreateFirm in lib/firms/types.ts) ──────────── */

export const ARRAY_CAPS = {
  voice_descriptors: 20,
  differentiators: 20,
  partner_names: 50,
  signature_phrases: 30,
  service_areas: 50,
} as const;

/** Max chars per array entry. Arbitrary but generous for taglines / phrases. */
export const ENTRY_MAX_CHARS = 240;

/** Max chars for the tagline field. */
export const TAGLINE_MAX_CHARS = 240;

/** Allowed social platform keys. Mirrors what url-extractor returns. */
export const SOCIAL_PLATFORMS = [
  "facebook",
  "twitter",
  "linkedin",
  "instagram",
  "youtube",
  "tiktok",
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

/* ── Prompt assembly ────────────────────────────────────────────────────── */

export const BRAND_EXTRACT_SYSTEM_PROMPT = `You analyze U.S. plaintiff law firm websites and extract a concise brand profile.

You will be given the cleaned text content of a firm's homepage (title, headings, key paragraphs, social links). Your job is to return STRICT JSON describing the firm's brand voice, differentiators, named partners, signature phrases, service areas, and verified social handles.

CRITICAL RULES:
- Never invent facts. If the page does not clearly state something, leave the field empty (null for strings, [] for arrays, {} for objects).
- Voice descriptors should be 1-3 word adjectives or phrases describing tone (e.g., "compassionate", "no-nonsense", "results-driven"). Infer from headlines and paragraph tone, not from generic legal jargon.
- Differentiators should be specific claims the firm makes about itself (e.g., "30+ years experience", "free home visits", "Spanish-speaking staff"). Skip generic claims every firm makes ("best lawyer", "we care").
- Partner names: only include explicit named attorneys/partners. Format: "First Last" or "First Last, J.D.". No titles like "Attorney" or "Esq." unless attached to a real name.
- Signature phrases: short, distinctive lines that appear as taglines or recurring slogans (e.g., "We don't get paid unless you do"). Skip generic CTAs like "Call now".
- Service areas: practice areas the firm advertises (e.g., "car accidents", "wrongful death", "workers' compensation"). Use lowercase.
- Social handles: only include platforms whose URL is in the input. Map to keys: facebook, twitter, linkedin, instagram, youtube, tiktok. Value is the URL, not the handle.
- Tagline: a single short line if the page clearly has one. Null otherwise.
- Rationale: 1-2 sentences explaining what signals you used. This is for the user's UI, not stored.

Return ONLY valid JSON matching the schema. No markdown fences, no commentary.`;

/**
 * Build the user prompt from extracted page signal. Truncates aggressively
 * because firm homepages can be verbose and we're paying per token.
 *
 * Caps:
 *   - title: 200 chars
 *   - meta_description: 400 chars
 *   - og_description: 400 chars
 *   - first 8 headings (each capped at 200 chars)
 *   - first 12 paragraphs (each capped at 600 chars)
 *   - social links: all (already capped by extractor)
 */
export function buildExtractionUserPrompt(input: ExtractedPageWithUrl): string {
  const { finalUrl, page } = input;
  const lines: string[] = [];
  lines.push(`URL: ${finalUrl}`);
  if (page.title) {
    lines.push(`Title: ${truncate(page.title, 200)}`);
  }
  if (page.metaDescription) {
    lines.push(`Meta description: ${truncate(page.metaDescription, 400)}`);
  }
  if (page.og.title && page.og.title !== page.title) {
    lines.push(`OG title: ${truncate(page.og.title, 200)}`);
  }
  if (page.og.description && page.og.description !== page.metaDescription) {
    lines.push(`OG description: ${truncate(page.og.description, 400)}`);
  }
  if (page.og.siteName) {
    lines.push(`OG site name: ${truncate(page.og.siteName, 200)}`);
  }

  if (page.headings && page.headings.length > 0) {
    lines.push("");
    lines.push("Headings:");
    for (const h of page.headings.slice(0, 8)) {
      lines.push(`- ${truncate(h, 200)}`);
    }
  }

  if (page.paragraphs && page.paragraphs.length > 0) {
    lines.push("");
    lines.push("Paragraphs:");
    for (const p of page.paragraphs.slice(0, 12)) {
      lines.push(`- ${truncate(p, 600)}`);
    }
  }

  // socialLinks keys are fixed (facebook, x, linkedin, instagram,
  // youtube, tiktok). Only render entries that are non-null.
  const socialEntries = Object.entries(page.socialLinks).filter(
    ([, url]) => typeof url === "string" && url.length > 0,
  ) as Array<[string, string]>;
  if (socialEntries.length > 0) {
    lines.push("");
    lines.push("Social links:");
    for (const [platform, url] of socialEntries) {
      lines.push(`- ${platform}: ${url}`);
    }
  }

  if (page.phoneNumbers && page.phoneNumbers.length > 0) {
    lines.push("");
    lines.push(`Phones detected: ${page.phoneNumbers.slice(0, 5).join(", ")}`);
  }

  if (typeof page.wordCount === "number" && page.wordCount < 50) {
    lines.push("");
    lines.push(
      `Note: only ${page.wordCount} words extracted. Page may be JS-rendered or thin on content. Be especially conservative — leave fields blank rather than guess.`,
    );
  }

  lines.push("");
  lines.push(
    "Return JSON with: tagline (string|null), voice_descriptors (string[]), differentiators (string[]), partner_names (string[]), signature_phrases (string[]), service_areas (string[]), social_handles (Record<string,string>), rationale (string).",
  );

  return lines.join("\n");
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

/* ── Response parsing & validation ──────────────────────────────────────── */

/**
 * Strip common LLM JSON wrappers (markdown fences) before JSON.parse.
 * Mirrors the helper in generate-pi-video-script/testable.ts so behavior
 * stays consistent across routes.
 */
export function stripJSONWrapper(content: string): string {
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n/i, "");
    cleaned = cleaned.replace(/\n```\s*$/i, "");
  }
  return cleaned.trim();
}

/**
 * Validate + sanitize an LLM response into a clean ExtractedBrandProfile.
 * Returns ok:true with a cleaned value, or ok:false with errors.
 *
 * Sanitization rules (applied in this order):
 *   1. Drop fields with the wrong primitive type
 *   2. Trim every string entry
 *   3. Drop empty / whitespace-only entries
 *   4. Cap entry length at ENTRY_MAX_CHARS
 *   5. Dedupe arrays (case-insensitive)
 *   6. Truncate arrays at ARRAY_CAPS
 *   7. Filter social_handles to known platforms with http(s) URLs
 *
 * This is the gate between LLM output and database write — anything
 * that passes here must be acceptable to validateCreateFirm.
 */
export function validateExtractedBrandProfile(
  parsed: unknown,
):
  | { ok: true; value: ExtractedBrandProfile }
  | { ok: false; errors: string[] } {
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, errors: ["response is not an object"] };
  }
  const obj = parsed as Record<string, unknown>;
  const errors: string[] = [];

  // Tagline: string | null. Empty string -> null.
  let tagline: string | null = null;
  if (obj.tagline === null || obj.tagline === undefined) {
    tagline = null;
  } else if (typeof obj.tagline === "string") {
    const trimmed = obj.tagline.trim();
    tagline = trimmed.length === 0 ? null : truncate(trimmed, TAGLINE_MAX_CHARS);
  } else {
    errors.push("tagline must be string or null");
  }

  const voice_descriptors = sanitizeStringArray(
    obj.voice_descriptors,
    "voice_descriptors",
    ARRAY_CAPS.voice_descriptors,
    errors,
  );
  const differentiators = sanitizeStringArray(
    obj.differentiators,
    "differentiators",
    ARRAY_CAPS.differentiators,
    errors,
  );
  const partner_names = sanitizeStringArray(
    obj.partner_names,
    "partner_names",
    ARRAY_CAPS.partner_names,
    errors,
  );
  const signature_phrases = sanitizeStringArray(
    obj.signature_phrases,
    "signature_phrases",
    ARRAY_CAPS.signature_phrases,
    errors,
  );
  const service_areas = sanitizeStringArray(
    obj.service_areas,
    "service_areas",
    ARRAY_CAPS.service_areas,
    errors,
  );

  // Social handles: filter to known platforms with valid http(s) URLs.
  const social_handles: Record<string, string> = {};
  if (obj.social_handles !== undefined && obj.social_handles !== null) {
    if (typeof obj.social_handles !== "object" || Array.isArray(obj.social_handles)) {
      errors.push("social_handles must be an object");
    } else {
      const raw = obj.social_handles as Record<string, unknown>;
      for (const platform of SOCIAL_PLATFORMS) {
        const value = raw[platform];
        if (typeof value !== "string") continue;
        const trimmed = value.trim();
        if (!trimmed) continue;
        try {
          const u = new URL(trimmed);
          if (u.protocol === "http:" || u.protocol === "https:") {
            social_handles[platform] = trimmed;
          }
        } catch {
          // Skip invalid URLs silently — they're a soft failure, not
          // a reason to reject the whole response.
        }
      }
    }
  }

  // Rationale: string, capped. Required-but-tolerant: if the model
  // forgets it, we substitute a generic message rather than failing.
  let rationale = "";
  if (typeof obj.rationale === "string") {
    rationale = truncate(obj.rationale.trim(), 600);
  }
  if (!rationale) {
    rationale = "Auto-extracted from website content.";
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      tagline,
      voice_descriptors,
      differentiators,
      partner_names,
      signature_phrases,
      service_areas,
      social_handles,
      rationale,
    },
  };
}

function sanitizeStringArray(
  raw: unknown,
  fieldName: string,
  cap: number,
  errors: string[],
): string[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    errors.push(`${fieldName} must be an array`);
    return [];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim();
    if (trimmed.length === 0) continue;
    const capped = truncate(trimmed, ENTRY_MAX_CHARS);
    const key = capped.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(capped);
    if (out.length >= cap) break;
  }
  return out;
}

/* ── Request validation ─────────────────────────────────────────────────── */

/**
 * Validate the POST body. The firm_id comes from the URL path so it's
 * not in the body — only the optional override URL and dry_run flag.
 */
export function validateBrandExtractRequest(
  body: unknown,
): { ok: true; value: BrandExtractRequest } | { ok: false; errors: string[] } {
  if (body === null || body === undefined) {
    return { ok: true, value: {} };
  }
  if (typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, errors: ["body must be an object"] };
  }
  const obj = body as Record<string, unknown>;
  const errors: string[] = [];
  const out: BrandExtractRequest = {};

  if (obj.website_url !== undefined && obj.website_url !== null) {
    if (typeof obj.website_url !== "string") {
      errors.push("website_url must be a string");
    } else {
      const trimmed = obj.website_url.trim();
      if (trimmed.length === 0) {
        // Treat empty string as "use firm's stored URL".
      } else {
        try {
          const u = new URL(trimmed);
          if (u.protocol !== "http:" && u.protocol !== "https:") {
            errors.push("website_url must be http or https");
          } else {
            out.website_url = trimmed;
          }
        } catch {
          errors.push("website_url is not a valid URL");
        }
      }
    }
  }

  if (obj.dry_run !== undefined) {
    if (typeof obj.dry_run !== "boolean") {
      errors.push("dry_run must be a boolean");
    } else {
      out.dry_run = obj.dry_run;
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: out };
}
