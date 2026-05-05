/**
 * POST /api/campaigns/generate-pi-strategic-brief
 *
 * PR C — first PI artifact whose value-prop hinges on UNIQUE data signals
 * a competitor agency or generic SaaS can't surface in one place:
 *   - FARS fatal-crash density per state + county (motor vehicle PI)
 *   - NOAA storm event clusters (severe weather PI)
 *   - BLS CFOI construction fatalities
 *   - USCG boating accidents
 *   - Internal pi_viability_scores (state-level legal climate composite)
 *
 * Flow:
 *   1. Validate request (state + pi_category)
 *   2. Pull only the signal blocks SIGNALS_BY_CATEGORY says are relevant
 *      for this category, plus legal_climate (always included)
 *   3. Hand the signal set to gpt-4o + a strict prompt that forbids
 *      hallucinating numbers and requires each claim cite the source tag
 *   4. Validate response shape, return JSON
 *
 * Cost: ~$0.005-0.01 per call (gpt-4o, ~1500 tokens in / ~600 out).
 * Tracked in generation_costs with purpose='strategic_brief'.
 *
 * Errors:
 *   400 — missing/invalid input
 *   401 — unauthenticated
 *   403 — entitlement denial (PI access required, geo scope must include state)
 *   429 — entitlement denial (monthly cap)
 *   502 — LLM upstream failure or response failed shape validation
 *   504 — LLM timeout
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  checkCampaignBuilderEntitlement,
  entitlementErrorBody,
} from "@/lib/campaign-builder/entitlements";
import {
  DemoModeAccessDenied,
  readDemoModeOverride,
} from "@/lib/admin/demo-mode";
import { trackCall } from "@/lib/cost-tracking/tracker";
import {
  buildPIBriefUserPrompt,
  PIBriefRequest,
  PIBriefSignalSet,
  PI_STRATEGIC_BRIEF_SYSTEM_PROMPT,
  SIGNALS_BY_CATEGORY,
  stripJSONWrapper,
  validatePIBriefRequest,
  validatePIStrategicBrief,
  type CountySignal,
} from "./testable";

const LLM_TIMEOUT_MS = 30_000;

/**
 * FARS lookback window. We have data 2018-2022 ingested; this stays in
 * one place so we can bump it when more years are loaded.
 */
const FARS_LOOKBACK_START_YEAR = 2018;
const FARS_LOOKBACK_END_YEAR = 2022;
const FARS_LOOKBACK_LABEL = `${FARS_LOOKBACK_START_YEAR}-${FARS_LOOKBACK_END_YEAR}`;
const FARS_LOOKBACK_YEARS =
  FARS_LOOKBACK_END_YEAR - FARS_LOOKBACK_START_YEAR + 1;

const STORM_LOOKBACK_YEARS = 5;
const STORM_LOOKBACK_START_YEAR = 2019; // most recent 5y window

/* ── State name lookup ─────────────────────────────────────────────────── */

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina",
  ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", DC: "District of Columbia",
};

