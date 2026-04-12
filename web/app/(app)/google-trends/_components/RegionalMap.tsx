"use client";

type GeoRow = {
  region_code: string | null;
  region_name: string | null;
  interest_value: number | null;
};

interface RegionalMapProps {
  data: GeoRow[];
}

function getColor(value: number): string {
  // Map 0-100 to a purple gradient
  const intensity = Math.round((value / 100) * 255);
  // From dark purple (low) to bright purple (high)
  const r = Math.round(88 + (intensity / 255) * 80);
  const g = Math.round(28 + (intensity / 255) * 20);
  const b = Math.round(135 + (intensity / 255) * 100);
  return `rgb(${r},${g},${b})`;
}

export function RegionalMap({ data }: RegionalMapProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">
        No regional data available.
      </div>
    );
  }

  // Sort by interest descending
  const sorted = [...data]
    .filter((d) => d.interest_value !== null)
    .sort((a, b) => (b.interest_value ?? 0) - (a.interest_value ?? 0));

  const maxValue = sorted[0]?.interest_value ?? 100;

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-500 mb-3">
        Regional interest (0–100 relative scale). Top {Math.min(sorted.length, 51)} regions shown.
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
                    backgroundColor: getColor(val),
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
