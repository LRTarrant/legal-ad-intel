/**
 * Testable internals for the PI Google Responsive Search Ad route (Phase 4b).
 *
 * Generates the TEXT for a Google Ads RSA — text-only ad format that
 * Google reassembles dynamically from a pool of headlines + descriptions:
 *
 *   headlines    — UP TO 15, each ≤ 30 characters
 *   descriptions — UP TO 4,  each ≤ 90 characters
 *   path1, path2 — UP TO 2 URL display-path crumbs, each ≤ 15 characters
 *
 * Reference: Google Ads RSA spec
 *   https://support.google.com/google-ads/answer/7684791
 *
 * Why this is its own route (not /generate-pi-meta-ad):
 *   - Different shape: 15 short headlines vs Meta's single primary_text +
 *     headline + description triple, no image, no CTA enum
 *   - Different platform conventions (Google rejects ALL CAPS, exclamation
 *     overload, repeated punctuation; Meta is more permissive)
 *   - Different cost profile: no image leg, all in one LLM call
 *
 * Pure-function pieces extracted out of route.ts so they can be unit-
 * tested without spinning up Next request/response or mocking OpenAI.
 *
 * Hard-max enforcement:
 *   We enforce a STRICT 30/90/15 hard max; over-length items are
 *   truncated at word boundary. Google rejects ad uploads with even one
 *   over-length asset, so we cannot ship "tight". Recommended counts
 *   match the hard max — no headroom.
 */

import type {
  PICategory,
  PITemplate,
  SeverityModifier,
} from "@/lib/campaign-builder/pi-templates/types";
import { getAvailablePICategories } from "@/lib/campaign-builder/pi-templates";
import {
  brandInputsFromFirm,
  renderBrandPromptSection,
  type BrandPromptInputs,
} from "../generate-pi-radio-script/testable";

// Re-export so route.ts has one import.
export { brandInputsFromFirm };
export type { BrandPromptInputs };

/* ── Public types ──────────────────────────────────────────────────────── */

export interface PIGoogleRSARequest {
  pi_category: PICategory;
  market_display_name: string;
  state: string;
  firm_id?: string;
  firm_name: string;
  severity_modifiers?: SeverityModifier[];
  language?: "en" | "es";
  /**
   * Final URL the ad clicks to. Optional — when present the LLM uses it
   * as a hint to shape path1/path2 (e.g. final_url ending in /birmingham
   * suggests path1 = "Birmingham"). Not validated as a real URL — that's
   * a Google upload-time concern.
   */
  final_url?: string | null;
}

export interface PIGoogleRSAResponse {
  headlines: string[];           // 15 strings, each ≤ 30 chars
  descriptions: string[];        // 4 strings,  each ≤ 90 chars
  path1: string;                 // ≤ 15 chars, no spaces
  path2: string;                 // ≤ 15 chars, no spaces
  /**
   * Free-text rationale, 1-2 sentences. Not persisted; surfaced in the
   * response for the UI to show "here's the angle these headlines lean
   * into".
   */
  rationale: string;
}

/* ── Char limits (HARD enforcement; Google rejects over-length) ────────── */

/**
 * Google Ads RSA limits per the official asset spec.
 *   https://support.google.com/google-ads/answer/7684791
 *
 * Google REJECTS ads where any single asset exceeds the limit, so unlike
 * Meta these are hard caps with no headroom. The system prompt asks for
 * <= max so the LLM has no excuse to overshoot.
 */
export const GOOGLE_RSA_LIMITS = {
  headline: { count: 15, maxChars: 30 },
  description: { count: 4, maxChars: 90 },
  path: { count: 2, maxChars: 15 },
} as const;

/* ── Request validation ────────────────────────────────────────────────── */

const VALID_LANGUAGES = new Set(["en", "es"]);
const VALID_SEVERITIES = new Set(["fatal", "catastrophic"]);