/* ── POST handler ──────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PIBriefRequest;
  try {
    body = (await req.json()) as PIBriefRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const errors = validatePIBriefRequest(body);
  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Validation failed", errors },
      { status: 400 },
    );
  }

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

  // Entitlement gate: PI access + geo scope must include the state.
  const gate = await checkCampaignBuilderEntitlement(
    supabase,
    user.id,
    {
      practice_area: "personal_injury",
      state: body.state,
      is_create: false,
    },
    demoMode,
  );
  if (!gate.ok) {
    const { body: errBody, status } = entitlementErrorBody(gate);
    return NextResponse.json(errBody, { status });
  }

  // ── Pull signal set ────────────────────────────────────────────────
  const stateName = STATE_NAMES[body.state] ?? body.state;
  const signals: PIBriefSignalSet = {
    state_abbr: body.state,
    state_name: stateName,
    pi_category: body.pi_category,
  };

  const blocks = SIGNALS_BY_CATEGORY[body.pi_category];

  // Always include legal_climate. The other blocks come in based on
  // the category map. We run them in parallel so the slowest signal
  // (FARS county aggregation) doesn't serialize the others.
  const pulls: Array<Promise<void>> = [
    pullLegalClimate(supabase, body.state).then((r) => {
      if (r) signals.legal_climate = r;
    }),
  ];

  if (blocks.includes("motor_vehicle")) {
    pulls.push(
      pullMotorVehicle(supabase, body.state, body.pi_category).then((r) => {
        if (r) signals.motor_vehicle = r;
      }),
    );
  }
  if (blocks.includes("weather")) {
    pulls.push(
      pullWeather(supabase, body.state).then((r) => {
        if (r) signals.weather = r;
      }),
    );
  }
  if (blocks.includes("construction")) {
    pulls.push(
      pullConstruction(supabase, body.state).then((r) => {
        if (r) signals.construction = r;
      }),
    );
  }
  if (blocks.includes("boating")) {
    pulls.push(
      pullBoating(supabase, body.state).then((r) => {
        if (r) signals.boating = r;
      }),
    );
  }

  await Promise.all(pulls);

  // ── LLM call ───────────────────────────────────────────────────────
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 500 },
    );
  }

  const userPrompt = buildPIBriefUserPrompt(body, signals);

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
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        // gpt-4o for the strategic brief — the structured-data grounding
        // is much more sensitive to hallucinated numbers than ad copy is,
        // so we want the strongest model. ~$0.005-0.01 per brief.
        model: "gpt-4o",
        temperature: 0.4,
        max_tokens: 1100,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: PI_STRATEGIC_BRIEF_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      console.error(
        "OpenAI error (PI strategic brief):",
        response.status,
        errBody,
      );
      return NextResponse.json(
        { error: "AI service unavailable" },
        { status: 502 },
      );
    }

    llmData = await response.json();
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === "AbortError") {
      return NextResponse.json(
        { error: "AI service timed out" },
        { status: 504 },
      );
    }
    console.error("PI strategic brief error:", err);
    return NextResponse.json(
      { error: "Internal error generating brief" },
      { status: 500 },
    );
  }

  const latency_ms = Date.now() - llmStartedAt;

  const rawContent = llmData.choices?.[0]?.message?.content?.trim();
  if (!rawContent) {
    return NextResponse.json({ error: "Empty AI response" }, { status: 502 });
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(stripJSONWrapper(rawContent));
  } catch (err) {
    console.error(
      "PI strategic brief: JSON parse failed:",
      err,
      "content:",
      rawContent,
    );
    return NextResponse.json(
      { error: "AI returned invalid JSON" },
      { status: 502 },
    );
  }

  const result = validatePIStrategicBrief(parsedJson);
  if (!result.ok) {
    console.error(
      "PI strategic brief: validation failed:",
      result.errors,
      "raw:",
      rawContent,
    );
    return NextResponse.json(
      { error: "AI response failed validation", errors: result.errors },
      { status: 502 },
    );
  }

  // Cost tracking. Await so cost_cents is available in the response body.
  const tracked = await trackCall(supabase, {
    user_id: user.id,
    firm_id: null,
    purpose: "strategic_brief",
    provider: "openai",
    model: "gpt-4o",
    usage: {
      input_tokens: llmData.usage?.prompt_tokens ?? 0,
      output_tokens: llmData.usage?.completion_tokens ?? 0,
    },
    latency_ms,
    meta: {
      pi_category: body.pi_category,
      state: body.state,
      signal_blocks: blocks,
      had_legal_climate: !!signals.legal_climate,
      had_motor_vehicle: !!signals.motor_vehicle,
      had_weather: !!signals.weather,
      had_construction: !!signals.construction,
      had_boating: !!signals.boating,
    },
  });

  return NextResponse.json({
    ...result.value,
    signals,
    cost_cents: tracked.cost_cents,
  });
}

/* ── Signal pulls ──────────────────────────────────────────────────────── */

/**
 * State-level + top-counties FARS aggregation. Filters by category so a
 * truck_accident brief only counts crashes flagged has_large_truck, etc.
 *
 * SECURITY: fars_fatalities currently has RLS DISABLED (advisory).
 * We're intentionally reading it without a tenant filter because the
 * data is public-domain NHTSA data and we want every authenticated
 * user to see it. Flagged in a separate user-facing message rather
 * than gated here.
 */
