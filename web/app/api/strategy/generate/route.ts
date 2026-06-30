/**
 * POST /api/strategy/generate
 *
 * The standalone Strategy Engine endpoint. Re-assembles the market inputs
 * SERVER-SIDE (never trusting the client), builds the tactic menu, runs the
 * grounded AI strategist (gpt-5.5 via STRATEGIST_MODEL) to SELECT tactics and
 * WRITE prose, maps the output into the deck's contract Strategy shape, and
 * returns it. Competitive landscape, opportunity counties, brand, and handoff
 * remain deterministic. The AI selects + writes; code owns every number.
 *
 * Errors: 400 invalid input · 401 unauth · 403 entitlement · 422 no data ·
 *         502 grounding failure · 504 LLM timeout · 500 config/internal.
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
import type { MeasuredChannel, OpportunityCounty } from "@/lib/strategy-engine/recommendations";
import {
  buildCompetitiveChannels,
  buildHandoff,
  leadMetricFor,
  primaryTort,
  validateInterview,
  readinessToFoundation,
  buildGoalText,
  type MarketCreative,
  type Strategy,
  type StrategyInterviewRequest,
} from "@/lib/strategy-engine/standalone";
import type { ChannelKey } from "@/lib/strategy-engine/types";
import { buildTacticMenu } from "@/lib/strategy-engine/tactic-scoring";
import { classifyGoal, budgetTierToMonthlyUsd } from "@/lib/strategy-engine/tactics";
import { buildStrategistOutput, GroundingError } from "@/lib/strategy-engine/strategist";
import { budgetTierToRange } from "@/lib/strategy-engine/campaign-handoff";
import {
  computeEconomics,
  economicsCaseType,
  resolveMarketTier,
  DEFAULT_LEVERS,
} from "@/lib/strategy-engine/economics";
import { fetchPiEconomicsBenchmark } from "@/lib/queries/pi-economics";
import { createOpenAICallModel, resolveStrategistModel } from "@/lib/strategy-engine/openai-strategist";
import {
  strategistToRecommendations,
  strategistToAllocation,
  strategistToProse,
  strategistToReadiness,
} from "@/lib/strategy-engine/strategist-to-strategy";

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
    assembleStrategyInputs(sb, state, { tortSlug, tortLabel, dmaCode: body.dma_code ?? null }),
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
      .select("dma_code, display_name, rank")
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

  const dmaRows =
    (dmaRes.data as Array<{ dma_code: string; display_name: string; rank: number | null }> | null) ?? [];
  const stateDmas = dmaRows.map((d) => d.dma_code);
  const selectedDma = body.dma_code ? dmaRows.find((d) => d.dma_code === body.dma_code) : null;
  const dmaLabel = selectedDma?.display_name ?? null;
  // Market-tier heuristic: the selected DMA's Nielsen rank, or — statewide — the
  // state's top-ranked DMA (dmaRows are ordered by rank ascending).
  const selectedDmaRank = selectedDma?.rank ?? dmaRows[0]?.rank ?? null;
  const marketLabel = dmaLabel ?? oppCounties[0]?.cbsa_title ?? `${inputs.state_name} statewide`;

  // ── Build the tactic menu (deterministic) ───────────────────────────────────
  const budgetMonthlyUsd = budgetTierToMonthlyUsd(body.budget_tier);
  const menu = buildTacticMenu(inputs, { goal: classifyGoal(body.goal), budgetMonthlyUsd });

  // ── Run the grounded strategist (AI selects + writes; code owns numbers) ─────
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  const llmStartedAt = Date.now();
  let usage = { input_tokens: 0, output_tokens: 0 };
  let strategistOut;
  try {
    strategistOut = await buildStrategistOutput({
      menu,
      promptFacts: {
        market_label: marketLabel,
        tort_label: tortLabel,
        voice: body.audience,
        goal_text: buildGoalText(body),
        recommended_tactic_count: menu.recommended_tactic_count,
        outlets: inputs.outlets,
        advertisers: inputs.top_advertisers,
        demographic_note: inputs.demographic_note ?? undefined,
      },
      groundingFacts: { outletNames: new Set(inputs.outlets.map((o) => o.name.toLowerCase())) },
      outlets: inputs.outlets,
      foundation: readinessToFoundation(body.readiness),
      confidence: menu.market_opportunity_intensity != null ? "moderate" : "directional",
      callModel: createOpenAICallModel({
        apiKey,
        signal: controller.signal,
        onUsage: (u) => { usage = u; },
      }),
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === "AbortError") {
      return NextResponse.json({ error: "AI service timed out" }, { status: 504 });
    }
    if (err instanceof GroundingError) {
      return NextResponse.json({ error: "AI response failed validation", errors: err.errors }, { status: 502 });
    }
    console.error("strategist error:", err);
    return NextResponse.json({ error: "Internal error generating strategy" }, { status: 500 });
  }
  clearTimeout(timeout);
  const latency_ms = Date.now() - llmStartedAt;

  const mapFacts = {
    market_label: marketLabel,
    top_advertiser: inputs.top_advertisers[0]?.name ?? null,
    opportunity_intensity: menu.market_opportunity_intensity,
  };
  const recommendations = strategistToRecommendations(strategistOut, menu, mapFacts, measured);
  const watch_list: { channel: ChannelKey; reason: string }[] = [];

  if (recommendations.length === 0) {
    return NextResponse.json(
      { error: "The strategist returned no usable tactics for this market/budget." },
      { status: 422 },
    );
  }

  const tracked = await trackCall(supabase, {
    user_id: user.id,
    firm_id: null,
    purpose: "strategy_engine",
    provider: "openai",
    model: resolveStrategistModel(),
    called_from: "api/strategy/generate",
    usage,
    latency_ms,
    meta: { state, tort: tortSlug, audience: body.audience, tactics: strategistOut.briefs.length, confidence: strategistOut.confidence },
  });

  // ── PI ad economics (budget → signed cases) ───────────────────────────────
  // Only the three motor-vehicle PI case types have economics coverage; others
  // (nursing_home/workers_comp/boating/general PI) omit the section honestly.
  let economics: Strategy["economics"] = null;
  const econCaseType = economicsCaseType(tortSlug);
  if (econCaseType) {
    const marketTier = resolveMarketTier(selectedDmaRank);
    const benchmark = await fetchPiEconomicsBenchmark(sb, econCaseType, marketTier);
    if (benchmark) {
      const range = budgetTierToRange(body.budget_tier);
      const monthly = range
        ? { min: range.min, max: range.max, mid: range.midpoint }
        : { min: budgetMonthlyUsd, max: budgetMonthlyUsd, mid: budgetMonthlyUsd };
      economics = {
        case_type: econCaseType,
        market_tier: marketTier,
        monthly_spend: monthly,
        benchmark,
        default_result: computeEconomics(benchmark, monthly.mid, DEFAULT_LEVERS),
      };
    }
  }

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
    readiness: strategistToReadiness(strategistOut, menu),
    integrated_plan: {
      allocation: strategistToAllocation(strategistOut),
      cadence: "always_on",
      funnel_emphasis: classifyGoal(body.goal) === "brand" ? "brand_led" : "conversion_led",
    },
    handoff: buildHandoff(tortSlug, body.dma_code ?? null, recommendations, stateDmas),
    prose: strategistToProse(strategistOut, mapFacts),
    confidence: strategistOut.confidence,
    data_warnings: [...dataErrors, ...strategistOut.warnings],
    cost_cents: tracked.cost_cents ?? null,
    economics,
  };
  return NextResponse.json(payload);
}
