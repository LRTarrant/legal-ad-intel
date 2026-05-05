/**
 * Testable internals for the PI Strategic Brief route (PR C).
 *
 * The brief is the first PI artifact whose value-prop hinges on UNIQUE
 * data signals — FARS fatality density, NOAA storm clusters, state-level
 * legal-climate composite scores — that competitor agencies and generic
 * SaaS tools can't surface in one place. Everything in this file is
 * pure (no Next, no Supabase types in the prompt builder); the route
 * does the side-effectful DB pulls and assembles a grounded narrative.
 *
 * Structure of the brief output (matches UI sections):
 *   1. Why this market — 2-3 sentence intro grounded in data
 *   2. Top counties / DMAs to prioritize — table with FARS-derived numbers
 *   3. Risk factors — state-specific PI advertising / legal-climate signals
 *   4. Recommended angles — 1-2 marketing angles backed by the data
 *
 * What "grounded" means here: every claim carries a source attribution
 * tag the route writes into the LLM context (FARS, NOAA, BLS-CFOI,
 * pi_viability_scores). The LLM is instructed not to invent numbers
 * — only paraphrase or compute simple ratios off the data we feed in.
 *
 * Why not raw SQL in the route file: keeping the prompt shape and the
 * data-shape contract in this testable.ts means we can unit-test the
 * LLM-input assembly without spinning up Supabase or Next.
 */

import type { PICategory } from "@/lib/campaign-builder/pi-templates/types";

/* ── Public types ──────────────────────────────────────────────────────── */

export interface PIBriefRequest {
  pi_category: PICategory;
  state: string;
  /** Optional: pre-resolved firm name for tone. Brief is firm-agnostic v1. */
  firm_name?: string;
  /** Optional pre-resolved market display name (e.g. "Birmingham, AL"). */
  market_display_name?: string;
}

/**
 * Top-county row from the FARS / construction / boating signal pulls.
 * The route fills these from SQL aggregations; this shape is what the
 * prompt builder + UI both consume.
 */
export interface CountySignal {
  county_name: string;
  /** Total occurrence count over the lookback window. */
  count: number;
  /**
   * Rate per 100K population — NULL if we don't have demographics for
   * this county. Lets the LLM rank by rate when available.
   */
  rate_per_100k: number | null;
  /** Optional drill-down attribute the LLM can highlight. */
  detail?: string;
}

/**
 * Result shape of the signal lookup. Brief route fills only the fields
 * relevant to the chosen PI category; unrelated fields stay undefined.
 *
 * Source attribution is explicit per-block so the LLM can cite each
 * claim correctly without our prompt parsing strings.
 */
export interface PIBriefSignalSet {
  state_abbr: string;
  state_name: string;
  pi_category: PICategory;

  /** From fars_fatalities (car / truck / motorcycle / pedestrian). */
  motor_vehicle?: {
    lookback_years: number;
    state_total: number;
    /** State-level rate per 100K. NULL if unavailable. */
    state_rate_per_100k: number | null;
    top_counties: CountySignal[];
    motorcycle_share?: number;
    truck_share?: number;
    rural_share?: number;
    drunk_share?: number;
    source: "FARS";
  };

  /** From storm_events (severe weather / hail / wind PI). */
  weather?: {
    lookback_years: number;
    state_total_events: number;
    state_total_injuries: number;
    state_total_deaths: number;
    top_counties: CountySignal[];
    common_event_types: Array<{ event_type: string; count: number }>;
    source: "NOAA";
  };

  /** From construction_fatalities (construction PI). */
  construction?: {
    lookback_years: number;
    state_total: number;
    state_rate_per_100k_workers: number | null;
    top_causes: Array<{ cause: string; count: number }>;
    source: "BLS CFOI";
  };

  /** From boating_accidents. */
  boating?: {
    lookback_years: number;
    state_total: number;
    state_total_deaths: number;
    state_total_injuries: number;
    top_waterbodies: Array<{ name: string; count: number }>;
    source: "USCG";
  };

  /** Always-included state-level legal climate from pi_viability_scores. */
  legal_climate?: {
    composite_score: number;
    /**
     * Best of negligence_rule | non_economic_cap | punitive_cap |
     * statute_of_limitations  — whichever the score row marks as
     * meaningful. Free-form short label.
     */
    negligence_rule: string;
    statute_of_limitations: string;
    non_economic_cap: string;
    source: "Legal Marketing Intelligence pi_viability_scores";
  };
}

/**
 * The structured brief output. The LLM returns JSON in this exact shape;
 * the validator below enforces it. Sections kept short on purpose: each
 * is rendered as its own UI card.
 */
