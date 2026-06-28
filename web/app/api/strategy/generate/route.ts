/**
 * POST /api/strategy/generate
 *
 * The standalone Strategy Engine endpoint. Re-assembles the market inputs
 * SERVER-SIDE (never trusting the client), runs the deterministic core
 * (scorer → channel planner → recommendation assembler), asks gpt-4o to NARRATE
 * the fixed plan in the chosen voice, and returns the contract `Strategy`
 * object the deck renders.
 *
 * Reuses the proven state-page engine route for auth / entitlement / LLM / cost,
 * and adds the two PR-1 layer RPCs + buildRecommendations + composeStrategy.
 *
 * Errors: 400 invalid input · 401 unauth · 403 entitlement · 422 no data ·
 *         502 LLM/validation · 504 LLM timeout.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  checkCampaignBuilderEntitlement,
  entitlementErrorBody,
} from "@/lib/campaign-builder/entitlements";
import { DemoModeAccessDenied, readDemoModeOverride } from "@/lib/admin/demo-mode";
import { trackCall } from "@/lib/cost-tracking/tracker";
import { assembleStrategyInputs } from "@/lib/strategy-engine/assemble-inputs";
import { detectGorilla, scoreArchetypes } from "@/lib/strategy-engine/archetypes";
import { buildStrategyPlan } from "@/lib/strategy-engine/channel-plan";
import { buildRecommendations } from "@/lib/strategy-engine/recommendations";
import type { MeasuredChannel, OpportunityCounty } from "@/lib/strategy-engine/recommendations";
import {
  STRATEGY_SYSTEM_PROMPT,
  buildStrategyUserPrompt,
  stripJSONWrapper,
  validateStrategyProse,
} from "@/lib/strategy-engine/prompt";
import {
  buildCompetitiveChannels,
  buildHandoff,
  buildIntegratedPlan,
  leadMetricFor,
  primaryTort,
  validateInterview,
  type MarketCreative,
  type Strategy,
  type StrategyInterviewRequest,
} from "@/lib/strategy-engine/standalone";
import type { ChannelKey } from "@/lib/strategy-engine/types";

export const runtime = "nodejs";

const LLM_TIMEOUT_MS = 30_000;

const DEFAULT_BRAND = {
  company_name: "Legal Marketing Intelligence",
  logo_url: null as string | null,
  primary_color: "#1A8C96",
  accent_color: "#3FBEC8",
};

/** White-label: the caller's tenant brand, for the deck (agency-facing). */
async function resolveBrand(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<typeof DEFAULT_BRAND> {
  try {
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", userId).maybeSingle();
    const tenantId = (profile as { tenant_id?: string } | null)?.tenant_id;
    if (!tenantId) return DEFAULT_BRAND;
    const { data: b } = await supabase
      .from("tenant_branding")
      .select("company_name, logo_url, primary_color, accent_color")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!b) return DEFAULT_BRAND;
    return {
      company_name: b.company_name ?? DEFAULT_BRAND.company_name,
      logo_url: b.logo_url ?? null,
      primary_color: b.primary_color ?? DEFAULT_BRAND.primary_color,
      accent_color: b.accent_color ?? DEFAULT_BRAND.accent_color,
    };
  } catch {
    return DEFAULT_BRAND;
  }
}

