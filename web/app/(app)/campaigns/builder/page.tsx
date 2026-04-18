import { Crosshair } from "lucide-react";
import { CampaignBuilderClient } from "./campaign-builder-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Campaign Builder | Legal Marketing Intelligence",
  description:
    "Generate data-driven campaign plans for mass tort advertising with real market intelligence.",
};

export default function CampaignBuilderPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-intelligence-teal/10">
          <Crosshair className="h-5 w-5 text-intelligence-teal" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-midnight-navy">
            Campaign Builder
          </h1>
          <p className="text-sm text-slate-gray">
            Generate data-driven campaign plans powered by real market
            intelligence.
          </p>
        </div>
      </div>

      <CampaignBuilderClient />
    </div>
  );
}
