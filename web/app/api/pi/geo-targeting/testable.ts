/**
 * Testable internals for the PI geo-targeting endpoint (PR D).
 *
 * Returns a county-level + metro-roll-up ranking for a given (state,
 * pi_category) pair, grounded in FARS fatal-crash data plus our internal
 * county_msa_crosswalk. The output is meant to be:
 *
 *   1. Renderable as sortable tables in the dedicated UI
 *   2. Slim-summarizable into the campaign builder card
 *   3. Exportable as a CSV the user can paste into Google Ads / DV360
 *
 * Why not call the strategic-brief route's signal pulls: those return
 * narrative-shaped data (top 5 + share metrics). The geo report needs
 * the FULL county list (15-30+ rows in big states) for the table, and
 * the MSA roll-up which the brief doesn't expose. Different shape ⇒
 * different endpoint.
 *
 * Population-rate normalization is INTENTIONALLY DEFERRED for v1.
 * We have census_demographics by county; layering rate per 100K is a
 * follow-up (PR D.5). For now the table shows raw counts plus the FARS
 * source tag — honest, defensible, and matches what most agencies see.
 */

import type { PICategory } from "@/lib/campaign-builder/pi-templates/types";

/* ── Public types ──────────────────────────────────────────────────────── */

/**
 * One county row for the FARS-backed PI geo report.
 *
 * `priority` is a bucketed label we compute server-side off the count
 * distribution so the UI can color-code without re-doing the math:
 *   - "high"   — top quartile
 *   - "medium" — 50th-75th percentile
 *   - "low"    — bottom half
 *
 * Rank is 1-based. Ties broken by county_name alphabetical.
 */
export interface GeoTargetCountyRow {
  rank: number;
  county_name: string;
  fips_full: string | null;
  state_abbr: string;
  fatal_crashes: number;
  motorcycle_share: number;
  truck_share: number;
  drunk_share: number;
  rural_share: number;
  cbsa_code: string | null;
  cbsa_title: string | null;
  priority: "high" | "medium" | "low";
}

/**
 * One CBSA / metro roll-up — sum of every county that maps to this CBSA.
 * Some counties don't belong to any CBSA (rural / non-metro); they are
 * still included in the per-county table but excluded from this roll-up.
 */
export interface GeoTargetMetroRow {
  rank: number;
  cbsa_code: string;
  cbsa_title: string;
  state_abbr: string;
  fatal_crashes: number;
  county_count: number;
  /** Comma-joined preview of top counties in this CBSA, max 3. */
  county_preview: string;
  priority: "high" | "medium" | "low";
}

export interface GeoTargetingReport {
  state_abbr: string;
  state_name: string;
  pi_category: PICategory;
  lookback_label: string;
  lookback_years: number;
  /** Source tag for footer / CSV. */
  source: "FARS" | "FARS + county_msa_crosswalk";
  state_total_fatal_crashes: number;
  /** Full sorted list (highest first). UI can paginate or show all. */
  counties: GeoTargetCountyRow[];
  /** Sorted metro roll-up (highest first). */
  metros: GeoTargetMetroRow[];
  /** Optional caveat (e.g. "no rows for this state/category"). */
  notes?: string;
}

/* ── Category filter helper ────────────────────────────────────────────── */

/**
 * Some PI categories map to a FARS column flag. Others (pedestrian,
 * bicycle) don't have a flag column — we still return the full state
 * fatal-crash data because that's the closest signal we have, and the
 * UI labels the category clearly so users aren't misled.
 *
 * Keeping this map exported so route + tests + future callers agree on
 * which categories actually filter and which fall back to "all crashes".
 */
export const FARS_FLAG_COLUMN_BY_CATEGORY: Partial<
  Record<PICategory, "has_motorcycle" | "has_large_truck">
> = {
  motorcycle_accident: "has_motorcycle",
  truck_accident: "has_large_truck",
  // car_accident: no flag — all FARS rows are car-involved by default
  // pedestrian_accident, bicycle_accident: no FARS flag, fall through
};

export const SUPPORTED_PI_CATEGORIES: ReadonlySet<PICategory> = new Set([
  "car_accident",
  "truck_accident",
  "motorcycle_accident",
  "pedestrian_accident",
  "bicycle_accident",
]);

/* ── Request validation ────────────────────────────────────────────────── */

export interface GeoTargetingQuery {
  state: string;
  pi_category: PICategory;
}

export function validateGeoTargetingQuery(q: GeoTargetingQuery): string[] {
  const errors: string[] = [];
  if (!q.state || !/^[A-Z]{2}$/.test(q.state)) {
    errors.push("state is required (2-letter uppercase state code)");
  }
  if (!q.pi_category) {
    errors.push("pi_category is required");
  } else if (!SUPPORTED_PI_CATEGORIES.has(q.pi_category)) {
    errors.push(
      `pi_category '${q.pi_category}' is not supported by geo-targeting (motor-vehicle categories only for v1)`,
    );
  }
  return errors;
}

/* ── Aggregation helpers (pure, unit-tested) ───────────────────────────── */

