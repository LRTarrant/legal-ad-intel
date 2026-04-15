import type { RecentStormEvent } from "@/lib/queries";
import { MapPin } from "lucide-react";

function formatDamage(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  if (value > 0) return `$${value.toLocaleString()}`;
  return "$0";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function RecentEventsPanel({
  events,
  subtitle,
}: {
  events: RecentStormEvent[];
  subtitle: string;
}) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm overflow-x-auto">
      <div className="mb-4">
        <h2 className="font-heading text-xl font-semibold text-midnight-navy">
          Recent Storm Events
        </h2>
        <p className="mt-1 text-sm text-slate-gray">{subtitle}</p>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-slate-gray">
          No storm events found for the selected period.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cloud text-left">
              <th className="pb-3 pr-4 font-semibold text-slate-gray">Date</th>
              <th className="pb-3 pr-4 font-semibold text-slate-gray">State</th>
              <th className="pb-3 pr-4 font-semibold text-slate-gray">County</th>
              <th className="pb-3 pr-4 font-semibold text-slate-gray">Event Type</th>
              <th className="pb-3 pr-4 text-right font-semibold text-slate-gray">
                Property Damage
              </th>
              <th className="pb-3 pr-4 text-right font-semibold text-slate-gray">
                Injuries
              </th>
              <th className="pb-3 text-right font-semibold text-slate-gray">
                Deaths
              </th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev, i) => {
              const eventLabel =
                ev.event_type === "Tornado" && ev.tor_f_scale
                  ? `Tornado (${ev.tor_f_scale})`
                  : ev.event_type;

              return (
                <tr
                  key={`${ev.begin_date_time}-${ev.state}-${ev.county_name}-${i}`}
                  className="border-b border-cloud/50 hover:bg-cloud/30 transition-colors"
                >
                  <td className="py-2.5 pr-4 whitespace-nowrap text-midnight-navy">
                    {formatDate(ev.begin_date_time)}
                  </td>
                  <td className="py-2.5 pr-4 font-medium text-midnight-navy">
                    {ev.state}
                  </td>
                  <td className="py-2.5 pr-4 text-midnight-navy">
                    <span className="flex items-center gap-1">
                      {ev.county_name}
                      {ev.begin_lat != null && ev.begin_lon != null && (
                        <span
                          title={`${ev.begin_lat.toFixed(2)}, ${ev.begin_lon.toFixed(2)}`}
                        >
                          <MapPin className="inline h-3.5 w-3.5 text-slate-gray/60" />
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-midnight-navy">{eventLabel}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {formatDamage(ev.damage_property)}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {ev.total_injuries.toLocaleString()}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {ev.total_deaths.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