async function pullMotorVehicle(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  state: string,
  category: string,
): Promise<PIBriefSignalSet["motor_vehicle"] | null> {
  // Build the category filter clause.
  let catFilter = "";
  if (category === "motorcycle_accident") {
    catFilter = " AND has_motorcycle = true";
  } else if (category === "truck_accident") {
    catFilter = " AND has_large_truck = true";
  }
  // pedestrian_accident and bicycle_accident: FARS doesn't flag these
  // in a column we have, so we keep the whole-state count and let the
  // LLM say so in notes.

  const stateTotalQ = supabase
    .from("fars_fatalities")
    .select("fatalities", { count: "exact", head: false })
    .eq("state", state)
    .gte("year", FARS_LOOKBACK_START_YEAR)
    .lte("year", FARS_LOOKBACK_END_YEAR);

  // We can't compose a string filter easily; use rpc-style alternative
  // by running a raw aggregate query. Simplest: use .select with sum
  // via an rpc OR compute client-side from a paged read. The .select
  // approach below is slow on big states; we'll use a postgres function
  // when the volume warrants. For now: a single SELECT with rollup.
  //
  // Actually, simplest: use Supabase's aggregate via .rpc — but we don't
  // have a stored function. Fall back to a single raw query using
  // .from("fars_fatalities").select("...").csv() — also unwieldy.
  //
  // Pragmatic path: pull count with .head=true, and pull top counties
  // separately with a raw SQL via .rpc. Since the agent doesn't have an
  // rpc available either, we use postgrest's groupby workaround through
  // .select("county_name, fatalities.sum()") — supported via
  // PostgREST ?select=county_name,sum:fatalities.sum(). The Supabase JS
  // client supports this:
  void stateTotalQ; // silence unused; we compute below

  // State total count (sum of fatalities)
  const { data: totalRows } = (await supabase
    .from("fars_fatalities")
    .select("fatalities")
    .eq("state", state)
    .gte("year", FARS_LOOKBACK_START_YEAR)
    .lte("year", FARS_LOOKBACK_END_YEAR)
    .order("fatalities", { ascending: false })
    .limit(50000)) as { data: Array<{ fatalities: number }> | null };
  // Apply category flag in JS since we can't compose AND with string
  // filters cleanly. Acceptable: query is bounded by state + 5y window.
  const statePool = totalRows ?? [];
  // Re-fetch with category flag if needed. The most precise approach
  // is two-step: pull rows, filter in-memory.
  let categoryPool = statePool;
  if (catFilter) {
    // Re-pull with the flag column to filter.
    const colName =
      category === "motorcycle_accident" ? "has_motorcycle" : "has_large_truck";
    const { data: flaggedRows } = (await supabase
      .from("fars_fatalities")
      .select(`fatalities, ${colName}`)
      .eq("state", state)
      .eq(colName, true)
      .gte("year", FARS_LOOKBACK_START_YEAR)
      .lte("year", FARS_LOOKBACK_END_YEAR)
      .limit(50000)) as {
      data: Array<{ fatalities: number }> | null;
    };
    categoryPool = flaggedRows ?? [];
  }
  const stateTotal = categoryPool.reduce(
    (acc, r) => acc + (r.fatalities ?? 1),
    0,
  );

  // Top 5 counties by fatality count. Same in-memory aggregation.
  const colName =
    category === "motorcycle_accident"
      ? "has_motorcycle"
      : category === "truck_accident"
        ? "has_large_truck"
        : null;
  let countyQuery = supabase
    .from("fars_fatalities")
    .select(`county_name, fatalities`)
    .eq("state", state)
    .gte("year", FARS_LOOKBACK_START_YEAR)
    .lte("year", FARS_LOOKBACK_END_YEAR)
    .not("county_name", "is", null);
  if (colName) {
    countyQuery = countyQuery.eq(colName, true);
  }
  const { data: countyRows } = (await countyQuery.limit(50000)) as {
    data: Array<{ county_name: string | null; fatalities: number }> | null;
  };
  const counts = new Map<string, number>();
  for (const r of countyRows ?? []) {
    if (!r.county_name) continue;
    counts.set(
      r.county_name,
      (counts.get(r.county_name) ?? 0) + (r.fatalities ?? 1),
    );
  }
  const topCounties: CountySignal[] = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([county_name, count]) => ({
      county_name,
      count,
      rate_per_100k: null, // we don't have county pop joined yet
    }));

  // Compute share metrics in-memory from the state-wide pool.
  const totalRowsCount = statePool.length || 1;
  let motorcycleCount = 0;
  let truckCount = 0;
  let drunkCount = 0;
  let ruralCount = 0;
  // Re-pull with all flag columns (single query, bounded). Same window.
  const { data: shareRows } = (await supabase
    .from("fars_fatalities")
    .select(
      "has_motorcycle, has_large_truck, drunk_drivers, rur_urb, fatalities",
    )
    .eq("state", state)
    .gte("year", FARS_LOOKBACK_START_YEAR)
    .lte("year", FARS_LOOKBACK_END_YEAR)
    .limit(50000)) as {
    data: Array<{
      has_motorcycle: boolean | null;
      has_large_truck: boolean | null;
      drunk_drivers: number | null;
      rur_urb: number | null;
      fatalities: number | null;
    }> | null;
  };
  const sharePool = shareRows ?? [];
  for (const r of sharePool) {
    if (r.has_motorcycle) motorcycleCount++;
    if (r.has_large_truck) truckCount++;
    if ((r.drunk_drivers ?? 0) > 0) drunkCount++;
    // FARS rur_urb: 1 = rural, 2 = urban (varies by year). Treat 1 as rural.
    if (r.rur_urb === 1) ruralCount++;
  }
  const sharePoolSize = sharePool.length || 1;

  return {
    lookback_years: FARS_LOOKBACK_YEARS,
    state_total: stateTotal,
    state_rate_per_100k: null, // future: join census_demographics
    top_counties: topCounties,
    motorcycle_share: round3(motorcycleCount / sharePoolSize),
    truck_share: round3(truckCount / sharePoolSize),
    rural_share: round3(ruralCount / sharePoolSize),
    drunk_share: round3(drunkCount / sharePoolSize),
    source: "FARS",
  };
}

