import {
  getMdlFirmSummary,
  getMdlAttorneyScorecard,
  hasMdlAttorneyData,
} from "@/lib/queries/mdl-attorneys";

interface Props {
  mdlNumber: number;
}

export default async function OnDocketFirms({ mdlNumber }: Props) {
  const hasData = await hasMdlAttorneyData(mdlNumber);
  if (!hasData) return null;

  const [scorecard, firms] = await Promise.all([
    getMdlAttorneyScorecard(mdlNumber),
    getMdlFirmSummary(mdlNumber),
  ]);

  return (
    <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <h2 className="mb-4 text-2xl font-bold text-white">
        On-Docket Firms
      </h2>

      {/* Scorecard */}
      {scorecard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Total Firms</p>
            <p className="text-2xl font-bold text-white mt-1">{scorecard.total_firms.toLocaleString()}</p>
          </div>
          <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Total Attorneys</p>
            <p className="text-2xl font-bold text-white mt-1">{scorecard.total_attorneys.toLocaleString()}</p>
          </div>
          <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Plaintiff Firms</p>
            <p className="text-2xl font-bold text-purple-400 mt-1">{scorecard.plaintiff_firms.toLocaleString()}</p>
          </div>
          <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Total Parties</p>
            <p className="text-2xl font-bold text-white mt-1">{scorecard.total_parties.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Firm table */}
      {firms.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-800 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Firm</th>
                <th className="px-4 py-3 text-right">Attorneys</th>
                <th className="px-4 py-3 text-right">Parties</th>
                <th className="px-4 py-3">Roles</th>
                <th className="px-4 py-3">Sample Attorneys</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {firms.map((f) => (
                <tr key={f.firm_name} className="hover:bg-zinc-800/60 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{f.firm_name}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{f.attorney_count}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{f.party_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(f.roles ?? []).map((r) => (
                        <span
                          key={r}
                          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                            r.toLowerCase().includes("plaintiff")
                              ? "bg-purple-900/40 text-purple-300"
                              : "bg-zinc-800 text-slate-300"
                          }`}
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {f.attorneys.slice(0, 3).join(", ")}
                    {f.attorneys.length > 3 && (
                      <span className="text-slate-500 ml-1">
                        +{f.attorneys.length - 3} more
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
