import {
  getAdvertiserProfiles,
  getAdvertiserFilters,
} from "@/lib/queries";
import { Building2 } from "lucide-react";
import { AdvertisingInsight } from "../../components/advertising-insight";
import { AdvertisersClient } from "./advertisers-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Advertiser Profiles | Legal Marketing Intelligence",
};

export default async function AdvertiserProfilesPage() {
  const [profiles, filters] = await Promise.all([
    getAdvertiserProfiles(),
    getAdvertiserFilters(),
  ]);

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-intelligence-teal/10">
          <Building2 className="h-5 w-5 text-intelligence-teal" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-midnight-navy">
            Advertiser Profiles
          </h1>
          <p className="text-sm text-slate-gray">
            Explore the law firms and aggregators active in legal advertising
            across channels, torts, and markets.
          </p>
        </div>
      </div>

      {/* Explainer */}
      <div className="mt-5">
        <AdvertisingInsight>
          <p>
            This page profiles every advertiser we track across legal
            advertising channels. Each row aggregates a firm&apos;s activity —
            how many channels they use, which torts they target, how many
            markets they reach, and their estimated total spend.
          </p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>
              <strong>Filter by channel</strong> to see which advertisers are
              active on a specific platform (e.g., Facebook, Google Ads).
            </li>
            <li>
              <strong>Filter by tort</strong> to narrow to advertisers
              targeting a specific case type.
            </li>
            <li>
              <strong>Sort by spend</strong> (default) to identify the
              highest-spending competitors in the market.
            </li>
          </ul>
          <p className="mt-2 text-slate-gray">
            Data sourced from ad observation feeds. Spend figures are
            estimates based on observed creative volume and platform
            benchmarks — not verified billing data.
          </p>
        </AdvertisingInsight>
      </div>

      {/* Client-side interactive section */}
      <div className="mt-5 space-y-5">
        <AdvertisersClient profiles={profiles} filters={filters} />
      </div>
    </>
  );
}