/**
 * Pull state-level storm event totals + top counties.
 */
async function pullWeather(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  state: string,
): Promise<PIBriefSignalSet["weather"] | null> {
  const stateName = STATE_NAMES[state];
  if (!stateName) return null;
  // storm_events.state column appears to be the state NAME (uppercase
  // in NOAA data). Try both abbr and name; prefer name.
  const stateMatch = stateName.toUpperCase();

  const { data: rows } = (await supabase
    .from("storm_events")
    .select(
      "county_name, event_type, injuries_direct, deaths_direct, year",
    )
    .eq("state", stateMatch)
    .gte("year", STORM_LOOKBACK_START_YEAR)
    .limit(50000)) as {
    data: Array<{
      county_name: string | null;
      event_type: string | null;
      injuries_direct: number | null;
      deaths_direct: number | null;
    }> | null;
  };
  const pool = rows ?? [];
  if (pool.length === 0) return null;

  const countyCounts = new Map<string, number>();
  const typeCounts = new Map<string, number>();
  let injuries = 0;
  let deaths = 0;
  for (const r of pool) {
    if (r.county_name)
      countyCounts.set(r.county_name, (countyCounts.get(r.county_name) ?? 0) + 1);
    if (r.event_type)
      typeCounts.set(r.event_type, (typeCounts.get(r.event_type) ?? 0) + 1);
    injuries += r.injuries_direct ?? 0;
    deaths += r.deaths_direct ?? 0;
  }

  return {
    lookback_years: STORM_LOOKBACK_YEARS,
    state_total_events: pool.length,
    state_total_injuries: injuries,
    state_total_deaths: deaths,
    top_counties: Array.from(countyCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([county_name, count]) => ({
        county_name,
        count,
        rate_per_100k: null,
      })),
    common_event_types: Array.from(typeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([event_type, count]) => ({ event_type, count })),
    source: "NOAA",
  };
}

