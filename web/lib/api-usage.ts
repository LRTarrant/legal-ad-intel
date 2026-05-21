/**
 * api-usage — provider-agnostic infra-cost logger.
 *
 * Writes to the `api_usage_log` table. Distinct from
 * `lib/cost-tracking/tracker` (which writes per-user/per-campaign
 * rows to `generation_costs`). OpenAI campaign routes write to both:
 * `generation_costs` for billing attribution, `api_usage_log` for
 * unified observability across OpenAI + Searchapi + Apify.
 *
 * Server-only. Uses service-role client so RLS doesn't block inserts.
 *
 * Design:
 *   1. NEVER throw — cost logging is observability, not a transaction.
 *      Failures are console.warn'd and swallowed.
 *   2. fire-and-forget: callers can `void logApiCall(...)` or await.
 *   3. request_id is generated at log time as a UUID; idempotency
 *      within api_usage_log only (no cross-table use).
 */

import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  calculateLLMCost,
  calculateImageCost,
  calculateTTSCost,
  calculateVideoCost,
} from "./cost-tracking/calculator";

export type ApiProvider = "openai" | "searchapi" | "apify";

export type ApiUnitType =
  | "tokens"
  | "searches"
  | "compute_units"
  | "characters"
  | "seconds"
  | "images";

export interface LogApiCallInput {
  provider: ApiProvider;
  operation: string;
  model_or_actor: string;
  units_consumed: number;
  unit_type: ApiUnitType;
  cost_usd: number;
  called_from: string;
  tenant_id?: string | null;
  request_id?: string;
  metadata?: Record<string, unknown>;
}

let cachedServiceClient: SupabaseClient | null = null;

function serviceClient(): SupabaseClient | null {
  if (cachedServiceClient) return cachedServiceClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  cachedServiceClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedServiceClient;
}

/**
 * Record a single API call. Always returns; never throws.
 *
 * Pass a `request_id` explicitly only when the upstream provider gives
 * you one (e.g. Apify run id) so retries dedupe. Otherwise we generate
 * a UUID here.
 */
export async function logApiCall(input: LogApiCallInput): Promise<void> {
  const client = serviceClient();
  if (!client) {
    console.warn("[api-usage] missing Supabase service env; skipping log");
    return;
  }

  const row = {
    provider: input.provider,
    operation: input.operation,
    model_or_actor: input.model_or_actor,
    units_consumed: input.units_consumed,
    unit_type: input.unit_type,
    cost_usd: input.cost_usd,
    request_id: input.request_id ?? randomUUID(),
    called_from: input.called_from,
    tenant_id: input.tenant_id ?? null,
    metadata: input.metadata ?? {},
  };

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = client as any;
    const { error } = await db.from("api_usage_log").insert(row);
    if (error) {
      console.warn(`[api-usage] insert failed: ${error.message}`);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn(`[api-usage] insert threw: ${message}`);
  }
}

/* ──────────────────────────────────────────────────────────────────────── */
/* OpenAI helpers — convert usage shape to a logApiCall payload              */
/* ──────────────────────────────────────────────────────────────────────── */

export interface LogOpenAITokenCallInput {
  operation: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  called_from: string;
  tenant_id?: string | null;
  request_id?: string;
  metadata?: Record<string, unknown>;
}

export async function logOpenAITokenCall(
  input: LogOpenAITokenCallInput,
): Promise<void> {
  const cost_cents = calculateLLMCost("openai", input.model, {
    input_tokens: input.input_tokens,
    output_tokens: input.output_tokens,
  });
  await logApiCall({
    provider: "openai",
    operation: input.operation,
    model_or_actor: input.model,
    units_consumed: input.input_tokens + input.output_tokens,
    unit_type: "tokens",
    cost_usd: cost_cents / 100,
    called_from: input.called_from,
    tenant_id: input.tenant_id,
    request_id: input.request_id,
    metadata: {
      input_tokens: input.input_tokens,
      output_tokens: input.output_tokens,
      ...(input.metadata ?? {}),
    },
  });
}

export interface LogOpenAIImageCallInput {
  operation: string;
  model: string;
  image_count: number;
  called_from: string;
  tenant_id?: string | null;
  request_id?: string;
  metadata?: Record<string, unknown>;
}

export async function logOpenAIImageCall(
  input: LogOpenAIImageCallInput,
): Promise<void> {
  const cost_cents = calculateImageCost("openai", input.model, input.image_count);
  await logApiCall({
    provider: "openai",
    operation: input.operation,
    model_or_actor: input.model,
    units_consumed: input.image_count,
    unit_type: "images",
    cost_usd: cost_cents / 100,
    called_from: input.called_from,
    tenant_id: input.tenant_id,
    request_id: input.request_id,
    metadata: input.metadata,
  });
}

