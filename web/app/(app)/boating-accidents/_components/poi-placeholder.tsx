import { Anchor } from "lucide-react";

export function POIPlaceholder() {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <Anchor className="mt-0.5 h-5 w-5 shrink-0 text-intelligence-teal" />
        <div>
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Nearby Advertising Targets
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-gray">
            Marina, boat ramp, and yacht club data coming soon. This feature
            will show geo-targetable advertising inventory near boating
            hotspots.
          </p>
          <div className="mt-3 inline-flex items-center rounded-full bg-cloud px-3 py-1 text-xs font-medium text-slate-gray">
            Coming soon
          </div>
        </div>
      </div>
    </div>
  );
}
