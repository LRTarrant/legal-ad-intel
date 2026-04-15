import {
  getAdvertiserProfiles,
  getAdvertiserFilters,
} from "@/lib/queries";
import { Building2 } from "lucide-react";
import { AdvertisersClient } from "../advertising/advertisers/advertisers-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Competitors | Legal Marketing Intelligence",
};

export default async function CompetitorsPage() {
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
          <h1 className="text-2xl font-bold text-midnight-navy">Competitors</h1>
          <p className="text-sm text-slate-gray">
            See which firms are active where — and how their channel mix,
            markets, and tort focus compare to the rest of the market.
          </p>
        </div>
      </div>

      {/* Client-side interactive section */}
      <div className="mt-5 space-y-5">
        <AdvertisersClient profiles={profiles} filters={filters} />
      </div>
    </>
  );
}
