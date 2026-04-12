"use client";

import { useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
} from "react-simple-maps";
import { scaleSequential } from "d3-scale";
import { fipsToPostal, stateNameToPostal, postalToStateName } from "@/lib/usStates";

const US_TOPO_URL =
  "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

type GeoRow = {
  region_code: string | null;
  region_name: string | null;
  interest_value: number | null;
};

interface RegionalMapProps {
  data: GeoRow[];
  worldData?: GeoRow[];
}

/** Extract 2-letter postal code from a geo row.
 *  region_code may be "US-AL" or just "AL"; region_name may be "Alabama". */
function toPostalCode(row: GeoRow): string | null {
  const rc = row.region_code ?? "";
  if (rc.startsWith("US-")) return rc.slice(3);
  if (rc.length === 2 && rc === rc.toUpperCase()) return rc;
  const name = row.region_name ?? "";
  return stateNameToPostal[name] ?? null;
}

/** Purple color interpolator for [0, 1] — dark to vivid purple */
function purpleInterpolator(t: number): string {
  // From zinc-800-ish (low) to vivid purple (high)
  const r = Math.round(39 + t * 153); // 39 → 192
  const g = Math.round(39 + t * 6);   // 39 → 45
  const b = Math.round(42 + t * 213); // 42 → 255
  return `rgb(${r},${g},${b})`;
}

function WorldFallback({ data }: { data: GeoRow[] }) {
  const sorted = [...data]
    .filter((d) => d.interest_value !== null)
    .sort((a, b) => (b.interest_value ?? 0) - (a.interest_value ?? 0));

  const maxValue = sorted[0]?.interest_value ?? 100;

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-500 mb-3">
        No US state-level data available yet. Showing worldwide regional
        interest (0-100 relative scale).
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
        {sorted.slice(0, 51).map((row, i) => {
          const val = row.interest_value ?? 0;
          const pct = maxValue > 0 ? (val / maxValue) * 100 : 0;
          return (
            <div key={`${row.region_code}-${i}`} className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 w-28 truncate shrink-0">
                {row.region_name ?? row.region_code ?? "Unknown"}
              </span>
              <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: purpleInterpolator(val / 100),
                  }}
                />
              </div>
              <span className="text-xs text-zinc-300 w-6 text-right">{val}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RegionalMap({ data, worldData = [] }: RegionalMapProps) {
  // Build postal code → interest value lookup from US data
  const stateMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of data) {
      const pc = toPostalCode(row);
      if (pc && row.interest_value !== null) {
        // Keep the highest value if duplicates exist
        const existing = m.get(pc);
        if (existing === undefined || row.interest_value > existing) {
          m.set(pc, row.interest_value);
        }
      }
    }
    return m;
  }, [data]);

  const hasUSData = stateMap.size > 0;

  // Fallback: no US data → show worldwide bar chart
  if (!hasUSData) {
    if (worldData.length > 0) {
      return <WorldFallback data={worldData} />;
    }
    return (
      <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">
        No regional data available.
      </div>
    );
  }

  const maxVal = Math.max(...stateMap.values(), 1);
  const colorScale = scaleSequential()
    .domain([0, maxVal])
    .interpolator(purpleInterpolator);

  // Top-10 states for the ranked list
  const top10 = [...stateMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">
        US state-level interest (0-100 relative scale). Hover for details.
      </p>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Map */}
        <div className="flex-1 min-w-0">
          <ComposableMap
            projection="geoAlbersUsa"
            projectionConfig={{ scale: 1000 }}
            width={800}
            height={500}
            style={{ width: "100%", height: "auto" }}
          >
            <Geographies geography={US_TOPO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const fips = String(geo.id).padStart(2, "0");
                  const postal = fipsToPostal[fips];
                  const value = postal ? stateMap.get(postal) : undefined;
                  const fill =
                    value !== undefined
                      ? colorScale(value)
                      : "rgb(39, 39, 42)"; // zinc-800

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={fill}
                      stroke="rgb(63, 63, 70)"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: {
                          outline: "none",
                          fill: value !== undefined ? "#c084fc" : "rgb(63, 63, 70)",
                          cursor: "pointer",
                        },
                        pressed: { outline: "none" },
                      }}
                    >
                      <title>
                        {postal
                          ? `${postalToStateName[postal] ?? postal}: ${value ?? "No data"}`
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
            <span className="text-xs text-zinc-500">0</span>
            <div
              className="flex-1 h-2 rounded-full"
              style={{
                background: `linear-gradient(to right, ${purpleInterpolator(0)}, ${purpleInterpolator(0.5)}, ${purpleInterpolator(1)})`,
              }}
            />
            <span className="text-xs text-zinc-500">{maxVal}</span>
          </div>
        </div>

        {/* Top 10 ranked list */}
        <div className="lg:w-56 shrink-0">
          <h3 className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wide">
            Top 10 States
          </h3>
          <div className="space-y-1">
            {top10.map(([postal, value], i) => {
              const pct = maxVal > 0 ? (value / maxVal) * 100 : 0;
              return (
                <div key={postal} className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 w-4 text-right">{i + 1}.</span>
                  <span className="text-xs text-zinc-300 w-20 truncate">
                    {postalToStateName[postal] ?? postal}
                  </span>
                  <div className="flex-1 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: purpleInterpolator(value / maxVal),
                      }}
                    />
                  </div>
                  <span className="text-xs text-zinc-400 w-6 text-right">{value}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
