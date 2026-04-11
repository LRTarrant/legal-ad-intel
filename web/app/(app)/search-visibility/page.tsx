import { getSerpVisibilityWindowed } from "@/lib/queries/serp-visibility";
import { getTorts } from "@/lib/queries/ad-saturation";
import { computeDateRange } from "../ad-saturation/_components/time-window-utils";
import { TimeWindowSelector } from "../ad-saturation/_components/TimeWindowSelector";
import { SearchVisibilityClient } from "./search-visibility-client";
import { Suspense } from "react";
import { Search } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Search Visibility | Legal Marketing Intelligence",
};

export default async function SearchVisibilityPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string; from?: string; to?: string; tort?: string }>;
}) {
  const sp = await searchParams;
  const { windowStart, windowEnd } = computeDateRange(sp.window, sp.from, sp.to);

  const [visibilityData, torts] = await Promise.all([
    getSerpVisibilityWindowed(windowStart, windowEnd, sp.tort || undefined),
    getTorts(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Search className="h-6 w-6 text-blue-400" />
          Search Visibility
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          SERP position tracking across tort-related queries — organic, paid, and featured results.
        </p>
      </div>

      <Suspense fallback={null}>
        <TimeWindowSelector />
      </Suspense>

      <SearchVisibilityClient data={visibilityData} torts={torts} />
    </div>
  );
}
