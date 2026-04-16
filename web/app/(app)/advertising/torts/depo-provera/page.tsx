import Link from "next/link";
import {
  ArrowLeft,
  Users,
  DollarSign,
  Eye,
  Monitor,
  ArrowRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

/* ── Metadata ──────────────────────────────────────────────────────────── */

export function generateMetadata() {
  return {
    title:
      "Depo-Provera Advertising Intelligence | Legal Marketing Intelligence",
  };
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function DepoProveraAdvertisingPage() {
  const tortLabel = "Depo-Provera";
  const injury = "Meningioma";
  const tortSlug = "depo-provera";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/torts"
          className="text-sm text-slate-gray hover:text-midnight-navy"
        >
          <span className="flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            All Torts
          </span>
        </Link>
        <h1 className="mt-2 font-heading text-3xl font-bold text-midnight-navy">
          {tortLabel}
        </h1>
        <p className="mt-1 text-slate-gray">
          Advertising intelligence for {tortLabel} ({injury}) — who is
          advertising, where, how much, and on what platforms.
        </p>
      </div>

      {/* Summary stat cards — placeholder */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Users className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Advertisers
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">—</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <DollarSign className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Est. Spend
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">—</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Eye className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Unique Creatives
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">—</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Monitor className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Platforms
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">—</p>
        </div>
      </div>

      {/* Placeholder sections */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-midnight-navy mb-4">
          Advertiser Segments
        </h2>
        <p className="text-sm text-slate-gray">
          Advertiser segment data for {tortLabel} ({injury}) will be populated
          here.
        </p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Top Advertisers
          </h2>
          <Link
            href={`/advertising/saturation/${tortSlug}`}
            className="flex items-center gap-1 text-xs font-semibold text-intelligence-teal hover:underline"
          >
            Full saturation view <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <p className="text-sm text-slate-gray">
          Top advertiser data for {tortLabel} ({injury}) will be populated here.
        </p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-midnight-navy mb-4">
          Top Markets by Saturation
        </h2>
        <p className="text-sm text-slate-gray">
          Market saturation data for {tortLabel} ({injury}) will be populated
          here.
        </p>
      </div>

      {/* Cross-links */}
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/advertising/saturation/${tortSlug}`}
          className="rounded-lg border-2 border-intelligence-teal px-5 py-2.5 text-sm font-semibold text-intelligence-teal transition hover:bg-intelligence-teal hover:text-white"
        >
          Full Saturation Analysis →
        </Link>
        <Link
          href="/advertising/cost-benchmarks"
          className="rounded-lg border-2 border-cloud px-5 py-2.5 text-sm font-semibold text-slate-gray transition hover:border-intelligence-teal hover:text-intelligence-teal"
        >
          All Cost Benchmarks →
        </Link>
        <Link
          href="/advertising/channel-planner"
          className="rounded-lg border-2 border-cloud px-5 py-2.5 text-sm font-semibold text-slate-gray transition hover:border-intelligence-teal hover:text-intelligence-teal"
        >
          Channel Planner →
        </Link>
      </div>
    </div>
  );
}
