/**
 * State Intel block → 1–2 slides, driven by the static StateConfig the v2
 * state pages already use (web/lib/state-config). Population is a best-effort
 * census_demographics sum via the service client; everything else is config.
 *
 *   1. Fatality snapshot  — population + FARS total / speed / alcohol, with
 *      the same fatalitiesSourceLabel / fatalitiesReportYear attribution the
 *      v2 pages render.
 *   2. Workplace (CFOI)   — only when data present and showWorkplaceSection
 *      is not explicitly disabled.
 */

import type { ProposalBlockRow } from "@/lib/proposal-builder/types";
import {
  type SlideSpec,
  fallbackSlide,
} from "@/lib/proposal-builder/slide-spec";
import { STATE_CONFIGS } from "@/lib/state-config";
import type { StateConfig } from "@/lib/state-config";
import { type SupabaseLike, fmtInt } from "./shared";

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

export async function renderStateIntel(
  block: ProposalBlockRow,
  supabase: SupabaseLike,
): Promise<SlideSpec[]> {
  const data = block.block_data ?? {};
  const abbr = String(data.state_abbr ?? "").trim();
  const label = (typeof data.label === "string" && data.label) || abbr;

  const config = abbr ? configByAbbr(abbr) : null;
  if (!config) {
    return [
      fallbackSlide(
        label || "State Intelligence",
        abbr
          ? `No state-intelligence profile is wired for ${abbr} yet.`
          : "No state selected.",
        "State Intelligence",
      ),
    ];
  }

  const t = config.trafficStats;
  const sourceLabel = t.fatalitiesSourceLabel ?? t.sourceLabel;
  const reportYear = t.fatalitiesReportYear ?? t.reportYear;

  const population = await statePopulation(supabase, config.stateCode);

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
      delta:
        t.speedRelatedPct != null ? `${t.speedRelatedPct}%` : undefined,
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

  const fatalitySlide: SlideSpec = {
    kicker: "State Intelligence",
    heading: `${config.stateName} — Injury & Fatality Snapshot`,
    stats,
    bullets,
    footnote: `Source: ${sourceLabel}${
      population ? " · Population: U.S. Census ACS" : ""
    }`,
  };

  const slides: SlideSpec[] = [fatalitySlide];

  const showWorkplace = config.features?.showWorkplaceSection !== false;
  const w = config.workplaceStats;
  if (showWorkplace && w && w.totalWorkplaceFatalities > 0) {
    slides.push({
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
    });
  }

  return slides;
}
