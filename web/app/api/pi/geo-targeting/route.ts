/**
 * GET /api/pi/geo-targeting
 *
 * PR D — county- and metro-level FARS-grounded geo-targeting report.
 * Pairs with the strategic brief (PR C): the brief tells the story,
 * this endpoint hands the user a list of counties + metros they can
 * paste into Google Ads / DV360 / Meta geo-targeting.
 *
 * Query params:
 *   state         — 2-letter state code (e.g. "AL")
 *   pi_category   — motor-vehicle PI category (car/truck/motorcycle/
 *                   pedestrian/bicycle). Other categories return 400 —
 *                   FARS only covers motor-vehicle.
 *   format=csv    — optional: stream CSV instead of JSON
 *
 * Why GET (vs the strategic brief's POST): no LLM call, no firm or
 * cost attribution, idempotent. A future Vercel edge cache could
 * memoize this for free.
 *
 * Errors:
 *   400 — missing/invalid input
 *   401 — unauthenticated
 *   403 — entitlement denial (PI access required, geo scope must include state)
 *   500 — DB read failed
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
import {
  aggregateCounties,
  aggregateMetros,
  CrosswalkRowMin,
  FARS_FLAG_COLUMN_BY_CATEGORY,
  FarsRowMin,
  GeoTargetingReport,
  reportToCsv,
  validateGeoTargetingQuery,
} from "./testable";
import type { PICategory } from "@/lib/campaign-builder/pi-templates/types";

/**
 * FARS lookback window. Same constants as the strategic-brief route so
 * users see consistent numbers across the two surfaces.
 */
const FARS_LOOKBACK_START_YEAR = 2018;
const FARS_LOOKBACK_END_YEAR = 2022;
const FARS_LOOKBACK_LABEL = `${FARS_LOOKBACK_START_YEAR}-${FARS_LOOKBACK_END_YEAR}`;
const FARS_LOOKBACK_YEARS =
  FARS_LOOKBACK_END_YEAR - FARS_LOOKBACK_START_YEAR + 1;

/**
 * Big states (TX, CA, FL) can have 5-10K+ rows in a 5-year FARS window.
 * The aggregation is in-memory; cap the page-size to avoid run-away
 * memory if FARS data ever balloons. 50K rows × ~80 bytes = 4MB working
 * set, well within Vercel function limits.
 */
const FARS_ROW_LIMIT = 50_000;

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

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const state = (url.searchParams.get("state") ?? "").toUpperCase();
  const pi_category = (url.searchParams.get("pi_category") ?? "") as PICategory;
  const format = url.searchParams.get("format") ?? "json";

  const errors = validateGeoTargetingQuery({ state, pi_category });
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

  // Entitlement gate: PI access + geo scope must include state.
  const gate = await checkCampaignBuilderEntitlement(
    supabase,
    user.id,
    {
      practice_area: "personal_injury",
      state,
      is_create: false,
    },
    demoMode,
  );
  if (!gate.ok) {
    const { body: errBody, status } = entitlementErrorBody(gate);
    return NextResponse.json(errBody, { status });
  }

  // ── Pull FARS rows ─────────────────────────────────────────────────
  // Build the SELECT once. We always read every flag column because the
  // aggregator computes shares regardless of category, and reading 4
  // extra small columns is cheaper than two round-trips.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  let farsQuery = db
    .from("fars_fatalities")
    .select(
      "county_name, state_fips, county_fips, fatalities, has_motorcycle, has_large_truck, drunk_drivers, rur_urb",
    )
    .eq("state", state)
    .gte("year", FARS_LOOKBACK_START_YEAR)
    .lte("year", FARS_LOOKBACK_END_YEAR)
    .limit(FARS_ROW_LIMIT);

  // Apply category-specific filter at the SQL layer when the FARS table
  // has a column flag for it (motorcycle / large truck). Other PI
  // categories fall through to all motor-vehicle crashes.
  const flagColumn = FARS_FLAG_COLUMN_BY_CATEGORY[pi_category];
  if (flagColumn) {
    farsQuery = farsQuery.eq(flagColumn, true);
  }

  const { data: farsRows, error: farsErr } = (await farsQuery) as {
    data: FarsRowMin[] | null;
    error: { message: string } | null;
  };
  if (farsErr) {
    console.error("geo-targeting: FARS read failed:", farsErr.message);
    return NextResponse.json(
      { error: "Failed to load FARS data" },
      { status: 500 },
    );
  }
  const rows = farsRows ?? [];

  // ── Pull crosswalk for this state ──────────────────────────────────
  const { data: xwalkRows, error: xwalkErr } = (await db
    .from("county_msa_crosswalk")
    .select("fips_full, state_abbr, county_name, cbsa_code, cbsa_title")
    .eq("state_abbr", state)) as {
    data: CrosswalkRowMin[] | null;
    error: { message: string } | null;
  };
  if (xwalkErr) {
    console.error("geo-targeting: crosswalk read failed:", xwalkErr.message);
    // Non-fatal: we still produce per-county data, just without metro
    // roll-ups.
  }
  const xwalk = xwalkRows ?? [];

  // ── Aggregate ──────────────────────────────────────────────────────
  const counties = aggregateCounties(rows, xwalk, state);
  const metros = aggregateMetros(counties, state);

  const stateTotal = counties.reduce((acc, c) => acc + c.fatal_crashes, 0);

  const report: GeoTargetingReport = {
    state_abbr: state,
    state_name: STATE_NAMES[state] ?? state,
    pi_category,
    lookback_label: FARS_LOOKBACK_LABEL,
    lookback_years: FARS_LOOKBACK_YEARS,
    source: xwalk.length > 0 ? "FARS + county_msa_crosswalk" : "FARS",
    state_total_fatal_crashes: stateTotal,
    counties,
    metros,
    notes:
      counties.length === 0
        ? `No FARS rows for ${pi_category} in ${state} between ${FARS_LOOKBACK_LABEL}.`
        : undefined,
  };

  // ── Output: CSV or JSON ────────────────────────────────────────────
  if (format === "csv") {
    const csv = reportToCsv(report);
    const filename = `pi-geo-${state}-${pi_category}-${FARS_LOOKBACK_LABEL}.csv`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  return NextResponse.json(report);
}
