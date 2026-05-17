/**
 * State Intel block → 1–2 slides.
 *
 * Data lookup order (PR Phase 2.1, issue #1):
 *   1. Supabase `state_crash_statistics` (national FARS dataset, keyed by
 *      `state_code`) is the source of truth for the fatality snapshot. The
 *      static state-config registry is NOT a gate for whether the slide
 *      renders — it only supplies `showWorkplaceSection`, workplace stats,
 *      and any narrative / footer overrides.
 *   2. If Supabase has no crash row, fall back to the static StateConfig.
 *   3. Only if neither has data do we render the "not wired" fallback.
 *
 * `state_data_sources` (also keyed by `state_code`) is queried alongside
 * to surface the deeper state-owned datasets that are integrated/available.
 */

import type { ProposalBlockRow } from "@/lib/proposal-builder/types";
import {
  type SlideSpec,
  fallbackSlide,
} from "@/lib/proposal-builder/slide-spec";
import { STATE_CONFIGS } from "@/lib/state-config";
import type { StateConfig } from "@/lib/state-config";
import { postalToStateName } from "@/lib/usStates";
import { type SupabaseLike, fmtInt } from "./shared";

interface CrashStatRow {
  state_code: string;
  year: number;
  total_fatalities: number | null;
  rural_fatalities: number | null;
  urban_fatalities: number | null;
  alcohol_related_fatalities: number | null;
  speeding_related_fatalities: number | null;
  motorcycle_fatalities: number | null;
  pedestrian_fatalities: number | null;
  data_source: string | null;
  is_preliminary: boolean | null;
}

interface DataSourceRow {
  source_name: string | null;
  source_type: string | null;
  status: string | null;
}

function configByAbbr(abbr: string): StateConfig | null {
  const code = abbr.trim().toUpperCase();
  for (const cfg of Object.values(STATE_CONFIGS)) {
    if (cfg.stateCode.toUpperCase() === code) return cfg;
  }
  return null;
}

async function statePopulation(
  supabase: SupabaseLike,
  stateCode: string,
): Promise<number | null> {
  try {
    const { data } = await supabase
      .from("census_demographics")
      .select("total_population")
      .eq("state_abbr", stateCode);
    const rows = (data ?? []) as { total_population: number | string | null }[];
    if (rows.length === 0) return null;
    const sum = rows.reduce(
      (acc, r) => acc + (Number(r.total_population) || 0),
      0,
    );
    return sum > 0 ? sum : null;
  } catch {
    return null;
  }
}

/** Most recent crash row with a populated total, or null. */
async function latestCrashStat(
  supabase: SupabaseLike,
  abbr: string,
): Promise<CrashStatRow | null> {
  try {
    const { data } = await supabase
      .from("state_crash_statistics")
      .select(
        "state_code, year, total_fatalities, rural_fatalities, urban_fatalities, alcohol_related_fatalities, speeding_related_fatalities, motorcycle_fatalities, pedestrian_fatalities, data_source, is_preliminary",
      )
      .eq("state_code", abbr)
      .order("year", { ascending: false });
    const rows = (data ?? []) as CrashStatRow[];
    return rows.find((r) => r.total_fatalities != null) ?? null;
  } catch {
    return null;
  }
}

async function stateDataSources(
  supabase: SupabaseLike,
  abbr: string,
): Promise<DataSourceRow[]> {
  try {
    const { data } = await supabase
      .from("state_data_sources")
      .select("source_name, source_type, status")
      .eq("state_code", abbr);
    return (data ?? []) as DataSourceRow[];
  } catch {
    return [];
  }
}

function pct(part: number | null, total: number | null): string | undefined {
  if (part == null || !total) return undefined;
  return `${Math.round((part / total) * 100)}%`;
}

