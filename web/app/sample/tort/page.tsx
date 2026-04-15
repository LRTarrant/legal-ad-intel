import { getSaturationScores } from "@/lib/queries";
import { Radio } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sample: Torts | Legal Marketing Intelligence",
};

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

type SeverityLevel = "Severe" | "High" | "Moderate" | "Light";

function getSeverity(score: number): SeverityLevel {
  if (score >= 75) return "Severe";
  if (score >= 50) return "High";
  if (score >= 25) return "Moderate";
  return "Light";
}

function severityBadge(score: number) {
  const severity = getSeverity(score);
  const styles: Record<SeverityLevel, string> = {
    Severe: "bg-red-50 text-red-700 ring-1 ring-red-200",
    High: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
    Moderate: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
    Light: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${styles[severity]}`}
    >
      {severity} ({score.toFixed(1)})
    </span>
  );
}

export default async function SampleTortPage() {
  const scores = await getSaturationScores();

  // Show top 15 by saturation score
  const topScores = scores.slice(0, 15);

  // Aggregate unique torts
  const uniqueTorts = new Set(topScores.map((s) => s.tort_label));

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-intelligence-teal/10">
          <Radio className="h-5 w-5 text-intelligence-teal" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-midnight-navy">
            Torts — Sample View
          </h1>
          <p className="text-sm text-slate-gray">
            Track mass tort advertising intensity and competitive crowding.
            Showing top 15 tort-market combinations by saturation.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
            Tort-Market Combos Shown
          </p>
          <p className="mt-1 text-2xl font-bold text-midnight-navy">
            {topScores.length}
          </p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
            Unique Torts
          </p>
          <p className="mt-1 text-2xl font-bold text-midnight-navy">
            {uniqueTorts.size}
          </p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
            Total Est. Spend
          </p>
          <p className="mt-1 text-2xl font-bold text-intelligence-teal">
            {formatCurrency(topScores.reduce((s, r) => s + r.estimated_spend, 0))}
          </p>
        </div>
      </div>

      {/* Table */}
      <section className="mt-6 rounded-lg bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-cloud text-left text-xs font-semibold uppercase tracking-wider text-slate-gray">
                <th className="px-4 py-3 w-12 text-center">#</th>
                <th className="px-4 py-3">Tort</th>
                <th className="px-4 py-3">Market</th>
                <th className="px-4 py-3 text-center">Competition</th>
                <th className="px-4 py-3 text-right">Est. Spend</th>
                <th className="px-4 py-3 text-center">Advertisers</th>
                <th className="px-4 py-3 text-center">Creatives</th>
              </tr>
            </thead>
            <tbody>
              {topScores.map((row, idx) => (
                <tr
                  key={row.id}
                  className="border-b border-cloud last:border-0 hover:bg-cloud/30 transition-colors"
                >
                  <td className="px-4 py-3 text-center text-sm text-slate-gray tabular-nums">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-charcoal">
                      {row.tort_label}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-charcoal">{row.geo_name}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {severityBadge(row.saturation_score)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-midnight-navy tabular-nums">
                    {formatCurrency(row.estimated_spend)}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-semibold text-charcoal tabular-nums">
                    {formatNumber(row.total_advertisers)}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-semibold text-charcoal tabular-nums">
                    {formatNumber(row.total_creatives)}
                  </td>
                </tr>
              ))}
              {topScores.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-slate-gray"
                  >
                    No tort saturation data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
