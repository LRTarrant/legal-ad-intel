import {
  getMsaDemographics,
  getMsaDemographicCount,
  type MsaDemographic,
} from "@/lib/queries";
import { Users, Building2, MapPin, DollarSign } from "lucide-react";
import { DemographicsTable } from "./demographics-table";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Market Demographics | Legal Marketing Intelligence",
};

function formatNumber(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString();
}

function formatCurrency(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString()}`;
}

export default async function MarketDemographicsPage() {
  const [data, totalCount] = await Promise.all([
    getMsaDemographics(500),
    getMsaDemographicCount(),
  ]);

  const metroCount = data.filter((d) =>
    d.cbsa_type.includes("Metropolitan")
  ).length;
  const totalPop = data.reduce((s, d) => s + (d.total_population ?? 0), 0);
  const avgMedianIncome =
    data.filter((d) => d.median_household_income != null).length > 0
      ? Math.round(
          data
            .filter((d) => d.median_household_income != null)
            .reduce((s, d) => s + d.median_household_income!, 0) /
            data.filter((d) => d.median_household_income != null).length
        )
      : null;

  const cards = [
    {
      label: "Total Markets",
      value: formatNumber(totalCount),
      sub: "MSA & μSA areas",
      icon: MapPin,
      accent: "bg-intelligence-teal/10 text-intelligence-teal",
    },
    {
      label: "Metropolitan",
      value: formatNumber(metroCount),
      sub: "Metro statistical areas",
      icon: Building2,
      accent: "bg-steel-blue/10 text-steel-blue",
    },
    {
      label: "Combined Pop.",
      value: formatNumber(totalPop),
      sub: "Across loaded markets",
      icon: Users,
      accent: "bg-light-teal/10 text-light-teal",
    },
    {
      label: "Avg Median Income",
      value: formatCurrency(avgMedianIncome),
      sub: "Across loaded markets",
      icon: DollarSign,
      accent: "bg-success/10 text-success",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="rounded-full bg-intelligence-teal/10 p-3">
          <Users className="h-6 w-6 text-intelligence-teal" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-midnight-navy">
            Market Demographics
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-gray">
            ACS 2024 5-Year demographic profiles aggregated to MSA/μSA level
            from the Census Bureau — population, race/ethnicity, income,
            education, housing, and health insurance.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${card.accent}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-gray">
                  {card.label}
                </p>
              </div>
              <p className="mt-3 text-2xl font-bold text-midnight-navy">
                {card.value}
              </p>
              <p className="text-sm text-slate-gray">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Interactive Table */}
      <DemographicsTable data={data} totalCount={totalCount} />
    </div>
  );
}
