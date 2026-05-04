/**
 * Tests for cost calculator. Covers each provider/modality combination
 * we ship rates for, plus the unrecognized-model graceful-zero behavior.
 */

import {
  calculateCost,
  calculateLLMCost,
  calculateTTSCost,
  calculateImageCost,
  calculateVideoCost,
} from "./calculator";

/* ── LLM ────────────────────────────────────────────────────────────────── */

test("LLM: gpt-4o-mini at small token counts rounds up to a whole cent", () => {
  // 1k input + 1k output @ 15\u00a2/1M + 60\u00a2/1M = 0.015\u00a2 + 0.06\u00a2 = 0.075\u00a2 \u2192 ceil 1\u00a2
  const cost = calculateLLMCost("openai", "gpt-4o-mini", {
    input_tokens: 1000,
    output_tokens: 1000,
  });
  expect(cost).toBe(1);
});

test("LLM: gpt-4o at 100k input + 5k output produces predictable cost", () => {
  // 100k * 250\u00a2/1M = 25\u00a2 + 5k * 1000\u00a2/1M = 5\u00a2 \u2192 30\u00a2
  const cost = calculateLLMCost("openai", "gpt-4o", {
    input_tokens: 100_000,
    output_tokens: 5_000,
  });
  expect(cost).toBe(30);
});

test("LLM: claude-3-5-sonnet returns expected cost", () => {
  // 50k * 300\u00a2/1M = 15\u00a2 + 10k * 1500\u00a2/1M = 15\u00a2 \u2192 30\u00a2
  const cost = calculateLLMCost("anthropic", "claude-3-5-sonnet-20241022", {
    input_tokens: 50_000,
    output_tokens: 10_000,
  });
  expect(cost).toBe(30);
});

test("LLM: aliased model id (with date suffix) resolves to same rate", () => {
  // gpt-4o-2024-08-06 is the dated alias \u2014 should match base "gpt-4o"
  const dated = calculateLLMCost("openai", "gpt-4o-2024-08-06", {
    input_tokens: 100_000,
    output_tokens: 5_000,
  });
  const base = calculateLLMCost("openai", "gpt-4o", {
    input_tokens: 100_000,
    output_tokens: 5_000,
  });
  expect(dated).toBe(base);
});

test("LLM: unknown model returns 0 and warns (not throw)", () => {
  const cost = calculateLLMCost("openai", "future-model-not-shipped-yet", {
    input_tokens: 1000,
    output_tokens: 500,
  });
  expect(cost).toBe(0);
});

test("LLM: zero usage returns 0", () => {
  const cost = calculateLLMCost("openai", "gpt-4o", {
    input_tokens: 0,
    output_tokens: 0,
  });
  expect(cost).toBe(0);
});

/* ── TTS ────────────────────────────────────────────────────────────────── */

test("TTS: ElevenLabs Turbo at 1k chars = 30\u00a2", () => {
  const cost = calculateTTSCost("elevenlabs", "eleven_turbo_v2", 1000);
  expect(cost).toBe(30);
});

test("TTS: ElevenLabs Turbo at 250 chars rounds up to 8\u00a2", () => {
  // 250 * 30 / 1000 = 7.5 \u2192 ceil 8
  const cost = calculateTTSCost("elevenlabs", "eleven_turbo_v2", 250);
  expect(cost).toBe(8);
});

test("TTS: OpenAI tts-1 at 10k chars = 20\u00a2", () => {
  const cost = calculateTTSCost("openai", "tts-1", 10_000);
  expect(cost).toBe(20);
});

test("TTS: unknown provider returns 0", () => {
  const cost = calculateTTSCost("nope", "model", 1000);
  expect(cost).toBe(0);
});

/* ── Images ─────────────────────────────────────────────────────────────── */

test("Image: DALL-E 3 at 1 image = 4\u00a2", () => {
  const cost = calculateImageCost("openai", "dall-e-3", 1);
  expect(cost).toBe(4);
});

test("Image: DALL-E 3 at 5 images = 20\u00a2", () => {
  const cost = calculateImageCost("openai", "dall-e-3", 5);
  expect(cost).toBe(20);
});

test("Image: cheap model (Flux schnell) bills at least 1\u00a2 per call", () => {
  const cost = calculateImageCost("replicate", "flux-schnell", 1);
  expect(cost).toBe(1);
});

test("Image: Imagen 4 Fast charged at 2\u00a2 per image", () => {
  expect(calculateImageCost("google", "imagen-4-fast", 1)).toBe(2);
  expect(calculateImageCost("google", "imagen-4-fast", 3)).toBe(6);
});

test("Image: internal library lookups always free even with count > 0", () => {
  expect(calculateImageCost("internal", "pi_library", 1)).toBe(0);
  expect(calculateImageCost("internal", "pi_library", 50)).toBe(0);
  expect(calculateImageCost("internal", "tort_library", 10)).toBe(0);
});

test("Image: zero count returns 0", () => {
  const cost = calculateImageCost("openai", "dall-e-3", 0);
  expect(cost).toBe(0);
});

/* ── Video ──────────────────────────────────────────────────────────────── */

test("Video: Runway gen-3 at 30 seconds = 360\u00a2", () => {
  const cost = calculateVideoCost("runwayml", "gen-3-alpha", 30);
  expect(cost).toBe(360);
});

test("Video: Sora at 10 seconds = 500\u00a2 ($5)", () => {
  const cost = calculateVideoCost("openai", "sora-1", 10);
  expect(cost).toBe(500);
});

test("Video: fractional seconds round up", () => {
  // Runway at 10.5s = 126 \u2192 ceil = 126
  const cost = calculateVideoCost("runwayml", "gen-3-alpha", 10.5);
  expect(cost).toBe(126);
});

/* ── Top-level dispatcher ───────────────────────────────────────────────── */

test("calculateCost picks LLM path when input_tokens present", () => {
  const cost = calculateCost("openai", "gpt-4o-mini", {
    input_tokens: 1000,
    output_tokens: 1000,
  });
  expect(cost).toBe(1);
});

test("calculateCost picks TTS path when characters_synth present", () => {
  const cost = calculateCost("elevenlabs", "eleven_turbo_v2", {
    characters_synth: 1000,
  });
  expect(cost).toBe(30);
});

test("calculateCost picks video path when seconds_video present", () => {
  const cost = calculateCost("runwayml", "gen-3-alpha", {
    seconds_video: 10,
  });
  expect(cost).toBe(120);
});

test("calculateCost picks image path when image_count present", () => {
  const cost = calculateCost("openai", "dall-e-3", { image_count: 1 });
  expect(cost).toBe(4);
});

test("calculateCost returns 0 when no measurements provided", () => {
  const cost = calculateCost("openai", "gpt-4o", {});
  expect(cost).toBe(0);
});
