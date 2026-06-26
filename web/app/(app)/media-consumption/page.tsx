import { Radio } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import {
  MediaConsumptionExplorer,
  type BaselineRow,
} from "./media-consumption-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Media Consumption | Legal Marketing Intelligence",
};

// Decision-lead reads, derived from the baseline — the "so what" before the data.
const INSIGHTS: { lead: string; body: string }[] = [
  {
    lead: "Radio still reaches everyone.",
    body: "Near-universal with Black (92%) and Hispanic (98%) adults, and 87–93% across every age band. The one traditional channel whose reach doesn't skew old — lead with it in high-minority and rural markets.",
  },
  {
    lead: "Streaming is now the broad-reach screen.",
    body: "Connected TV reaches 83% of all adults — even 65% of those 65+ — and over-indexes upper-income households (91%). Linear cable is the inverse: only 36% subscribe, just 16% of under-30s.",
  },
  {
    lead: "Match the platform to the audience.",
    body: "TikTok and Snapchat are the only majors that skew lower-income; Instagram and CTV skew upper. For older case types, Facebook (80% of 30–49) and YouTube (65% at 65+) hold where Instagram (19% at 65+) drops off.",
  },
];

export default async function MediaConsumptionPage() {
  // media_consumption_baseline isn't in database.types yet; read via an untyped
  // handle (repo pattern for not-yet-typed tables).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabase() as any;
  const { data } = await supabase
    .from("media_consumption_baseline")
    .select(
      "demographic_type, demographic_group, channel, metric, scope, value, unit, source, source_url, source_year, notes",
    )
    .eq("geography_level", "national");

  const rows = ((data as BaselineRow[] | null) ?? []).map((r) => ({
    ...r,
    value: typeof r.value === "number" ? r.value : Number(r.value),
  }));

  return (
    <div className="space-y-10">
      {/* Header */}
      <header className="flex items-start gap-4">
        <div className="rounded-full bg-intelligence-teal/10 p-3">
          <Radio className="h-6 w-6 text-intelligence-teal" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-midnight-navy">
            Media Consumption
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-gray">
            How U.S. audiences consume each channel, by demographic — from Pew, BLS
            and industry sources. A national baseline you apply to a market&apos;s own
            population mix, not measured local consumption.
          </p>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="font-heading text-base font-semibold text-midnight-navy">
            Baseline unavailable
          </p>
          <p className="mt-1 text-sm text-slate-gray">
            No consumption rows loaded yet. The national baseline populates from the
            data pipeline.
          </p>
        </div>
      ) : (
        <>
          {/* Decision lead */}
          <section
            aria-label="Key reads"
            className="rounded-xl border border-slate-200 bg-white"
          >
            <div className="divide-y divide-slate-200 sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {INSIGHTS.map((it) => (
                <div key={it.lead} className="p-5">
                  <p className="font-heading text-sm font-semibold text-midnight-navy">
                    {it.lead}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-gray">
                    {it.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Legend */}
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-gray">
            <li className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-8 rounded-sm bg-intelligence-teal" aria-hidden />
              Share of that group who use / reach the channel
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-3.5 w-px bg-midnight-navy/35" aria-hidden />
              All-adults average (bars past it over-index)
            </li>
            <li>
              <span className="rounded-full bg-cloud px-2 py-0.5 font-semibold text-steel-blue">
                news proxy
              </span>{" "}
              = measures getting news there, a reach proxy
            </li>
            <li>&ldquo;cited as fact&rdquo; = industry stat, linked, not a reproduced table</li>
          </ul>

          <MediaConsumptionExplorer rows={rows} />

          {/* Attribution */}
          <footer className="border-t border-slate-200 pt-5 text-xs leading-relaxed text-slate-gray">
            <p>
              <span className="font-semibold text-charcoal">Sources:</span> Pew
              Research Center (2024–2026); BLS American Time Use Survey; OAAA / Harris
              Poll (out-of-home); Edison Research (podcast). Nielsen, Edison Share of
              Ear, eMarketer and Adwave figures are cited as fact with a link to the
              public source, never reproduced as Nielsen tables.
            </p>
            <p className="mt-2">
              Pew Research Center bears no responsibility for the analyses or
              interpretations of the data presented here.
            </p>
          </footer>
        </>
      )}
    </div>
  );
}
