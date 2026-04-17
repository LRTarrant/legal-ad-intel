import { getMarketHeatmapData, getMarketFilters } from "@/lib/queries";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { MarketsClient } from "../advertising/markets/markets-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Market Explorer | Legal Marketing Intelligence",
};

type StateMetrics = {
  name: string;
  href: string;
  fatalCrashes: string;
  piCompetitors: string;
  topOpportunity: string;
  mostContested: string;
  metrosTracked: string;
  adSaturation: string;
};

const STATE_COMPARISON_CARDS: StateMetrics[] = [
  {
    name: "Alabama",
    href: "/state-intelligence/alabama",
    fatalCrashes: "1,075",
    piCompetitors: "6",
    topOpportunity: "Large Truck",
    mostContested: "Truck",
    metrosTracked: "4",
    adSaturation: "Low",
  },
  {
    name: "Florida",
    href: "/state-intelligence/florida",
    fatalCrashes: "3,531",
    piCompetitors: "11",
    topOpportunity: "Motorcycle",
    mostContested: "Truck",
    metrosTracked: "4",
    adSaturation: "High",
  },
  {
    name: "California",
    href: "/state-intelligence/california",
    fatalCrashes: "4,407",
    piCompetitors: "13",
    topOpportunity: "Motor Vehicle",
    mostContested: "Truck",
    metrosTracked: "4",
    adSaturation: "High",
  },
];

export default async function MarketsPage() {
  const [events, filters] = await Promise.all([
    getMarketHeatmapData(),
    getMarketFilters(),
  ]);

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-intelligence-teal/10">
          <MapPin className="h-5 w-5 text-intelligence-teal" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-midnight-navy">Market Explorer</h1>
          <p className="text-sm text-slate-gray">
            Compare state-level demand signals, competitive intensity, and case-type opportunity across U.S. markets.
          </p>
        </div>
      </div>

      {/* State Comparison Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {STATE_COMPARISON_CARDS.map((state) => (
          <div key={state.name} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-midnight-navy">{state.name}</h2>
            <div className="mt-4 grid grid-cols-3 gap-x-4 gap-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fatal Crashes</p>
                <p className="mt-0.5 text-lg font-semibold text-slate-900">{state.fatalCrashes}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">PI Competitors</p>
                <p className="mt-0.5 text-lg font-semibold text-slate-900">{state.piCompetitors}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Top Opportunity</p>
                <p className="mt-0.5 text-lg font-semibold text-slate-900">{state.topOpportunity}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Most Contested</p>
                <p className="mt-0.5 text-lg font-semibold text-slate-900">{state.mostContested}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Metros Tracked</p>
                <p className="mt-0.5 text-lg font-semibold text-slate-900">{state.metrosTracked}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ad Saturation</p>
                <p className="mt-0.5 text-lg font-semibold text-slate-900">{state.adSaturation}</p>
              </div>
            </div>
            <Link
              href={state.href}
              className="mt-5 inline-flex items-center text-sm font-medium text-intelligence-teal hover:text-intelligence-teal/80 transition-colors"
            >
              Explore {state.name} →
            </Link>
          </div>
        ))}
      </div>

      {/* DMA Advertising Activity */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-midnight-navy">DMA Advertising Activity</h2>
        <p className="mt-1 text-sm text-slate-gray">
          Tort advertising saturation across major designated market areas.
        </p>
        <div className="mt-5 space-y-5">
          <MarketsClient events={events} filters={filters} />
        </div>
      </section>
    </>
  );
}