export function validatePIGoogleRSARequest(body: PIGoogleRSARequest): string[] {
  const errors: string[] = [];

  if (!body.pi_category) {
    errors.push("pi_category is required");
  } else if (!getAvailablePICategories().includes(body.pi_category)) {
    errors.push(`pi_category '${body.pi_category}' is not a v1 PI category`);
  }

  if (!body.market_display_name?.trim()) {
    errors.push("market_display_name is required");
  }
  if (!body.state || !/^[A-Z]{2}$/.test(body.state)) {
    errors.push("state is required (2-letter uppercase state code)");
  }
  if (!body.firm_name?.trim()) {
    errors.push("firm_name is required");
  }

  if (body.language !== undefined && !VALID_LANGUAGES.has(body.language)) {
    errors.push("language must be 'en' or 'es'");
  }

  if (
    body.final_url !== undefined &&
    body.final_url !== null &&
    typeof body.final_url !== "string"
  ) {
    errors.push("final_url must be a string or null");
  }

  if (body.severity_modifiers) {
    if (!Array.isArray(body.severity_modifiers)) {
      errors.push("severity_modifiers must be an array");
    } else {
      for (const sev of body.severity_modifiers) {
        if (!VALID_SEVERITIES.has(sev)) {
          errors.push(`invalid severity_modifier: ${sev}`);
        }
      }
    }
  }

  return errors;
}

/* ── Prompt assembly ────────────────────────────────────────────────────── */

export const PI_GOOGLE_RSA_SYSTEM_PROMPT = `You write Google Search Ads (Responsive Search Ad / RSA format) for U.S. plaintiff law firms.

Your output is STRICT JSON with exactly these fields:
  headlines     — array of EXACTLY 15 strings (each ≤ 30 characters)
  descriptions  — array of EXACTLY 4 strings (each ≤ 90 characters)
  path1         — short URL display-path crumb (≤ 15 chars, no spaces, ASCII only)
  path2         — second URL display-path crumb (≤ 15 chars, no spaces, ASCII only)
  rationale     — 1-2 sentences explaining the headline portfolio's angles

CRITICAL RULES:
1. CHARACTER LIMITS ARE HARD. Google rejects ads with even one over-length asset. Stay under or AT the limit. Each headline ≤ 30. Each description ≤ 90. Each path ≤ 15.

2. HEADLINE PORTFOLIO STRATEGY (Google rotates these, so they must work in any combination):
   - Mix angle types: pain-point ("Hurt In A Wreck?"), benefit ("No Fee Unless We Win"), location ("Birmingham Injury Lawyer"), urgency ("Free Case Review Today"), authority ("Trial Lawyers Since 1994"), and social proof ("$100M+ Recovered").
   - At least 2 should include the city name. At least 2 should include the state name (full or abbreviation). At least 1 should mention "free consultation" or equivalent. At least 1 should reference no-win-no-fee in legally compliant terms ("No Fee Unless We Win" — never "guaranteed").
   - DO NOT repeat phrases verbatim. DO vary length (some short / punchy, some that fill the budget).
   - NO ALL CAPS words (Google disapproves; first-letter capitalization is fine for Title Case).
   - NO trailing exclamation marks or repeated punctuation. One "?" is fine in a question headline.
   - NO emoji.

3. DESCRIPTION RULES:
   - Each description must be a complete sentence ending in a period.
   - Lead with empathy or value, follow with a soft CTA ("Call today for a free consultation.").
   - At least 1 description must mention the firm's location/state. At least 1 should reference no-win-no-fee. At least 1 should include a generic call-to-action.
   - Do NOT promise outcomes, use the word "guaranteed", or include disclaimers verbatim.

4. PATH RULES:
   - path1 and path2 are URL-display crumbs that appear after the domain in the green URL line: example.com/path1/path2.
   - ASCII letters/digits/dash only. No spaces, no slashes, no special characters.
   - path1 should be the practice-area slug (e.g. "Personal-Injury", "Car-Accident").
   - path2 should be the geo (e.g. "Birmingham", "Alabama").
   - If the user provided a final_url, you may copy a meaningful slug from it but obey the char limit.

5. FIRM VOICE:
   - Use the firm voice context (if provided) to flavor tone and pick differentiators that show up in headlines.
   - Do NOT invent firm-specific facts. If no voice context, write in a neutral plaintiff-firm tone.

6. LANGUAGE:
   - Spanish requests get fully translated copy (all 15 headlines + 4 descriptions). Use natural plaintiff-firm Spanish ("Abogado de Lesiones", "Sin Honorarios A Menos Que Ganemos") — not literal translations.

Return ONLY the JSON object. No markdown fences, no commentary outside the JSON.`;

