import {
  EventBreakdownChart,
  TrendChart,
  SubsectorChart,
} from "./construction-charts";
import type {
  ConstructionEventBreakdown,
  ConstructionTrend,
  ConstructionSubsector,
} from "@/lib/queries";

type ConstructionChartsPanelProps = {
  eventBreakdown: ConstructionEventBreakdown[];
  trend: ConstructionTrend[];
  subsectors: ConstructionSubsector[];
  year: number;
};

export function ConstructionChartsPanel({
  eventBreakdown,
  trend,
  subsectors,
  year,
}: ConstructionChartsPanelProps) {
  return (
    <div className="space-y-8">
      {/* Row 1: Event Breakdown + Trend */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="font-heading text-xl font-semibold text-midnight-navy">
            Fatalities by Event Type
          </h2>
          <p className="mt-1 text-sm text-slate-gray">
            {year} construction fatalities by cause of death
          </p>
          <div className="mt-4">
            <EventBreakdownChart data={eventBreakdown} />
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="font-heading text-xl font-semibold text-midnight-navy">
            Annual Trend
          </h2>
          <p className="mt-1 text-sm text-slate-gray">
            Construction fatalities 2019&ndash;2024
          </p>
          <div className="mt-4">
            <TrendChart data={trend} />
          </div>
        </div>
      </div>

      {/* Row 2: Subsector Comparison */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="font-heading text-xl font-semibold text-midnight-navy">
          Subsector Comparison
        </h2>
        <p className="mt-1 text-sm text-slate-gray">
          236 (Construction of Buildings) vs 237 (Heavy &amp; Civil Engineering)
          vs 238 (Specialty Trade Contractors) — {year}
        </p>
        <div className="mt-4">
          <SubsectorChart data={subsectors} />
        </div>
        {subsectors.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3">
            {subsectors.map((s) => (
              <div
                key={s.naics_code}
                className="rounded-lg bg-cloud px-3 py-1.5 text-xs"
              >
                <span className="font-semibold text-midnight-navy">
                  {s.naics_code}
                </span>{" "}
                <span className="text-slate-gray">{s.industry_name}</span>{" "}
                <span className="font-mono font-semibold text-intelligence-teal">
                  {s.total_fatalities.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
