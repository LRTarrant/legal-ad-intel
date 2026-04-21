"use client";

import { useState, useMemo } from "react";
import { BarChart3, ChevronDown } from "lucide-react";
import type {
  CompetitiveLandscapeData,
  CompetitiveAdvertiser,
} from "@/lib/data/competitive-landscape/types";
import {
  getAllPracticeAreas,
  classifyAdvertiser,
} from "@/lib/data/competitive-landscape/practice-area-mapping";

interface CompetitiveLandscapeTableProps {
  data: CompetitiveLandscapeData;
}

type ActivityLevel = "Heavy" | "Moderate" | "Light";

function getActivityLevel(instances: number): ActivityLevel {
  if (instances >= 1000) return "Heavy";
  if (instances >= 200) return "Moderate";
  return "Light";
}

function getActivityDot(level: ActivityLevel): string {
  switch (level) {
    case "Heavy":
      return "bg-emerald-400";
    case "Moderate":
      return "bg-blue-400";
    case "Light":
      return "bg-slate-400";
  }
}

function getActivityTextColor(level: ActivityLevel): string {
  switch (level) {
    case "Heavy":
      return "text-emerald-700";
    case "Moderate":
      return "text-blue-700";
    case "Light":
      return "text-slate-500";
  }
}

interface AggregatedRow {
  advertiser: string;
  parent: string;
  practiceArea: string;
  instances: number;
  nationalMarkets: number;
  googleAds?: boolean;
  youtube?: boolean;
  meta?: boolean;
  tiktok?: boolean;
}

function aggregateAcrossMarkets(
  data: CompetitiveLandscapeData,
  practiceAreaFilter: string
): AggregatedRow[] {
  const map = new Map<string, AggregatedRow>();
  for (const market of data.markets) {
    const entries = data.data[market] ?? [];
    for (const entry of entries) {
      const classified = classifyAdvertiser(entry.advertiser);
      if (
        practiceAreaFilter !== "All Practice Areas" &&
        classified !== practiceAreaFilter
      )
        continue;
      const key = `${entry.advertiser}|${classified}`;
      const existing = map.get(key);
      if (existing) {
        existing.instances += entry.instances;
        existing.googleAds = existing.googleAds || entry.googleAds;
        existing.youtube = existing.youtube || entry.youtube;
        existing.meta = existing.meta || entry.meta;
        existing.tiktok = existing.tiktok || entry.tiktok;
      } else {
        map.set(key, {
          advertiser: entry.advertiser,
          parent: entry.parent,
          practiceArea: classified,
          instances: entry.instances,
          nationalMarkets: entry.nationalMarkets,
          googleAds: entry.googleAds,
          youtube: entry.youtube,
          meta: entry.meta,
          tiktok: entry.tiktok,
        });
      }
    }
  }
  return Array.from(map.values());
}

function filterByMarket(
  entries: CompetitiveAdvertiser[],
  practiceAreaFilter: string
): AggregatedRow[] {
  return entries
    .map((e) => ({
      advertiser: e.advertiser,
      parent: e.parent,
      practiceArea: classifyAdvertiser(e.advertiser),
      instances: e.instances,
      nationalMarkets: e.nationalMarkets,
      googleAds: e.googleAds,
      youtube: e.youtube,
      meta: e.meta,
      tiktok: e.tiktok,
    }))
    .filter(
      (e) =>
        practiceAreaFilter === "All Practice Areas" ||
        e.practiceArea === practiceAreaFilter
    );
}

const MAX_ROWS = 20;