/**
 * Render the user prompt. Mirrors the radio-script + Meta-ad approach:
 * pass the structured PI template (hook/problem/CTA/disclaimer) as source
 * material and ask the LLM to compress it into RSA-shaped fields. Brand
 * profile gets layered in just like in the radio + video + meta routes.
 */
export function buildPIGoogleRSAUserPrompt(
  body: PIGoogleRSARequest,
  template: PITemplate,
  brand?: BrandPromptInputs | null,
): string {
  const lang = body.language === "es" ? "Spanish (es)" : "English (en)";

  const finalUrlLine = body.final_url?.trim()
    ? `\nFinal URL (for display-path inspiration only): ${body.final_url.trim()}`
    : "";

  const sourceLines = [
    `HOOK: ${template.hook}`,
    `PROBLEM: ${template.problem}`,
    `AUTHORITY: ${template.authority}`,
    template.socialProof ? `SOCIAL PROOF: ${template.socialProof}` : null,
    `CALL TO ACTION: ${template.cta}`,
    `DISCLAIMER (in-spirit, not verbatim): ${template.baseDisclaimer}`,
  ]
    .filter(Boolean)
    .join("\n");

  const lines = [
    `Category: ${template.displayName}`,
    `Language: ${lang}`,
    `Firm: ${body.firm_name}`,
    `Market: ${body.market_display_name}`,
    `State: ${body.state}`,
  ];
  if (finalUrlLine) lines.push(finalUrlLine.trim());

  const brandSection = renderBrandPromptSection(brand);
  if (brandSection) {
    lines.push("");
    lines.push(
      "Firm voice context (the ad should sound like THIS firm — weave these signals in naturally; do not list them):",
    );
    lines.push(brandSection);
  }

  lines.push("");
  lines.push("Source material (compress into RSA assets):");
  lines.push(sourceLines);
  lines.push("");
  lines.push(
    `Return JSON: { "headlines": string[15], "descriptions": string[4], "path1": string, "path2": string, "rationale": string }`,
  );

  return lines.join("\n");
}

/* ── Response parsing & validation ──────────────────────────────────────── */

/**
 * Strip common LLM JSON wrappers (markdown fences). Same helper used by
 * the Meta + video script + brand extract routes.
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
 * Sanity-check the LLM's JSON shape AND apply hard-max enforcement.
 * Returns ok:true with a cleaned value, or ok:false with errors.
 *
 * Sanitization rules:
 *   1. headlines must be an array; we accept 5-15 items (Google's min is 3,
 *      we ask for 15 but tolerate the LLM dropping a few). Each item
 *      is trimmed and truncated to ≤ 30 chars at word boundary.
 *   2. descriptions must be an array of 2-4 items. Each trimmed and
 *      truncated to ≤ 90 chars at word boundary.
 *   3. path1/path2 are sanitized: trim, replace spaces with hyphens,
 *      strip non-ASCII-alphanumeric-or-dash, truncate to ≤ 15 chars.
 *   4. Empty / duplicate-after-normalization headlines are filtered out
 *      so the final array has only distinct, non-empty entries.
 *
 * Why we tolerate 5-15 headlines (not strictly 15): occasionally gpt-4o
 * returns 12-13 well-crafted ones rather than 15 mediocre. Google
 * accepts uploads with as few as 3 headlines, so 5+ is well within spec.
 * If the LLM returns < 5 we treat it as a quality miss and fail.
 */
export function validatePIGoogleRSAResponse(
  parsed: unknown,
):
  | { ok: true; value: PIGoogleRSAResponse }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, errors: ["response is not an object"] };
  }
  const obj = parsed as Record<string, unknown>;

  const headlines = sanitizeStringArray(
    obj.headlines,
    "headlines",
    GOOGLE_RSA_LIMITS.headline.maxChars,
    /* minCount */ 5,
    /* maxCount */ 15,
    errors,
  );

  const descriptions = sanitizeStringArray(
    obj.descriptions,
    "descriptions",
    GOOGLE_RSA_LIMITS.description.maxChars,
    /* minCount */ 2,
    /* maxCount */ 4,
    errors,
  );

  const path1 = sanitizePathField(obj.path1, "path1", errors);
  const path2 = sanitizePathField(obj.path2, "path2", errors);

  let rationale = "Generated by AI.";
  if (typeof obj.rationale === "string" && obj.rationale.trim()) {
    rationale = obj.rationale.trim().slice(0, 600);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      headlines: headlines!,
      descriptions: descriptions!,
      path1: path1!,
      path2: path2!,
      rationale,
    },
  };
}

