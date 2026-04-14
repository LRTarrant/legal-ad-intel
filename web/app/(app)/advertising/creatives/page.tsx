import {
  getCreativeObservations,
  getCreativeFilters,
} from "@/lib/queries";
import { Film } from "lucide-react";
import { AdvertisingInsight } from "../../components/advertising-insight";
import { CreativesClient } from "./creatives-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Creative Gallery | Legal Marketing Intelligence",
};

export default async function CreativeGalleryPage() {
  const [observations, filters] = await Promise.all([
    getCreativeObservations(),
    getCreativeFilters(),
  ]);

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-intelligence-teal/10">
          <Film className="h-5 w-5 text-intelligence-teal" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-midnight-navy">
            Creative Gallery
          </h1>
          <p className="text-sm text-slate-gray">
            Browse individual ad observations across TV, CTV, digital, radio,
            search, and social channels to analyze competitor messaging.
          </p>
        </div>
      </div>

      {/* Explainer */}
      <div className="mt-5">
        <AdvertisingInsight>
          <p>
            This page shows individual ad observations — each row is a single
            campaign sighting on a specific channel, in a specific market, on a
            given date. Use it to see what messaging competitors are running and
            where.
          </p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>
              <strong>Filter by advertiser, channel, tort, or market</strong> to
              narrow down to specific competitive activity.
            </li>
            <li>
              <strong>Campaign name</strong> is the primary creative identifier
              — creative text and assets are not yet captured.
            </li>
            <li>
              <strong>Spend estimates are modeled</strong>, not actual billing
              data. Observation coverage is partial and varies by channel.
            </li>
          </ul>
        </AdvertisingInsight>
      </div>

      {/* Client-side interactive section */}
      <div className="mt-5 space-y-5">
        <CreativesClient observations={observations} filters={filters} />
      </div>
    </>
  );
}
