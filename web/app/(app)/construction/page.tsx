import {
  getConstructionNationalSummary,
  getConstructionEventBreakdown,
  getConstructionTrend,
  getConstructionSubsectorBreakdown,
  getConstructionIndustryDetail,
  getConstructionStatePriority,
} from "@/lib/queries";
import { ConstructionFilterBar } from "./construction-filter-bar";
import { IndustryDetailTable } from "./_components/industry-detail-table";
import { StatePriorityTable } from "./_components/state-priority-table";
import { ConstructionChartsPanel } from "./_components/construction-charts-panel";
import { HardHat, TrendingDown, TrendingUp } from "lucide-react";

export const metadata = {
  title: "Construction Fatalities | Legal Marketing Intelligence",
};

type SearchParams = Promise<{
  year?: string | string[];
}>;

function getSingleValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function ConstructionPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const rawYear = getSingleValue(params.year);
  const year = rawYear ? Number.parseInt(rawYear, 10) : 2024;
  const validYear =
    Number.isFinite(year) && year >= 2019 && year <= 2024 ? year : 2024;

  // Fetch all data in parallel
  let summary = {
    year: validYear,
    total_fatalities: 0,
    falls: 0,
    transportation: 0,
    exposure: 0,
    contact: 0,
    violence: 0,
    fires: 0,
    fatality_rate: 0,
    yoy_change: null as number | null,
  };
  let eventBreakdown: Awaited<ReturnType<typeof getConstructionEventBreakdown>> = [];
  let trend: Awaited<ReturnType<typeof getConstructionTrend>> = [];
  let subsectors: Awaited<ReturnType<typeof getConstructionSubsectorBreakdown>> = [];
  let industryDetail: Awaited<ReturnType<typeof getConstructionIndustryDetail>> = [];
  let statePriority: Awaited<ReturnType<typeof getConstructionStatePriority>> = [];

  try {
    [summary, eventBreakdown, trend, subsectors, industryDetail, statePriority] =
      await Promise.all([
        getConstructionNationalSummary(validYear),
        getConstructionEventBreakdown(validYear),
        getConstructionTrend("US"),
        getConstructionSubsectorBreakdown(validYear),
        getConstructionIndustryDetail(validYear, 3, 5),
        getConstructionStatePriority(),
      ]);
  } catch {
    // Gracefully show zeros if data unavailable
  }

  const fallPct =
    summary.total_fatalities > 0
      ? ((summary.falls / summary.total_fatalities) * 100).toFixed(1)
      : "0";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <HardHat className="h-7 w-7 shrink-0" style={{ color: "#1A8C96" }} />
        <div>
          <h1 className="font-heading text-3xl font-bold text-midnight-navy">
            Construction / Job Site Fatalities
          </h1>
          <p className="mt-1 text-slate-gray">
            BLS CFOI data &middot; 2019&ndash;2024 &middot; Source: Bureau of
            Labor Statistics
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <ConstructionFilterBar selectedYear={validYear} />

      {/* Scorecards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Fatalities with YoY badge */}
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase text-slate-gray">
            Total Fatalities
          </p>
          <p className="mt-1 font-heading text-2xl font-bold text-midnight-navy">
            {summary.total_fatalities.toLocaleString()}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            {summary.yoy_change != null ? (
              summary.yoy_change > 0 ? (
                <>
                  <TrendingUp className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-xs font-semibold text-red-500">
                    +{summary.yoy_change.toFixed(1)}% YoY
                  </span>
                </>
              ) : summary.yoy_change < 0 ? (
                <>
                  <TrendingDown className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-xs font-semibold text-green-600">
                    {summary.yoy_change.toFixed(1)}% YoY
                  </span>
                </>
              ) : (
                <span className="text-xs text-slate-gray">0% YoY</span>
              )
            ) : (
              <span className="text-xs text-slate-gray">
                {validYear} national total
              </span>
            )}
          </div>
        </div>

        {/* Fatality Rate */}
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase text-slate-gray">
            Fatality Rate
          </p>
          <p className="mt-1 font-heading text-2xl font-bold text-midnight-navy">
            {summary.fatality_rate.toFixed(1)}{" "}
            <span className="text-sm font-normal text-slate-gray">
              per 100K FTE
            </span>
          </p>
          <p className="mt-0.5 text-xs text-slate-gray">
            ~3&times; the all-industry average
          </p>
        </div>

        {/* #1 Cause of Death */}
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase text-slate-gray">
            #1 Cause of Death
          </p>
          <p className="mt-1 font-heading text-2xl font-bold text-midnight-navy">
            Falls
          </p>
          <p className="mt-0.5 text-xs text-slate-gray">
            {summary.falls.toLocaleString()} fatalities ({fallPct}% of total)
          </p>
        </div>

        {/* Highest-Risk Trade */}
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase text-slate-gray">
            Highest-Risk Trade
          </p>
          <p className="mt-1 font-heading text-2xl font-bold text-midnight-navy">
            Roofing
          </p>
          <p className="mt-0.5 text-xs text-slate-gray">
            120&ndash;134 fatalities/yr &middot; 80% from falls
          </p>
        </div>
      </div>

      {/* Charts — Event Breakdown + Annual Trend */}
      <ConstructionChartsPanel
        eventBreakdown={eventBreakdown}
        trend={trend}
        subsectors={subsectors}
        year={validYear}
      />

      {/* Industry detail table */}
      <IndustryDetailTable rows={industryDetail} />

      {/* Advertising Intelligence section */}
      <div className="space-y-6">
        <div>
          <h2 className="font-heading text-xl font-semibold text-midnight-navy">
            Advertising Intelligence
          </h2>
          <p className="mt-1 text-sm text-slate-gray">
            Data-driven recommendations based on construction fatality patterns
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* AI Card 1 */}
          <div className="rounded-xl border-l-4 border-intelligence-teal bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                <svg
                  className="h-5 w-5 text-intelligence-teal"
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                  <path d="M9 18h6" />
                  <path d="M10 22h4" />
                </svg>
              </div>
              <div>
                <h3 className="font-heading text-sm font-semibold text-midnight-navy">
                  Target Fall-Heavy Trades for Maximum Reach
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-gray">
                  Falls account for {fallPct}% of all construction fatalities (
                  {summary.falls.toLocaleString()} in {validYear}). Roofing
                  contractors alone had ~120 deaths, with 80% from falls. Focus
                  campaigns on roofing, framing, and masonry contractors in
                  high-construction states.
                </p>
                <p className="mt-2 text-xs font-semibold text-intelligence-teal">
                  {summary.falls.toLocaleString()} fall fatalities in {validYear}
                </p>
              </div>
            </div>
          </div>

          {/* AI Card 2 */}
          <div className="rounded-xl border-l-4 border-intelligence-teal bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                <svg
                  className="h-5 w-5 text-intelligence-teal"
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                  <path d="M9 18h6" />
                  <path d="M10 22h4" />
                </svg>
              </div>
              <div>
                <h3 className="font-heading text-sm font-semibold text-midnight-navy">
                  Specialty Trade Contractors = 59% of All Construction Deaths
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-gray">
                  NAICS 238 (specialty trades) dominates construction fatalities.
                  Electrical, plumbing/HVAC, and building finishing contractors
                  represent large, reachable audiences. Consider targeted digital
                  campaigns on trade-specific forums and supply houses.
                </p>
                <p className="mt-2 text-xs font-semibold text-intelligence-teal">
                  ~606 fatalities in specialty trades ({validYear})
                </p>
              </div>
            </div>
          </div>

          {/* AI Card 3 */}
          <div className="rounded-xl border-l-4 border-intelligence-teal bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                <svg
                  className="h-5 w-5 text-intelligence-teal"
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                  <path d="M9 18h6" />
                  <path d="M10 22h4" />
                </svg>
              </div>
              <div>
                <h3 className="font-heading text-sm font-semibold text-midnight-navy">
                  Highway &amp; Utility Work = Transportation Incident Hotspot
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-gray">
                  Heavy/civil engineering construction (NAICS 237) has
                  disproportionate transportation deaths — workers struck by
                  vehicles is a major pattern. Geo-target DOT highway project
                  corridors.
                </p>
                <p className="mt-2 text-xs font-semibold text-intelligence-teal">
                  ~60 highway construction deaths in {validYear}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* State priority table */}
      <StatePriorityTable rows={statePriority} />

      {/* Data source attribution */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-gray">
          <strong className="text-midnight-navy">Source:</strong> U.S. Bureau of
          Labor Statistics, Census of Fatal Occupational Injuries (CFOI),
          2019&ndash;2024.{" "}
          <a
            href="https://www.bls.gov/iif/fatal-injuries-tables.htm"
            target="_blank"
            rel="noopener noreferrer"
            className="text-intelligence-teal underline hover:no-underline"
          >
            View tables
          </a>
        </p>
        <p className="mt-1 text-xs text-slate-gray">
          Note: CFOI counts fatal work injuries only. Dashes indicate suppressed
          data (small cell sizes).
        </p>
      </div>
    </div>
  );
}
