/**
 * Tort Page block → 2–3 slides:
 *   1. Tort Overview      — MDL identity, case-count trend, qualification gist
 *   2. Advertiser Landscape — top advertisers, channel-mix donut, saturation
 *   3. Recent Developments  — only when mdl_developments has rows
 *
 * All reads go through the service-role client passed in so we can join
 * mass_torts → mdls → mdl_stats_monthly / mdl_developments / ad_events
 * without per-user RLS gaps.
 */

import type { ProposalBlockRow } from "@/lib/proposal-builder/types";
import { resolveDateRange } from "@/lib/proposal-builder/types";
import {
  type SlideSpec,
  fallbackSlide,
} from "@/lib/proposal-builder/slide-spec";
import { getQualificationCriteria } from "@/lib/data/tort-qualification-criteria";
import {
  type SupabaseLike,
  channelBucket,
  fmtInt,
  pctDelta,
  rangeLabel,
  shortDate,
} from "./shared";

interface MassTortRow {
  id: string;
  name: string;
  slug: string | null;
  status: string | null;
  category: string | null;
  disease_or_injury: string | null;
  product_or_exposure: string | null;
}

interface MdlRow {
  id: string;
  mdl_number: number;
  title: string;
  court: string | null;
  district: string | null;
  judge_name: string | null;
  status: string | null;
  filed_date: string | null;
}

interface StatsRow {
  stats_month: string;
  pending_actions: number | null;
  pending_actions_change: number | null;
}

interface AdRow {
  advertiser_name_raw: string | null;
  source: string | null;
  channel: string | null;
  event_date: string;
}

const CHANNELS = ["TV", "Digital", "Radio", "CTV", "Other"] as const;

export async function renderTortPage(
  block: ProposalBlockRow,
  supabase: SupabaseLike,
): Promise<SlideSpec[]> {
  const data = block.block_data ?? {};
  const slug = String(data.tort_slug ?? "").trim();
  const label = (typeof data.label === "string" && data.label) || slug;
  if (!slug) {
    return [fallbackSlide(label || "Tort Page", "No tort selected.", "Tort Spotlight")];
  }

  const { date_from, date_to } = resolveDateRange(data);

  const { data: tortRow } = await supabase
    .from("mass_torts")
    .select(
      "id, name, slug, status, category, disease_or_injury, product_or_exposure",
    )
    .eq("slug", slug)
    .maybeSingle();
  const tort = tortRow as MassTortRow | null;

  if (!tort) {
    return [
      fallbackSlide(
        label,
        `No mass-tort record matches "${slug}". It may have been renamed or removed.`,
        "Tort Spotlight",
      ),
    ];
  }

  // Pick the most relevant MDL: prefer an open one, newest filing first.
  const { data: mdlRows } = await supabase
    .from("mdls")
    .select(
      "id, mdl_number, title, court, district, judge_name, status, filed_date",
    )
    .eq("mass_tort_id", tort.id)
    .order("filed_date", { ascending: false });
  const mdls = (mdlRows ?? []) as MdlRow[];
  const mdl =
    mdls.find((m) => (m.status ?? "").toLowerCase() !== "closed") ??
    mdls[0] ??
    null;

  const slides: SlideSpec[] = [];
  slides.push(
    await buildOverview(supabase, tort, mdl, slug, label),
  );
  slides.push(
    await buildAdvertiserLandscape(
      supabase,
      tort,
      label,
      date_from,
      date_to,
    ),
  );

  if (mdl) {
    const devSlide = await buildDevelopments(supabase, mdl, label);
    if (devSlide) slides.push(devSlide);
  }

  return slides;
}

async function buildOverview(
  supabase: SupabaseLike,
  tort: MassTortRow,
  mdl: MdlRow | null,
  slug: string,
  label: string,
): Promise<SlideSpec> {
  const stats: SlideSpec["stats"] = [];
  let trend: SlideSpec["chart"] | undefined;
  const footnote = `Source: LMI MDL tracker · /advertising/${slug}`;

  if (mdl) {
    const { data: statsRows } = await supabase
      .from("mdl_stats_monthly")
      .select("stats_month, pending_actions, pending_actions_change")
      .eq("mdl_id", mdl.id)
      .order("stats_month", { ascending: true });
    const sm = (statsRows ?? []) as StatsRow[];
    const recent = sm.slice(-6);
    const latest = sm[sm.length - 1];
    const prev = sm[sm.length - 2];

    if (latest) {
      const mom =
        prev?.pending_actions != null && latest.pending_actions != null
          ? latest.pending_actions - prev.pending_actions
          : (latest.pending_actions_change ?? 0);
      stats.push({
        label: "Active Cases",
        value: fmtInt(latest.pending_actions),
        delta: `${mom >= 0 ? "+" : "-"}${fmtInt(Math.abs(mom))} MoM`,
      });
      stats.push({
        label: "Latest Report",
        value: new Date(
          `${latest.stats_month}T00:00:00Z`,
        ).toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }),
      });
    }
    if (recent.length >= 2) {
      trend = {
        type: "line",
        series: [
          {
            name: "Active cases",
            labels: recent.map((r) =>
              new Date(`${r.stats_month}T00:00:00Z`).toLocaleDateString(
                "en-US",
                { month: "short", timeZone: "UTC" },
              ),
            ),
            values: recent.map((r) => Number(r.pending_actions ?? 0)),
          },
        ],
        caption: "Pending actions, recent monthly snapshots (JPML)",
      };
    }
  }

  const bullets: string[] = [];
  if (mdl) {
    bullets.push(
      `MDL ${mdl.mdl_number} — ${mdl.title}`.trim(),
    );
    const venue = [mdl.district || mdl.court, mdl.judge_name]
      .filter(Boolean)
      .join(" · Judge ");
    if (venue) bullets.push(venue);
  } else {
    bullets.push("No consolidated MDL on file yet — pre-consolidation tort.");
  }
  if (tort.disease_or_injury)
    bullets.push(`Injury: ${tort.disease_or_injury}`);
  if (tort.product_or_exposure)
    bullets.push(`Product / exposure: ${tort.product_or_exposure}`);

  const criteria = getQualificationCriteria(slug);
  if (criteria && criteria.screeningQuestions.length) {
    bullets.push("");
    bullets.push("Key qualification criteria:");
    for (const q of criteria.screeningQuestions.slice(0, 4)) {
      bullets.push(`• ${q.question}`);
    }
  }

  return {
    kicker: "Tort Spotlight",
    heading: tort.name || label,
    subheading: tort.category ?? undefined,
    stats,
    chart: trend,
    bullets,
    footnote,
  };
}

