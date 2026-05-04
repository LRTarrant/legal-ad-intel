/**
 * Testable internals for the PI Meta ad creative route (Phase 4a).
 *
 * Generates the TEXT half of a Meta (Facebook/Instagram) feed ad:
 *
 *   primary_text     — main body copy above the image (~125 chars rec)
 *   headline         — bold line below the image (~27-40 chars rec)
 *   description      — small grey line below headline (~27 chars rec)
 *   cta_label        — chosen from Meta's CTA button enum
 *   image_prompt     — what to feed to the image generator (Phase 4 v2)
 *
 * Why this is its own route (not /generate-creative):
 *   - /generate-creative is heavily tort-tuned (Roundup, Depo-Provera).
 *     PI categories don't fit those scene templates.
 *   - Meta ad copy is structured (4 short fields with hard char limits),
 *     not a single script blob. Different prompt + validator shape.
 *   - PI cost attribution lands on firm_id; the existing route doesn't
 *     thread that through.
 *
 * Pure-function pieces extracted out of route.ts so they can be unit-
 * tested without spinning up Next request/response or mocking OpenAI.
 *
 * Char limits below are MAX limits we enforce post-LLM. The system
 * prompt asks for MEDIAN-recommended lengths so we don't constantly
 * bump against the ceiling.
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

export interface PIMetaAdRequest {
  pi_category: PICategory;
  market_display_name: string;
  state: string;
  firm_id?: string;
  firm_name: string;
  severity_modifiers?: SeverityModifier[];
  language?: "en" | "es";
  /**
   * Aspect ratio used to shape the image_prompt's framing instructions.
   * Meta's most-used feed format is square; story/reels are 9:16.
   * Defaults to "square".
   */
  aspect_ratio?: "square" | "vertical" | "landscape";
  /**
   * Optional secondary CTA hint. The model still picks from the Meta
   * CTA enum, but this nudges it toward a category. e.g. "form_submission"
   * tells the LLM to favor "Sign Up" / "Get Quote"; "phone_call" favors
   * "Call Now". Leaving this null lets the LLM choose.
   */
  cta_intent?: "phone_call" | "form_submission" | "learn_more" | null;
}

/**
 * Subset of Meta's standard CTA buttons that fit plaintiff-firm intent.
 * We constrain the LLM to this set so we don't get back something Meta
 * will reject at upload time (e.g. "Shop Now" or "Donate").
 *
 * Keep this list aligned with Meta Marketing API CallToActionType values
 * that make sense for a law firm. Source: Meta's CallToActionType enum
 * (verified against current docs at time of implementation).
 */
export const VALID_CTA_LABELS = [
  "Call Now",
  "Get Quote",
  "Learn More",
  "Contact Us",
  "Sign Up",
  "Get Offer",
] as const;
export type CTALabel = (typeof VALID_CTA_LABELS)[number];

export interface PIMetaAdResponse {
  primary_text: string;
  headline: string;
  description: string;
  cta_label: CTALabel;
  image_prompt: string;
  /**
   * Free-text rationale, 1-2 sentences. Not persisted; surfaced in the
   * response for the UI to show "here's why this CTA was picked".
   */
  rationale: string;
}

/* ── Char limits (max enforcement) ──────────────────────────────────────── */

/**
 * Meta's published "recommended" lengths are the right target; we enforce
 * a HARD MAX a bit above to give the LLM room to write naturally without
 * us hand-truncating mid-word.
 *
 * Source: Meta Ads Manager > Ad Format Specs (Feed image ad).
 */
export const META_LIMITS = {
  primary_text: { recommended: 125, max: 300 },
  headline: { recommended: 40, max: 60 },
  description: { recommended: 30, max: 60 },
} as const;

/* ── Request validation ────────────────────────────────────────────────── */

const VALID_LANGUAGES = new Set(["en", "es"]);
const VALID_ASPECTS = new Set(["square", "vertical", "landscape"]);
const VALID_SEVERITIES = new Set(["fatal", "catastrophic"]);
const VALID_CTA_INTENTS = new Set(["phone_call", "form_submission", "learn_more"]);

