/**
 * Strategy Engine — audience fit from the national media-consumption baseline.
 *
 * PURE module (no Supabase, no React, no Next). Given the national
 * `media_consumption_baseline` rows and a market's demographic mix, it computes
 * a RELATIVE per-channel fit score in [0,1]. The math NEVER reaches the LLM —
 * the engine narrates the result (same contract as channel-plan.ts). No
 * absolute reach: every score is relative (fit feeds opportunity = fit × (1 −
 * competition) downstream). Unit-tested in strategy-engine.test.ts.
 *
 * The `scope` column is load-bearing (docs/media-consumption-baseline.md
 * "News vs general scope"):
 *   - general = direct reach/adoption — trust as-is for channel fit.
 *   - news    = news-getting on the channel — a relative-ranking proxy only.
 * Per channel we prefer `general` base rows; we use `news` base rows only when
 * the channel has no `general` base row, and flag that channel `news_proxy` so
 * the writer can say "news-consumption proxy". Radio therefore draws on the
 * general Nielsen reach rows (Black 92 / Hispanic 98), NEVER the Pew radio-news
 * row (44 sometimes / 11 often), which badly understates general radio reach.
 */

import type { ChannelKey } from "./types";

/** One national baseline row (subset of columns the fit math needs). */
export interface BaselineRow {
  demographic_type: string; // all | race | age | income | education
  demographic_group: string; // all_adults | black | white | hispanic | asian | 18_29 | 25_54 | 50_plus | 65_plus
  channel: string; // baseline channel (tv_linear, radio, radio_urban, social, digital, ooh, …)
  metric: string;
  scope: string; // news | general
  value: number;
  unit: string; // gate the math by unit — only reach/adoption percentages are comparable
  source: string; // Pew Research Center | Nielsen (cited as fact) | BLS American Time Use Survey
}

/** Population shares (0..1) for the demographic groups the baseline keys on. */
export interface DemographicMix {
  race: { black: number; white: number; hispanic: number; asian: number };
  age: { "18_29": number; "25_54": number; "50_plus": number; "65_plus": number };
}

/** Per-channel relative fit + the narration hints the digest surfaces. */
export interface ChannelFit {
  /** Relative fit in [0,1] (normalized across channels). */
  fit: number;
  /** Whether the score rests on general reach or only a news proxy. */
  scope: "general" | "news_proxy";
  /** Distinct attribution sources backing the score (for citation). */
  sources: string[];
}

/**
 * Baseline channel → engine ChannelKey. Channels the engine cannot buy map to
 * null and never produce a fit:
 *   - `social` is an aggregate (the platform-specific rows cover it),
 *   - `digital` is a device bucket (NOT ctv — see spec Known gaps),
 *   - `all_media` is a context stat,
 *   - reddit/snapchat/whatsapp/x_twitter are not engine channels.
 * `radio_urban` folds into `radio` (its only metric is format_share, which is
 * excluded from the numeric base anyway — see BASE_METRICS).
 */
const BASELINE_CHANNEL_TO_KEY: Record<string, ChannelKey | null> = {
  tv_linear: "tv_linear",
  ctv: "ctv",
  radio: "radio",
  radio_urban: "radio",
  podcast: "podcast",
  facebook: "facebook",
  instagram: "instagram",
  tiktok: "tiktok",
  youtube: "youtube",
  search: "search",
  print: "print",
  social: null,
  digital: null,
  all_media: null,
  ooh: null, // out-of-home/billboard — not an engine ChannelKey; skip gracefully
  reddit: null,
  snapchat: null,
  whatsapp: null,
  x_twitter: null,
};

/**
 * Metrics that count as a numeric reach/adoption base. Everything else is
 * narration context and is NEVER scored:
 *   - news_prefer (a preference, not reach), news_consume_skew (directional flag)
 *   - format_share + ad_audio_share (within-channel/audio splits, not reach)
 *   - linear_share_of_tv_time + watch_time_skew (shares of time, not reach)
 *   - listener_share (audience composition, not reach), netflix_use (sub-platform)
 *   - heavy_viewer_index (an index), time_spent_daily/weekly (hours), ad_notice (OOH)
 * Radio's ad_audio_share/format_share stay OUT so radio fit rests on reach.
 * A second `REACH_PCT_UNITS` gate (below) is belt-and-suspenders: even an
 * allow-listed metric only counts if its unit is a population-percentage, so a
 * non-percentage row (hours, index, share-of-time) can never enter the math.
 */
