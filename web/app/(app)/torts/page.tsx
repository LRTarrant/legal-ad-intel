import {
  getSaturationScores,
  getSaturationFilters,
  getAdvertiserEntities,
} from "@/lib/queries";
import { Radio } from "lucide-react";
import { SaturationClient } from "../advertising/saturation/saturation-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Torts | Legal Marketing Intelligence",
};

export default async function TortsPage() {
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
          <h1 className="text-2xl font-bold text-midnight-navy">Torts</h1>
          <p className="text-sm text-slate-gray">
            Track active mass tort litigation — filing velocity, advertising
            intensity, and competitive crowding — to spot torts worth entering
            and torts to avoid.
          </p>
        </div>
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