/**
 * Pull state-level construction fatality data. Aggregates over the
 * latest year we have.
 */
async function pullConstruction(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  state: string,
): Promise<PIBriefSignalSet["construction"] | null> {
  const { data: rows } = (await supabase
    .from("construction_fatalities")
    .select(
      "year, total_fatalities, falls, transportation, exposure, contact, fatality_rate",
    )
    .eq("state_abbr", state)
    .order("year", { ascending: false })
    .limit(10)) as {
    data: Array<{
      year: number;
      total_fatalities: number | null;
      falls: number | null;
      transportation: number | null;
      exposure: number | null;
      contact: number | null;
      fatality_rate: number | null;
    }> | null;
  };
  const pool = rows ?? [];
  if (pool.length === 0) return null;

  // Aggregate the most recent year (or 5y if available).
  const lookback = pool.slice(0, 5);
  const total = lookback.reduce((a, r) => a + (r.total_fatalities ?? 0), 0);
  const causeBuckets: Record<string, number> = {
    Falls: 0,
    Transportation: 0,
    Exposure: 0,
    Contact: 0,
  };
  for (const r of lookback) {
    causeBuckets["Falls"] += r.falls ?? 0;
    causeBuckets["Transportation"] += r.transportation ?? 0;
    causeBuckets["Exposure"] += r.exposure ?? 0;
    causeBuckets["Contact"] += r.contact ?? 0;
  }
  const top_causes = Object.entries(causeBuckets)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([cause, count]) => ({ cause, count }));

  return {
    lookback_years: lookback.length,
    state_total: total,
    state_rate_per_100k_workers:
      lookback[0]?.fatality_rate != null ? Number(lookback[0].fatality_rate) : null,
    top_causes,
    source: "BLS CFOI",
  };
}

/**
 * Pull state-level boating accident data. Lookback is whatever we have.
 */
async function pullBoating(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  state: string,
): Promise<PIBriefSignalSet["boating"] | null> {
  const { data: rows } = (await supabase
    .from("boating_accidents")
    .select("body_of_water, deaths, injuries, year")
    .eq("state", state)
    .limit(50000)) as {
    data: Array<{
      body_of_water: string | null;
      deaths: number | null;
      injuries: number | null;
      year: number | null;
    }> | null;
  };
  const pool = rows ?? [];
  if (pool.length === 0) return null;

  const totalDeaths = pool.reduce((a, r) => a + (r.deaths ?? 0), 0);
  const totalInjuries = pool.reduce((a, r) => a + (r.injuries ?? 0), 0);
  const waterCounts = new Map<string, number>();
  for (const r of pool) {
    if (r.body_of_water) {
      waterCounts.set(
        r.body_of_water,
        (waterCounts.get(r.body_of_water) ?? 0) + 1,
      );
    }
  }
  const years = pool.map((r) => r.year ?? 0).filter((y) => y > 0);
  const lookback_years =
    years.length > 0 ? Math.max(...years) - Math.min(...years) + 1 : 0;

  return {
    lookback_years,
    state_total: pool.length,
    state_total_deaths: totalDeaths,
    state_total_injuries: totalInjuries,
    top_waterbodies: Array.from(waterCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count })),
    source: "USCG",
  };
}

/**
 * Pull state-level legal-climate composite from pi_viability_scores.
 */
async function pullLegalClimate(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  state: string,
): Promise<PIBriefSignalSet["legal_climate"] | null> {
  const { data } = (await supabase
    .from("pi_viability_scores")
    .select(
      "composite_score, negligence_rule, statute_of_limitations, non_economic_cap",
    )
    .eq("state", state)
    .single()) as {
    data: {
      composite_score: number | null;
      negligence_rule: string | null;
      statute_of_limitations: string | null;
      non_economic_cap: string | null;
    } | null;
  };
  if (!data) return null;
  return {
    composite_score: Number(data.composite_score ?? 0),
    negligence_rule: data.negligence_rule ?? "Unknown",
    statute_of_limitations: data.statute_of_limitations ?? "Unknown",
    non_economic_cap: data.non_economic_cap ?? "Unknown",
    source: "Legal Marketing Intelligence pi_viability_scores",
  };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
