"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
} from "react-simple-maps";
import { scaleSequential } from "d3-scale";
import { fipsToPostal, postalToStateName } from "@/lib/usStates";
import { getSupabase } from "@/lib/supabase";
import { MapPin, Database } from "lucide-react";
import type { TortHeatmapRow } from "@/lib/queries/ad-saturation";

const US_TOPO_URL =
  "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

interface TortAdvertisingHeatmapProps {
  tortSlug: string;
  /** Pre-fetched heatmap data for state level (server-rendered) */
  initialStateData?: TortHeatmapRow[];
}

type GeoLevel = "state" | "dma";

/** Teal color interpolator matching intelligence-teal branding */
function tealInterpolator(t: number): string {
  // From slate-200 (low) to intelligence-teal (high)
  const r = Math.round(226 - t * 186); // 226 → 40
  const g = Math.round(232 - t * 62);  // 232 → 170
  const b = Math.round(240 - t * 50);  // 240 → 190
  return `rgb(${r},${g},${b})`;
}

export function TortAdvertisingHeatmap({
  tortSlug,
  initialStateData,
}: TortAdvertisingHeatmapProps) {
  const [geoLevel, setGeoLevel] = useState<GeoLevel>("state");
  const [stateData, setStateData] = useState<TortHeatmapRow[]>(
    initialStateData ?? []
  );
  const [dmaData, setDmaData] = useState<TortHeatmapRow[]>([]);
  const [loading, setLoading] = useState(!initialStateData);
  const [dmaLoaded, setDmaLoaded] = useState(false);

  // Fetch state data if not provided via SSR
  useEffect(() => {
    if (initialStateData) return;
    let cancelled = false;
    async function fetch() {
      setLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = getSupabase() as any;
      const { data } = await sb.rpc("get_tort_advertising_heatmap", {
        p_tort_slug: tortSlug,
        p_geo_level: "state",
        p_window_days: 90,
      });
      if (!cancelled) {
        setStateData((data ?? []) as TortHeatmapRow[]);
        setLoading(false);
      }
    }
    fetch();
    return () => { cancelled = true; };
  }, [tortSlug, initialStateData]);

  // Lazy-load DMA data when user switches to DMA tab
  useEffect(() => {
    if (geoLevel !== "dma" || dmaLoaded) return;
    let cancelled = false;
    async function fetch() {
      setLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = getSupabase() as any;
      const { data } = await sb.rpc("get_tort_advertising_heatmap", {
        p_tort_slug: tortSlug,
        p_geo_level: "dma",
        p_window_days: 90,
      });
      if (!cancelled) {
        setDmaData((data ?? []) as TortHeatmapRow[]);
        setDmaLoaded(true);
        setLoading(false);
      }
    }
    fetch();
    return () => { cancelled = true; };
  }, [tortSlug, geoLevel, dmaLoaded]);

  const activeData = geoLevel === "state" ? stateData : dmaData;

  // Build state postal → advertiser count map for choropleth
  const stateMap = useMemo(() => {
    const m = new Map<string, TortHeatmapRow>();
    if (geoLevel !== "state") return m;
    for (const row of stateData) {
      if (row.geo_code) m.set(row.geo_code, row);
    }
    return m;
  }, [stateData, geoLevel]);

  const maxVal = useMemo(() => {
    if (activeData.length === 0) return 1;
    return Math.max(...activeData.map((r) => r.advertiser_count), 1);
  }, [activeData]);

  const colorScale = useMemo(
    () =>
      scaleSequential()
        .domain([0, maxVal])
        .interpolator(tealInterpolator),
    [maxVal]
  );

  // Top states/DMAs for the ranked list
  const topGeos = useMemo(
    () => [...activeData].sort((a, b) => b.advertiser_count - a.advertiser_count).slice(0, 10),
    [activeData]
  );

  const hasData = activeData.length > 0;

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <MapPin className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Advertising Activity by Geography
          </h2>
          {hasData && !loading && (
            <span className="rounded-full bg-emerald-50 border border-success/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success flex items-center gap-1">
              <Database className="w-3 h-3" /> Live Data
            </span>
          )}
        </div>

        {/* Geo level toggle */}
        <div className="flex rounded-lg border border-cloud overflow-hidden">
          <button
            type="button"
            onClick={() => setGeoLevel("state")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              geoLevel === "state"
                ? "bg-intelligence-teal text-white"
                : "bg-white text-slate-gray hover:bg-cloud/60"
            }`}
          >
            State
          </button>
          <button
            type="button"
            onClick={() => setGeoLevel("dma")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              geoLevel === "dma"
                ? "bg-intelligence-teal text-white"
                : "bg-white text-slate-gray hover:bg-cloud/60"
            }`}
          >
            DMA
          </button>
        </div>
      </div>

      <p className="mb-4 text-xs text-slate-gray">
        Unique advertisers observed per {geoLevel === "state" ? "state" : "DMA market"} in the last 90 days.
        Higher intensity indicates more competitive activity.
      </p>

      {/* Loading state */}
      {loading && (
        <div className="animate-pulse space-y-4">
          <div className="h-64 rounded-lg bg-cloud/60" />
          <div className="h-4 w-48 rounded bg-cloud/60" />
        </div>
      )}

      {/* Empty state */}
      {!loading && !hasData && (
        <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
          <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
          <p className="text-sm font-medium text-midnight-navy/60">
            No advertising activity observed
          </p>
          <p className="mt-1 text-xs text-slate-gray max-w-md mx-auto">
            No advertising activity observed for this tort in the last 90 days.
            Data will appear here as ad platform observations are collected.
          </p>
        </div>
      )}

      {/* Map view (state level) */}
      {!loading && hasData && geoLevel === "state" && (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0">
            <ComposableMap
              projection="geoAlbersUsa"
              projectionConfig={{ scale: 900 }}
              width={800}
              height={400}
              style={{ width: "100%", height: "auto" }}
            >
              <Geographies geography={US_TOPO_URL}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const fips = String(geo.id).padStart(2, "0");
                    const postal = fipsToPostal[fips];
                    const row = postal ? stateMap.get(postal) : undefined;
                    const fill =
                      row !== undefined
                        ? colorScale(row.advertiser_count)
                        : "rgb(241, 245, 249)"; // slate-100

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={fill}
                        stroke="rgb(203, 213, 225)"
                        strokeWidth={0.5}
                        style={{
                          default: { outline: "none" },
                          hover: {
                            outline: "none",
                            fill: row ? "#0d9488" : "rgb(226, 232, 240)",
                            cursor: row ? "pointer" : "default",
                          },
                          pressed: { outline: "none" },
                        }}
                      >
                        <title>
                          {postal
                            ? row
                              ? `${postalToStateName[postal] ?? postal}: ${row.advertiser_count} advertiser${row.advertiser_count !== 1 ? "s" : ""}`
                              : `${postalToStateName[postal] ?? postal}: No data`
                            : geo.properties.name ?? "Unknown"}
                        </title>
                      </Geography>
                    );
                  })
                }
              </Geographies>
            </ComposableMap>

            {/* Color legend */}
            <div className="flex items-center gap-2 mt-2 px-1">
              <span className="text-xs text-slate-gray">0</span>
              <div
                className="flex-1 h-2 rounded-full"
                style={{
                  background: `linear-gradient(to right, ${tealInterpolator(0)}, ${tealInterpolator(0.5)}, ${tealInterpolator(1)})`,
                }}
              />
              <span className="text-xs text-slate-gray">{maxVal} advertiser{maxVal !== 1 ? "s" : ""}</span>
            </div>
          </div>

          {/* Top 10 ranked list */}
          <div className="lg:w-56 shrink-0">
            <h3 className="text-xs font-medium text-slate-gray mb-2 uppercase tracking-wide">
              Top 10 States
            </h3>
            <div className="space-y-1">
              {topGeos.map((row, i) => {
                const pct = maxVal > 0 ? (row.advertiser_count / maxVal) * 100 : 0;
                return (
                  <div key={row.geo_code} className="flex items-center gap-2">
                    <span className="text-xs text-slate-gray w-4 text-right">{i + 1}.</span>
                    <span className="text-xs text-midnight-navy w-20 truncate">
                      {postalToStateName[row.geo_code] ?? row.geo_code}
                    </span>
                    <div className="flex-1 bg-cloud rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: tealInterpolator(row.advertiser_count / maxVal),
                        }}
                      />
                    </div>
                    <span className="text-xs text-midnight-navy font-medium w-6 text-right">
                      {row.advertiser_count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* DMA table view (no boundary GeoJSON available) */}
      {!loading && hasData && geoLevel === "dma" && (
        <div>
          <p className="mb-3 text-xs text-slate-gray italic">
            DMA map view coming soon. Showing DMA markets as a ranked table.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cloud">
                  <th className="py-3 pr-2 text-xs font-semibold uppercase tracking-wider text-slate-gray w-10">
                    #
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                    DMA Market
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                    Advertisers
                  </th>
                  <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right w-32">
                    Observations
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeData.map((row, i) => {
                  const pct = maxVal > 0 ? (row.advertiser_count / maxVal) * 100 : 0;
                  return (
                    <tr
                      key={`${row.geo_code}-${i}`}
                      className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                    >
                      <td className="py-3 pr-2 text-sm font-medium text-slate-gray">
                        {i + 1}
                      </td>
                      <td className="py-3 px-3 font-medium text-midnight-navy">
                        {row.geo_name}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 rounded-full bg-cloud">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                width: `${Math.min(pct, 100)}%`,
                                backgroundColor: tealInterpolator(row.advertiser_count / maxVal),
                              }}
                            />
                          </div>
                          <span className="text-sm font-bold text-midnight-navy w-6 text-right">
                            {row.advertiser_count}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pl-3 text-right text-sm text-midnight-navy/70">
                        {row.observation_count.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Data notice */}
      {!loading && (
        <div className="mt-4 rounded-md border border-intelligence-teal/30 bg-intelligence-teal/5 px-4 py-3 text-xs leading-relaxed">
          <strong className="text-intelligence-teal">Data Notice:</strong>
          <span className="text-charcoal">
            {" "}Shows distinct advertisers observed in the last 90 days. Treat as directional competitive intelligence.
          </span>
        </div>
      )}
    </div>
  );
}
