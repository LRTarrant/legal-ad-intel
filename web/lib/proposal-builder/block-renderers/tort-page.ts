/**
 * Tort Page block → 2–3 slides:
 *   1. Tort Overview      — MDL identity, case-count trend, qualification gist
 *   2. Advertiser Landscape — tracked advertisers, segment-mix donut, spend
 *   3. Recent Developments  — only when mdl_developments has rows
 *
 * Reads go through the service-role client passed in so we can join
 * mass_torts → mdls → mdl_stats_monthly / mdl_developments without
 * per-user RLS gaps. The advertiser landscape uses the same RPCs the live
 * /advertising/<tort> pages use (ad_observations_raw via the legacy `torts`
 * dimension) rather than ad_events.mass_tort_id, which is unpopulated.
 */

import type { ProposalBlockRow } from "@/lib/proposal-builder/types";
import {
  type SlideSpec,
  fallbackSlide,
} from "@/lib/proposal-builder/slide-spec";
import { getQualificationCriteria } from "@/lib/data/tort-qualification-criteria";
import { type SupabaseLike, fmtInt, fmtUsd, shortDate } from "./shared";

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

interface SegmentSummaryRow {
  segment: string;
  advertiser_count: number;
  total_spend: number | string;
  total_creatives: number;
}

interface TopAdvertiserRow {
  advertiser_name: string;
  segment: string;
  entity_type: string;
  total_spend: number | string;
  total_creatives: number;
  market_count: number;
}

const SEGMENT_LABELS: Record<string, string> = {
  on_docket: "On-docket firms",
  off_docket: "Off-docket firms",
  aggregator: "Lead aggregators",
  marketing: "Marketing / agency",
  unknown: "Unclassified",
  unclassified: "Unclassified",
};

function humanizeSegment(s: string | null | undefined): string {
  const k = (s ?? "").toLowerCase();
  if (SEGMENT_LABELS[k]) return SEGMENT_LABELS[k];
  if (!k) return "Unclassified";
  return k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

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
  slides.push(await buildAdvertiserLandscape(supabase, tort, label));

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

/**
 * Mirrors the live /advertising/<tort> pages. Those pages read advertiser
 * activity from ad_observations_raw joined through the legacy `torts`
 * dimension via the get_top_advertisers_by_segment / get_segment_summary
 * RPCs — NOT ad_events.mass_tort_id (that column is unpopulated for these
 * torts, which is why Phase 2 rendered empty advertiser slides). The block
 * stores the hyphenated mass_torts slug; the RPCs key on the legacy
 * underscore slug (or its slug_alias), so we convert hyphen → underscore.
 */
async function buildAdvertiserLandscape(
  supabase: SupabaseLike,
  tort: MassTortRow,
  label: string,
): Promise<SlideSpec> {
  const legacySlug = (tort.slug ?? "").replace(/-/g, "_");

  const [topRes, segRes] = await Promise.all([
    supabase.rpc("get_top_advertisers_by_segment", {
      p_tort_slug: legacySlug,
      p_limit: 8,
      p_source: null,
    }),
    supabase.rpc("get_segment_summary", {
      p_tort_slug: legacySlug,
      p_source: null,
    }),
  ]);

  const top = (topRes?.data ?? []) as TopAdvertiserRow[];
  const segments = (segRes?.data ?? []) as SegmentSummaryRow[];

  if (top.length === 0) {
    return {
      kicker: "Advertiser Landscape",
      heading: `${label} — Advertiser Landscape`,
      bullets: [
        `No tracked ad activity for ${label} in the LMI ad observation feed yet.`,
        "Advertiser tracking populates as creatives are observed across Meta, Google, and TikTok.",
      ],
      footnote: "Source: LMI ad observation feed (cumulative, estimates)",
      fallback: true,
    };
  }

  const advertiserCount = segments.reduce(
    (s, r) => s + Number(r.advertiser_count || 0),
    0,
  );
  const totalSpend = segments.reduce(
    (s, r) => s + Number(r.total_spend || 0),
    0,
  );
  const totalCreatives = segments.reduce(
    (s, r) => s + Number(r.total_creatives || 0),
    0,
  );

  const segMix = segments
    .filter((s) => Number(s.advertiser_count || 0) > 0)
    .slice(0, 6);

  return {
    kicker: "Advertiser Landscape",
    heading: `${label} — Advertiser Landscape`,
    stats: [
      {
        label: "Tracked advertisers",
        value: fmtInt(advertiserCount || top.length),
      },
      { label: "Est. ad spend", value: fmtUsd(totalSpend) },
      { label: "Creatives", value: fmtInt(totalCreatives) },
    ],
    chart:
      segMix.length > 0
        ? {
            type: "doughnut",
            series: [
              {
                name: "Advertiser mix",
                labels: segMix.map((s) => humanizeSegment(s.segment)),
                values: segMix.map((s) => Number(s.advertiser_count || 0)),
              },
            ],
            caption: "Tracked advertisers by segment",
          }
        : undefined,
    table: {
      columns: ["Top advertiser", "Segment", "Est. spend"],
      rows: top.map((a) => [
        a.advertiser_name || "Unattributed",
        humanizeSegment(a.segment),
        fmtUsd(Number(a.total_spend || 0)),
      ]),
    },
    footnote:
      "Source: LMI ad observation feed (cumulative, estimates) · matches the live tort page",
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
