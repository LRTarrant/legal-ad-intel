"use client";

import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ExternalLink } from "lucide-react";

/* ───────────────────────── types ───────────────────────── */

export type BaselineRow = {
  demographic_type: string;
  demographic_group: string;
  channel: string;
  metric: string;
  scope: string;
  value: number;
  unit: string | null;
  source: string | null;
  source_url: string | null;
  source_year: number | null;
  notes: string | null;
};

type Axis = "race" | "age" | "income";

/* ───────────────────────── label maps ───────────────────────── */

const AXES: { key: Axis; label: string; blurb: string }[] = [
  { key: "race", label: "Race & ethnicity", blurb: "How each channel reaches Black, Hispanic, White and Asian adults." },
  { key: "age", label: "Age", blurb: "Where each channel skews young or holds with older audiences." },
  { key: "income", label: "Income", blurb: "Which channels over-index with lower- vs upper-income households." },
];

// Channel display names + the families that order the page.
const CHANNEL_LABEL: Record<string, string> = {
  tv_linear: "Broadcast TV", ctv: "Connected TV / streaming", radio: "Radio",
  radio_urban: "Urban radio formats", podcast: "Podcast", all_media: "All media",
  youtube: "YouTube", facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok",
  snapchat: "Snapchat", whatsapp: "WhatsApp", reddit: "Reddit", x_twitter: "X / Twitter",
  social: "Social media", digital: "Digital / online", search: "Search", print: "Print",
  ooh: "Out-of-home / billboard",
};

const FAMILIES: { label: string; channels: string[] }[] = [
  { label: "Broadcast & audio", channels: ["radio", "tv_linear", "ctv", "podcast", "radio_urban", "all_media"] },
  { label: "Digital & social", channels: ["youtube", "facebook", "instagram", "tiktok", "whatsapp", "snapchat", "reddit", "x_twitter", "social", "digital"] },
  { label: "Out-of-home", channels: ["ooh"] },
  { label: "Search & print", channels: ["search", "print"] },
];

const METRIC_LABEL: Record<string, string> = {
  platform_use: "Use the platform", reach_monthly: "Monthly reach", reach_weekly: "Weekly reach",
  streaming_use: "Use streaming", cable_subscribe: "Subscribe to cable / satellite",
  news_consume: "Get news here", news_regular: "Regularly get news here", news_prefer: "Prefer for news",
  local_news: "Get local news here", listen: "Listen", netflix_use: "Use Netflix",
  ad_notice: "Notice ads en route to retail", time_spent_daily: "Time spent per day",
  time_spent_weekly: "Time spent per week", heavy_viewer_index: "Heavy-viewer index (100 = avg)",
  linear_share_of_tv_time: "Share of TV time on linear", watch_time_skew: "Share of US YouTube watch time",
  listener_share: "Share of podcast listeners", ad_audio_share: "Share of ad-supported audio",
  format_share: "Share of Black radio listening", news_consume_skew: "Over-indexes for news",
};

const GROUP_LABEL: Record<string, string> = {
  all_adults: "All adults", black: "Black", white: "White", hispanic: "Hispanic", asian: "Asian",
  lower: "Lower income", upper: "Upper income",
  "12_34": "12–34", "18_29": "18–29", "18_34": "18–34", "18_49": "18–49", "25_54": "25–54",
  "30_49": "30–49", "35_49": "35–49", "35_54": "35–54", "35_plus": "35+", "50_64": "50–64",
  "50_plus": "50+", "55_plus": "55+", "65_plus": "65+",
};

// Units that express "% of this demographic group" → render as a comparable 0–100 bar.
const BAR_UNITS = new Set([
  "pct_ever_use", "pct_reach", "pct_monthly", "pct_subscribe",
  "pct_at_least_sometimes", "pct_regularly", "pct_notice_enroute_retail",
]);

const groupLabel = (g: string) => GROUP_LABEL[g] ?? g;
const channelLabel = (c: string) => CHANNEL_LABEL[c] ?? c;
const metricLabel = (m: string) => METRIC_LABEL[m] ?? m;

