/**
 * Testable internals for the PI video script route.
 *
 * Pure-function pieces extracted out of route.ts so they can be unit-
 * tested without spinning up Next request/response or mocking OpenAI.
 *
 * Design echoes the radio script route: the LLM polishes a structured
 * PI template into a 3-scene storyboard. It does NOT invent facts \u2014
 * the template's hook/problem/authority/CTA/disclaimer are the source
 * material; the LLM rewrites them as scene-shaped prose at the right
 * word count for each scene.
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

// Re-export so route.ts has a single import surface.
export { brandInputsFromFirm };
export type { BrandPromptInputs };

/* ── Types ──────────────────────────────────────────────────────────────── */

export type VideoPlatform =
  | "youtube_ad"
  | "youtube_short"
  | "tiktok"
  | "meta_reel"
  | "meta_feed";

export interface PIVideoScriptRequest {
  pi_category: PICategory;
  market_display_name: string;
  state: string;
  firm_id?: string;
  firm_name: string;
  severity_modifiers?: SeverityModifier[];
  duration: "15s" | "30s" | "60s";
  platform: VideoPlatform;
  language?: "en" | "es";
}

export interface VideoScene {
  sceneNumber: number;
  headline: string;
  subheadline: string;
  imagePrompt: string;
  voiceover: string;
  durationSeconds: number;
}

export interface PIVideoScriptResponse {
  scenes: VideoScene[];
  ctaHeadline: string;
  ctaPhone: string;
  ctaSubline: string;
  /** Compliance disclaimer — preserved verbatim from the PI template. */
  disclaimer: string;
}

/* ── Validation ─────────────────────────────────────────────────────────── */

const VALID_DURATIONS = new Set(["15s", "30s", "60s"]);
const VALID_PLATFORMS = new Set([
  "youtube_ad",
  "youtube_short",
  "tiktok",
  "meta_reel",
  "meta_feed",
]);
const VALID_LANGUAGES = new Set(["en", "es"]);
const VALID_SEVERITIES = new Set(["fatal", "catastrophic"]);

export function validatePIVideoRequest(body: PIVideoScriptRequest): string[] {
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
  if (!VALID_DURATIONS.has(body.duration)) {
    errors.push("duration must be '15s', '30s', or '60s'");
  }
  if (!VALID_PLATFORMS.has(body.platform)) {
    errors.push(
      "platform must be one of youtube_ad, youtube_short, tiktok, meta_reel, meta_feed",
    );
  }
  if (body.language && !VALID_LANGUAGES.has(body.language)) {
    errors.push("language must be 'en' or 'es'");
  }
  if (body.severity_modifiers) {
    for (const sev of body.severity_modifiers) {
      if (!VALID_SEVERITIES.has(sev)) {
        errors.push(`severity_modifiers contains invalid value: ${sev}`);
        break;
      }
    }
    if (body.severity_modifiers.length > 1) {
      errors.push("severity_modifiers can have at most one entry in v1");
    }
  }

  return errors;
}

/* ── Scene budgets (mirror the mass-tort route) ─────────────────────────── */

/**
 * Per-duration scene timing. Always 3 scenes evenly distributed plus a
 * 5-second CTA tail. English speaking rate ≈ 2.5 words/sec.
 */
export const SCENE_BUDGETS: Record<
  "15s" | "30s" | "60s",
  { perSceneSec: number; perSceneWords: number; totalSec: number; tone: string }
> = {
  "15s": {
    perSceneSec: 5,
    perSceneWords: 12,
    totalSec: 15,
    tone: "very concise — one short beat per scene, no wasted words",
  },
  "30s": {
    perSceneSec: 10,
    perSceneWords: 25,
    totalSec: 30,
    tone: "balanced — give each scene room to land but don't overwrite",
  },
  "60s": {
    perSceneSec: 20,
    perSceneWords: 50,
    totalSec: 60,
    tone: "expansive — each scene can build with detail and emotion",
  },
};

/* ── System prompt ──────────────────────────────────────────────────────── */

