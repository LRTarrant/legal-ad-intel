/**
 * Ad Intel block. One renderer per sub-surface; Advertisers + Saturation
 * resolve real data (the surfaces the user pitches with today), the rest
 * return a single "Coming soon" slide so the dropdown stays complete and
 * the long tail can be filled in a follow-up without touching the export
 * pipeline.
 */

import type { ProposalBlockRow } from "@/lib/proposal-builder/types";
import { resolveDateRange } from "@/lib/proposal-builder/types";
import { AD_INTEL_SURFACES } from "@/lib/proposal-builder/types";
import type { SlideSpec } from "@/lib/proposal-builder/slide-spec";
import {
  type SupabaseLike,
  fmtInt,
  rangeLabel,
  weekKey,
  shortDate,
} from "./shared";

const SURFACE_LABEL: Record<string, string> = Object.fromEntries(
  AD_INTEL_SURFACES.map((s) => [s.id, s.label]),
);

interface AdRow {
  advertiser_name_raw: string | null;
  firm_id: string | null;
  state_code: string | null;
  dma_code: string | null;
  event_date: string;
}

export async function renderAdIntel(
  block: ProposalBlockRow,
  supabase: SupabaseLike,
): Promise<SlideSpec[]> {
  const data = block.block_data ?? {};
  const surface = String(data.surface ?? "").trim();
  const label =
    (typeof data.label === "string" && data.label) ||
    SURFACE_LABEL[surface] ||
    surface;
  const { date_from, date_to } = resolveDateRange(data);

  switch (surface) {
    case "advertisers":
      return renderAdvertisers(supabase, label, date_from, date_to);
    case "saturation":
      return renderSaturation(supabase, label, date_from, date_to);
    default:
      return [comingSoon(label, surface)];
  }
}

function comingSoon(label: string, surface: string): SlideSpec {
  return {
    kicker: "Ad Intelligence",
    heading: label || "Ad Intelligence",
    bullets: [
      `Deep rendering for the ${label} surface is coming soon.`,
      surface ? `Live view: /advertising/${surface}` : "",
    ].filter(Boolean),
    fallback: true,
  };
}

async function loadAds(
  supabase: SupabaseLike,
  date_from: string,
  date_to: string,
): Promise<AdRow[]> {
  const { data } = await supabase
    .from("ad_events")
    .select("advertiser_name_raw, firm_id, state_code, dma_code, event_date")
    .gte("event_date", date_from)
    .lte("event_date", date_to)
    .order("event_date", { ascending: false })
    .limit(20000);
  return (data ?? []) as AdRow[];
}

async function renderAdvertisers(
  supabase: SupabaseLike,
  label: string,
  date_from: string,
  date_to: string,
): Promise<SlideSpec[]> {
  const ads = await loadAds(supabase, date_from, date_to);
  if (ads.length === 0) {
    return [
      {
        kicker: "Ad Intelligence",
        heading: `${label} — Advertisers`,
        bullets: [
          `No tracked ad activity between ${rangeLabel(date_from, date_to)}.`,
        ],
        footnote: `Window: ${rangeLabel(date_from, date_to)}`,
        fallback: true,
      },
    ];
  }

  const count = new Map<string, number>();
  const firmOf = new Map<string, Map<string, number>>();
  for (const a of ads) {
    const name = (a.advertiser_name_raw ?? "").trim() || "Unattributed";
    count.set(name, (count.get(name) ?? 0) + 1);
    if (a.firm_id) {
      const m = firmOf.get(name) ?? new Map<string, number>();
      m.set(a.firm_id, (m.get(a.firm_id) ?? 0) + 1);
      firmOf.set(name, m);
    }
  }
  const top = [...count.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Resolve the dominant firm affiliation per advertiser.
  const firmIds = new Set<string>();
  for (const [name] of top) {
    const m = firmOf.get(name);
    if (m) {
      const best = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
      if (best) firmIds.add(best[0]);
    }
  }
  const firmName = new Map<string, string>();
  if (firmIds.size > 0) {
    const { data: firms } = await supabase
      .from("firms")
      .select("id, name")
      .in("id", [...firmIds]);
    for (const f of (firms ?? []) as { id: string; name: string }[]) {
      firmName.set(f.id, f.name);
    }
  }

  const affiliationFor = (name: string): string => {
    const m = firmOf.get(name);
    if (!m) return "—";
    const best = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
    return (best && firmName.get(best[0])) || "—";
  };

  return [
    {
      kicker: "Ad Intelligence",
      heading: `${label} — Top Advertisers`,
      stats: [
        { label: "Advertisers", value: fmtInt(count.size) },
        { label: "Ad observations", value: fmtInt(ads.length) },
      ],
      chart: {
        type: "bar",
        series: [
          {
            name: "Ad observations",
            labels: top.map(([n]) =>
              n.length > 22 ? `${n.slice(0, 21)}…` : n,
            ),
            values: top.map(([, c]) => c),
          },
        ],
        caption: "Top 10 advertisers by tracked ad observations",
      },
      table: {
        columns: ["Advertiser", "Firm affiliation", "Ad observations"],
        rows: top.map(([n, c]) => [n, affiliationFor(n), fmtInt(c)]),
      },
      footnote: `Window: ${rangeLabel(date_from, date_to)} · Source: LMI ad observation feed (estimates)`,
    },
  ];
}

async function renderSaturation(
  supabase: SupabaseLike,
  label: string,
  date_from: string,
  date_to: string,
): Promise<SlideSpec[]> {
  const ads = await loadAds(supabase, date_from, date_to);
  if (ads.length === 0) {
    return [
      {
        kicker: "Ad Intelligence",
        heading: `${label} — Market Saturation`,
        bullets: [
          `No tracked ad activity between ${rangeLabel(date_from, date_to)}.`,
        ],
        footnote: `Window: ${rangeLabel(date_from, date_to)}`,
        fallback: true,
      },
    ];
  }

  const advertisers = new Set<string>();
  const markets = new Set<string>();
  const byState = new Map<string, number>();
  // Weekly distinct-advertiser series.
  const weekAdvs = new Map<string, Set<string>>();
  for (const a of ads) {
    const name = (a.advertiser_name_raw ?? "").trim() || "Unattributed";
    advertisers.add(name);
    const mkt = a.dma_code || a.state_code;
    if (mkt) markets.add(mkt);
    if (a.state_code)
      byState.set(a.state_code, (byState.get(a.state_code) ?? 0) + 1);
    const wk = weekKey(a.event_date);
    const set = weekAdvs.get(wk) ?? new Set<string>();
    set.add(name);
    weekAdvs.set(wk, set);
  }

  const weeks = [...weekAdvs.keys()].sort();
  const topStates = [...byState.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return [
    {
      kicker: "Ad Intelligence",
      heading: `${label} — Market Saturation`,
      stats: [
        { label: "Active advertisers", value: fmtInt(advertisers.size) },
        { label: "Ad observations", value: fmtInt(ads.length) },
        { label: "Markets reached", value: fmtInt(markets.size) },
      ],
      chart: {
        type: "line",
        series: [
          {
            name: "Distinct advertisers",
            labels: weeks.map((w) => shortDate(w)),
            values: weeks.map((w) => weekAdvs.get(w)?.size ?? 0),
          },
        ],
        caption: "Distinct advertisers per week over the selected range",
      },
      table: {
        columns: ["State", "Ad observations"],
        rows: topStates.map(([s, c]) => [s, fmtInt(c)]),
      },
      footnote: `Window: ${rangeLabel(date_from, date_to)} · Source: LMI ad observation feed (estimates)`,
    },
  ];
}