/** Fatality slide built from the live Supabase crash row. */
function fatalitySlideFromCrash(
  crash: CrashStatRow,
  config: StateConfig | null,
  population: number | null,
  stateName: string,
  sources: DataSourceRow[],
): SlideSpec {
  const stats: SlideSpec["stats"] = [];
  if (population)
    stats.push({ label: "Population", value: fmtInt(population) });
  stats.push({
    label: `Traffic Fatalities (${crash.year})`,
    value: fmtInt(crash.total_fatalities),
  });
  if (crash.speeding_related_fatalities && crash.speeding_related_fatalities > 0)
    stats.push({
      label: "Speeding-Related",
      value: fmtInt(crash.speeding_related_fatalities),
      delta: pct(crash.speeding_related_fatalities, crash.total_fatalities),
    });
  if (crash.alcohol_related_fatalities && crash.alcohol_related_fatalities > 0)
    stats.push({
      label: "Alcohol-Related",
      value: fmtInt(crash.alcohol_related_fatalities),
      delta: pct(crash.alcohol_related_fatalities, crash.total_fatalities),
    });

  const bullets: string[] = [];
  if (crash.rural_fatalities != null && crash.urban_fatalities != null)
    bullets.push(
      `Rural fatalities ${fmtInt(crash.rural_fatalities)} · Urban ${fmtInt(crash.urban_fatalities)}`,
    );
  if (crash.motorcycle_fatalities != null || crash.pedestrian_fatalities != null)
    bullets.push(
      [
        crash.motorcycle_fatalities != null
          ? `Motorcyclist ${fmtInt(crash.motorcycle_fatalities)}`
          : null,
        crash.pedestrian_fatalities != null
          ? `Pedestrian ${fmtInt(crash.pedestrian_fatalities)}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ") + " fatalities",
    );
  if (config?.content?.legalLandscape)
    bullets.push(config.content.legalLandscape);

  const deeper = sources
    .filter(
      (s) =>
        s.source_name &&
        (s.status === "integrated" || s.status === "available"),
    )
    .slice(0, 3)
    .map((s) => s.source_name as string);
  if (deeper.length)
    bullets.push(`Deeper state data available: ${deeper.join("; ")}`);

  const t = config?.trafficStats;
  const sourceLabel =
    t?.fatalitiesSourceLabel ??
    `${crash.data_source ?? "FARS"} ${crash.year}${
      crash.is_preliminary ? " (preliminary)" : ""
    }`;

  return {
    kicker: "State Intelligence",
    heading: `${stateName} — Injury & Fatality Snapshot`,
    stats,
    bullets,
    footnote: `Source: ${sourceLabel}${
      population ? " · Population: U.S. Census ACS" : ""
    }`,
  };
}

function workplaceSlide(config: StateConfig): SlideSpec | null {
  const showWorkplace = config.features?.showWorkplaceSection !== false;
  const w = config.workplaceStats;
  if (!showWorkplace || !w || w.totalWorkplaceFatalities <= 0) return null;
  return {
    kicker: "Workplace Safety (CFOI)",
    heading: `${config.stateName} — Workplace Fatalities`,
    stats: [
      {
        label: `Workplace Fatalities (${w.reportYear})`,
        value: fmtInt(w.totalWorkplaceFatalities),
      },
      {
        label: "Construction",
        value: fmtInt(w.constructionFatalities),
        delta: `${w.constructionPctTotal}% of total`,
      },
      {
        label: "Transport & Warehouse",
        value: fmtInt(w.transportWarehouseFatalities),
      },
    ],
    bullets: [
      `Covered employment: ${fmtInt(w.qcewCoveredEmployment)}`,
      `Falls / slips / trips: ${fmtInt(w.fallsSlipsTrips)} · Transportation incidents: ${fmtInt(w.transportationIncidents)}`,
      config.content?.constructionAudience ?? "",
    ].filter(Boolean),
    footnote: `Source: BLS Census of Fatal Occupational Injuries — ${config.stateName} ${w.reportYear}`,
  };
}

/** Legacy path: build the fatality slide entirely from the static config. */
function fatalitySlideFromConfig(
  config: StateConfig,
  population: number | null,
): SlideSpec {
  const t = config.trafficStats;
  const sourceLabel = t.fatalitiesSourceLabel ?? t.sourceLabel;
  const reportYear = t.fatalitiesReportYear ?? t.reportYear;

  const stats: SlideSpec["stats"] = [];
  if (population)
    stats.push({ label: "Population", value: fmtInt(population) });
  stats.push({
    label: `Traffic Fatalities (${reportYear})`,
    value: fmtInt(t.totalFatalities),
  });
  if (t.speedRelatedFatalities != null)
    stats.push({
      label: "Speed-Related",
      value: fmtInt(t.speedRelatedFatalities),
      delta: t.speedRelatedPct != null ? `${t.speedRelatedPct}%` : undefined,
    });
  if (t.alcoholRelatedFatalities != null)
    stats.push({
      label: "Alcohol-Related",
      value: fmtInt(t.alcoholRelatedFatalities),
      delta:
        t.alcoholRelatedPct != null ? `${t.alcoholRelatedPct}%` : undefined,
    });

  const bullets: string[] = [];
  bullets.push(`Total reported crashes: ${fmtInt(t.totalCrashes)}`);
  if (t.ruralFatalities != null && t.urbanFatalities != null)
    bullets.push(
      `Rural fatalities ${fmtInt(t.ruralFatalities)} · Urban ${fmtInt(t.urbanFatalities)}`,
    );
  if (config.content?.legalLandscape)
    bullets.push(config.content.legalLandscape);

  return {
    kicker: "State Intelligence",
    heading: `${config.stateName} — Injury & Fatality Snapshot`,
    stats,
    bullets,
    footnote: `Source: ${sourceLabel}${
      population ? " · Population: U.S. Census ACS" : ""
    }`,
  };
}

export async function renderStateIntel(
  block: ProposalBlockRow,
  supabase: SupabaseLike,
): Promise<SlideSpec[]> {
  const data = block.block_data ?? {};
  const abbr = String(data.state_abbr ?? "").trim().toUpperCase();
  const label = (typeof data.label === "string" && data.label) || abbr;

  if (!abbr) {
    return [
      fallbackSlide(
        label || "State Intelligence",
        "No state selected.",
        "State Intelligence",
      ),
    ];
  }

  const config = configByAbbr(abbr);
  const stateName = config?.stateName ?? postalToStateName[abbr] ?? abbr;

  const [crash, population, sources] = await Promise.all([
    latestCrashStat(supabase, abbr),
    statePopulation(supabase, abbr),
    stateDataSources(supabase, abbr),
  ]);

  // 1. Supabase crash data is the source of truth.
  if (crash) {
    const slides: SlideSpec[] = [
      fatalitySlideFromCrash(crash, config, population, stateName, sources),
    ];
    if (config) {
      const wp = workplaceSlide(config);
      if (wp) slides.push(wp);
    }
    return slides;
  }

  // 2. No Supabase row — fall back to the static registry.
  if (config) {
    const slides: SlideSpec[] = [
      fatalitySlideFromConfig(config, population),
    ];
    const wp = workplaceSlide(config);
    if (wp) slides.push(wp);
    return slides;
  }

  // 3. Neither has data.
  return [
    fallbackSlide(
      label || stateName,
      `No state-intelligence data is wired for ${abbr} yet.`,
      "State Intelligence",
    ),
  ];
}