const GENERAL_BASE_METRICS = new Set([
  "platform_use",
  "reach_monthly",
  "reach_weekly",
  "streaming_use", // ctv adoption (Pew streaming-use, replaced the old streaming_share_of_tv)
  "cable_subscribe", // tv_linear access proxy (Pew cable/satellite subscription)
  "listen", // legacy podcast metric (kept for back-compat; no rows in the current seed)
  "streaming_share_of_tv", // legacy (kept for back-compat)
  "penetration", // legacy (kept for back-compat)
]);
const NEWS_BASE_METRICS = new Set([
  "news_consume",
  "news_regular",
  "local_news", // radio's republishable Pew local-news anchor (news proxy)
]);

/**
 * Units that represent a share-of-population reach/adoption (0–100), the only
 * unit family the weighted average can mix. Anything else (hours_per_day,
 * index_vs_avg, direction_over_index, pct_of_tv_time, pct_of_listeners,
 * pct_of_ad_supported_audio, …) is rejected before the math.
 */
const REACH_PCT_UNITS = new Set([
  "pct_ever_use",
  "pct_reach",
  "pct_monthly",
  "pct_subscribe",
  "pct_at_least_sometimes",
  "pct_regularly",
]);

/**
 * Weight given to an `all_adults` (whole-population) base row. It anchors a
 * channel's score to the national rate and is then nudged by the market's
 * race/age-specific rows (weighted by the market's actual share of each group).
 * A modest floor so a dominant local group leads where a specific row exists,
 * but a channel with only an all_adults row (e.g. Facebook adoption) still
 * scores, and partial race coverage doesn't let a 1%-share group hijack the
 * score.
 */
const ALL_ADULTS_WEIGHT = 0.5;

function groupWeight(row: BaselineRow, mix: DemographicMix): number {
  if (row.demographic_type === "all") return ALL_ADULTS_WEIGHT;
  if (row.demographic_type === "race") {
    return mix.race[row.demographic_group as keyof DemographicMix["race"]] ?? 0;
  }
  if (row.demographic_type === "age") {
    return mix.age[row.demographic_group as keyof DemographicMix["age"]] ?? 0;
  }
  return 0; // income / education not in the mix yet
}

/**
 * Compute relative per-channel audience fit from the national baseline and a
 * market's demographic mix. Returns a Map keyed by engine ChannelKey; channels
 * with no usable baseline row are absent (the caller treats absence as "no
 * signal", not zero). Empty input → empty map (caller degrades gracefully).
 */
export function computeAudienceFit(
  baselineRows: BaselineRow[],
  mix: DemographicMix,
): Map<ChannelKey, ChannelFit> {
  // Bucket usable base rows by engine channel, split by scope.
  const byChannel = new Map<
    ChannelKey,
    { general: BaselineRow[]; news: BaselineRow[] }
  >();
  for (const row of baselineRows) {
    const key = BASELINE_CHANNEL_TO_KEY[row.channel];
    if (!key) continue; // unknown / non-buyable channel (ooh, digital, social, …)
    // Ignore the income axis for now — the mix has no income shares yet, so an
    // income row would weight to 0 anyway; skip it so it never reaches the
    // unweighted fallback either. (Don't crash on it.)
    if (row.demographic_type === "income") continue;
    if (!REACH_PCT_UNITS.has(row.unit)) continue; // not a reach %, can't be averaged
    const isGeneral = row.scope === "general" && GENERAL_BASE_METRICS.has(row.metric);
    const isNews = row.scope === "news" && NEWS_BASE_METRICS.has(row.metric);
    if (!isGeneral && !isNews) continue; // context/directional row — skip
    const bucket = byChannel.get(key) ?? { general: [], news: [] };
    (isGeneral ? bucket.general : bucket.news).push(row);
    byChannel.set(key, bucket);
  }

  // First pass: a demographic-weighted raw value per channel, under the scope
  // rule (prefer general; news only as a fallback proxy).
  const raw = new Map<
    ChannelKey,
    { value: number; scope: "general" | "news_proxy"; sources: Set<string> }
  >();
  for (const [key, bucket] of byChannel) {
    const useGeneral = bucket.general.length > 0;
    const rows = useGeneral ? bucket.general : bucket.news;
    if (rows.length === 0) continue;

    let wSum = 0;
    let wValSum = 0;
    let plainSum = 0; // fallback if every present group has ~0 share
    const sources = new Set<string>();
    for (const r of rows) {
      const w = groupWeight(r, mix);
      wSum += w;
      wValSum += w * r.value;
      plainSum += r.value;
      if (r.source) sources.add(r.source);
    }
    const value = wSum > 0 ? wValSum / wSum : plainSum / rows.length;
    raw.set(key, { value, scope: useGeneral ? "general" : "news_proxy", sources });
  }

  // Second pass: normalize to a relative [0,1] score (divide by the max raw).
  let maxRaw = 0;
  for (const { value } of raw.values()) if (value > maxRaw) maxRaw = value;

  const out = new Map<ChannelKey, ChannelFit>();
  for (const [key, { value, scope, sources }] of raw) {
    out.set(key, {
      fit: maxRaw > 0 ? Math.max(0, Math.min(1, value / maxRaw)) : 0,
      scope,
      sources: Array.from(sources),
    });
  }
  return out;
}