async function buildAdvertiserLandscape(
  supabase: SupabaseLike,
  tort: MassTortRow,
  label: string,
  date_from: string,
  date_to: string,
): Promise<SlideSpec> {
  // ad_events is the time-series fact; join by mass_tort_id within range.
  const { data: adRows } = await supabase
    .from("ad_events")
    .select("advertiser_name_raw, source, channel, event_date")
    .eq("mass_tort_id", tort.id)
    .gte("event_date", date_from)
    .lte("event_date", date_to)
    .limit(20000);
  const ads = (adRows ?? []) as AdRow[];

  if (ads.length === 0) {
    return {
      kicker: "Advertiser Landscape",
      heading: `${label} — Advertiser Landscape`,
      bullets: [
        `No tracked ad activity for ${label} between ${rangeLabel(date_from, date_to)}.`,
        "Widen the date range or check back after the next ad-intel ingest.",
      ],
      footnote: `Window: ${rangeLabel(date_from, date_to)} · Source: LMI ad observation feed`,
      fallback: true,
    };
  }

  // Top advertisers by ad volume.
  const byAdv = new Map<string, number>();
  const byChannel = new Map<string, number>();
  for (const a of ads) {
    const name = (a.advertiser_name_raw ?? "").trim() || "Unattributed";
    byAdv.set(name, (byAdv.get(name) ?? 0) + 1);
    const b = channelBucket(a.source, a.channel);
    byChannel.set(b, (byChannel.get(b) ?? 0) + 1);
  }
  const topAdv = [...byAdv.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Week-over-week delta on the last two 7-day windows of the range.
  const end = new Date(`${date_to}T00:00:00Z`);
  const w1Start = new Date(end.getTime() - 6 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const w0End = new Date(end.getTime() - 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const w0Start = new Date(end.getTime() - 13 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  let lastWeek = 0;
  let priorWeek = 0;
  for (const a of ads) {
    if (a.event_date >= w1Start) lastWeek += 1;
    else if (a.event_date >= w0Start && a.event_date <= w0End)
      priorWeek += 1;
  }

  const channelSeries = CHANNELS.filter((c) => (byChannel.get(c) ?? 0) > 0);

  return {
    kicker: "Advertiser Landscape",
    heading: `${label} — Advertiser Landscape`,
    stats: [
      { label: "Advertisers", value: fmtInt(byAdv.size) },
      { label: "Ad observations", value: fmtInt(ads.length) },
      {
        label: "Ad volume (last 7d)",
        value: fmtInt(lastWeek),
        delta: `${pctDelta(lastWeek, priorWeek)} WoW`,
      },
    ],
    chart: {
      type: "doughnut",
      series: [
        {
          name: "Channel mix",
          labels: channelSeries,
          values: channelSeries.map((c) => byChannel.get(c) ?? 0),
        },
      ],
      caption: "Share of tracked ad observations by channel",
    },
    table: {
      columns: ["Top advertiser", "Ad observations"],
      rows: topAdv.map(([n, c]) => [n, fmtInt(c)]),
    },
    footnote: `Window: ${rangeLabel(date_from, date_to)} · Source: LMI ad observation feed (estimates)`,
  };
}

async function buildDevelopments(
  supabase: SupabaseLike,
  mdl: MdlRow,
  label: string,
): Promise<SlideSpec | null> {
  const { data: devRows } = await supabase
    .from("mdl_developments")
    .select("title, summary, source_name, source_url, event_date")
    .eq("mdl_number", mdl.mdl_number)
    .order("event_date", { ascending: false })
    .limit(5);
  const devs = (devRows ?? []) as {
    title: string;
    summary: string | null;
    source_name: string | null;
    source_url: string | null;
    event_date: string;
  }[];
  if (devs.length === 0) return null;

  return {
    kicker: "Recent Developments",
    heading: `${label} — Recent Developments`,
    table: {
      columns: ["Date", "Headline", "Source"],
      rows: devs.map((d) => [
        shortDate(d.event_date),
        d.title,
        d.source_name || "—",
      ]),
    },
    footnote: `MDL ${mdl.mdl_number} · Source: LMI development tracker`,
  };
}