export interface PIStrategicBrief {
  /** 2-3 sentence opener tying the chosen state + category to data. */
  why_this_market: string;
  /**
   * Up to 5 (county_name, headline, supporting_stat) recommendations.
   * The LLM picks counties from the signal set's top_counties and
   * writes a one-line rationale. Stats must come from the signal set;
   * the prompt forbids hallucinated numbers.
   */
  top_counties_to_target: Array<{
    county_name: string;
    headline: string;
    supporting_stat: string;
  }>;
  /**
   * 2-4 risk factors. Examples: state caps on non-economic damages,
   * statute-of-limitations cliffs, contributory-negligence rule.
   * LLM is instructed to NOT give legal advice — these are advertising
   * implications only.
   */
  risk_factors: Array<{ label: string; implication: string }>;
  /**
   * 1-3 marketing angles with supporting data. Each angle ties back to
   * a signal we passed in (e.g. "Lean on rural-county fatality rate"
   * with the FARS rural_share number).
   */
  recommended_angles: Array<{
    angle: string;
    supporting_data: string;
  }>;
  /** Free-text "what we observed" notes; can be empty. */
  notes?: string;
}

/* ── Which signal blocks are relevant per PI category ──────────────────── */

/**
 * Which of the signal blocks the SQL layer should populate for a given
 * category. Keeping this map here so the prompt builder + tests + route
 * all agree on the contract.
 */
export const SIGNALS_BY_CATEGORY: Record<
  PICategory,
  Array<"motor_vehicle" | "weather" | "construction" | "boating">
> = {
  car_accident: ["motor_vehicle", "weather"],
  truck_accident: ["motor_vehicle", "weather"],
  motorcycle_accident: ["motor_vehicle", "weather"],
  pedestrian_accident: ["motor_vehicle"],
  bicycle_accident: ["motor_vehicle"],
  boating_accident: ["boating", "weather"],
  slip_and_fall: ["weather"],
  premises_liability: ["weather"],
  // Dog-bite has no public dataset we ingest; legal_climate alone is
  // useful but not signal-rich. The LLM is told to lean harder on
  // legal_climate when the signal set is otherwise sparse.
  dog_bite: [],
};

/* ── Request validation ────────────────────────────────────────────────── */

const VALID_PI_CATEGORIES = new Set<PICategory>(
  Object.keys(SIGNALS_BY_CATEGORY) as PICategory[],
);

export function validatePIBriefRequest(body: PIBriefRequest): string[] {
  const errors: string[] = [];
  if (!body.pi_category) {
    errors.push("pi_category is required");
  } else if (!VALID_PI_CATEGORIES.has(body.pi_category)) {
    errors.push(`pi_category '${body.pi_category}' is not a valid PI category`);
  }
  if (!body.state || !/^[A-Z]{2}$/.test(body.state)) {
    errors.push("state is required (2-letter uppercase state code)");
  }
  return errors;
}

/* ── Prompt assembly ────────────────────────────────────────────────────── */

export const PI_STRATEGIC_BRIEF_SYSTEM_PROMPT = `You are a senior strategist helping U.S. plaintiff law firms decide where and how to advertise for personal injury cases.

You will receive:
  1. A target STATE + PI CATEGORY (e.g. car_accident, motorcycle_accident, boating_accident)
  2. A SIGNAL SET — structured data we have already pulled from FARS, NOAA storm events, BLS CFOI, and our internal pi_viability_scores

Your output is a STRICT JSON object with these fields:
  why_this_market           — 2-3 sentences. Open with the most striking signal stat.
  top_counties_to_target    — UP TO 5 rows. Each row: county_name (must come from signal set), headline (one short hook), supporting_stat (a number from the signal set + a source tag).
  risk_factors              — 2-4 rows. Each row: label, implication. Focus on ADVERTISING and CASE-ACQUISITION implications, NOT legal advice.
  recommended_angles        — 1-3 angles. Each: angle (one-line), supporting_data (which stat justifies it).
  notes                     — Optional. Use only if there's a noteworthy gap or caveat (e.g. "FARS data lags by 2 years").

CRITICAL RULES:
1. NUMBERS: Every numeric claim must be traceable to the signal set. NEVER invent a stat. If you compute a ratio, label it as such.
2. SOURCES: When citing a number, name the source the signal set tagged it with (e.g. "FARS 2018-2022", "NOAA storm events", "BLS CFOI", "pi_viability_scores").
3. LEGAL ADVICE: Do NOT advise users on the law. Frame everything as advertising-strategy implications.
4. COUNTIES: Top counties must be drawn from signal_set.*.top_counties. Don't hallucinate counties.
5. EMPTY SIGNALS: If a signal block is missing or empty, say so in 'notes'. Do not pretend.
6. TONE: Friendly, casual, clear. Short headings, bullet-friendly sentences. No hedging like "you may want to consider".
7. NO MARKDOWN inside JSON string fields. Plain text only.

Return ONLY the JSON object. No markdown fences. No commentary.`;