/* ── Demographic mix from census_demographics ───────────────────────────── */

/** One census row (subset) — county-level, as stored in census_demographics. */
export interface CensusRow {
  total_population: number | null;
  pct_black: number | null;
  pct_white: number | null;
  pct_hispanic: number | null;
  pct_asian: number | null;
  pop_18_to_24: number | null;
  pop_25_to_34: number | null;
  pop_35_to_44: number | null;
  pop_45_to_54: number | null;
  pop_55_to_64: number | null;
  pop_65_to_74: number | null;
  pop_75_plus: number | null;
}

const n = (v: unknown): number => (typeof v === "number" ? v : Number(v) || 0);

/**
 * Build a population-weighted demographic mix for a market from its county
 * census rows. Race shares are the population-weighted average of the county
 * `pct_*` columns (stored 0–100 in this repo → converted to 0..1 fractions).
 * Age-group shares are summed population buckets ÷ total population; the
 * baseline's age groups map to census buckets approximately:
 *   18_29  ≈ 18–34 (no clean 18–29 bucket exists),
 *   25_54  ≈ 25–54,
 *   50_plus ≈ 55+,
 *   65_plus ≈ 65+.
 * Returns all-zero shares when there are no rows (caller still gets a map and
 * degrades honestly).
 */
export function buildDemographicMix(rows: CensusRow[]): DemographicMix {
  let totPop = 0;
  let black = 0;
  let white = 0;
  let hispanic = 0;
  let asian = 0;
  let a18_34 = 0;
  let a25_54 = 0;
  let a55_plus = 0;
  let a65_plus = 0;

  for (const r of rows) {
    const pop = n(r.total_population);
    if (pop <= 0) continue;
    totPop += pop;
    // pct_* are percentages (0–100); accumulate population-weighted percent.
    black += pop * n(r.pct_black);
    white += pop * n(r.pct_white);
    hispanic += pop * n(r.pct_hispanic);
    asian += pop * n(r.pct_asian);
    a18_34 += n(r.pop_18_to_24) + n(r.pop_25_to_34);
    a25_54 += n(r.pop_25_to_34) + n(r.pop_35_to_44) + n(r.pop_45_to_54);
    a55_plus += n(r.pop_55_to_64) + n(r.pop_65_to_74) + n(r.pop_75_plus);
    a65_plus += n(r.pop_65_to_74) + n(r.pop_75_plus);
  }

  if (totPop <= 0) {
    return {
      race: { black: 0, white: 0, hispanic: 0, asian: 0 },
      age: { "18_29": 0, "25_54": 0, "50_plus": 0, "65_plus": 0 },
    };
  }

  // Convert weighted percent → 0..1 fraction (divide by total pop, then /100).
  const frac = (weightedPct: number) => Math.max(0, Math.min(1, weightedPct / totPop / 100));
  const ageFrac = (count: number) => Math.max(0, Math.min(1, count / totPop));

  return {
    race: {
      black: frac(black),
      white: frac(white),
      hispanic: frac(hispanic),
      asian: frac(asian),
    },
    age: {
      "18_29": ageFrac(a18_34),
      "25_54": ageFrac(a25_54),
      "50_plus": ageFrac(a55_plus),
      "65_plus": ageFrac(a65_plus),
    },
  };
}