// A source is "cited as fact" (not republishable as a table) when it names a paid
// vendor or says so explicitly. These get an inline cited-as-fact marker.
const isCitedAsFact = (s: string | null) =>
  !!s && /cited as fact|nielsen|emarketer|adwave|share of ear|pixability|ipsos/i.test(s);

// Compact per-part value. The metric label carries the noun ("Share of
// ad-supported audio", "Time spent per day"), so the value stays terse.
function formatContext(unit: string | null, value: number): string {
  switch (unit) {
    case "hours_per_day":
    case "hours_per_week": return `${value} h`;
    case "index_vs_avg": return `${value}`;
    case "direction_over_index": return "over-indexes";
    default: return `${value}%`; // every pct_* variant
  }
}

/* ───────────────────────── derived shapes ───────────────────────── */

type Bar = { group: string; value: number; source: string | null; url: string | null; year: number | null };
type MetricGroup = {
  metric: string; scope: string; cited: boolean; source: string | null; url: string | null;
  bars: Bar[]; baseline: number | null;
};
type ContextStat = { metric: string; unit: string | null; cited: boolean; url: string | null; parts: { group: string; value: number }[] };
type ChannelBlock = { channel: string; metricGroups: MetricGroup[]; context: ContextStat[] };

function buildBlocks(rows: BaselineRow[], axis: Axis): ChannelBlock[] {
  const axisRows = rows.filter((r) => r.demographic_type === axis);
  // all_adults baseline per channel+metric, for the over-index reference tick.
  const baseline = new Map<string, number>();
  for (const r of rows) {
    if (r.demographic_type === "all") baseline.set(`${r.channel}|${r.metric}`, r.value);
  }

  const blocks: ChannelBlock[] = [];
  for (const family of FAMILIES) {
    for (const channel of family.channels) {
      const chRows = axisRows.filter((r) => r.channel === channel);
      if (chRows.length === 0) continue;

      const barRows = chRows.filter((r) => r.unit && BAR_UNITS.has(r.unit));
      const ctxRows = chRows.filter((r) => !r.unit || !BAR_UNITS.has(r.unit));

      // group bar rows by (metric, scope); general scope first, then news proxy.
      const mgMap = new Map<string, MetricGroup>();
      for (const r of barRows) {
        const key = `${r.metric}|${r.scope}`;
        let mg = mgMap.get(key);
        if (!mg) {
          mg = {
            metric: r.metric, scope: r.scope, cited: isCitedAsFact(r.source),
            source: r.source, url: r.source_url,
            bars: [], baseline: baseline.get(`${channel}|${r.metric}`) ?? null,
          };
          mgMap.set(key, mg);
        }
        mg.bars.push({ group: r.demographic_group, value: r.value, source: r.source, url: r.source_url, year: r.source_year });
        if (isCitedAsFact(r.source)) mg.cited = true;
      }
      const metricGroups = [...mgMap.values()]
        .map((mg) => {
          // Dedupe to one bar per demographic group; when two sources report the
          // same cell (e.g. TikTok Black news 2024 vs 2026), keep the latest year.
          const byGroup = new Map<string, Bar>();
          for (const b of mg.bars) {
            const prev = byGroup.get(b.group);
            if (!prev || (b.year ?? 0) > (prev.year ?? 0)) byGroup.set(b.group, b);
          }
          return { ...mg, bars: [...byGroup.values()].sort((a, b) => b.value - a.value) };
        })
        .sort((a, b) => (a.scope === b.scope ? 0 : a.scope === "general" ? -1 : 1));

      // context stats grouped by metric; dedupe to one value per group (keep the
      // highest when two sources report the same cell, e.g. Black radio ad-audio).
      const ctxMap = new Map<string, { meta: ContextStat; byGroup: Map<string, number> }>();
      for (const r of ctxRows) {
        let cs = ctxMap.get(r.metric);
        if (!cs) {
          cs = { meta: { metric: r.metric, unit: r.unit, cited: isCitedAsFact(r.source), url: r.source_url, parts: [] }, byGroup: new Map() };
          ctxMap.set(r.metric, cs);
        }
        const prev = cs.byGroup.get(r.demographic_group);
        if (prev == null || r.value > prev) cs.byGroup.set(r.demographic_group, r.value);
        if (isCitedAsFact(r.source)) cs.meta.cited = true;
      }
      const context: ContextStat[] = [...ctxMap.values()].map(({ meta, byGroup }) => ({
        ...meta,
        parts: [...byGroup.entries()]
          .map(([group, value]) => ({ group, value }))
          .sort((a, b) => b.value - a.value),
      }));

      if (metricGroups.length || context.length) blocks.push({ channel, metricGroups, context });
    }
  }
  return blocks;
}