/** strategy_whitespace_channels returns 'paid_search'/'seo'; map the buyable one. */
function toChannelKey(channel: string): ChannelKey | null {
  return channel === "paid_search" ? "search" : null; // seo has no buyable ChannelKey
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: StrategyInterviewRequest;
  try {
    body = (await req.json()) as StrategyInterviewRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const errors = validateInterview(body);
  if (errors.length > 0) {
    return NextResponse.json({ error: "Validation failed", errors }, { status: 400 });
  }
  const state = body.state.toUpperCase();
  const { slug: tortSlug, label: tortLabel } = primaryTort(body.case_types);

  // Demo-mode override (super_admin only).
  let demoMode;
  try {
    demoMode = await readDemoModeOverride(supabase, req, user.id);
  } catch (e) {
    if (e instanceof DemoModeAccessDenied) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    throw e;
  }

  // Entitlement: PI access + geo scope must include the state.
  const gate = await checkCampaignBuilderEntitlement(
    supabase,
    user.id,
    { practice_area: "personal_injury", state, is_create: false },
    demoMode,
  );
  if (!gate.ok) {
    const { body: errBody, status } = entitlementErrorBody(gate);
    return NextResponse.json(errBody, { status });
  }

  // ── Assemble inputs + the two new layer summaries (server-side) ──────────
  const sb = supabase as unknown as Parameters<typeof assembleStrategyInputs>[0];
  const [{ inputs, errors: dataErrors }, oppRes, wsRes, dmaRes, creativesRes] = await Promise.all([
    assembleStrategyInputs(sb, state, { tortSlug, tortLabel }),
    sb.rpc("strategy_opportunity_counties", {
      p_state: state,
      p_fips_full: body.county_fips ?? null,
    }),
    sb.rpc("strategy_whitespace_channels", {
      p_state: state,
      p_dma_code: body.dma_code ?? null,
      p_tort_slug: tortSlug,
    }),
    sb
      .from("dma_markets")
      .select("dma_code, display_name")
      .contains("states_covered", [state])
      .order("rank", { ascending: true }),
    sb.rpc("strategy_market_creatives", {
      p_state: state,
      p_dma_code: body.dma_code ?? null,
      p_limit_per: 3,
    }),
  ]);

  if (inputs.channels.length === 0 && !inputs.local_signal) {
    return NextResponse.json(
      { error: "Not enough market data to build a strategy for this state yet." },
      { status: 422 },
    );
  }

  const oppCounties = ((oppRes.data as OpportunityCounty[] | null) ?? []).map((c) => ({
    county_name: c.county_name,
    cbsa_title: c.cbsa_title,
    total_population: c.total_population,
    pct_with_internet: c.pct_with_internet,
    total_fatalities: Number(c.total_fatalities) || 0,
    truck_fatalities: Number(c.truck_fatalities) || 0,
    motorcycle_fatalities: Number(c.motorcycle_fatalities) || 0,
    deaths_per_100k: c.deaths_per_100k,
  }));
  const farsYearMin = (oppRes.data as Array<{ fars_year_min: number | null }> | null)?.[0]?.fars_year_min ?? null;
  const farsYearMax = (oppRes.data as Array<{ fars_year_max: number | null }> | null)?.[0]?.fars_year_max ?? null;
  const leadMetric = leadMetricFor(body.case_types);

  const wsRows = (wsRes.data as Array<{ channel: string; active_firms: number; status: string }> | null) ?? [];
  const measured: MeasuredChannel[] = wsRows
    .map((r) => {
      const key = toChannelKey(r.channel);
      return key
        ? ({ channel: key, active_firms: Number(r.active_firms) || 0, status: r.status as MeasuredChannel["status"] })
        : null;
    })
    .filter((m): m is MeasuredChannel => m !== null);
  const seoRow = wsRows.find((r) => r.channel === "seo");

  const stateDmas = ((dmaRes.data as Array<{ dma_code: string; display_name: string }> | null) ?? []).map(
    (d) => d.dma_code,
  );
  const dmaLabel = body.dma_code
    ? ((dmaRes.data as Array<{ dma_code: string; display_name: string }> | null) ?? []).find(
        (d) => d.dma_code === body.dma_code,
      )?.display_name
    : null;
  const marketLabel = dmaLabel ?? oppCounties[0]?.cbsa_title ?? `${inputs.state_name} statewide`;

  // ── Deterministic core ───────────────────────────────────────────────────
  const gorilla = detectGorilla(inputs.top_advertisers);
  const scored = scoreArchetypes(inputs);
  const chosen = scored.find((a) => !a.locked_out) ?? scored[0];
  const plan = buildStrategyPlan(inputs, chosen, gorilla);

  const { recommendations, watch_list } = buildRecommendations(
    plan.channel_plan,
    { counties: oppCounties, market_label: marketLabel, lead_metric: leadMetric, fars_year_min: farsYearMin, fars_year_max: farsYearMax },
    measured,
  );

  // ── LLM (writer only) ─────────────────────────────────────────────────────
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  const llmStartedAt = Date.now();
  let llmData: {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.4,
        max_tokens: 1100,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: STRATEGY_SYSTEM_PROMPT },
          { role: "user", content: buildStrategyUserPrompt(plan, body.audience) },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("OpenAI error (strategy):", response.status, errText);
      return NextResponse.json({ error: "AI service unavailable" }, { status: 502 });
    }
    llmData = await response.json();
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === "AbortError") {
      return NextResponse.json({ error: "AI service timed out" }, { status: 504 });
    }
    console.error("strategy generate error:", err);
    return NextResponse.json({ error: "Internal error generating strategy" }, { status: 500 });
  }

  const latency_ms = Date.now() - llmStartedAt;
  const rawContent = llmData.choices?.[0]?.message?.content?.trim();
  if (!rawContent) return NextResponse.json({ error: "Empty AI response" }, { status: 502 });

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(stripJSONWrapper(rawContent));
  } catch {
    return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 502 });
  }
  const proseResult = validateStrategyProse(parsedJson);
  if (!proseResult.ok) {
    return NextResponse.json({ error: "AI response failed validation", errors: proseResult.errors }, { status: 502 });
  }

  const tracked = await trackCall(supabase, {
    user_id: user.id,
    firm_id: null,
    purpose: "strategy_engine",
    provider: "openai",
    model: "gpt-4o",
    called_from: "api/strategy/generate",
    usage: {
      input_tokens: llmData.usage?.prompt_tokens ?? 0,
      output_tokens: llmData.usage?.completion_tokens ?? 0,
    },
    latency_ms,
    meta: { state, tort: tortSlug, audience: body.audience, archetype: chosen.key, confidence: plan.confidence },
  });

  // ── Compose the contract Strategy object ──────────────────────────────────
  const competitiveChannels = buildCompetitiveChannels(measured, recommendations);
  if (seoRow) {
    competitiveChannels.push({
      channel: "seo",
      label: "Organic SEO",
      active_firms: Number(seoRow.active_firms) || 0,
      status: seoRow.status as "open" | "contested" | "defended",
      measured: true,
    });
  }

  const payload: Strategy = {
    brand: await resolveBrand(supabase, user.id),
    audience: body.audience,
    market: { state, label: marketLabel, dma_code: body.dma_code ?? null },
    case_types: body.case_types,
    budget_tier: body.budget_tier,
    goal: body.goal,
    opportunity: { counties: oppCounties, fars_year_min: farsYearMin, fars_year_max: farsYearMax, lead_metric: leadMetric },
    competitive: {
      advertisers: inputs.top_advertisers.map((a) => ({ name: a.name, share: a.share, rank: a.rank })),
      channels: competitiveChannels,
      creative: ((creativesRes.data as MarketCreative[] | null) ?? []).map((c) => ({
        channel: c.channel,
        format_label: c.format_label,
        advertiser: c.advertiser,
        advertiser_domain: c.advertiser_domain,
        headline: c.headline,
        body: c.body,
        image_url: c.image_url,
        link: c.link,
      })),
    },
    recommendations,
    watch_list,
    integrated_plan: {
      allocation: buildIntegratedPlan(plan.channel_plan),
      cadence: plan.channel_plan.cadence,
      funnel_emphasis: plan.channel_plan.funnel,
    },
    handoff: buildHandoff(tortSlug, body.dma_code ?? null, recommendations, stateDmas),
    prose: proseResult.value,
    confidence: plan.confidence,
    data_warnings: dataErrors,
    cost_cents: tracked.cost_cents ?? null,
  };
  return NextResponse.json(payload);
}