export function CompetitiveLandscapeTable({
  data,
}: CompetitiveLandscapeTableProps) {
  const [marketFilter, setMarketFilter] = useState("All Markets");
  const [practiceAreaFilter, setPracticeAreaFilter] =
    useState("All Practice Areas");

  const rows = useMemo(() => {
    let result: AggregatedRow[];
    if (marketFilter === "All Markets") {
      result = aggregateAcrossMarkets(data, practiceAreaFilter);
    } else {
      const entries = data.data[marketFilter] ?? [];
      result = filterByMarket(entries, practiceAreaFilter);
    }
    result.sort((a, b) => b.instances - a.instances);
    return result.slice(0, MAX_ROWS);
  }, [data, marketFilter, practiceAreaFilter]);

  const allPracticeAreas = useMemo(() => getAllPracticeAreas(), []);

  const totalCount = useMemo(() => {
    if (marketFilter === "All Markets") {
      return aggregateAcrossMarkets(data, practiceAreaFilter).length;
    }
    const entries = data.data[marketFilter] ?? [];
    if (practiceAreaFilter !== "All Practice Areas") {
      return entries.filter(
        (e) => classifyAdvertiser(e.advertiser) === practiceAreaFilter
      ).length;
    }
    return entries.length;
  }, [data, marketFilter, practiceAreaFilter]);

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm border">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="w-4.5 h-4.5 text-intelligence-teal" />
        <h2 className="font-heading text-2xl font-bold text-midnight-navy">
          Competitive Landscape
        </h2>
      </div>
      <p className="mb-5 text-sm text-slate-gray">
        Advertiser activity across {data.state} markets &mdash; {data.dataMonth}
      </p>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative">
          <select
            value={marketFilter}
            onChange={(e) => setMarketFilter(e.target.value)}
            className="appearance-none rounded-md border border-cloud bg-cloud/40 px-3 py-1.5 pr-8 text-sm text-midnight-navy focus:outline-none focus:ring-1 focus:ring-intelligence-teal cursor-pointer"
          >
            <option>All Markets</option>
            {data.markets.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-gray" />
        </div>

        <div className="relative">
          <select
            value={practiceAreaFilter}
            onChange={(e) => setPracticeAreaFilter(e.target.value)}
            className="appearance-none rounded-md border border-cloud bg-cloud/40 px-3 py-1.5 pr-8 text-sm text-midnight-navy focus:outline-none focus:ring-1 focus:ring-intelligence-teal cursor-pointer"
          >
            <option>All Practice Areas</option>
            {allPracticeAreas.map((pa) => (
              <option key={pa} value={pa}>
                {pa}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-gray" />
        </div>

        <span className="text-xs text-slate-gray">
          Showing {rows.length} of {totalCount} advertisers
        </span>
      </div>

      {/* Table */}
      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-cloud">
                <th className="py-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-gray w-10">
                  #
                </th>
                <th className="py-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
                  Advertiser
                </th>
                <th className="py-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
                  Parent Company
                </th>
                <th className="py-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
                  Practice Area
                </th>
                <th className="py-3 px-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-gray w-16">
                  Google
                </th>
                <th className="py-3 px-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-gray w-16">
                  YouTube
                </th>
                <th className="py-3 px-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-gray w-16">
                  Meta
                </th>
                <th className="py-3 px-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-gray w-16">
                  TikTok
                </th>
                <th className="py-3 px-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
                  Markets
                </th>
                <th className="py-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
                  Activity
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const activity = getActivityLevel(row.instances);
                return (
                  <tr
                    key={`${row.advertiser}-${row.practiceArea}-${i}`}
                    className={`border-b border-cloud/50 transition-colors ${
                      i % 2 === 0 ? "bg-white" : "bg-cloud/20"
                    }`}
                  >
                    <td className="py-2.5 px-2 text-slate-gray">{i + 1}</td>
                    <td className="py-2.5 px-2 font-semibold text-midnight-navy whitespace-nowrap">
                      {row.advertiser}
                    </td>
                    <td className="py-2.5 px-2 text-slate-gray whitespace-nowrap">
                      {row.parent}
                    </td>
                    <td className="py-2.5 px-2">
                      <span className="inline-block rounded-full bg-intelligence-teal/10 px-2 py-0.5 text-[10px] font-bold text-intelligence-teal whitespace-nowrap">
                        {row.practiceArea}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {row.googleAds ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          <span className="text-[10px] text-emerald-700">Yes</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">&mdash;</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {row.youtube ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          <span className="text-[10px] text-emerald-700">Yes</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">&mdash;</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {row.meta ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          <span className="text-[10px] text-emerald-700">Yes</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">&mdash;</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {row.tiktok ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          <span className="text-[10px] text-emerald-700">Yes</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">&mdash;</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right text-midnight-navy/80">
                      {row.nationalMarkets}
                    </td>
                    <td className="py-2.5 px-2">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${getActivityDot(
                            activity
                          )}`}
                        />
                        <span
                          className={`text-[11px] font-medium ${getActivityTextColor(
                            activity
                          )}`}
                        >
                          {activity}
                        </span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
          <BarChart3 className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
          <p className="text-sm font-medium text-midnight-navy/60">
            {practiceAreaFilter !== "All Practice Areas"
              ? `No advertisers found for ${practiceAreaFilter} in ${
                  marketFilter === "All Markets" ? data.state : marketFilter
                }`
              : "No advertisers match the selected filters"}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-slate-gray">
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Heavy
          (1,000+ instances)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-400" /> Moderate
          (200&ndash;999)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Light
          (&lt;200)
        </span>
      </div>
    </div>
  );
}
