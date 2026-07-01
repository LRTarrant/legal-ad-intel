/**
 * Strategy Engine — shared data assembler.
 *
 * Builds `StrategyInputs` from Supabase, used by BOTH the Alabama page (for
 * instant client-side card scoring) and the generate route (re-assembled
 * server-side, never trusted from the client). Every source is fetched
 * independently and degrades gracefully: a missing block flips its
 * `available` flag, the engine still scores on what's present, and confidence
 * drops to "directional" rather than fabricating.
 *
 * Data sources (chosen after verifying what's actually populated for AL):
 *   - Advertiser landscape / the "Gorilla" → get_pi_competitors_by_dma(state,
 *     dmaCode): real PI-firm activity, scoped to the selected DMA when one is
 *     chosen (NULL dmaCode = statewide all-markets view). (The
 *     mass-tort get_top_advertisers_by_segment was the wrong table.)
 *   - Named outlets → media_outlets (by DMA market name) + broadcast_stations.
 *   - Local signal → get_state_accident_summary (FARS), rates only.
 *   - Audience fit → media_profiles (generic consumption profiles; AL has no
 *     per-DMA rows, so fit is directional by nature).
 *   - Channel competition → channel_competition_scores (keyed by geo UUID;
 *     no AL DMA rows today, so competition stays null = unknown, honestly).
 *
 * State-parameterized. The only Alabama-specific asset is a small, hand-checked
 * county→DMA crosswalk: a wrong county→market guess destroys trust with a
 * sophisticated buyer (per the council), so we ship a correct AL table and
 * return an empty translation for states we haven't mapped yet.
 */

import type {
  AdvertiserShare,
  ChannelKey,
  ChannelSignal,
  CountyDmaLink,
  LocalSignal,
  NamedOutlet,
  StrategyInputs,
} from "./types";
import {
  buildDemographicMix,
  computeAudienceFit,
  deriveDemographicNote,
  type BaselineRow,
  type CensusRow,
} from "./audience-fit";

/** Loose Supabase surface — the repo casts to `any` for these dynamic calls. */
type SupabaseLike = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
  rpc: (fn: string, params?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AZ: "Arizona",
  CA: "California",
  FL: "Florida",
  GA: "Georgia",
  TN: "Tennessee",
};

/* ── Alabama county → DMA crosswalk (hand-checked; correct or omitted) ───── */

const COUNTY_DMA_BY_STATE: Record<string, Record<string, string>> = {
  AL: {
    Jefferson: "Birmingham",
    Shelby: "Birmingham",
    Tuscaloosa: "Birmingham",
    "St. Clair": "Birmingham",
    Walker: "Birmingham",
    Talladega: "Birmingham",
    Calhoun: "Birmingham",
    Madison: "Huntsville",
    Morgan: "Huntsville",
    Limestone: "Huntsville",
    Lauderdale: "Huntsville",
    Marshall: "Huntsville",
    Mobile: "Mobile",
    Baldwin: "Mobile",
    Montgomery: "Montgomery",
    Lee: "Montgomery",
    Elmore: "Montgomery",
    Autauga: "Montgomery",
  },
};

const DMA_RANK_BY_NAME: Record<string, number> = {
  Birmingham: 44,
  Mobile: 60,
  Huntsville: 81,
  Montgomery: 117,
};

/* ── Channel name normalization ─────────────────────────────────────────── */

const CHANNEL_ALIASES: Record<string, ChannelKey> = {
  tv_linear: "tv_linear",
  linear_tv: "tv_linear",
  tv: "tv_linear",
  broadcast: "tv_linear",
  ctv: "ctv",
  ctv_streaming: "ctv",
  streaming: "ctv",
  ott: "ctv",
  radio: "radio",
  podcast: "podcast",
  facebook: "facebook",
  meta: "facebook",
  instagram: "instagram",
  tiktok: "tiktok",
  youtube: "youtube",
  search: "search",
  paid_search: "search",
  sem: "search",
  print: "print",
};

function normalizeChannel(raw: string): ChannelKey | null {
  return CHANNEL_ALIASES[raw.trim().toLowerCase()] ?? null;
}

