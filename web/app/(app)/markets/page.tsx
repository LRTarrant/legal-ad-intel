import { getMarketHeatmapData, getMarketFilters } from "@/lib/queries";
import { MapPin } from "lucide-react";
import { MarketsClient } from "../advertising/markets/markets-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Markets | Legal Marketing Intelligence",
};

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
          <h1 className="text-2xl font-bold text-midnight-navy">Markets</h1>
          <p className="text-sm text-slate-gray">
            Compare markets by demand, competition, and advertising intensity to
            find high-value places to deploy your next dollar.
          </p>
        </div>
      </div>

      {/* Client-side interactive section */}
      <div className="mt-5 space-y-5">
        <MarketsClient events={events} filters={filters} />
      </div>
    </>
  );
}