/**
 * Single FARS row shape we read from Supabase. `fatalities` is the count
 * of deaths in this incident; we sum across rows. `county_name` can be
 * null for rows where FARS didn't resolve the county; those rows roll up
 * into a special "Unknown county" bucket the UI hides by default.
 */
export interface FarsRowMin {
  county_name: string | null;
  state_fips: number | null;
  county_fips: number | null;
  fatalities: number | null;
  has_motorcycle: boolean | null;
  has_large_truck: boolean | null;
  drunk_drivers: number | null;
  rur_urb: number | null;
}

/**
 * One row from county_msa_crosswalk. fips_full is the 5-digit string
 * (state*1000 + county); we build the same on the FARS side and join
 * in-memory.
 */
export interface CrosswalkRowMin {
  fips_full: string | null;
  state_abbr: string | null;
  county_name: string | null;
  cbsa_code: string | null;
  cbsa_title: string | null;
}

/**
 * Build a 5-digit FIPS string from numeric state + county FIPS as they
 * come back from the FARS table.
 *
 * FARS uses BIG-ENDIAN style: state_fips is 1-2 digits, county_fips is
 * 1-3 digits. We zero-pad both. Returns null if either is missing.
 */
export function buildFipsFull(
  stateFips: number | null,
  countyFips: number | null,
): string | null {
  if (stateFips == null || countyFips == null) return null;
  if (countyFips === 0) return null; // FARS uses 0 for "unknown county"
  const s = String(stateFips).padStart(2, "0");
  const c = String(countyFips).padStart(3, "0");
  return s + c;
}

/**
 * Aggregate FARS rows into the per-county table. Counts every row with
 * a usable county_name, sums fatalities, computes per-county shares
 * (motorcycle / truck / drunk / rural).
 *
 * Returns counties sorted by fatal_crashes DESC, county_name ASC for
 * tiebreaks. Priority bucketing is applied at the END after sorting.
 */
export function aggregateCounties(
  rows: FarsRowMin[],
  crosswalk: CrosswalkRowMin[],
  stateAbbr: string,
): GeoTargetCountyRow[] {
  // Build a fips -> crosswalk map. Crosswalk rows already filter to
  // this state at the SQL layer.
  const xwalkByFips = new Map<string, CrosswalkRowMin>();
  for (const x of crosswalk) {
    if (x.fips_full) xwalkByFips.set(x.fips_full, x);
  }

  interface Bucket {
    fips_full: string | null;
    county_name: string;
    crashes: number;
    motorcycle: number;
    truck: number;
    drunk: number;
    rural: number;
  }
  const byKey = new Map<string, Bucket>();

  for (const r of rows) {
    const fips = buildFipsFull(r.state_fips, r.county_fips);
    const name = r.county_name?.trim() || "";
    if (!name) continue; // skip "unknown county" rows
    // Key on fips when available (handles county-name spelling
    // inconsistencies like "DeKalb" vs "De Kalb"); fall back to name.
    const key = fips ?? `name:${name.toLowerCase()}`;
    let b = byKey.get(key);
    if (!b) {
      b = {
        fips_full: fips,
        county_name: name,
        crashes: 0,
        motorcycle: 0,
        truck: 0,
        drunk: 0,
        rural: 0,
      };
      byKey.set(key, b);
    }
    // Each FARS row represents one fatal crash; fatalities can be > 1
    // (multiple deaths in one crash). For "fatal_crashes" we count rows.
    // Shares are computed as (rows with flag) / total rows in the county.
    b.crashes += 1;
    if (r.has_motorcycle) b.motorcycle += 1;
    if (r.has_large_truck) b.truck += 1;
    if ((r.drunk_drivers ?? 0) > 0) b.drunk += 1;
    if (r.rur_urb === 1) b.rural += 1;
  }

  // Convert + sort.
  const items = Array.from(byKey.values()).map((b) => {
    const xw = b.fips_full ? xwalkByFips.get(b.fips_full) : null;
    return {
      bucket: b,
      cbsa_code: xw?.cbsa_code ?? null,
      cbsa_title: xw?.cbsa_title ?? null,
    };
  });

  items.sort((a, b) => {
    if (b.bucket.crashes !== a.bucket.crashes) {
      return b.bucket.crashes - a.bucket.crashes;
    }
    return a.bucket.county_name.localeCompare(b.bucket.county_name);
  });

  // Priority buckets — quartile on the SORTED list. Edge case: when
  // there are fewer than 4 counties, just label them all "high" so the
  // UI doesn't show a misleading "low" tag for the only county.
  const total = items.length;
  const top25 = Math.max(1, Math.ceil(total * 0.25));
  const top50 = Math.max(1, Math.ceil(total * 0.5));
  const priorityFor = (idx: number): "high" | "medium" | "low" => {
    if (total <= 3) return "high";
    if (idx < top25) return "high";
    if (idx < top50) return "medium";
    return "low";
  };

  return items.map((it, i) => ({
    rank: i + 1,
    county_name: it.bucket.county_name,
    fips_full: it.bucket.fips_full,
    state_abbr: stateAbbr,
    fatal_crashes: it.bucket.crashes,
    motorcycle_share: round3(it.bucket.motorcycle / it.bucket.crashes),
    truck_share: round3(it.bucket.truck / it.bucket.crashes),
    drunk_share: round3(it.bucket.drunk / it.bucket.crashes),
    rural_share: round3(it.bucket.rural / it.bucket.crashes),
    cbsa_code: it.cbsa_code,
    cbsa_title: it.cbsa_title,
    priority: priorityFor(i),
  }));
}

