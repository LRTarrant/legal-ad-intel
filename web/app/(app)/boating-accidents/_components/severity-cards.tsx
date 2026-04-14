import type { BoatingSeverityStats } from "@/lib/queries";

type SeverityCardsProps = {
  severity: BoatingSeverityStats;
  filterSummary: string;
};

export function SeverityCards({ severity, filterSummary }: SeverityCardsProps) {
  return (
    <>
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase text-slate-gray">Fatality Rate</p>
        <p className="mt-1 font-heading text-2xl font-bold text-midnight-navy">
          {severity.fatality_rate.toFixed(1)}%
        </p>
        <p className="mt-0.5 text-xs text-slate-gray">
          Deaths per accident &middot; {filterSummary}
        </p>
      </div>
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase text-slate-gray">% Fatal Accidents</p>
        <p className="mt-1 font-heading text-2xl font-bold text-midnight-navy">
          {severity.pct_fatal.toFixed(1)}%
        </p>
        <p className="mt-0.5 text-xs text-slate-gray">
          Accidents with &ge;1 death &middot; {filterSummary}
        </p>
      </div>
    </>
  );
}
