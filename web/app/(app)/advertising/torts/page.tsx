import { getAllMassTorts } from "@/lib/queries";
import Link from "next/link";
import { Radio, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tort Advertising Intelligence | Legal Marketing Intelligence",
  description:
    "Browse all mass tort advertising intelligence profiles — case data, advertising landscape, geographic targeting, and market opportunity signals.",
};

export default async function TortsIndexPage() {
  const torts = await getAllMassTorts();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-intelligence-teal/10">
          <Radio className="h-5 w-5 text-intelligence-teal" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-midnight-navy">
            Tort Advertising Intelligence
          </h1>
          <p className="text-sm text-slate-gray">
            Browse advertising intelligence profiles for {torts.length} active
            mass torts.
          </p>
        </div>
      </div>

      {/* Tort Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {torts.map((tort) => (
          <Link
            key={tort.id}
            href={`/advertising/${tort.slug}`}
            className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-intelligence-teal/30"
          >
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-midnight-navy group-hover:text-intelligence-teal transition-colors">
                {tort.name}
              </h3>
              <ArrowRight className="w-4 h-4 mt-1 text-slate-gray/40 group-hover:text-intelligence-teal transition-colors shrink-0" />
            </div>
            {tort.short_description && (
              <p className="mt-2 text-sm text-slate-gray line-clamp-2">
                {tort.short_description}
              </p>
            )}
            {tort.category && (
              <span className="mt-3 inline-block rounded-full bg-intelligence-teal/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-intelligence-teal">
                {tort.category}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