/**
 * Roll counties up by CBSA (metro area). Counties with no CBSA are
 * excluded from the roll-up entirely (a CBSA roll-up of one rural
 * county isn't meaningful — the per-county table already shows it).
 *
 * Returns metros sorted by total fatal_crashes DESC.
 */
export function aggregateMetros(
  counties: GeoTargetCountyRow[],
  stateAbbr: string,
): GeoTargetMetroRow[] {
  interface MetroBucket {
    cbsa_code: string;
    cbsa_title: string;
    crashes: number;
    counties: GeoTargetCountyRow[];
  }
  const byCbsa = new Map<string, MetroBucket>();

  for (const c of counties) {
    if (!c.cbsa_code || !c.cbsa_title) continue;
    let m = byCbsa.get(c.cbsa_code);
    if (!m) {
      m = {
        cbsa_code: c.cbsa_code,
        cbsa_title: c.cbsa_title,
        crashes: 0,
        counties: [],
      };
      byCbsa.set(c.cbsa_code, m);
    }
    m.crashes += c.fatal_crashes;
    m.counties.push(c);
  }

  const items = Array.from(byCbsa.values()).sort(
    (a, b) => b.crashes - a.crashes,
  );

  const total = items.length;
  const top25 = Math.max(1, Math.ceil(total * 0.25));
  const top50 = Math.max(1, Math.ceil(total * 0.5));
  const priorityFor = (idx: number): "high" | "medium" | "low" => {
    if (total <= 3) return "high";
    if (idx < top25) return "high";
    if (idx < top50) return "medium";
    return "low";
  };

  return items.map((m, i) => ({
    rank: i + 1,
    cbsa_code: m.cbsa_code,
    cbsa_title: m.cbsa_title,
    state_abbr: stateAbbr,
    fatal_crashes: m.crashes,
    county_count: m.counties.length,
    county_preview: m.counties
      .slice(0, 3)
      .map((c) => c.county_name)
      .join(", "),
    priority: priorityFor(i),
  }));
}

/* ── CSV export ────────────────────────────────────────────────────────── */

/**
 * Build CSV text from a counties + metros report. Two sections:
 *
 *   COUNTIES,...
 *   header
 *   rows...
 *   (blank line)
 *   METROS,...
 *   header
 *   rows...
 *
 * Plain CSV (no Excel-specific quoting modes). Strings are quoted ONLY
 * when they contain a comma, quote, or newline. Header columns chosen
 * for direct paste into Google Ads / DV360 audience-target lists.
 */
export function reportToCsv(report: GeoTargetingReport): string {
  const meta = [
    `# Legal Marketing Intelligence — PI Geo Targeting`,
    `# State: ${report.state_name} (${report.state_abbr})`,
    `# PI Category: ${report.pi_category}`,
    `# Source: ${report.source}`,
    `# Window: ${report.lookback_label}`,
    `# State total fatal crashes: ${report.state_total_fatal_crashes}`,
  ].join("\n");

  const countyHeader = [
    "rank",
    "county_name",
    "fips_full",
    "state_abbr",
    "fatal_crashes",
    "motorcycle_share",
    "truck_share",
    "drunk_share",
    "rural_share",
    "cbsa_code",
    "cbsa_title",
    "priority",
  ];
  const countyRows = report.counties.map((c) =>
    [
      c.rank,
      c.county_name,
      c.fips_full ?? "",
      c.state_abbr,
      c.fatal_crashes,
      c.motorcycle_share,
      c.truck_share,
      c.drunk_share,
      c.rural_share,
      c.cbsa_code ?? "",
      c.cbsa_title ?? "",
      c.priority,
    ].map(csvCell),
  );

  const metroHeader = [
    "rank",
    "cbsa_code",
    "cbsa_title",
    "state_abbr",
    "fatal_crashes",
    "county_count",
    "county_preview",
    "priority",
  ];
  const metroRows = report.metros.map((m) =>
    [
      m.rank,
      m.cbsa_code,
      m.cbsa_title,
      m.state_abbr,
      m.fatal_crashes,
      m.county_count,
      m.county_preview,
      m.priority,
    ].map(csvCell),
  );

  return [
    meta,
    "",
    "COUNTIES",
    countyHeader.join(","),
    ...countyRows.map((r) => r.join(",")),
    "",
    "METROS",
    metroHeader.join(","),
    ...metroRows.map((r) => r.join(",")),
    "",
  ].join("\n");
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function round3(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 1000) / 1000;
}
