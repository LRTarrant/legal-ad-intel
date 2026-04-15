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
            Composite PI attractiveness scores · Sources: State statutes,{" "}
            <a
              href="https://tlrfoundation.org/wp-content/uploads/2025/01/Damage-Caps-Across-the-US_TLR-Foundation-2024.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-intelligence-teal underline hover:no-underline"
            >
              TLR Foundation
            </a>
            , Jury Verdict Research
          </p>
        </div>
      </div>

      <PiViabilityFilter states={allStates} />

      <AdvertisingInsight>
        <p>
          <strong>Focus your budget on plaintiff-friendly jurisdictions.</strong> Scores are compiled
          from state negligence statutes, statutory damage cap data via{" "}
          <a
            href="https://tlrfoundation.org/wp-content/uploads/2025/01/Damage-Caps-Across-the-US_TLR-Foundation-2024.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-intelligence-teal underline hover:no-underline"
          >
            TLR Foundation reports
          </a>
          , and historical jury verdict data from Jury Verdict Research. States with pure comparative
          negligence, no damage caps, and historically high verdicts offer the best return on legal
          advertising spend. Use these scores to prioritize markets where successful case outcomes
          justify higher client acquisition costs.
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
        <p className="mt-2 text-xs text-slate-gray/70">
          Negligence Rule &amp; SOL — state statutes · Non-Econ Cap, Punitive Cap &amp; Med-Mal
          Cap —{" "}
          <a
            href="https://tlrfoundation.org/wp-content/uploads/2025/01/Damage-Caps-Across-the-US_TLR-Foundation-2024.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-intelligence-teal/70 underline hover:no-underline"
          >
            TLR Foundation (2024)
          </a>{" "}
          · Avg Verdict — Jury Verdict Research &amp; public court records
        </p>
      </div>

      {/* TODO: Choropleth map */}

      <PiViabilityTable scores={scores} />
    </div>
  );
}
