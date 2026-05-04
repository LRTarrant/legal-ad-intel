/**
 * Testable internals for the PI radio script route.
 *
 * Pure-function pieces extracted out of route.ts so they can be unit-
 * tested without spinning up Next request/response or mocking OpenAI.
 * The route handler imports + re-exports these so we keep one source
 * of truth.
 */

import type {
  PICategory,
  PITemplate,
  SeverityModifier,
} from "@/lib/campaign-builder/pi-templates/types";
import { getAvailablePICategories } from "@/lib/campaign-builder/pi-templates";

/* ── Public types (mirror route.ts) ─────────────────────────────────────── */

export interface PIRadioScriptRequest {
  pi_category: PICategory;
  market_display_name: string;
  state: string;
  firm_id?: string;
  firm_name: string;
  severity_modifiers?: SeverityModifier[];
  duration: "15s" | "30s" | "60s";
  format?: "radio" | "podcast";
  language?: "en" | "es";
}

export interface VoiceRecommendation {
  gender: "male" | "female";
  style: string;
  reason: string;
}

/* ── Validation ─────────────────────────────────────────────────────────── */

const VALID_DURATIONS = new Set(["15s", "30s", "60s"]);
const VALID_FORMATS = new Set(["radio", "podcast"]);
const VALID_LANGUAGES = new Set(["en", "es"]);
const VALID_SEVERITIES = new Set(["fatal", "catastrophic"]);

export function validatePIRadioRequest(body: PIRadioScriptRequest): string[] {
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
  if (body.format && !VALID_FORMATS.has(body.format)) {
    errors.push("format must be 'radio' or 'podcast'");
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

/* ── Voice recommendation ───────────────────────────────────────────────── */

export function recommendPIVoice(
  category: PICategory,
  severity: SeverityModifier[],
): VoiceRecommendation {
  const isFatal = severity.includes("fatal");
  const isCatastrophic = severity.includes("catastrophic");

  if (isFatal) {
    return {
      gender: "male",
      style: "compassionate and grave",
      reason: "Fatal cases require gravitas — addressing surviving family",
    };
  }
  if (isCatastrophic) {
    return {
      gender: "male",
      style: "authoritative and measured",
      reason:
        "Catastrophic injury (TBI, paralysis, amputation) calls for serious authoritative tone",
    };
  }

  switch (category) {
    case "pedestrian_accident":
    case "bicycle_accident":
      return {
        gender: "female",
        style: "warm and reassuring",
        reason:
          "Vulnerable road user cases — drivers often blame the victim, empathetic voice rebalances",
      };
    case "dog_bite":
    case "slip_and_fall":
    case "premises_liability":
      return {
        gender: "female",
        style: "approachable and confident",
        reason:
          "Premises cases skew everyday-injury — friendly voice keeps the spot conversational",
      };
    case "truck_accident":
      return {
        gender: "male",
        style: "authoritative and direct",
        reason:
          "Commercial vehicle / FMCSA framing — confident male voice signals seriousness",
      };
    case "motorcycle_accident":
      return {
        gender: "male",
        style: "direct and respectful",
        reason: "Rider audience responds to a direct, no-pity voice",
      };
    case "boating_accident":
      return {
        gender: "male",
        style: "calm and informed",
        reason: "Boating audience tends male; calm voice cuts through summer-spot clutter",
      };
    case "car_accident":
    default:
      return {
        gender: "male",
        style: "authoritative but empathetic",
        reason: "General auto-injury voice — broad audience, balanced tone",
      };
  }
}

/* ── Prompt assembly ────────────────────────────────────────────────────── */

const WORD_COUNTS: Record<"15s" | "30s" | "60s", { radio: string; podcast: string }> = {
  "15s": { radio: "exactly 35-40 words", podcast: "exactly 35-40 words" },
  "30s": { radio: "exactly 75-80 words", podcast: "exactly 85-95 words" },
  "60s": { radio: "exactly 150-160 words", podcast: "exactly 170-190 words" },
};

export const PI_RADIO_SYSTEM_PROMPT = `You are an expert direct-response radio advertising copywriter for personal injury legal services.

You write compelling, broadcast-ready radio scripts that drive immediate action — but you do NOT invent facts, statistics, or legal claims. The user will give you a structured PI script template (hook, problem, authority, call-to-action, disclaimer) for a specific injury category, market, and state. Your job is to polish that material into a single block of broadcast-ready script text.

Rules:
- Match the requested word count exactly
- Preserve EVERY compliance disclaimer the template provides, verbatim, at the end
- Use the firm name, market name, and state name exactly as the template provides them
- Tone: urgent but trustworthy, authoritative but empathetic
- Do NOT use the word "lawsuit" — use "legal rights" or "compensation" instead
- Do NOT invent injuries, percentages, or facts not present in the template
- Format as a single block of script text — no stage directions, speaker labels, or markdown
- If the language is "es", produce the script in natural conversational Spanish while preserving all disclaimers

Respond with ONLY the script text — no JSON, no commentary, no preamble.`;

export const PI_PODCAST_SYSTEM_PROMPT = `You are an expert podcast advertising copywriter for personal injury legal services.

You write natural, conversational host-read ad scripts. The user will give you a structured PI script template (hook, problem, authority, call-to-action, disclaimer) for a specific injury category, market, and state. Your job is to polish that material into a single block of host-read podcast ad copy.

Rules:
- Match the requested word count exactly
- Preserve EVERY compliance disclaimer the template provides, verbatim, at the end
- Use the firm name, market name, and state name exactly as the template provides them
- Tone: conversational, trustworthy, informative — like a host genuinely recommending something
- Use contractions and natural phrasing; sound like a real person talking, not a commercial
- Do NOT use the word "lawsuit" — use "legal rights" or "compensation" instead
- Do NOT invent injuries, percentages, or facts not present in the template
- Format as a single block of script text — no stage directions, speaker labels, or markdown
- If the language is "es", produce the script in natural conversational Spanish while preserving all disclaimers

Respond with ONLY the script text — no JSON, no commentary, no preamble.`;

export function buildPIRadioUserPrompt(
  body: PIRadioScriptRequest,
  template: PITemplate,
): string {
  const words =
    WORD_COUNTS[body.duration][body.format === "podcast" ? "podcast" : "radio"];
  const lang = body.language === "es" ? "Spanish (es)" : "English (en)";

  const sourceLines = [
    `HOOK: ${template.hook}`,
    `PROBLEM: ${template.problem}`,
    `AUTHORITY: ${template.authority}`,
    template.socialProof ? `SOCIAL PROOF: ${template.socialProof}` : null,
    `CALL TO ACTION: ${template.cta}`,
    `DISCLAIMER (preserve verbatim): ${template.baseDisclaimer}`,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    `Category: ${template.displayName}`,
    `Spot length: ${body.duration} (${words})`,
    `Language: ${lang}`,
    `Firm: ${body.firm_name}`,
    `Market: ${body.market_display_name}`,
    `State: ${body.state}`,
    "",
    "Source material (polish into a broadcast-ready spot):",
    sourceLines,
  ].join("\n");
}