/* ───────────────────────── component ───────────────────────── */

const isAxis = (v: string | null): v is Axis =>
  v === "race" || v === "age" || v === "income";

export function MediaConsumptionExplorer({ rows }: { rows: BaselineRow[] }) {
  // Axis is URL-addressable (?view=) so a view is shareable and survives refresh.
  const searchParams = useSearchParams();
  const urlAxis = searchParams.get("view");
  const [axis, setAxis] = useState<Axis>(isAxis(urlAxis) ? urlAxis : "race");
  const tabRefs = useRef<Record<Axis, HTMLButtonElement | null>>({
    race: null,
    age: null,
    income: null,
  });

  const blocks = useMemo(() => buildBlocks(rows, axis), [rows, axis]);
  const activeBlurb = AXES.find((a) => a.key === axis)!.blurb;

  // Select an axis, sync the URL without a server round-trip (replaceState keeps
  // the deep-link shareable but doesn't re-run the server component), and move
  // focus to the chosen tab when the change came from the keyboard.
  function selectAxis(next: Axis, focus = false) {
    setAxis(next);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `${window.location.pathname}?view=${next}`);
    }
    if (focus) tabRefs.current[next]?.focus();
  }

  // WAI-ARIA tabs keyboard pattern: arrow keys move + activate, Home/End jump.
  function onTabKeyDown(e: React.KeyboardEvent) {
    const i = AXES.findIndex((a) => a.key === axis);
    let next = i;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % AXES.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + AXES.length) % AXES.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = AXES.length - 1;
    else return;
    e.preventDefault();
    selectAxis(AXES[next].key, true);
  }

  const panelId = "mc-consumption-panel";

  return (
    <section aria-label="Consumption by demographic">
      {/* Axis control */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div
          role="tablist"
          aria-label="Demographic breakdown"
          onKeyDown={onTabKeyDown}
          className="inline-flex w-full rounded-lg border border-slate-200 bg-white p-1 sm:w-auto"
        >
          {AXES.map((a) => {
            const active = a.key === axis;
            return (
              <button
                key={a.key}
                id={`mc-tab-${a.key}`}
                role="tab"
                type="button"
                aria-selected={active}
                aria-controls={panelId}
                tabIndex={active ? 0 : -1}
                ref={(el) => {
                  tabRefs.current[a.key] = el;
                }}
                onClick={() => selectAxis(a.key)}
                className={`flex-1 whitespace-nowrap rounded-md px-3.5 py-2 text-sm font-semibold transition-colors sm:flex-none ${
                  active
                    ? "bg-midnight-navy text-white"
                    : "text-slate-gray hover:bg-cloud hover:text-midnight-navy"
                }`}
              >
                {a.label}
              </button>
            );
          })}
        </div>
        <p className="text-sm text-slate-gray sm:max-w-sm sm:text-right">{activeBlurb}</p>
      </div>

      {/* Families → channels → bars */}
      <div
        key={axis}
        id={panelId}
        role="tabpanel"
        aria-labelledby={`mc-tab-${axis}`}
        tabIndex={0}
        className="mt-8 space-y-12 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-intelligence-teal"
      >
        {FAMILIES.map((family) => {
          const familyBlocks = blocks.filter((b) =>
            family.channels.includes(b.channel)
          );
          if (familyBlocks.length === 0) return null;
          return (
            <div key={family.label}>
              <h3 className="font-heading text-xs font-bold uppercase tracking-[0.18em] text-slate-gray">
                {family.label}
              </h3>
              <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
                {familyBlocks.map((block) => (
                  <ChannelRow key={block.channel} block={block} />
                ))}
              </div>
            </div>
          );
        })}
        {blocks.length === 0 && (
          <p className="text-sm text-slate-gray">No consumption data for this view yet.</p>
        )}
      </div>
    </section>
  );
}

