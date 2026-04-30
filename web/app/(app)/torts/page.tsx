import {
  getSaturationScores,
  getSaturationFilters,
  getAdvertiserEntities,
} from "@/lib/queries";
import Link from "next/link";
import { Radio } from "lucide-react";
import { SaturationClient } from "../advertising/saturation/saturation-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tort Intelligence | Legal Marketing Intelligence",
};

type TortProfile = {
  name: string;
  route: string;
  statusLine: string;
  mdlBadge: "Active MDL" | "Post-Settlement" | "Pre-MDL" | "Emerging";
};

const TORT_PROFILES: TortProfile[] = [
  { name: "Depo-Provera", route: "/advertising/depo-provera", statusLine: "18,000+ cases filed", mdlBadge: "Active MDL" },
  { name: "Roundup", route: "/advertising/roundup", statusLine: "$11B+ in settlements", mdlBadge: "Post-Settlement" },
  { name: "Hair Relaxer", route: "/advertising/hair-relaxer", statusLine: "Discovery phase", mdlBadge: "Active MDL" },
  { name: "Talcum Powder", route: "/advertising/talcum-powder", statusLine: "60,000+ cases filed", mdlBadge: "Active MDL" },
  { name: "Paraquat", route: "/advertising/paraquat", statusLine: "Parkinson's disease link", mdlBadge: "Active MDL" },
  { name: "AFFF / Firefighter Foam", route: "/advertising/afff-firefighting-foam", statusLine: "Water contamination", mdlBadge: "Active MDL" },
  { name: "Social Media Addiction", route: "/advertising/social-media-addiction", statusLine: "800+ school districts", mdlBadge: "Active MDL" },
  { name: "Roblox Abuse", route: "/advertising/roblox-abuse", statusLine: "Child safety litigation", mdlBadge: "Pre-MDL" },
  { name: "GLP-1 Gastroparesis", route: "/advertising/glp1-gastroparesis", statusLine: "Ozempic/Mounjaro claims", mdlBadge: "Emerging" },
  { name: "GLP-1 Vision Loss", route: "/advertising/glp1-vision-loss", statusLine: "NAION risk signal", mdlBadge: "Emerging" },
  { name: "Bard PowerPort", route: "/advertising/bard-powerport", statusLine: "Catheter complications", mdlBadge: "Active MDL" },
];

const MDL_BADGE_STYLES: Record<TortProfile["mdlBadge"], string> = {
  "Active MDL": "bg-intelligence-teal/10 text-intelligence-teal ring-1 ring-intelligence-teal/30",
  "Post-Settlement": "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  "Pre-MDL": "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  Emerging: "bg-white text-intelligence-teal ring-1 ring-intelligence-teal/40",
};

export default async function TortsPage() {
  const [scores, filters, advertisers] = await Promise.all([
    getSaturationScores(),
    getSaturationFilters(),
    getAdvertiserEntities(),
  ]);

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-intelligence-teal/10">
          <Radio className="h-5 w-5 text-intelligence-teal" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-midnight-navy">Tort Intelligence</h1>
          <p className="text-sm text-slate-gray">
            Track litigation momentum, advertising intensity, and market opportunity across active mass torts.
          </p>
        </div>
      </div>

      {/* Client-side interactive section (KPI cards are rendered by SaturationClient) */}
      <div className="mt-5 space-y-5">
        <SaturationClient
          scores={scores}
          filters={filters}
          advertisers={advertisers}
        />
      </div>

      {/* Active Tort Profiles */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-midnight-navy">Active Tort Profiles</h2>
        <p className="mt-1 text-sm text-slate-gray">
          Select a tort to view in-depth research including case summary, MDL status, buying criteria, audience analysis, and market opportunity signals.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TORT_PROFILES.map((tort) => (
            <div
              key={tort.name}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-midnight-navy">{tort.name}</h3>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${MDL_BADGE_STYLES[tort.mdlBadge]}`}
                >
                  {tort.mdlBadge}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{tort.statusLine}</p>
              <Link
                href={tort.route}
                className="mt-4 inline-flex items-center text-sm font-medium text-intelligence-teal hover:text-intelligence-teal/80 transition-colors"
              >
                View Profile →
              </Link>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