/**
 * Map an outlet's media format (media_outlets.media_format is "Audio"/"Video";
 * broadcast_stations.service_type is "TV"/"FM"/"AM") to a channel key.
 */
function formatToChannel(format: string, callSign?: string): ChannelKey | null {
  const f = format.trim().toLowerCase();
  if (f === "audio" || f.includes("radio") || f === "am" || f === "fm") return "radio";
  if (f === "video" || f.includes("tv") || f === "dt" || f === "tx") {
    // An -FM/-AM call sign mislabeled "Video" is still radio.
    if (callSign && /-(FM|AM)$/i.test(callSign)) return "radio";
    return "tv_linear";
  }
  if (f.includes("stream") || f.includes("ctv") || f.includes("ott")) return "ctv";
  if (f.includes("podcast")) return "podcast";
  if (f.includes("print")) return "print";
  return null;
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

const num = (v: unknown): number => (typeof v === "number" ? v : Number(v) || 0);
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Normalize a DMA / market name for cross-source comparison.
 *
 * `dma_markets` carries short labels ("Dallas", "Washington DC") while
 * `media_outlets.market` and `broadcast_stations.nielsen_dma` carry Nielsen
 * full/uppercase variants ("Dallas-Ft.Worth", "DALLAS-FT. WORTH",
 * "Washington, DC"). Uppercasing, dropping periods (so "Ft."/"St." collapse),
 * turning separators (-,&/()) into spaces, and collapsing whitespace makes all
 * those variants compare equal.
 *
 * Deliberately does NOT strip trailing state suffixes: `media_outlets` carries
 * both "Portland, ME" and "Portland, OR", so "PORTLAND ME" must stay distinct
 * from "PORTLAND OR" or an OR strategy would leak ME outlets.
 */
export function normalizeDmaName(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/\./g, " ") // periods → space ("FT."→"FT", "ST."→"ST")
    .replace(/[-,&/()]/g, " ") // separators → space
    .replace(/\s+/g, " ")
    .trim();
}

/** Build a normalized-name Set from {display_name, full_name} pairs. */
function buildNormalizedDmaSet(pairs: Array<{ display: string; full: string }>): Set<string> {
  const set = new Set<string>();
  for (const p of pairs) {
    if (p.display) set.add(normalizeDmaName(p.display));
    if (p.full) set.add(normalizeDmaName(p.full));
  }
  return set;
}

/**
 * Coarse server-side prefilter prefixes for the media_outlets fetch. Each prefix
 * is the FIRST alphanumeric token of an in-scope DMA's display_name / full_name
 * (e.g. "Dallas", "Washington", "New"). Used as `market.ilike.<prefix>*` so the
 * query returns only that market's handful of rows instead of the whole 7,900-row
 * table. Deliberately coarse: the exact `normalizeDmaName` match in the assembler
 * still governs inclusion, so OVER-fetching (e.g. "New" → "New York" + "New
 * Orleans") is harmless, while a first-token prefix can't UNDER-fetch a Nielsen
 * variant ("Dallas" prefix still catches DB row "Dallas-Ft.Worth").
 */
function buildMarketPrefixes(pairs: Array<{ display: string; full: string }>): string[] {
  const set = new Set<string>();
  for (const p of pairs) {
    for (const label of [p.display, p.full]) {
      const token = label?.match(/[A-Za-z0-9]+/)?.[0];
      if (token) set.add(token);
    }
  }
  return [...set];
}

/**
 * Fetch media_outlets scoped to the in-scope DMA market(s) via a single
 * server-side `.or(... ilike ...)` query — replaces the old whole-table
 * pagination. Returns the same { data, error } shape the inline query did so the
 * parallel-fetch + graceful-degrade structure is untouched. Empty prefixes
 * (strict mode with an unresolved dmaCode → Finding 5) yields zero rows without
 * a query.
 */
