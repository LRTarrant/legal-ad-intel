/**
 * Cost calculator for external AI/asset API calls.
 *
 * Pure functions: given a provider, model, and usage measurements,
 * return the cost in cents (always integer, always non-negative).
 *
 * Pricing is hardcoded here so we control updates explicitly. When a
 * provider changes prices we bump the table and the change ships with
 * the next release \u2014 no surprise reads from a config service.
 *
 * Source-of-truth links live next to each rate so future-Lance can
 * verify prices haven't drifted. All rates as of 2026-05.
 */

/* ──────────────────────────────────────────────────────────────────────── */
/* LLM rates: per million tokens                                            */
/* ──────────────────────────────────────────────────────────────────────── */

interface LLMRate {
  /** Cents per 1M input tokens. */
  input: number;
  /** Cents per 1M output tokens. */
  output: number;
}

/**
 * Lookup keyed by `${provider}:${model}`.
 *
 * Use exact model strings as they appear in the provider's API
 * (e.g. "gpt-4o-mini-2024-07-18", not "gpt4o-mini") so we don't
 * silently miss a price update because of a renamed alias.
 */
const LLM_RATES: Record<string, LLMRate> = {
  // OpenAI \u2014 https://openai.com/api/pricing
  "openai:gpt-4o": { input: 250, output: 1000 },
  "openai:gpt-4o-mini": { input: 15, output: 60 },
  "openai:gpt-4-turbo": { input: 1000, output: 3000 },
  "openai:o1-mini": { input: 110, output: 440 },
  "openai:o1": { input: 1500, output: 6000 },

  // Anthropic \u2014 https://www.anthropic.com/pricing
  "anthropic:claude-3-5-sonnet-20241022": { input: 300, output: 1500 },
  "anthropic:claude-3-5-haiku-20241022": { input: 80, output: 400 },
  "anthropic:claude-3-opus-20240229": { input: 1500, output: 7500 },
};

/**
 * Resolve a model alias to the rate-table key. Lets callers pass
 * "gpt-4o-mini" without worrying whether the table key includes a date
 * suffix. Returns null when the model isn't recognized; the tracker
 * surfaces this as an explicit warning rather than silently zeroing.
 */
function resolveLLMRate(provider: string, model: string): LLMRate | null {
  const direct = LLM_RATES[`${provider}:${model}`];
  if (direct) return direct;

  // Tolerate aliases by prefix match. Most "gpt-4o" / "gpt-4o-mini"
  // calls on OpenAI return a dated model id like "gpt-4o-2024-08-06";
  // we want both the dated and undated forms to hit the same rate.
  const prefixHit = Object.entries(LLM_RATES).find(
    ([key]) => key.startsWith(`${provider}:`) && model.startsWith(key.split(":")[1]),
  );
  return prefixHit ? prefixHit[1] : null;
}

export interface LLMUsage {
  input_tokens: number;
  output_tokens: number;
}

/**
 * Compute LLM cost in cents. Returns 0 (and logs via console.warn) when
 * the model is unrecognized so the calling route doesn't blow up \u2014 but
 * the unrecognized call IS still recorded with cost_cents=0 so we can
 * see it in the admin dashboard and add the rate later.
 */
export function calculateLLMCost(
  provider: string,
  model: string,
  usage: LLMUsage,
): number {
  const rate = resolveLLMRate(provider, model);
  if (!rate) {
    console.warn(`[cost-tracking] No rate for ${provider}:${model}`);
    return 0;
  }
  // Rates are cents per 1M tokens, so divide by 1M.
  // Use Math.ceil so a 1-token call still records 1 cent for visibility.
  const inputCost = (usage.input_tokens * rate.input) / 1_000_000;
  const outputCost = (usage.output_tokens * rate.output) / 1_000_000;
  const totalCents = inputCost + outputCost;
  // Round to integer cents. Use ceil so we never under-bill ourselves.
  return Math.max(0, Math.ceil(totalCents));
}

/* ──────────────────────────────────────────────────────────────────────── */
/* TTS rates: per character or per minute                                   */
/* ──────────────────────────────────────────────────────────────────────── */

/**
 * ElevenLabs (https://elevenlabs.io/pricing) charges per character on
 * subscription tiers and per minute on pay-as-you-go. Both forms are
 * supported here \u2014 the tracker passes whichever measurement is known.
 *
 * Rates approximate the Creator-tier blended rate as of 2026-05;
 * actual cost can vary by tier. Good enough for COGS visibility.
 */
