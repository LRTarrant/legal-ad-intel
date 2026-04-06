import {
  getJudicialProfileSummary,
  getJudicialProfiles,
  getJudicialStates,
} from "@/lib/queries";
import { JudicialFilterBar } from "./judicial-filter-bar";
import { JudicialMapPanel } from "./judicial-map-panel";
import { JudicialTable } from "./judicial-table";

export const metadata = {
  title: "Judicial Profiles | Legal Marketing Intelligence",
};

type SearchParams = Promise<{
  state?: string | string[];
}>;

function getSingleValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function parseState(rawState: string | null): string | null {
  const state = rawState?.trim().toUpperCase() ?? "";
  return state || null;
}

export default async function JudicialProfilesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const selectedState = parseState(getSingleValue(params.state));

  const [states, summary, rows] = await Promise.all([
    getJudicialStates(),
    getJudicialProfileSummary(selectedState),
    getJudicialProfiles(selectedState),
  ]);

  const filterSummary = selectedState ? `${selectedState} only` : "All states";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-midnight-navy">
          Judicial Profiles
        </h1>
        <p className="mt-1 text-slate-gray">
          County-level judicial leanings for prospecting and market context
        </p>
      </div>

      <JudicialFilterBar
        states={states}
        selectedState={selectedState}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Conservative"
          value={summary.conservative.toLocaleString()}
          accent="text-rose-600"
          sub={filterSummary}
        />
        <SummaryCard
          label="Moderate"
          value={summary.moderate.toLocaleString()}
          accent="text-amber-600"
          sub={filterSummary}
        />
        <SummaryCard
          label="Liberal"
          value={summary.liberal.toLocaleString()}
          accent="text-blue-600"
          sub={filterSummary}
        />
        <SummaryCard
          label="Total Counties"
          value={summary.total_counties.toLocaleString()}
          accent="text-midnight-navy"
          sub="Profiles returned"
        />
      </div>

      <JudicialMapPanel rows={rows} selectedState={selectedState} />

      <JudicialTable rows={rows} />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase text-slate-gray">{label}</p>
      <p className={`mt-1 font-heading text-2xl font-bold ${accent}`}>
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-xs text-slate-gray">{sub}</p> : null}
    </div>
  );
}