export const PI_VIDEO_SYSTEM_PROMPT = `You are generating a personal-injury video ad storyboard with EXACTLY 3 scenes.

The user will give you a structured PI template (hook, problem, authority, call-to-action, disclaimer) for a specific injury category, market, and state. Your job is to convert that template into a 3-scene video storyboard, distributing the message across scenes:
  - Scene 1 \u2192 the HOOK (pattern interrupt; grabs attention)
  - Scene 2 \u2192 the PROBLEM + AUTHORITY (what's at stake; why this firm)
  - Scene 3 \u2192 the CALL TO ACTION (what to do next; sets up the CTA card)

Per-scene fields:
  - headline (on-screen text, 2-5 words)
  - subheadline (5-10 words)
  - imagePrompt (visual placeholder; the rendering pipeline picks the image)
  - voiceover (spoken narration, sized to the per-scene word budget)
  - durationSeconds (the per-scene budget)

Word budgets (English ~2.5 words/sec):
  15s total \u2192 ~5s per scene \u2192 ~12 words of voiceover per scene
  30s total \u2192 ~10s per scene \u2192 ~25 words of voiceover per scene
  60s total \u2192 ~20s per scene \u2192 ~50 words of voiceover per scene

Rules:
- EXACTLY 3 scenes. No more, no fewer.
- Distribute spoken copy evenly. Do not front-load scene 1 and leave 2/3 sparse.
- Use the firm name, market, and state exactly as the template provides them.
- Preserve EVERY compliance disclaimer the template provides, verbatim, in the disclaimer field.
- Do NOT use the word "lawsuit" — use "legal rights" or "compensation" instead.
- Do NOT invent injuries, percentages, or facts not present in the template.
- If a "Firm voice context" block is present, weave the firm's voice descriptors / differentiators / signature phrases / attorneys in naturally (don't list them); override the default tone to match.

IMAGE PROMPT RULES (visual placeholder — the rendering pipeline handles image selection):
- NO courtrooms, NO gavels, NO legal scales, NO suits, NO handshakes
- NO generic "justice" or "legal" imagery
- Describe real people in real settings relevant to the injury type
- NO text, words, letters, or logos in the image description

CTA card (5-second tail after the 3 scenes):
- ctaHeadline: short and direct (e.g. "CALL NOW")
- ctaPhone: use "1-800-YOUR-FIRM" if no firm phone is available; otherwise the firm's phone
- ctaSubline: terse, e.g. "24/7 \u00b7 Free Consultation \u00b7 No Fee Unless You Win"
- disclaimer: copy the template's disclaimer text verbatim

Respond with ONLY valid JSON matching this exact structure:
{
  "scenes": [
    { "sceneNumber": 1, "headline": "...", "subheadline": "...", "imagePrompt": "...", "voiceover": "...", "durationSeconds": <budget> },
    { "sceneNumber": 2, "headline": "...", "subheadline": "...", "imagePrompt": "...", "voiceover": "...", "durationSeconds": <budget> },
    { "sceneNumber": 3, "headline": "...", "subheadline": "...", "imagePrompt": "...", "voiceover": "...", "durationSeconds": <budget> }
  ],
  "ctaHeadline": "CALL NOW",
  "ctaPhone": "1-800-YOUR-FIRM",
  "ctaSubline": "...",
  "disclaimer": "..."
}`;

/* ── Prompt assembly ────────────────────────────────────────────────────── */