/**
 * Render the user prompt. The signal set is JSON-serialized in full so
 * the LLM has access to every number; the natural-language preface
 * tells it which fields are relevant for this category.
 */
export function buildPIBriefUserPrompt(
  body: PIBriefRequest,
  signals: PIBriefSignalSet,
): string {
  const blocks = SIGNALS_BY_CATEGORY[body.pi_category];
  const blocksLine =
    blocks.length > 0
      ? `Signal blocks especially relevant for ${body.pi_category}: ${blocks.join(", ")}, plus legal_climate (always relevant).`
      : `No category-specific signal blocks for ${body.pi_category}; lean on legal_climate and call out the gap in notes.`;

  return [
    `Target: ${body.pi_category} in ${signals.state_name} (${body.state}).`,
    body.market_display_name ? `Market focus: ${body.market_display_name}.` : "",
    body.firm_name ? `Firm: ${body.firm_name}.` : "",
    "",
    blocksLine,
    "",
    "SIGNAL SET (use only these numbers; cite their `source` tags):",
    "```json",
    JSON.stringify(signals, null, 2),
    "```",
    "",
    `Return JSON: { why_this_market, top_counties_to_target[], risk_factors[], recommended_angles[], notes? }`,
  ]
    .filter(Boolean)
    .join("\n");
}

/* ── Response validation ───────────────────────────────────────────────── */

export function stripJSONWrapper(content: string): string {
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n/i, "");
    cleaned = cleaned.replace(/\n```\s*$/i, "");
  }
  return cleaned.trim();
}

/**
 * Validate the LLM output. Tolerant on optional fields and array sizes
 * (truncates rather than rejecting outright). Returns a normalized
 * value or an errors list.
 */
export function validatePIStrategicBrief(
  parsed: unknown,
):
  | { ok: true; value: PIStrategicBrief }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, errors: ["response is not an object"] };
  }
  const obj = parsed as Record<string, unknown>;

  // why_this_market
  let why = "";
  if (typeof obj.why_this_market === "string" && obj.why_this_market.trim()) {
    why = obj.why_this_market.trim().slice(0, 800);
  } else {
    errors.push("why_this_market must be a non-empty string");
  }

  // top_counties_to_target
  const counties: PIStrategicBrief["top_counties_to_target"] = [];
  if (Array.isArray(obj.top_counties_to_target)) {
    for (const raw of obj.top_counties_to_target.slice(0, 5)) {
      if (raw && typeof raw === "object") {
        const r = raw as Record<string, unknown>;
        if (
          typeof r.county_name === "string" &&
          typeof r.headline === "string" &&
          typeof r.supporting_stat === "string"
        ) {
          counties.push({
            county_name: r.county_name.trim().slice(0, 80),
            headline: r.headline.trim().slice(0, 200),
            supporting_stat: r.supporting_stat.trim().slice(0, 200),
          });
        }
      }
    }
  } else {
    errors.push("top_counties_to_target must be an array");
  }

  // risk_factors
  const risks: PIStrategicBrief["risk_factors"] = [];
  if (Array.isArray(obj.risk_factors)) {
    for (const raw of obj.risk_factors.slice(0, 4)) {
      if (raw && typeof raw === "object") {
        const r = raw as Record<string, unknown>;
        if (typeof r.label === "string" && typeof r.implication === "string") {
          risks.push({
            label: r.label.trim().slice(0, 120),
            implication: r.implication.trim().slice(0, 400),
          });
        }
      }
    }
  } else {
    errors.push("risk_factors must be an array");
  }

  // recommended_angles
  const angles: PIStrategicBrief["recommended_angles"] = [];
  if (Array.isArray(obj.recommended_angles)) {
    for (const raw of obj.recommended_angles.slice(0, 3)) {
      if (raw && typeof raw === "object") {
        const r = raw as Record<string, unknown>;
        if (
          typeof r.angle === "string" &&
          typeof r.supporting_data === "string"
        ) {
          angles.push({
            angle: r.angle.trim().slice(0, 200),
            supporting_data: r.supporting_data.trim().slice(0, 400),
          });
        }
      }
    }
  } else {
    errors.push("recommended_angles must be an array");
  }

  // notes (optional)
  let notes: string | undefined;
  if (typeof obj.notes === "string" && obj.notes.trim()) {
    notes = obj.notes.trim().slice(0, 600);
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      why_this_market: why,
      top_counties_to_target: counties,
      risk_factors: risks,
      recommended_angles: angles,
      notes,
    },
  };
}
