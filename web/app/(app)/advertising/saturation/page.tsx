import {
  getSaturationScores,
  getSaturationFilters,
  getAdvertiserEntities,
} from "@/lib/queries";
import { Radio } from "lucide-react";
import { AdvertisingInsight } from "../../components/advertising-insight";
import { SaturationClient } from "./saturation-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Advertising Saturation | Legal Marketing Intelligence",
};

export default async function AdvertisingSaturationPage() {
  const [scores, filters, advertisers] = await Promise.all([
    getSaturationScores(),
    getSaturationFilters(),
    getAdvertiserEntities(),
  ]);

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-intelligence-teal/10">
          <Radio className="h-5 w-5 text-intelligence-teal" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-midnight-navy">
            Advertising Saturation
          </h1>
          <p className="text-sm text-slate-gray">
            See where advertising competition is fiercest across tort categories
            and markets.
          </p>
        </div>
      </div>

      {/* Explainer */}
      <div className="mt-5">
        <AdvertisingInsight>
          <p>
            The <strong>saturation score</strong> is a composite metric (0–100)
            combining advertiser count, estimated spend, and creative volume for
            each tort-market combination. Higher scores indicate more crowded
            advertising environments.
          </p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>
              <strong>Identify crowded markets</strong> — Severe and High scores
              signal intense competition where differentiation is critical.
            </li>
            <li>
              <strong>Find underserved opportunities</strong> — Light scores may
              indicate markets with less competition for specific torts.
            </li>
            <li>
              <strong>Click any row</strong> to see the top advertisers, spend
              breakdown, and channel mix for that combination.
            </li>
          </ul>
          <p className="mt-2 text-slate-gray">
            Scores are computed daily from observed ad activity. Estimates are
            based on monitoring coverage and may not reflect total market spend.
          </p>
        </AdvertisingInsight>
      </div>

      {/* Client-side interactive section */}
      <div className="mt-5 space-y-5">
        <SaturationClient
          scores={scores}
          filters={filters}
          advertisers={advertisers}
        />
      </div>
    </>
  );
}
