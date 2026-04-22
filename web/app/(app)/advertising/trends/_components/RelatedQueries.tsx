type QueryItem = {
  query_type: string;
  position: number | null;
  query_text: string;
  display_value: string | null;
  extracted_value: number | null;
};

interface RelatedQueriesProps {
  topQueries: QueryItem[];
  risingQueries: QueryItem[];
}

export function RelatedQueries({ topQueries, risingQueries }: RelatedQueriesProps) {
  if (topQueries.length === 0 && risingQueries.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
        No related queries data yet. Run the pipeline to populate.
      </div>
    );
  }

  const topMax = topQueries[0]?.extracted_value ?? 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Top Queries */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h3 className="text-xs font-medium text-zinc-400 mb-3 uppercase tracking-wide">
          Top Queries
        </h3>
        {topQueries.length === 0 ? (
          <p className="text-xs text-zinc-500">No top queries data.</p>
        ) : (
          <div className="space-y-1.5">
            {topQueries.map((q, i) => {
              const val = q.extracted_value ?? 0;
              const pct = topMax > 0 ? (val / topMax) * 100 : 0;
              return (
                <div key={`${q.query_text}-${i}`} className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 w-5 text-right shrink-0">
                    {q.position ?? i + 1}.
                  </span>
                  <span className="text-xs text-zinc-300 w-36 truncate shrink-0">
                    {q.query_text}
                  </span>
                  <div className="flex-1 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-600 to-purple-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-400 w-8 text-right shrink-0">
                    {val}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rising Queries */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h3 className="text-xs font-medium text-zinc-400 mb-3 uppercase tracking-wide">
          Rising Queries
        </h3>
        {risingQueries.length === 0 ? (
          <p className="text-xs text-zinc-500">No rising queries data.</p>
        ) : (
          <div className="space-y-1.5">
            {risingQueries.map((q, i) => {
              const display = q.display_value ?? "";
              const isBreakout = display.toLowerCase().includes("breakout");
              return (
                <div key={`${q.query_text}-${i}`} className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 w-5 text-right shrink-0">
                    {q.position ?? i + 1}.
                  </span>
                  <span className="text-xs text-zinc-300 flex-1 truncate">
                    {q.query_text}
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                      isBreakout
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-purple-500/20 text-purple-300"
                    }`}
                  >
                    {display}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