/* ───────────────────────── channel row ───────────────────────── */

function ChannelRow({ block }: { block: ChannelBlock }) {
  return (
    <div className="grid gap-5 py-6 md:grid-cols-[180px_1fr] md:gap-8">
      <div className="md:pt-0.5">
        <h4 className="font-heading text-base font-semibold text-midnight-navy">
          {channelLabel(block.channel)}
        </h4>
      </div>

      <div className="space-y-6">
        {block.metricGroups.map((mg) => (
          <div key={`${mg.metric}-${mg.scope}`}>
            <div className="mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm font-medium text-charcoal">{metricLabel(mg.metric)}</span>
              {mg.scope === "news" && (
                <span className="rounded-full bg-cloud px-2 py-0.5 text-[11px] font-semibold text-steel-blue">
                  news-consumption proxy
                </span>
              )}
              <SourceTag source={mg.source} url={mg.url} cited={mg.cited} />
            </div>
            <div className="space-y-2">
              {mg.bars.map((bar) => (
                <BarLine key={`${bar.group}-${bar.value}`} bar={bar} baseline={mg.baseline} />
              ))}
            </div>
          </div>
        ))}

        {block.context.length > 0 && (
          <dl className="space-y-1.5">
            {block.context.map((cs) => (
              <div key={cs.metric} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <dt className="text-slate-gray">{metricLabel(cs.metric)}:</dt>
                <dd className="flex flex-wrap items-baseline gap-x-3 text-charcoal">
                  {cs.parts.map((p, i) => (
                    <span key={i}>
                      <span className="text-slate-gray">{groupLabel(p.group)}</span>{" "}
                      <span className="font-semibold tabular-nums">{formatContext(cs.unit, p.value)}</span>
                    </span>
                  ))}
                  {cs.cited && <span className="text-[11px] text-slate-gray">· cited as fact</span>}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── one bar ───────────────────────── */

function BarLine({ bar, baseline }: { bar: Bar; baseline: number | null }) {
  const pct = Math.max(0, Math.min(100, bar.value));
  // Over-index = points above/below the all-adults average. The sign carries the
  // meaning (so it never depends on color); teal/slate only reinforce it.
  const delta = baseline != null ? Math.round(bar.value - baseline) : null;
  const deltaLabel = delta == null ? null : delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "±0";
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-20 shrink-0 text-right text-xs text-slate-gray sm:w-24">
        {groupLabel(bar.group)}
      </span>
      <div className="relative h-6 flex-1 overflow-hidden rounded bg-cloud">
        <div
          className="mc-bar-fill h-full rounded bg-intelligence-teal"
          style={{ width: `${pct}%` }}
        />
        {baseline != null && (
          <span
            className="absolute top-0 bottom-0 w-0.5 bg-midnight-navy/45"
            style={{ left: `calc(${Math.min(100, baseline)}% - 1px)` }}
            aria-hidden
            title={`All-adults average: ${baseline}%`}
          />
        )}
      </div>
      <span className="w-9 shrink-0 text-right text-sm font-semibold tabular-nums text-midnight-navy">
        {bar.value}%
      </span>
      <span
        className={`w-11 shrink-0 text-left text-xs tabular-nums ${
          delta == null
            ? ""
            : delta > 0
              ? "font-semibold text-intelligence-teal"
              : "text-slate-gray"
        }`}
        title={delta == null ? undefined : `${deltaLabel} points vs the all-adults average`}
      >
        {deltaLabel ?? ""}
      </span>
    </div>
  );
}

/* ───────────────────────── source tag ───────────────────────── */

function SourceTag({ source, url, cited }: { source: string | null; url: string | null; cited: boolean }) {
  if (!source) return null;
  // Compact the source to a short label for the inline tag.
  const short = source
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/cited as fact/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const label = cited ? `${short} · cited as fact` : short;
  const cls = "text-[11px] text-slate-gray";
  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1 ${cls} underline decoration-slate-300 underline-offset-2 transition-colors hover:text-intelligence-teal hover:decoration-intelligence-teal`}
      >
        {label}
        <ExternalLink className="h-3 w-3" aria-hidden />
      </a>
    );
  }
  return <span className={cls}>{label}</span>;
}
