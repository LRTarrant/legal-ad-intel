import { getMarketHeatmapData, getMarketFilters } from "@/lib/queries";
import { MapPin } from "lucide-react";
import { AdvertisingInsight } from "../../components/advertising-insight";
import { MarketsClient } from "./markets-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Market Ad Heatmap | Legal Marketing Intelligence",
};

export default async function MarketHeatmapPage() {
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
          <h1 className="text-2xl font-bold text-midnight-navy">
            Market Ad Heatmap
          </h1>
          <p className="text-sm text-slate-gray">
            Compare advertising activity by market — see where competitors are
            spending the most and which torts and channels dominate each DMA.
          </p>
        </div>
      </div>

      {/* Explainer */}
      <div className="mt-5">
        <AdvertisingInsight>
          <p>
            Advertising activity aggregated by market — compare where
            competitors are spending the most and which torts and channels
            dominate each market.
          </p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>
              <strong>Filter by tort, channel, or advertiser</strong> to see
              market-level breakdowns for specific segments.
            </li>
            <li>
              <strong>Intensity bars</strong> show relative spend — wider bars
              mean higher estimated spend compared to other markets.
            </li>
            <li>
              <strong>Spend estimates are modeled</strong> (not actual
              invoices). Observation coverage is partial and activity levels
              reflect observed data, not true market share.
            </li>
          </ul>
        </AdvertisingInsight>
      </div>

      {/* Client-side interactive section */}
      <div className="mt-5 space-y-5">
        <MarketsClient events={events} filters={filters} />
      </div>
    </>
  );
}