const TTS_PER_1K_CHARS_CENTS: Record<string, number> = {
  // ElevenLabs Multilingual v2 / Turbo v2: ~$0.30 per 1k chars on PAYG
  "elevenlabs:eleven_turbo_v2": 30,
  "elevenlabs:eleven_multilingual_v2": 30,
  "elevenlabs:eleven_monolingual_v1": 30,

  // OpenAI TTS-1: $15 per 1M chars = 1.5\u00a2 per 1k
  "openai:tts-1": 2,
  "openai:tts-1-hd": 3,
};

export function calculateTTSCost(
  provider: string,
  model: string,
  characters: number,
): number {
  const rate = TTS_PER_1K_CHARS_CENTS[`${provider}:${model}`];
  if (!rate) {
    console.warn(`[cost-tracking] No TTS rate for ${provider}:${model}`);
    return 0;
  }
  return Math.max(0, Math.ceil((characters * rate) / 1000));
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Image rates: per image                                                   */
/* ──────────────────────────────────────────────────────────────────────── */

/**
 * Per-image rates in cents.
 * SDXL/Flux on Replicate or fal are cheap; DALL-E 3 / GPT-image is
 * pricier. Adjust as we lock in providers for video scene imagery.
 */
const IMAGE_PER_UNIT_CENTS: Record<string, number> = {
  "openai:dall-e-3": 4,           // ~$0.04 standard 1024x1024
  "openai:gpt-image-1": 4,
  "replicate:flux-schnell": 0,    // <0.5\u00a2; round up to 1\u00a2
  "replicate:flux-pro": 6,        // ~$0.055
  "fal:flux-schnell": 0,
  "fal:flux-pro": 6,
};

export function calculateImageCost(
  provider: string,
  model: string,
  count: number,
): number {
  const rate = IMAGE_PER_UNIT_CENTS[`${provider}:${model}`];
  if (rate === undefined) {
    console.warn(`[cost-tracking] No image rate for ${provider}:${model}`);
    return 0;
  }
  // Even "free" models cost something at scale; record at least 1\u00a2 per call.
  return Math.max(rate * count, count > 0 ? 1 : 0);
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Video rates: per second                                                  */
/* ──────────────────────────────────────────────────────────────────────── */

/**
 * Video composition cost per second of output. Most current providers
 * charge per second of generated video.
 *   Sora-1                   ~50\u00a2/sec at gen-1 launch pricing
 *   Runway Gen-3 Alpha        ~12\u00a2/sec
 *   Replicate kling/luma      ~10-20\u00a2/sec depending on resolution
 */
const VIDEO_PER_SEC_CENTS: Record<string, number> = {
  "openai:sora-1": 50,
  "runwayml:gen-3-alpha": 12,
  "runwayml:gen-3-turbo": 5,
  "replicate:kling-v1": 15,
  "replicate:luma-ray": 20,
};

export function calculateVideoCost(
  provider: string,
  model: string,
  seconds: number,
): number {
  const rate = VIDEO_PER_SEC_CENTS[`${provider}:${model}`];
  if (rate === undefined) {
    console.warn(`[cost-tracking] No video rate for ${provider}:${model}`);
    return 0;
  }
  return Math.max(0, Math.ceil(rate * seconds));
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Top-level convenience                                                    */
/* ──────────────────────────────────────────────────────────────────────── */

export interface UsageMeasurements {
  input_tokens?: number;
  output_tokens?: number;
  characters_synth?: number;
  seconds_audio?: number;
  seconds_video?: number;
  image_count?: number;
}

/**
 * Single entry point that picks the right calculator based on which
 * usage fields are present. Used by the tracker to keep call sites
 * one-liner clean.
 */
export function calculateCost(
  provider: string,
  model: string,
  usage: UsageMeasurements,
): number {
  if (usage.input_tokens !== undefined || usage.output_tokens !== undefined) {
    return calculateLLMCost(provider, model, {
      input_tokens: usage.input_tokens ?? 0,
      output_tokens: usage.output_tokens ?? 0,
    });
  }
  if (usage.characters_synth !== undefined) {
    return calculateTTSCost(provider, model, usage.characters_synth);
  }
  if (usage.seconds_video !== undefined) {
    return calculateVideoCost(provider, model, usage.seconds_video);
  }
  if (usage.image_count !== undefined) {
    return calculateImageCost(provider, model, usage.image_count);
  }
  return 0;
}
