"use client";

import { useState } from "react";
import { Car, ExternalLink } from "lucide-react";
import type { MvPoiTarget, MvPoiCategory } from "@/lib/queries";

type MvPoiTargetsTableProps = {
  pois: MvPoiTarget[];
  categories: MvPoiCategory[];
  selectedState: string | null;
};

const categoryColors: Record<string, string> = {
  hospital: "bg-rose-100 text-rose-700",
  auto_repair: "bg-blue-100 text-blue-700",
  auto_dealer: "bg-amber-100 text-amber-700",
  body_shop: "bg-teal-100 text-teal-700",
};

const categoryLabels: Record<string, string> = {
  hospital: "Hospital",
  auto_repair: "Auto Repair",
  auto_dealer: "Auto Dealer",
  body_shop: "Body Shop",
};

export function MvPoiTargetsTable({
  pois,
  categories,
  selectedState,
}: MvPoiTargetsTableProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = activeCategory
    ? pois.filter((p) => p.category === activeCategory)
    : pois;

  const totalPois = categories.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Car className="mt-0.5 h-5 w-5 shrink-0 text-intelligence-teal" />
          <div>
            <h2 className="font-heading text-xl font-semibold text-midnight-navy">
              Nearby Advertising Targets
            </h2>
            <p className="mt-1 text-sm text-slate-gray">
              {totalPois.toLocaleString()} POIs ranked by ad value
              {selectedState ? ` in ${selectedState}` : " nationwide"}
            </p>
          </div>
        </div>
      </div>

      {/* Category filter chips */}
      {categories.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              activeCategory === null
                ? "bg-intelligence-teal text-white"
                : "bg-cloud text-slate-gray hover:bg-midnight-navy/10"
            }`}
          >
            All ({totalPois.toLocaleString()})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.category}
              onClick={() =>
                setActiveCategory(
                  activeCategory === cat.category ? null : cat.category
                )
              }
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                activeCategory === cat.category
                  ? "bg-intelligence-teal text-white"
                  : "bg-cloud text-slate-gray hover:bg-midnight-navy/10"
              }`}
            >
              {categoryLabels[cat.category] ?? cat.category} (
              {cat.count.toLocaleString()})
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="text-sm text-slate-gray">
          No advertising targets match the current filter.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-midnight-navy/10">
                <th className="py-2 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  #
                </th>
                <th className="py-2 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Name
                </th>
                <th className="py-2 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  State
                </th>
                <th className="py-2 pr-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Nearby Crashes
                </th>
                <th className="py-2 pr-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Nearby Fatalities
                </th>
                <th className="py-2 pr-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Drunk Driving
                </th>
                <th className="py-2 pr-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Ad Score
                </th>
                <th className="py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Link
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, index) => (
                <tr
                  key={row.poi_id}
                  className="border-b border-midnight-navy/5 transition hover:bg-cloud"
                >
                  <td className="py-2.5 pr-3 font-mono text-xs text-slate-gray">
                    {index + 1}
                  </td>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-midnight-navy">
                        {row.poi_name}
                      </span>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          categoryColors[row.category] ??
                          "bg-cloud text-slate-gray"
                        }`}
                      >
                        {categoryLabels[row.category] ?? row.category}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 text-slate-gray">{row.state}</td>
                  <td className="py-2.5 pr-3 text-right font-mono text-midnight-navy">
                    {row.nearby_crashes.toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono text-midnight-navy">
                    {row.nearby_fatalities.toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono text-midnight-navy">
                    {row.nearby_drunk.toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-3 text-right">
                    <span className="inline-block rounded-full bg-intelligence-teal/10 px-2.5 py-0.5 font-mono text-xs font-bold text-intelligence-teal">
                      {row.ad_value_score.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    {row.website ? (
                      <a
                        href={row.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-intelligence-teal hover:underline"
                      >
                        <ExternalLink className="inline h-4 w-4" />
                      </a>
                    ) : (
                      <span className="text-slate-gray/40">&mdash;</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