export function buildPIVideoUserPrompt(
  body: PIVideoScriptRequest,
  template: PITemplate,
  brand?: BrandPromptInputs | null,
): string {
  const budget = SCENE_BUDGETS[body.duration];
  const lang = body.language === "es" ? "Spanish (es)" : "English (en)";

  const sourceLines = [
    `HOOK: ${template.hook}`,
    `PROBLEM: ${template.problem}`,
    `AUTHORITY: ${template.authority}`,
    template.socialProof ? `SOCIAL PROOF: ${template.socialProof}` : null,
    `CALL TO ACTION: ${template.cta}`,
    `DISCLAIMER (preserve verbatim in the JSON disclaimer field): ${template.baseDisclaimer}`,
  ]
    .filter(Boolean)
    .join("\n");

  const lines = [
    `Category: ${template.displayName}`,
    `Total runtime: ${body.duration} (~${budget.totalSec}s; 3 scenes \u00d7 ~${budget.perSceneSec}s each, ~${budget.perSceneWords} voiceover words/scene)`,
    `Pacing tone: ${budget.tone}`,
    `Platform: ${body.platform.replace(/_/g, " ")}`,
    `Language: ${lang}`,
    `Firm: ${body.firm_name}`,
    `Market: ${body.market_display_name}`,
    `State: ${body.state}`,
  ];

  // Spanish handling \u2014 same pattern as the mass-tort route. JSON keys
  // stay in English; scene text + CTA + disclaimer translate.
  if (body.language === "es") {
    lines.push("");
    lines.push(
      'IMPORTANT: Generate scene headlines, subheadlines, voiceover, ctaHeadline, ctaSubline, and disclaimer in natural conversational Spanish (Espa\u00f1ol). Image prompts stay in English (used for image generation). JSON keys stay in English. Keep the firm name as-is.',
    );
  }

  // Brand voice context (Phase 1.5 parity).
  const brandSection = renderBrandPromptSection(brand);
  if (brandSection) {
    lines.push("");
    lines.push(
      "Firm voice context (the script should sound like THIS firm \u2014 weave these signals in naturally; do not list them):",
    );
    lines.push(brandSection);
  }

  lines.push("");
  lines.push("Source material (turn into a 3-scene storyboard):");
  lines.push(sourceLines);
  lines.push("");
  lines.push("Remember: output ONLY the JSON, nothing else.");

  return lines.join("\n");
}

/* ── Response validation ────────────────────────────────────────────────── */

/**
 * Sanity-check the LLM's JSON shape. Returns a list of problems; an
 * empty list means the response is structurally valid. We log the
 * problems and let the caller decide whether to retry or surface a
 * 502 \u2014 hallucinations on this surface are rare with gpt-4o, but
 * defending against them here keeps the UI from rendering broken
 * scenes.
 */
export function validateVideoScriptResponse(
  parsed: unknown,
): { ok: true; value: PIVideoScriptResponse } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, errors: ["response is not an object"] };
  }
  const obj = parsed as Record<string, unknown>;

  if (!Array.isArray(obj.scenes)) {
    errors.push("scenes must be an array");
  } else if (obj.scenes.length !== 3) {
    errors.push(`expected exactly 3 scenes, got ${obj.scenes.length}`);
  } else {
    obj.scenes.forEach((s, idx) => {
      if (!s || typeof s !== "object") {
        errors.push(`scene ${idx + 1} is not an object`);
        return;
      }
      const sceneRecord = s as Record<string, unknown>;
      if (typeof sceneRecord.headline !== "string" || !sceneRecord.headline.trim()) {
        errors.push(`scene ${idx + 1}: headline missing or empty`);
      }
      if (typeof sceneRecord.subheadline !== "string") {
        errors.push(`scene ${idx + 1}: subheadline missing`);
      }
      if (typeof sceneRecord.voiceover !== "string" || !sceneRecord.voiceover.trim()) {
        errors.push(`scene ${idx + 1}: voiceover missing or empty`);
      }
      if (typeof sceneRecord.imagePrompt !== "string") {
        errors.push(`scene ${idx + 1}: imagePrompt missing`);
      }
      if (typeof sceneRecord.durationSeconds !== "number" || sceneRecord.durationSeconds <= 0) {
        errors.push(`scene ${idx + 1}: durationSeconds invalid`);
      }
    });
  }

  for (const field of ["ctaHeadline", "ctaPhone", "ctaSubline", "disclaimer"] as const) {
    if (typeof obj[field] !== "string" || !(obj[field] as string).trim()) {
      errors.push(`${field} missing or empty`);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: obj as unknown as PIVideoScriptResponse };
}

/**
 * Strip common LLM JSON wrappers (markdown code fences, leading/trailing
 * prose) before JSON.parse. Mirrors what the mass-tort route does.
 */
export function stripJSONWrapper(content: string): string {
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    // Drop the opening fence (could be ``` or ```json)
    cleaned = cleaned.replace(/^```(?:json)?\s*\n/i, "");
    // Drop the closing fence
    cleaned = cleaned.replace(/\n```\s*$/i, "");
  }
  return cleaned.trim();
}
