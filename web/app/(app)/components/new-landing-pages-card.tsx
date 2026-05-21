import Link from "next/link";
import { ExternalLink, Sparkles, TrendingUp } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

/**
 * NewLandingPagesCard — surfaces law-firm landing pages first detected
 * in the trailing 7 days for the given tort. Renders on each tort page
 * under app/(app)/advertising/<slug>/.
 *
 * Data sources:
 *   - tort_landing_pages (classification_status IN ('confirmed','candidate'))
 *   - tort_landing_page_velocity (4-week trailing avg, z-score)
 *
 * Filter to `tortSlug` matches mass_torts.slug OR advertising_page_slug.
 */

interface Props {
  /** The filesystem slug used on /advertising/<slug>/. */
  tortSlug: string;
  /** Display name fallback if mass_torts lookup miss. */
  tortLabel: string;
}

interface LandingRow {
  id: string;
  url: string;
  registered_domain: string;
  dma_code: string | null;
  rank: number | null;
  serp_feature: string;
  title: string | null;
  first_seen_at: string;
  confidence: string | null;
  classification_status: string;
  snapshot_path: string | null;
}

interface VelocityRow {
  week_start: string;
  new_pages_count: number;
  trailing_4w_avg: number | null;
  z_score: number | null;
}

async function loadData(tortSlug: string) {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: tortRow } = await db
    .from("mass_torts")
    .select("id,name,slug,advertising_page_slug")
    .or(`slug.eq.${tortSlug},advertising_page_slug.eq.${tortSlug}`)
    .eq("has_advertising_page", true)
    .maybeSingle();

  if (!tortRow) return null;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: landings } = await db
    .from("tort_landing_pages")
    .select(
      "id,url,registered_domain,dma_code,rank,serp_feature,title,first_seen_at,confidence,classification_status,snapshot_path"
    )
    .eq("tort_id", tortRow.id)
    .in("classification_status", ["confirmed", "candidate"])
    .gte("first_seen_at", sevenDaysAgo)
    .order("first_seen_at", { ascending: false })
    .limit(50);

  const { data: velocity } = await db
    .from("tort_landing_page_velocity")
    .select("week_start,new_pages_count,trailing_4w_avg,z_score")
    .eq("tort_id", tortRow.id)
    .eq("dma_code_key", "__national__")
    .order("week_start", { ascending: false })
    .limit(5);

  return {
    tort: tortRow,
    landings: (landings ?? []) as LandingRow[],
    velocity: (velocity ?? []) as VelocityRow[],
  };
}

function VelocitySparkline({ velocity }: { velocity: VelocityRow[] }) {
  // Render up to 5 most recent weeks as an inline SVG sparkline.
  if (velocity.length === 0) return null;
  const weeks = [...velocity].reverse();
  const counts = weeks.map((w) => w.new_pages_count);
  const max = Math.max(...counts, 1);
  const width = 100;
  const height = 24;
  const stepX = counts.length > 1 ? width / (counts.length - 1) : 0;
  const points = counts
    .map((c, i) => `${(i * stepX).toFixed(1)},${(height - (c / max) * (height - 2) - 1).toFixed(1)}`)
    .join(" ");

  const thisWeek = weeks[weeks.length - 1];
  const avg = thisWeek?.trailing_4w_avg ?? null;
  const multiplier =
    avg && avg > 0 ? (thisWeek.new_pages_count / avg).toFixed(1) : null;

  return (
    <div className="flex items-center gap-2 text-xs text-slate-gray">
      <svg width={width} height={height} className="text-intelligence-teal">
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {multiplier ? (
        <span className="font-medium">
          {multiplier}× the 4-week average
        </span>
      ) : (
        <span>Baseline period</span>
      )}
    </div>
  );
}

function ConfidenceBadge({ status }: { status: string }) {
  if (status === "confirmed") {
    return (
      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase bg-emerald-50 text-emerald-700">
        Confirmed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase bg-amber-50 text-amber-700">
      Candidate
    </span>
  );
}

export async function NewLandingPagesCard({ tortSlug, tortLabel }: Props) {
  const data = await loadData(tortSlug);
  if (!data || data.landings.length === 0) {
    return (
      <div className="rounded-lg bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-intelligence-teal" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-gray">
            New Law-Firm Landing Pages — last 7 days
          </h3>
        </div>
        <p className="text-sm text-slate-500">
          No new {tortLabel} landing pages detected in the last 7 days.
          The daily scan runs at 13:30 UTC; check back tomorrow.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-intelligence-teal" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-gray">
            New Law-Firm Landing Pages — last 7 days
          </h3>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <TrendingUp className="h-3.5 w-3.5" />
          <VelocitySparkline velocity={data.velocity} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-1.5 pr-3">Domain</th>
              <th className="py-1.5 pr-3">DMA</th>
              <th className="py-1.5 pr-3">Rank</th>
              <th className="py-1.5 pr-3">Confidence</th>
              <th className="py-1.5 pr-3">First seen</th>
              <th className="py-1.5"></th>
            </tr>
          </thead>
          <tbody>
            {data.landings.slice(0, 15).map((row) => (
              <tr key={row.id} className="border-b border-slate-100 last:border-0">
                <td className="py-1.5 pr-3 font-medium">
                  <Link
                    href={row.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-intelligence-teal hover:underline"
                  >
                    {row.registered_domain}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  {row.title ? (
                    <div className="text-xs text-slate-500 line-clamp-1">{row.title}</div>
                  ) : null}
                </td>
                <td className="py-1.5 pr-3 text-xs text-slate-500">
                  {row.dma_code ?? "National"}
                </td>
                <td className="py-1.5 pr-3 text-xs text-slate-500">
                  {row.rank ?? "—"} · {row.serp_feature}
                </td>
                <td className="py-1.5 pr-3">
                  <ConfidenceBadge status={row.classification_status} />
                </td>
                <td className="py-1.5 pr-3 text-xs text-slate-500">
                  {new Date(row.first_seen_at).toLocaleDateString()}
                </td>
                <td className="py-1.5 text-xs">
                  {row.snapshot_path ? (
                    <span className="text-slate-400" title="Snapshot stored (super-admin only)">
                      snapshot
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.landings.length > 15 ? (
        <div className="mt-2 text-xs text-slate-500">
          Showing 15 of {data.landings.length} detected. Sort and filter coming soon.
        </div>
      ) : null}
    </div>
  );
}
