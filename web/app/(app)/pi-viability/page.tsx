import { getPiViabilityScores } from "@/lib/queries";
import { PiViabilityTable } from "./pi-viability-table";
import { PiViabilityFilter } from "./pi-viability-filter";
import { AdvertisingInsight } from "../components/advertising-insight";
import { Scale } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Plaintiff Favorability By State | Legal Marketing Intelligence",
};

type SearchParams = Promise<{
  state?: string | string[];
}>;

function getSingleValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function PiViabilityPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filterState = getSingleValue(params.state)?.trim().toUpperCase() || undefined;

  const scores = await getPiViabilityScores(filterState);

  const allStates = scores.map((s) => s.state).sort();

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Scale className="w-7 h-7 shrink-0" style={{ color: "#1A8C96" }} />
        <div>
          <h1 className="font-heading text-3xl font-bold text-midnight-navy">
            Plaintiff Favorability By State
          </h1>
          <p className="mt-1 text-slate-gray">
            Composite PI attractiveness scores based on negligence rules, damage caps, and verdict history
          </p>
        </div>
      </div>

      <PiViabilityFilter states={allStates} />

      <AdvertisingInsight>
        <p>
          <strong>Focus your budget on plaintiff-friendly jurisdictions.</strong> States with pure
          comparative negligence, no damage caps, and historically high jury verdicts offer the best
          return on legal advertising spend. Use these scores to prioritize markets where successful
          case outcomes justify higher client acquisition costs.
        </p>
      </AdvertisingInsight>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-midnight-navy mb-3">
          Scoring Methodology
        </h2>
        <div className="flex flex-wrap gap-3 text-sm text-slate-gray">
          <span className="rounded-full bg-cloud px-3 py-1 font-medium">Negligence Rule (25%)</span>
          <span className="rounded-full bg-cloud px-3 py-1 font-medium">Non-Econ Cap (20%)</span>
          <span className="rounded-full bg-cloud px-3 py-1 font-medium">Avg Verdict (15%)</span>
          <span className="rounded-full bg-cloud px-3 py-1 font-medium">Punitive Cap (10%)</span>
          <span className="rounded-full bg-cloud px-3 py-1 font-medium">Med-Mal Cap (10%)</span>
          <span className="rounded-full bg-cloud px-3 py-1 font-medium">SOL (10%)</span>
        </div>
        <p className="mt-3 text-xs text-slate-gray">
          Each factor is scored 0–100 and weighted. Composite is normalized to a 0–100 scale.
          Higher scores indicate more favorable conditions for personal injury plaintiffs.
        </p>
      </div>

      {/* TODO: Choropleth map */}

      <PiViabilityTable scores={scores} />
    </div>
  );
}
