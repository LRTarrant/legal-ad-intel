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
  "Mobile": 60,
  Huntsville: 79,
  Montgomery: 118,
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

/** Map a broadcast/outlet media format to a channel key. */
function formatToChannel(format: string, mediaType?: string): ChannelKey | null {
  const f = format.trim().toLowerCase();
  if (f.includes("radio") || f === "am" || f === "fm") return "radio";
  if (f.includes("stream") || f.includes("ctv") || f.includes("ott")) return "ctv";
  if (f.includes("tv") || f === "dt" || f === "tx") return "tv_linear";
  if (f.includes("podcast")) return "podcast";
  if (f.includes("print") || f.includes("news")) return mediaType === "print" ? "print" : null;
  return null;
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

const num = (v: unknown): number => (typeof v === "number" ? v : Number(v) || 0);
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/* ── The assembler ──────────────────────────────────────────────────────── */

export interface AssembleResult {
  inputs: StrategyInputs;
  /** Non-fatal source errors, for logging / a DataHealthBanner. */
  errors: string[];
}

export async function assembleStrategyInputs(
  supabase: SupabaseLike,
  stateAbbr: string,
  opts: { tortSlug?: string; tortLabel?: string } = {},
): Promise<AssembleResult> {
  const state = stateAbbr.toUpperCase();
  const stateName = STATE_NAMES[state] ?? state;
  const tortSlug = opts.tortSlug ?? "personal_injury";
  const tortLabel = opts.tortLabel ?? "Personal Injury";
  const errors: string[] = [];

  // Fetch every block independently; never let one failure sink the rest.
  const [
    advertisersRes,
    summaryRes,
    dmaRes,
    accidentRes,
    profilesRes,
    outletsRes,
  ] = await Promise.allSettled([
    supabase.rpc("get_top_advertisers_by_segment", { p_tort_slug: tortSlug, p_limit: 8 }),
    supabase.rpc("get_segment_summary", { p_tort_slug: tortSlug }),
    supabase
      .from("dma_markets")
      .select("dma_code, display_name, full_name, rank, states_covered")
      .contains("states_covered", [state])
      .order("rank", { ascending: true }),
    supabase.rpc("get_state_accident_summary", { p_state: state }),
    supabase.from("media_profiles").select("*"),
    supabase
      .from("media_outlets")
      .select("call_sign, media_company, media_format, media_type, format_genre, market"),
  ]);

  /* top advertisers + Gorilla share ---------------------------------------- */
  let top_advertisers: AdvertiserShare[] = [];
  if (advertisersRes.status === "fulfilled" && !advertisersRes.value.error) {
    const rows = (advertisersRes.value.data as Array<Record<string, unknown>>) ?? [];
    const withSpend = rows
      .map((r) => ({ name: String(r.advertiser_name ?? "").trim(), spend: num(r.total_spend) }))
      .filter((r) => r.name);
    const totalSpend = withSpend.reduce((s, r) => s + r.spend, 0);
    top_advertisers = withSpend
      .map((r, i) => ({
        name: r.name,
        share: totalSpend > 0 ? r.spend / totalSpend : 0,
        rank: i + 1,
      }))
      .sort((a, b) => b.share - a.share)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  } else if (advertisersRes.status === "rejected") {
    errors.push("top_advertisers fetch failed");
  }

  /* market crowding proxy (directional saturation) ------------------------- */
  let saturation: number | null = null;
  let total_advertisers: number | null = null;
  if (summaryRes.status === "fulfilled" && !summaryRes.value.error) {
    const rows = (summaryRes.value.data as Array<Record<string, unknown>>) ?? [];
    const row = rows[0];
    if (row) {
      total_advertisers = num(row.advertiser_count) || null;
      // Directional crowding: more distinct advertisers → more saturated.
      // Capped well below 1 so it nudges, never dominates, the score.
      if (total_advertisers != null) saturation = clamp01(total_advertisers / 40);
    }
  } else if (summaryRes.status === "rejected") {
    errors.push("segment_summary fetch failed");
  }

  /* DMAs + county→DMA translation ------------------------------------------ */
  let topDmaName: string | null = null;
  let topDmaCode: string | null = null;
  const dmaNames: string[] = [];
  if (dmaRes.status === "fulfilled" && !dmaRes.value.error) {
    const rows = (dmaRes.value.data as Array<Record<string, unknown>>) ?? [];
    for (const r of rows) {
      const display = String(r.display_name ?? r.full_name ?? "").trim();
      if (display) dmaNames.push(display);
    }
    if (rows[0]) {
      topDmaName = String(rows[0].display_name ?? rows[0].full_name ?? "").trim() || null;
      topDmaCode = String(rows[0].dma_code ?? "").trim() || null;
    }
  } else if (dmaRes.status === "rejected") {
    errors.push("dma_markets fetch failed");
  }

  /* local signal (FARS) ---------------------------------------------------- */
  let local_signal: LocalSignal | null = null;
  const farsCounties: string[] = [];
  if (accidentRes.status === "fulfilled" && !accidentRes.value.error) {
    const rows = (accidentRes.value.data as Array<Record<string, unknown>>) ?? [];
    const counties = rows
      .filter((r) => r.deaths_per_100k != null)
      .sort((a, b) => num(b.deaths_per_100k) - num(a.deaths_per_100k))
      .slice(0, 6)
      .map((r) => ({
        county_name: String(r.county ?? "").trim(),
        deaths_per_100k: r.deaths_per_100k == null ? null : num(r.deaths_per_100k),
        rural_pct: r.rural_pct == null ? null : num(r.rural_pct),
      }))
      .filter((c) => c.county_name);
    if (counties.length > 0) {
      local_signal = { source: "FARS", top_counties: counties };
      farsCounties.push(...counties.map((c) => c.county_name));
    }
  } else if (accidentRes.status === "rejected") {
    errors.push("accident_summary fetch failed");
  }

  // Build the county→DMA translation from the FARS counties we actually have,
  // using the hand-checked crosswalk. Unknown counties are omitted (never guessed).
  const crosswalk = COUNTY_DMA_BY_STATE[state] ?? {};
  const seen = new Set<string>();
  const county_dma: CountyDmaLink[] = [];
  for (const county of farsCounties) {
    const dma = crosswalk[county];
    if (dma && !seen.has(county)) {
      seen.add(county);
      county_dma.push({ county_name: county, dma_name: dma, dma_rank: DMA_RANK_BY_NAME[dma] ?? null });
    }
  }

  /* channel audience fit (media_profiles, scale-independent) ---------------- */
  const channelFit = new Map<ChannelKey, number>();
  if (profilesRes.status === "fulfilled" && !profilesRes.value.error) {
    const rows = (profilesRes.value.data as Array<Record<string, unknown>>) ?? [];
    // Restrict to the top DMA's market when we can match it; else use all rows.
    const scoped = topDmaCode
      ? rows.filter((r) => String(r.market_id ?? "").includes(topDmaCode!))
      : [];
    const used = scoped.length > 0 ? scoped : rows;
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
    // Average each channel's index across the (age-band) rows.
    const sums = new Map<ChannelKey, { sum: number; n: number }>();
    for (const r of used) {
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
    const avgs = new Map<ChannelKey, number>();
    let maxAvg = 0;
    for (const [ch, { sum, n }] of sums) {
      const a = n > 0 ? sum / n : 0;
      avgs.set(ch, a);
      if (a > maxAvg) maxAvg = a;
    }
    // Scale-independent fit: normalize against the strongest channel in-market.
    for (const [ch, a] of avgs) {
      channelFit.set(ch, maxAvg > 0 ? clamp01(a / maxAvg) : 0);
    }
  } else if (profilesRes.status === "rejected") {
    errors.push("media_profiles fetch failed");
  }

  /* channel competition (channel_competition_scores by DMA) ---------------- */
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

  // Merge fit + competition into channel signals. A channel needs at least a
  // fit signal to be worth planning; competition is optional (null = unknown).
  const channels: ChannelSignal[] = [];
  for (const [ch, fit] of channelFit) {
    channels.push({ channel: ch, fit, competition: channelComp.has(ch) ? channelComp.get(ch)! : null });
  }

  /* named outlets (media_outlets scoped to DMA + broadcast_stations) -------- */
  const outlets: NamedOutlet[] = [];
  const outletSeen = new Set<string>();
  if (outletsRes.status === "fulfilled" && !outletsRes.value.error) {
    const rows = (outletsRes.value.data as Array<Record<string, unknown>>) ?? [];
    for (const r of rows) {
      const market = String(r.market ?? "").trim();
      // Loosely scope to one of this state's DMA names.
      const inState = dmaNames.some((d) => market && d.toLowerCase().includes(market.toLowerCase().split(" ")[0]));
      if (dmaNames.length > 0 && market && !inState) continue;
      const ch = formatToChannel(String(r.media_format ?? ""), String(r.media_type ?? ""));
      const name = String(r.call_sign ?? r.media_company ?? "").trim();
      if (!ch || !name || outletSeen.has(name)) continue;
      outletSeen.add(name);
      outlets.push({
        name,
        channel: ch,
        format_genre: r.format_genre ? String(r.format_genre) : undefined,
        dma_name: market || topDmaName || undefined,
      });
    }
  }
  // Backfill broadcast stations (TV/radio) for the state if outlets are thin.
  if (outlets.length < 6) {
    try {
      const { data, error } = await supabase
        .from("broadcast_stations")
        .select("call_sign, service_type, community_city, network_affil, nielsen_dma, active")
        .eq("community_state", state)
        .limit(40);
      if (!error && Array.isArray(data)) {
        for (const r of data as Array<Record<string, unknown>>) {
          if (r.active === false) continue;
          const ch = formatToChannel(String(r.service_type ?? ""));
          const name = String(r.call_sign ?? "").trim();
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