export function validatePIMetaAdRequest(body: PIMetaAdRequest): string[] {
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
  if (body.aspect_ratio !== undefined && !VALID_ASPECTS.has(body.aspect_ratio)) {
    errors.push("aspect_ratio must be 'square', 'vertical', or 'landscape'");
  }
  if (
    body.cta_intent !== undefined &&
    body.cta_intent !== null &&
    !VALID_CTA_INTENTS.has(body.cta_intent)
  ) {
    errors.push("cta_intent must be 'phone_call', 'form_submission', 'learn_more', or null");
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

export const PI_META_AD_SYSTEM_PROMPT = `You write Meta (Facebook/Instagram) feed ads for U.S. plaintiff law firms.

Your output is STRICT JSON with exactly these fields:
  primary_text   — the body copy that appears above the image
  headline       — the bold line below the image
  description    — the small line below the headline
  cta_label      — exact match to one of the allowed CTA buttons (provided in the user prompt)
  image_prompt   — a vivid, photographic image-generation prompt for this ad's visual
  rationale      — 1-2 sentences explaining your CTA choice and primary_text angle

CRITICAL RULES:
1. RECOMMENDED LENGTHS (target these; do not pad or pile in keywords):
   - primary_text: ~125 characters (think: one strong sentence + one supporting). HARD MAX 300.
   - headline: ~40 characters. HARD MAX 60.
   - description: ~30 characters. HARD MAX 60.
2. The PRIMARY TEXT must NOT promise outcomes, use the word "guaranteed", or mislead. Lead with empathy/concern, then a soft action.
3. The HEADLINE should communicate the firm's value or the user's situation in plain language. Avoid clickbait.
4. The DESCRIPTION is supplemental detail — qualifiers, geography, or social proof. NOT a repeat of the headline.
5. Choose the CTA from the provided allowed list ONLY. Match the CTA to the user's stated cta_intent if provided.
6. The IMAGE PROMPT must:
   - Describe a concrete, photographic scene (no abstract concepts, no text overlays in the image — Meta will reject ads with too much in-image text).
   - Reflect the PI category and severity (e.g. car wreck scene, hospital corridor, family at sunset).
   - Match the requested aspect ratio framing (square/vertical/landscape).
   - Avoid logos, gore, or anything that would trigger ad disapproval.
7. PRESERVE the disclaimer language IN-SPIRIT in the primary_text but you do NOT need to include it verbatim — Meta runs the disclaimer at the firm-page level. Focus on hook + qualifier + CTA framing.
8. Do not invent firm-specific facts. Use ONLY the firm voice context provided. If no voice context is given, write a clean, professional ad in a neutral plaintiff-firm tone.
9. Spanish requests get fully translated copy AND a culturally appropriate image prompt (e.g. familia rather than generic "family").

Return ONLY the JSON object. No markdown fences, no commentary outside the JSON.`;

/**
 * Render the user prompt. Mirrors the radio-script approach: take the
 * structured PI template (hook/problem/CTA/disclaimer) as source material
 * and ask the LLM to compress it into Meta-shaped fields. Brand profile
 * gets layered in just like in the radio + video routes.
 */
export function buildPIMetaAdUserPrompt(
  body: PIMetaAdRequest,
  template: PITemplate,
  brand?: BrandPromptInputs | null,
): string {
  const lang = body.language === "es" ? "Spanish (es)" : "English (en)";
  const aspect = body.aspect_ratio ?? "square";

  const ctaIntentLine = body.cta_intent
    ? `\nCTA intent: ${body.cta_intent} (favor a CTA that matches this intent if reasonable)`
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
    `Image aspect ratio: ${aspect}`,
    `Firm: ${body.firm_name}`,
    `Market: ${body.market_display_name}`,
    `State: ${body.state}`,
    `Allowed CTA labels (pick exactly one): ${VALID_CTA_LABELS.join(", ")}`,
  ];
  if (ctaIntentLine) lines.push(ctaIntentLine.trim());

  const brandSection = renderBrandPromptSection(brand);
  if (brandSection) {
    lines.push("");
    lines.push(
      "Firm voice context (the ad should sound like THIS firm — weave these signals in naturally; do not list them):",
    );
    lines.push(brandSection);
  }

  lines.push("");
  lines.push("Source material (compress into Meta ad fields):");
  lines.push(sourceLines);
  lines.push("");
  lines.push(
    `Return JSON: { "primary_text": string, "headline": string, "description": string, "cta_label": string, "image_prompt": string, "rationale": string }`,
  );

  return lines.join("\n");
}

/* ── Response parsing & validation ──────────────────────────────────────── */

/**
 * Strip common LLM JSON wrappers (markdown fences). Same helper used by
 * the video script + brand extract routes; duplicated here to keep the
 * module dependency-free.
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
 * Sanity-check the LLM's JSON shape AND apply hard-max truncation.
 * Returns ok:true with a cleaned value, or ok:false with errors.
 *
 * Sanitization rules:
 *   1. All four text fields are required, non-empty strings
 *   2. cta_label must EXACTLY match one of VALID_CTA_LABELS
 *   3. Each text field is trimmed; if longer than its hard max, we
 *      truncate at the last word boundary and append a period if missing
 *   4. rationale is optional — defaults to a generic message if missing
 *
 * Why we truncate here (instead of asking the LLM to retry): a single
 * over-length response would cost twice. Truncation at the word boundary
 * is a small quality hit but a big cost win, and char-limit overflows
 * are rare with gpt-4o once the system prompt sets clear targets.
 */
export function validatePIMetaAdResponse(
  parsed: unknown,
):
  | { ok: true; value: PIMetaAdResponse }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, errors: ["response is not an object"] };
  }
  const obj = parsed as Record<string, unknown>;

  // Required string fields
  const primary_text = sanitizeStringField(
    obj.primary_text,
    "primary_text",
    META_LIMITS.primary_text.max,
    errors,
  );
  const headline = sanitizeStringField(
    obj.headline,
    "headline",
    META_LIMITS.headline.max,
    errors,
  );
  const description = sanitizeStringField(
    obj.description,
    "description",
    META_LIMITS.description.max,
    errors,
  );
  const image_prompt = sanitizeStringField(
    obj.image_prompt,
    "image_prompt",
    1500, // generous; image prompts can be detailed
    errors,
  );

  // CTA label: exact-match enum
  let cta_label: CTALabel = "Learn More";
  if (typeof obj.cta_label !== "string") {
    errors.push("cta_label must be a string");
  } else {
    const trimmed = obj.cta_label.trim();
    if (!VALID_CTA_LABELS.includes(trimmed as CTALabel)) {
      errors.push(
        `cta_label '${trimmed}' is not in the allowed set: ${VALID_CTA_LABELS.join(", ")}`,
      );
    } else {
      cta_label = trimmed as CTALabel;
    }
  }

  // Rationale: optional, defaults to generic
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
      primary_text: primary_text!,
      headline: headline!,
      description: description!,
      cta_label,
      image_prompt: image_prompt!,
      rationale,
    },
  };
}