export interface LogOpenAITTSCallInput {
  operation: string;
  model: string;
  characters: number;
  called_from: string;
  tenant_id?: string | null;
  request_id?: string;
  metadata?: Record<string, unknown>;
}

export async function logOpenAITTSCall(
  input: LogOpenAITTSCallInput,
): Promise<void> {
  const cost_cents = calculateTTSCost("openai", input.model, input.characters);
  await logApiCall({
    provider: "openai",
    operation: input.operation,
    model_or_actor: input.model,
    units_consumed: input.characters,
    unit_type: "characters",
    cost_usd: cost_cents / 100,
    called_from: input.called_from,
    tenant_id: input.tenant_id,
    request_id: input.request_id,
    metadata: input.metadata,
  });
}

export interface LogOpenAIVideoCallInput {
  operation: string;
  model: string;
  seconds: number;
  called_from: string;
  tenant_id?: string | null;
  request_id?: string;
  metadata?: Record<string, unknown>;
}

export async function logOpenAIVideoCall(
  input: LogOpenAIVideoCallInput,
): Promise<void> {
  const cost_cents = calculateVideoCost("openai", input.model, input.seconds);
  await logApiCall({
    provider: "openai",
    operation: input.operation,
    model_or_actor: input.model,
    units_consumed: input.seconds,
    unit_type: "seconds",
    cost_usd: cost_cents / 100,
    called_from: input.called_from,
    tenant_id: input.tenant_id,
    request_id: input.request_id,
    metadata: input.metadata,
  });
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Searchapi pricing — read flat rate from api_pricing_config                */
/* ──────────────────────────────────────────────────────────────────────── */

interface PricingRow {
  rate_per_unit_usd: number;
  monthly_quota_units: number | null;
}

let cachedSearchapiRate: { value: PricingRow; ts: number } | null = null;
const PRICING_CACHE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch Searchapi rate + quota from `api_pricing_config`. Cached for
 * 5 minutes; fall back to Developer-plan defaults if the table is
 * unreachable (offline tests, transient DB error).
 */
export async function getSearchapiPricing(): Promise<PricingRow> {
  const FALLBACK: PricingRow = { rate_per_unit_usd: 0.0099, monthly_quota_units: 10000 };

  if (cachedSearchapiRate && Date.now() - cachedSearchapiRate.ts < PRICING_CACHE_MS) {
    return cachedSearchapiRate.value;
  }

  const client = serviceClient();
  if (!client) return FALLBACK;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = client as any;
    const { data, error } = await db
      .from("api_pricing_config")
      .select("rate_per_unit_usd, monthly_quota_units, effective_from")
      .eq("provider", "searchapi")
      .eq("unit_type", "searches")
      .lte("effective_from", new Date().toISOString().slice(0, 10))
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return FALLBACK;

    const value: PricingRow = {
      rate_per_unit_usd: Number(data.rate_per_unit_usd),
      monthly_quota_units: data.monthly_quota_units ?? null,
    };
    cachedSearchapiRate = { value, ts: Date.now() };
    return value;
  } catch {
    return FALLBACK;
  }
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Searchapi wrapper                                                         */
/* ──────────────────────────────────────────────────────────────────────── */

export interface SearchapiGetInput {
  url: string;
  params: Record<string, string | number | undefined>;
  called_from: string;
  operation: string;
  tenant_id?: string | null;
}

/**
 * GET against Searchapi.io. Records one log row per successful response.
 * Throws on HTTP error (caller decides retry policy); does NOT log
 * failed calls (avoids paying for retries twice in the dashboard).
 */
export async function searchapiGet(input: SearchapiGetInput): Promise<unknown> {
  const url = new URL(input.url);
  for (const [k, v] of Object.entries(input.params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }

  const resp = await fetch(url.toString(), { method: "GET" });
  if (!resp.ok) {
    throw new Error(`Searchapi ${resp.status}: ${await resp.text()}`);
  }
  const json = await resp.json();

  const pricing = await getSearchapiPricing();
  void logApiCall({
    provider: "searchapi",
    operation: input.operation,
    model_or_actor: String(input.params.engine ?? "search"),
    units_consumed: 1,
    unit_type: "searches",
    cost_usd: pricing.rate_per_unit_usd,
    called_from: input.called_from,
    tenant_id: input.tenant_id,
    metadata: { engine: input.params.engine, q: input.params.q },
  });

  return json;
}
