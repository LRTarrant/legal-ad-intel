/**
 * Cost tracker \u2014 records every external AI/asset API call.
 *
 * Design principles:
 *   1. NEVER break the user's request. If the cost insert fails (DB
 *      hiccup, RLS quirk), we log to console and let the API call
 *      succeed. The cost row is observability \u2014 not a transaction.
 *   2. Compute cost via lib/cost-tracking/calculator so the table
 *      never holds an "I forgot to convert dollars to cents" mistake.
 *   3. Take attribution as explicit fields (user_id, firm_id,
 *      campaign_id) rather than reading from request context. Lets
 *      tests construct calls without faking auth, and makes it
 *      obvious in route code which call belongs to which firm.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateCost,
  type UsageMeasurements,
} from "./calculator";
import { logApiCall, type ApiProvider, type ApiUnitType } from "../api-usage";

export type GenerationPurpose =
  | "pi_script"
  | "mt_radio_script"
  | "mt_video_script"
  | "voiceover"
  | "video_render"
  | "brand_extract"
  | "ad_creative"
  | "image_gen"
  | "strategic_brief"
  | "strategy_engine"
  | "other";

export interface TrackCallInput {
  user_id: string;
  firm_id?: string | null;
  campaign_id?: string | null;
  purpose: GenerationPurpose;
  provider: string;
  model: string;
  usage: UsageMeasurements;
  /** Round-trip latency for the call, milliseconds. Optional. */
  latency_ms?: number;
  /** Free-form metadata. Keep small. */
  meta?: Record<string, unknown>;
  /**
   * Source path for the api_usage_log fan-out
   * (e.g. "api/campaigns/generate-pi-meta-ad"). Required so the
   * admin cost dashboard can attribute spend to a route.
   */
  called_from: string;
}

export interface TrackCallResult {
  ok: boolean;
  cost_cents: number;
  /** id of the row inserted, when ok=true. */
  id?: string;
  /** Error message when ok=false (logged but not thrown). */
  error?: string;
}

/**
 * Record a single API call. Always returns synchronously \u2014 awaiting is
 * optional. Callers that want fire-and-forget can `void trackCall(...)`.
 *
 * Returns the computed cost regardless of insert success so callers
 * can include it in their response payload (e.g. for the Campaign
 * Builder's "this generated for $0.07" indicator).
 */
export async function trackCall(
  supabase: SupabaseClient,
  input: TrackCallInput,
): Promise<TrackCallResult> {
  const cost_cents = calculateCost(input.provider, input.model, input.usage);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  try {
    const { data, error } = await db
      .from("generation_costs")
      .insert({
        user_id: input.user_id,
        firm_id: input.firm_id ?? null,
        campaign_id: input.campaign_id ?? null,
        purpose: input.purpose,
        provider: input.provider,
        model: input.model,
        input_tokens: input.usage.input_tokens ?? null,
        output_tokens: input.usage.output_tokens ?? null,
        characters_synth: input.usage.characters_synth ?? null,
        seconds_audio: input.usage.seconds_audio ?? null,
        seconds_video: input.usage.seconds_video ?? null,
        image_count: input.usage.image_count ?? null,
        cost_cents,
        latency_ms: input.latency_ms ?? null,
        meta: input.meta ?? {},
      })
      .select("id")
      .single();

    if (error) {
      // Log but don't throw \u2014 cost tracking is observability.
      console.warn(`[cost-tracking] insert failed: ${error.message}`);
      // Still fan out to api_usage_log so the admin dashboard sees the
      // call even when the per-user attribution write fails.
      void fanOutToApiUsageLog(input, cost_cents);
      return { ok: false, cost_cents, error: error.message };
    }

    void fanOutToApiUsageLog(input, cost_cents);
    return { ok: true, cost_cents, id: (data as { id: string } | null)?.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn(`[cost-tracking] insert threw: ${message}`);
    void fanOutToApiUsageLog(input, cost_cents);
    return { ok: false, cost_cents, error: message };
  }
}

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
/* Fan-out to api_usage_log                                                 */
/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

function pickUnitType(provider: string, usage: UsageMeasurements): ApiUnitType {
  if (usage.input_tokens !== undefined || usage.output_tokens !== undefined) {
    return "tokens";
  }
  if (usage.characters_synth !== undefined) return "characters";
  if (usage.seconds_video !== undefined || usage.seconds_audio !== undefined) {
    return "seconds";
  }
  if (usage.image_count !== undefined) return "images";
  // Unknown shape; default to tokens (most calls).
  void provider;
  return "tokens";
}

function pickUnitsConsumed(usage: UsageMeasurements): number {
  if (usage.input_tokens !== undefined || usage.output_tokens !== undefined) {
    return (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0);
  }
  if (usage.characters_synth !== undefined) return usage.characters_synth;
  if (usage.seconds_video !== undefined) return usage.seconds_video;
  if (usage.seconds_audio !== undefined) return usage.seconds_audio;
  if (usage.image_count !== undefined) return usage.image_count;
  return 0;
}

async function fanOutToApiUsageLog(
  input: TrackCallInput,
  cost_cents: number,
): Promise<void> {
  // Only the three providers the admin dashboard tracks fan out.
  // Anthropic / ElevenLabs / Google Vertex calls stay in
  // generation_costs only until those providers join api_usage_log.
  const TRACKED: ReadonlySet<string> = new Set(["openai", "searchapi", "apify"]);
  if (!TRACKED.has(input.provider)) return;

  await logApiCall({
    provider: input.provider as ApiProvider,
    operation: input.purpose,
    model_or_actor: input.model,
    units_consumed: pickUnitsConsumed(input.usage),
    unit_type: pickUnitType(input.provider, input.usage),
    cost_usd: cost_cents / 100,
    called_from: input.called_from,
    tenant_id: input.firm_id ?? null,
    metadata: {
      purpose: input.purpose,
      campaign_id: input.campaign_id ?? null,
      user_id: input.user_id,
      latency_ms: input.latency_ms ?? null,
      ...(input.meta ?? {}),
    },
  });
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Latency-wrap helper                                                      */
/* ──────────────────────────────────────────────────────────────────────── */

/**
 * Convenience wrapper that times an async fn and records the cost
 * after it resolves. Skips tracking entirely if the fn throws so we
 * don't double-charge for failed calls.
 *
 * Usage:
 *   const result = await trackedCall(
 *     supabase,
 *     { user_id, firm_id, purpose: "pi_script", provider: "openai",
 *       model: "gpt-4o-mini" },
 *     async () => {
 *       const completion = await openai.chat.completions.create({...});
 *       return {
 *         result: completion.choices[0].message.content,
 *         usage: {
 *           input_tokens: completion.usage.prompt_tokens,
 *           output_tokens: completion.usage.completion_tokens,
 *         },
 *       };
 *     },
 *   );
 */
export async function trackedCall<T>(
  supabase: SupabaseClient,
  metadata: Omit<TrackCallInput, "usage" | "latency_ms">,
  fn: () => Promise<{ result: T; usage: UsageMeasurements }>,
): Promise<{ result: T; tracked: TrackCallResult }> {
  const start = Date.now();
  const { result, usage } = await fn();
  const latency_ms = Date.now() - start;

  const tracked = await trackCall(supabase, {
    ...metadata,
    usage,
    latency_ms,
  });

  return { result, tracked };
}