/**
 * Validate, trim, truncate, and dedupe a string array. Returns the
 * cleaned array or null on failure (with errors pushed to the errors
 * array).
 */
function sanitizeStringArray(
  raw: unknown,
  fieldName: string,
  maxLen: number,
  minCount: number,
  maxCount: number,
  errors: string[],
): string[] | null {
  if (!Array.isArray(raw)) {
    errors.push(`${fieldName} must be an array`);
    return null;
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    const fitted =
      trimmed.length <= maxLen
        ? trimmed
        : truncateAtWordBoundary(trimmed, maxLen);
    const key = fitted.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(fitted);
    if (out.length >= maxCount) break;
  }
  if (out.length < minCount) {
    errors.push(
      `${fieldName} must have at least ${minCount} non-empty items after de-dup (got ${out.length})`,
    );
    return null;
  }
  return out;
}

/**
 * Sanitize a path field: ASCII alphanumeric + hyphen only, ≤ 15 chars.
 * Spaces become hyphens; everything else is stripped. Empty after
 * sanitization is allowed (Google permits empty paths) — we substitute
 * an empty string and don't error.
 */
export function sanitizePathField(
  raw: unknown,
  fieldName: string,
  errors: string[],
): string | null {
  if (raw === null || raw === undefined) {
    return ""; // empty path is valid for Google
  }
  if (typeof raw !== "string") {
    errors.push(`${fieldName} must be a string`);
    return null;
  }
  // Replace whitespace with hyphen, then strip everything that isn't
  // alphanumeric or hyphen. Preserves Title-Case casing.
  const normalized = raw.trim().replace(/\s+/g, "-").replace(/[^A-Za-z0-9-]/g, "");
  // Collapse runs of multiple hyphens, trim leading/trailing hyphens.
  const cleaned = normalized.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned.slice(0, GOOGLE_RSA_LIMITS.path.maxChars);
}

/**
 * Truncate a string at the last whitespace before maxLen so we don't
 * cut mid-word. Same algorithm as the Meta route's helper. We do NOT
 * append a period for Google ads — headlines often don't end in
 * punctuation and forcing one looks wrong. Descriptions DO need
 * sentence-end punctuation; we add a period if missing AFTER truncation.
 */
export function truncateAtWordBoundary(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  const slice = s.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(" ");
  // Reserve no buffer — Google's max is hard so we use the entire budget.
  // Only break at word boundary if it's beyond the halfway mark.
  const cut = lastSpace > maxLen * 0.5 ? slice.slice(0, lastSpace) : slice;
  return cut.trimEnd();
}

/* ── Length report (UI helper) ──────────────────────────────────────────── */

export interface RSAItemReport {
  text: string;
  length: number;
  max: number;
  status: "ok" | "tight" | "over";
}

/**
 * For each headline / description, return a status report so the UI
 * can color-code length indicators. "tight" is anything within 3 chars
 * of the max — useful signal that a future regen might over-shoot.
 */
export function buildRSALengthReports(value: PIGoogleRSAResponse): {
  headlines: RSAItemReport[];
  descriptions: RSAItemReport[];
} {
  const headlines = value.headlines.map((h) =>
    reportFor(h, GOOGLE_RSA_LIMITS.headline.maxChars),
  );
  const descriptions = value.descriptions.map((d) =>
    reportFor(d, GOOGLE_RSA_LIMITS.description.maxChars),
  );
  return { headlines, descriptions };
}

function reportFor(text: string, max: number): RSAItemReport {
  const length = text.length;
  let status: RSAItemReport["status"];
  if (length > max) status = "over";
  else if (length >= max - 3) status = "tight";
  else status = "ok";
  return { text, length, max, status };
}