async function fetchMediaOutletsForMarkets(
  supabase: SupabaseLike,
  prefixes: string[],
): Promise<{ data: Array<Record<string, unknown>>; error: unknown }> {
  if (prefixes.length === 0) return { data: [], error: null };
  // prefixes are alphanumeric-only (buildMarketPrefixes), safe in the or() syntax.
  const orFilter = prefixes.map((p) => `market.ilike.${p}*`).join(",");
  const { data, error } = await supabase
    .from("media_outlets")
    .select("call_sign, media_company, media_format, media_type, format_genre, market")
    .or(orFilter)
    .order("id", { ascending: true }) // stable order → deterministic pick under the 16-cap
    // Ceiling guard only. Set above the whole media_outlets table (~7.9k rows) so a
    // wide statewide fan-out (broad prefixes like "San*") can never truncate a
    // legitimate in-market row before the in-memory match runs.
    .limit(10000);
  return { data: (data as Array<Record<string, unknown>> | null) ?? [], error };
}

/* ── The assembler ──────────────────────────────────────────────────────── */

export interface AssembleResult {
  inputs: StrategyInputs;
  /** Non-fatal source errors, for logging / a DataHealthBanner. */
  errors: string[];
}

export async function assembleStrategyInputs(
  supabase: SupabaseLike,
  stateAbbr: string,
  opts: { tortSlug?: string; tortLabel?: string; dmaCode?: string | null } = {},
): Promise<AssembleResult> {
  const state = stateAbbr.toUpperCase();
  const stateName = STATE_NAMES[state] ?? state;
  const tortSlug = opts.tortSlug ?? "personal_injury";
  const tortLabel = opts.tortLabel ?? "Personal Injury";
  const errors: string[] = [];
  // True when caller supplied a dmaCode — enables strict in-market scoping.
  // An unmatched code must produce zero outlets, never a statewide or #1-DMA fallback.
  const strictMarket = Boolean(opts.dmaCode);

  // Resolve the state's DMAs FIRST: the media_outlets fetch is scoped by market,
  // so the in-scope DMA names must be known before issuing it.
  const { data: dmaData, error: dmaErr } = await supabase
    .from("dma_markets")
    .select("dma_code, display_name, full_name, rank, states_covered, primary_state")
    .contains("states_covered", [state])
    .order("rank", { ascending: true });

  let topDmaName: string | null = null;
  let topDmaCode: string | null = null;
  // Display + full_name for every in-scope DMA, so the outlet match set can be
  // built from BOTH labels — "Dallas" (display) matches the Nielsen variant
  // "Dallas-Ft.Worth" via full_name "Dallas-Ft. Worth".
  const stateDmaPairs: Array<{ display: string; full: string }> = [];
  let selectedDmaPair: { display: string; full: string } | null = null;
  if (dmaErr) {
    errors.push("dma_markets fetch failed");
  } else {
    const rows = (dmaData as Array<Record<string, unknown>>) ?? [];
    // Prefer DMAs whose primary_state is this state (drops border markets like
    // Columbus GA that merely touch the state).
    const inState = rows.filter((r) => String(r.primary_state ?? "") === state);
    const ordered = inState.length > 0 ? inState : rows;
    const selected = opts.dmaCode
      ? ordered.find((r) => String(r.dma_code ?? "").trim() === opts.dmaCode)
      : undefined;
    for (const r of ordered) {
      const display = String(r.display_name ?? r.full_name ?? "").trim();
      const full = String(r.full_name ?? "").trim();
      if (display || full) stateDmaPairs.push({ display, full });
    }
    if (selected) {
      selectedDmaPair = {
        display: String(selected.display_name ?? selected.full_name ?? "").trim(),
        full: String(selected.full_name ?? "").trim(),
      };
    }
    // Finding 4: when dmaCode was provided but not found, do NOT label by ordered[0].
    const labelRow = selected ?? (strictMarket ? undefined : ordered[0]);
    if (labelRow) {
      topDmaName = String(labelRow.display_name ?? labelRow.full_name ?? "").trim() || null;
      topDmaCode = String(labelRow.dma_code ?? "").trim() || null;
    }
  }

  // Coarse server-side prefilter for the outlet fetch: strict mode scopes to the
  // selected DMA, statewide to all of the state's DMAs. Empty (strict + unresolved
  // dmaCode) → zero outlets, preserving Finding 5. The exact normalizeDmaName match
  // in the outlet-assembly block below still governs final inclusion.
  const marketPrefixes = buildMarketPrefixes(
    strictMarket ? (selectedDmaPair ? [selectedDmaPair] : []) : stateDmaPairs,
  );

  // Fetch the remaining blocks independently; never let one failure sink the rest.
  const [competitorsRes, accidentRes, profilesRes, outletsRes, baselineRes, censusRes] =
    await Promise.allSettled([
      // Scope the competitive field to the selected market when one is chosen
      // (NULL p_dma_code = all-markets/statewide view). Without this, picking a
      // DMA still returned statewide competitors while white space + creatives
      // were already market-scoped — an inconsistency.
      supabase.rpc("get_pi_competitors_by_dma", { p_state: state, p_dma_code: opts.dmaCode ?? null }),
      supabase.rpc("get_state_accident_summary", { p_state: state }),
      supabase.from("media_profiles").select("*"),
      // Market-scoped fetch (replaces the old whole-table pagination).
      fetchMediaOutletsForMarkets(supabase, marketPrefixes),
      // National demographic consumption baseline (Pew + BLS ATUS + Nielsen-cited).
      supabase
        .from("media_consumption_baseline")
        .select("demographic_type, demographic_group, channel, metric, scope, value, unit, source")
        .eq("geography_level", "national"),
      // County demographics for this state → population-weighted demographic mix.
      supabase
        .from("census_demographics")
        .select(
          "total_population, pct_black, pct_white, pct_hispanic, pct_asian, pop_18_to_24, pop_25_to_34, pop_35_to_44, pop_45_to_54, pop_55_to_64, pop_65_to_74, pop_75_plus",
        )
        .eq("state_abbr", state),
    ]);

  /* advertiser landscape + Gorilla share (state-PI-specific) --------------- */
  let top_advertisers: AdvertiserShare[] = [];
  let total_advertisers: number | null = null;
  let saturation: number | null = null;
  if (competitorsRes.status === "fulfilled" && !competitorsRes.value.error) {
    const rows = (competitorsRes.value.data as Array<Record<string, unknown>>) ?? [];
    // Rank advertisers by SUSTAINED PRESENCE — the same lens the Competitive
    // Analysis tab uses (get_pi_competitors_by_dma ORDER: breadth → density,
    // low-confidence sunk). Raw observation volume is a scraping artifact: a
    // dense 2-metro burst (e.g. Cunningham Bounds) must NOT read as the market
    // gorilla when statewide-saturation firms (4 metros) actually lead. This
    // reconciles the deck's "top advertisers" + the Gorilla rule with the tab,
    // so the same firm never sits #1 here and #6 there. See PR-0 issue.
    //
    // presence = metro breadth (integer-dominant) + a per-active-day-rate
    // tiebreaker in [0,0.99), × 0.4 if low-confidence (new / thin sample).
    // One firm can appear under multiple domains — group by name, keep its best.
    const byName = new Map<string, { metros: number; rate: number; lowConf: boolean; domain: string | null }>();
    for (const r of rows) {
      const name = String(r.advertiser_name ?? "").trim();
      if (!name) continue;
      const metros = Array.isArray(r.metros_active) ? r.metros_active.length : 0;
      const rate = num(r.observations_per_active_day);
      const lowConf = Boolean(r.low_confidence);
      // Keep a domain for linking (the firm may appear under several — take the
      // one on its highest-presence row, i.e. the row that wins the max below).
      const domain = String(r.advertiser_domain ?? "").trim() || null;
      const prev = byName.get(name);
      if (!prev) {
        byName.set(name, { metros, rate, lowConf, domain });
      } else {
        const winsRate = rate > prev.rate;
        byName.set(name, {
          metros: Math.max(prev.metros, metros),
          rate: Math.max(prev.rate, rate),
          lowConf: prev.lowConf && lowConf, // confident if any domain is confident
          domain: winsRate ? domain ?? prev.domain : prev.domain ?? domain,
        });
      }
    }
    const maxRate = Math.max(0, ...Array.from(byName.values(), (v) => v.rate));
    const presence = (v: { metros: number; rate: number; lowConf: boolean }): number => {
      const rateNorm = maxRate > 0 ? Math.min(v.rate / maxRate, 1) * 0.99 : 0;
      const base = v.metros + rateNorm;
      return v.lowConf ? base * 0.4 : base;
    };
    const scored = Array.from(byName.entries()).map(([name, v]) => ({ name, score: presence(v), domain: v.domain }));
    const totalScore = scored.reduce((s, x) => s + x.score, 0);
    top_advertisers = scored
      .map(({ name, score, domain }) => ({ name, share: totalScore > 0 ? score / totalScore : 0, rank: 0, domain }))
      .sort((a, b) => b.share - a.share)
      .slice(0, 20)
      .map((r, i) => ({ ...r, rank: i + 1 }));
    if (byName.size > 0) {
      total_advertisers = byName.size;
      // Directional crowding: more distinct PI advertisers → more saturated.
      saturation = clamp01(byName.size / 20);
    }
  } else if (competitorsRes.status === "rejected") {
    errors.push("pi_competitors fetch failed");
  }

  /* county→DMA translation (DMAs resolved earlier, before the outlet fetch) - */

  /* local signal (FARS) ---------------------------------------------------- */
  // The narrative signal surfaces counties by death RATE (highlights rural
  // media-desert hotspots); the county→DMA translation maps counties by total
  // DEATHS (the populous metro counties our crosswalk covers) so the table is
  // never empty. Both come from the same FARS pull.
  let local_signal: LocalSignal | null = null;
  const farsForTranslation: string[] = [];
  if (accidentRes.status === "fulfilled" && !accidentRes.value.error) {
    const rows = (accidentRes.value.data as Array<Record<string, unknown>>) ?? [];
    const named = rows.filter((r) => String(r.county ?? "").trim());

    const byRate = [...named]
      .filter((r) => r.deaths_per_100k != null)
      .sort((a, b) => num(b.deaths_per_100k) - num(a.deaths_per_100k))
      .slice(0, 6)
      .map((r) => ({
        county_name: String(r.county).trim(),
        deaths_per_100k: r.deaths_per_100k == null ? null : num(r.deaths_per_100k),
        rural_pct: r.rural_pct == null ? null : num(r.rural_pct),
      }));
    if (byRate.length > 0) local_signal = { source: "FARS", top_counties: byRate };

    const byDeaths = [...named]
      .sort((a, b) => num(b.total_deaths) - num(a.total_deaths))
      .slice(0, 10)
      .map((r) => String(r.county).trim());
    farsForTranslation.push(...byDeaths);
  } else if (accidentRes.status === "rejected") {
    errors.push("accident_summary fetch failed");
  }

  // county→DMA translation via the hand-checked crosswalk. Unknown counties are
  // omitted (never guessed).
  const crosswalk = COUNTY_DMA_BY_STATE[state] ?? {};
  const seen = new Set<string>();
  const county_dma: CountyDmaLink[] = [];
  for (const county of farsForTranslation) {
    const dma = crosswalk[county];
    if (dma && !seen.has(county)) {
      seen.add(county);
      county_dma.push({ county_name: county, dma_name: dma, dma_rank: DMA_RANK_BY_NAME[dma] ?? null });
    }
  }

  /* channel audience fit ---------------------------------------------------- */
  // Primary: the national media_consumption_baseline (Pew + ATUS + Nielsen-cited)
  // weighted by THIS state's population demographic mix → a relative per-channel
  // fit. The scope rule lives in audience-fit.ts (prefer general reach; news only
  // as a ranking proxy — radio leans on the Nielsen general reach rows, never the
  // Pew radio-news row). The math is deterministic and never reaches the LLM.
  // Fallback: the legacy generic media_profiles indices. Honest degrade:
  // audience_fit stays false when neither source yields a row.
  const channelFit = new Map<
    ChannelKey,
    { fit: number; scope?: "general" | "news_proxy"; sources?: string[] }
  >();

  let baselineRows: BaselineRow[] = [];
  if (baselineRes.status === "fulfilled" && !baselineRes.value.error) {
    baselineRows = (baselineRes.value.data as BaselineRow[]) ?? [];
  } else if (baselineRes.status === "rejected") {
    errors.push("media_consumption_baseline fetch failed");
  }

  let censusRows: CensusRow[] = [];
  if (censusRes.status === "fulfilled" && !censusRes.value.error) {
    censusRows = (censusRes.value.data as CensusRow[]) ?? [];
  } else if (censusRes.status === "rejected") {
    errors.push("census_demographics fetch failed");
  }

  const demographicMix = buildDemographicMix(censusRows);
  if (baselineRows.length > 0) {
    for (const [ch, f] of computeAudienceFit(baselineRows, demographicMix)) {
      channelFit.set(ch, { fit: f.fit, scope: f.scope, sources: f.sources });
    }
  }

  // Fallback to the legacy generic media_profiles indices only if the baseline
  // produced nothing (e.g. the table is empty before the seed migration applies).
  if (channelFit.size === 0) {
    if (profilesRes.status === "fulfilled" && !profilesRes.value.error) {
      const rows = (profilesRes.value.data as Array<Record<string, unknown>>) ?? [];
      // Generic consumption profiles, no demographic weighting — fit is directional.
      // Average each channel's index across all rows.
      const idxCols: Array<[string, ChannelKey]> = [
        ["tv_linear_index", "tv_linear"],
        ["ctv_streaming_index", "ctv"],
        ["radio_index", "radio"],
        ["podcast_index", "podcast"],
        ["facebook_index", "facebook"],
        ["instagram_index", "instagram"],
        ["tiktok_index", "tiktok"],
        ["youtube_index", "youtube"],
        ["search_index", "search"],
        ["print_index", "print"],
      ];
      const sums = new Map<ChannelKey, { sum: number; n: number }>();
      for (const r of rows) {
        for (const [col, ch] of idxCols) {
          const v = r[col];
          if (v != null) {
            const cur = sums.get(ch) ?? { sum: 0, n: 0 };
            cur.sum += num(v);
            cur.n += 1;
            sums.set(ch, cur);
          }
        }
      }
      let maxAvg = 0;
      const avgs = new Map<ChannelKey, number>();
      for (const [ch, { sum, n }] of sums) {
        const a = n > 0 ? sum / n : 0;
        avgs.set(ch, a);
        if (a > maxAvg) maxAvg = a;
      }
      for (const [ch, a] of avgs) {
        channelFit.set(ch, { fit: maxAvg > 0 ? clamp01(a / maxAvg) : 0 });
      }
    } else if (profilesRes.status === "rejected") {
      errors.push("media_profiles fetch failed");
    }
  }

  /* channel competition (channel_competition_scores by DMA) ---------------- */
  // Keyed by geo-target UUID today, not the DMA code, so AL rarely matches.
  // When it doesn't, competition stays null (unknown) — honest, not zero.
  const channelComp = new Map<ChannelKey, number>();
  if (topDmaCode) {
    try {
      const { data, error } = await supabase
        .from("channel_competition_scores")
        .select("channel, competition_score")
        .eq("market_id", topDmaCode);
      if (!error && Array.isArray(data)) {
        for (const r of data as Array<Record<string, unknown>>) {
          const ch = normalizeChannel(String(r.channel ?? ""));
          if (ch) channelComp.set(ch, clamp01(num(r.competition_score)));
        }
      }
    } catch {
      errors.push("channel_competition_scores fetch failed");
    }
  }

  const channels: ChannelSignal[] = [];
  for (const [ch, f] of channelFit) {
    channels.push({
      channel: ch,
      fit: f.fit,
      competition: channelComp.has(ch) ? channelComp.get(ch)! : null,
      fit_scope: f.scope,
      fit_sources: f.sources,
    });
  }

  /* named outlets (media_outlets scoped to DMA + broadcast_stations) -------- */
  const outlets: NamedOutlet[] = [];
  const outletSeen = new Set<string>();
  // When a market is selected, scope strictly to it; else allow all state DMAs.
  // Finding 5: in strict mode the scope set may be empty (unmatched dmaCode) — that
  // must produce zero outlets, not a statewide pass.  Non-strict keeps the old guard.
  // The set carries the NORMALIZED display AND full_name of each in-scope DMA so
  // Nielsen market variants ("Dallas-Ft.Worth") match short dim labels ("Dallas").
  const scopedDmaPairs = strictMarket
    ? selectedDmaPair
      ? [selectedDmaPair]
      : []
    : stateDmaPairs;
  const dmaNameSet = buildNormalizedDmaSet(scopedDmaPairs);
  // Selected DMA's normalized labels — used for the strict broadcast in-market filter.
  const selectedDmaSet = buildNormalizedDmaSet(selectedDmaPair ? [selectedDmaPair] : []);
  if (outletsRes.status === "fulfilled" && !outletsRes.value.error) {
    const rows = (outletsRes.value.data as Array<Record<string, unknown>>) ?? [];
    for (const r of rows) {
      const market = String(r.market ?? "").trim();
      if (strictMarket) {
        // Strict: outlet must be in the scoped set; empty set → exclude all.
        if (!market || !dmaNameSet.has(normalizeDmaName(market))) continue;
      } else if (dmaNameSet.size > 0 && market && !dmaNameSet.has(normalizeDmaName(market))) {
        continue;
      }
      const name = String(r.call_sign ?? r.media_company ?? "").trim();
      const ch = formatToChannel(String(r.media_format ?? ""), name);
      if (!ch || !name || outletSeen.has(name)) continue;
      outletSeen.add(name);
      outlets.push({
        name,
        channel: ch,
        format_genre: r.format_genre ? String(r.format_genre) : undefined,
        dma_name: market || topDmaName || undefined,
      });
      if (outlets.length >= 16) break;
    }
  } else if (outletsRes.status === "rejected") {
    errors.push("media_outlets fetch failed");
  }
  // Backfill broadcast stations (TV/radio) for the state if outlets are thin.
  // Finding 5: if dmaCode was given but unresolved, there is no market to scope to —
  // skip the backfill entirely so we never return out-of-market stations.
  if (outlets.length < 6 && !(strictMarket && !topDmaName)) {
    try {
      const { data, error } = await supabase
        .from("broadcast_stations")
        .select("call_sign, service_type, community_city, network_affil, nielsen_dma, active")
        .eq("community_state", state)
        .limit(40);
      if (!error && Array.isArray(data)) {
        for (const r of data as Array<Record<string, unknown>>) {
          if (r.active === false) continue;
          if (opts.dmaCode && topDmaName) {
            // Normalized match against the selected DMA's display + full_name, so
            // "DALLAS-FT. WORTH" matches the "Dallas" dim row via full_name.
            if (!selectedDmaSet.has(normalizeDmaName(String(r.nielsen_dma ?? "")))) continue;
          }
          const name = String(r.call_sign ?? "").trim();
          const ch = formatToChannel(String(r.service_type ?? ""), name);
          if (!ch || !name || outletSeen.has(name)) continue;
          outletSeen.add(name);
          outlets.push({
            name,
            channel: ch,
            network: r.network_affil ? String(r.network_affil) : undefined,
            dma_name: r.nielsen_dma ? String(r.nielsen_dma) : topDmaName || undefined,
          });
          if (outlets.length >= 12) break;
        }
      }
    } catch {
      errors.push("broadcast_stations fetch failed");
    }
  }

  const inputs: StrategyInputs = {
    state_abbr: state,
    state_name: stateName,
    tort_slug: tortSlug,
    tort_label: tortLabel,
    saturation,
    total_advertisers,
    top_advertisers,
    channels,
    outlets,
    county_dma,
    top_dma_name: topDmaName,
    local_signal,
    demographic_note: deriveDemographicNote(demographicMix),
    available: {
      saturation: saturation != null,
      competition: channelComp.size > 0,
      audience_fit: channelFit.size > 0,
      outlets: outlets.length > 0,
      local_signal: local_signal != null,
    },
  };

  return { inputs, errors };
}