/**
 * Validate one string field, trim it, and truncate at the last word
 * boundary if it exceeds maxLen. Pushes errors when required and the
 * field is missing/empty.
 */
function sanitizeStringField(
  raw: unknown,
  fieldName: string,
  maxLen: number,
  errors: string[],
): string | null {
  if (typeof raw !== "string") {
    errors.push(`${fieldName} must be a string`);
    return null;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    errors.push(`${fieldName} is empty`);
    return null;
  }
  if (trimmed.length <= maxLen) {
    return trimmed;
  }
  return truncateAtWordBoundary(trimmed, maxLen);
}

/**
 * Truncate a string at the last whitespace before maxLen so we don't
 * cut mid-word. If the result lost terminal punctuation, append a
 * period. Visible to UI as "Aut-truncated to fit Meta's limit".
 */
export function truncateAtWordBoundary(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  // Reserve one char for an ending period in case we add it.
  const slice = s.slice(0, maxLen - 1);
  const lastSpace = slice.lastIndexOf(" ");
  // If there's no space in the first maxLen-1 chars, it's one giant
  // token; just hard-truncate.
  const cut = lastSpace > maxLen * 0.5 ? slice.slice(0, lastSpace) : slice;
  const trimmed = cut.trimEnd();
  // If the result already ends in . ! ? leave it; otherwise add period.
  if (/[.!?]$/.test(trimmed)) return trimmed;
  return trimmed + ".";
}

/* ── Length report (UI helper) ──────────────────────────────────────────── */

export interface LengthReport {
  field: "primary_text" | "headline" | "description";
  length: number;
  recommended: number;
  max: number;
  /** "ok" when at/under recommended, "tight" when within 10% of max, "over" should never happen post-validation. */
  status: "ok" | "tight" | "over";
}

/**
 * For each text field, return a status report so the UI can color-code
 * length indicators. Pure function so we can unit-test the thresholds.
 */
export function buildLengthReport(value: PIMetaAdResponse): LengthReport[] {
  return [
    reportFor("primary_text", value.primary_text, META_LIMITS.primary_text),
    reportFor("headline", value.headline, META_LIMITS.headline),
    reportFor("description", value.description, META_LIMITS.description),
  ];
}

function reportFor(
  field: LengthReport["field"],
  text: string,
  limits: { recommended: number; max: number },
): LengthReport {
  const length = text.length;
  let status: LengthReport["status"];
  if (length > limits.max) {
    status = "over";
  } else if (length > limits.recommended) {
    status = "tight";
  } else {
    status = "ok";
  }
  return { field, length, recommended: limits.recommended, max: limits.max, status };
}
