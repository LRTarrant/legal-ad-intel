import type { ConstructionStatePriority } from "@/lib/queries";

type StatePriorityTableProps = {
  rows: ConstructionStatePriority[];
};

const TIER_STYLES: Record<string, { bg: string; text: string }> = {
  Critical: { bg: "bg-red-100", text: "text-red-800" },
  High: { bg: "bg-orange-100", text: "text-orange-800" },
  Medium: { bg: "bg-yellow-100", text: "text-yellow-800" },
  Low: { bg: "bg-green-100", text: "text-green-800" },
  Unknown: { bg: "bg-gray-100", text: "text-gray-600" },
};

export function StatePriorityTable({ rows }: StatePriorityTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-heading text-xl font-semibold text-midnight-navy">
          State Priority Ranking
        </h2>
        <p className="mt-3 text-sm text-slate-gray">
          No state priority data available.
        </p>
      </div>
    );
  }

  // Sort: states with rates first (desc by rate), then Unknown tier at bottom
  const sorted = [...rows].sort((a, b) => {
    if (a.priority_tier === "Unknown" && b.priority_tier !== "Unknown") return 1;
    if (b.priority_tier === "Unknown" && a.priority_tier !== "Unknown")
      return -1;
    return (
      (b.construction_fatality_rate_2024 ?? 0) -
      (a.construction_fatality_rate_2024 ?? 0)
    );
  });

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="font-heading text-xl font-semibold text-midnight-navy">
          State Priority Ranking — Construction Fatality Rate
        </h2>
        <p className="mt-1 text-sm text-slate-gray">
          Ranked by construction-specific fatality rate per 100K FTE. 34 states
          have published rates.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-midnight-navy/10">
              <th className="py-2 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-gray">
                #
              </th>
              <th className="py-2 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-gray">
                State
              </th>
              <th className="py-2 pr-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray">
                Construction Rate /100K
              </th>
              <th className="py-2 pr-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-gray">
                Priority Tier
              </th>
              <th className="py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray">
                vs. National
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, index) => {
              const style =
                TIER_STYLES[row.priority_tier] ?? TIER_STYLES.Unknown;
              return (
                <tr
                  key={row.state_abbr}
                  className="border-b border-midnight-navy/5"
                >
                  <td className="py-2.5 pr-3 font-mono text-xs text-slate-gray">
                    {index + 1}
                  </td>
                  <td className="py-2.5 pr-3 font-medium text-midnight-navy">
                    {row.state_name}{" "}
                    <span className="text-xs text-slate-gray">
                      ({row.state_abbr})
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono font-semibold text-midnight-navy">
                    {row.construction_fatality_rate_2024 != null
                      ? row.construction_fatality_rate_2024.toFixed(1)
                      : "—"}
                  </td>
                  <td className="py-2.5 pr-3 text-center">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.bg} ${style.text}`}
                    >
                      {row.priority_tier}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-mono text-xs">
                    {row.rate_vs_national != null ? (
                      <span
                        className={
                          row.rate_vs_national >= 1.5
                            ? "font-semibold text-red-600"
                            : row.rate_vs_national >= 1.0
                              ? "text-orange-600"
                              : "text-green-600"
                        }
                      >
                        {row.rate_vs_national.toFixed(1)}&times; national avg
                      </span>
                    ) : (
                      <span className="text-slate-gray">
                        Rate not published
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
