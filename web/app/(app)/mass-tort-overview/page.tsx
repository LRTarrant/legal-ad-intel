import { Newspaper } from "lucide-react";
import { getAllDevelopments } from "@/lib/queries/mdl-developments";
import { MassTortOverviewClient } from "./mass-tort-overview-client";
import type { MdlDevelopment } from "@/lib/queries/mdl-developments";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mass Tort Overview | Legal Marketing Intelligence",
};

const MDL_TORT_NAMES: Record<number, { name: string; href: string }> = {
  3140: { name: "Depo-Provera", href: "/advertising/depo-provera" },
  2741: { name: "Roundup", href: "/advertising/roundup" },
  3060: { name: "Hair Relaxer", href: "/advertising/hair-relaxer" },
  2738: { name: "Talcum Powder", href: "/advertising/talcum-powder" },
  3014: { name: "Paraquat", href: "/advertising/paraquat" },
  2433: {
    name: "AFFF / Firefighter Foam",
    href: "/advertising/afff-firefighting-foam",
  },
  3047: {
    name: "Social Media Addiction",
    href: "/advertising/social-media-addiction",
  },
  3049: { name: "Camp Lejeune", href: "/mdl-tracker/3049" },
  2885: { name: "3M Earplugs", href: "/mdl-tracker/2885" },
  2846: { name: "Hernia Mesh", href: "/mdl-tracker/2846" },
  3043: { name: "Tylenol / Autism", href: "/mdl-tracker/3043" },
  3026: { name: "NEC Baby Formula", href: "/mdl-tracker/3026" },
  2974: { name: "Paragard IUD", href: "/mdl-tracker/2974" },
  2924: { name: "Zantac", href: "/mdl-tracker/2924" },
};

function getTortName(mdlNumber: number): string {
  return MDL_TORT_NAMES[mdlNumber]?.name ?? `MDL ${mdlNumber}`;
}

function getTortHref(mdlNumber: number): string {
  return MDL_TORT_NAMES[mdlNumber]?.href ?? `/mdl-tracker/${mdlNumber}`;
}

function computeKpis(developments: MdlDevelopment[]) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonth = developments.filter((d) => {
    const [year, month] = d.event_date.split("-");
    return parseInt(year, 10) === currentYear && parseInt(month, 10) - 1 === currentMonth;
  });

  const distinctMdls = new Set(developments.map((d) => d.mdl_number));
  const distinctEventTypes = new Set(developments.map((d) => d.event_type));

  return {
    totalDevelopments: developments.length,
    activeMdls: distinctMdls.size,
    thisMonthCount: thisMonth.length,
    eventTypeCount: distinctEventTypes.size,
  };
}

function buildMdlSummaries(developments: MdlDevelopment[]) {
  const map = new Map<
    number,
    { mdlNumber: number; name: string; href: string; count: number; latestEventType: string }
  >();

  for (const dev of developments) {
    const existing = map.get(dev.mdl_number);
    if (!existing) {
      map.set(dev.mdl_number, {
        mdlNumber: dev.mdl_number,
        name: getTortName(dev.mdl_number),
        href: getTortHref(dev.mdl_number),
        count: 1,
        latestEventType: dev.event_type,
      });
    } else {
      existing.count++;
    }
  }

  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

export default async function MassTortOverviewPage() {
  const developments = await getAllDevelopments();

  const kpis = computeKpis(developments);
  const mdlSummaries = buildMdlSummaries(developments);

  // Build tort filter options from developments data
  const tortFilters = mdlSummaries.map((s) => ({
    mdlNumber: s.mdlNumber,
    name: s.name,
  }));

  // Annotate developments with tort names/hrefs for the client component
  const annotatedDevelopments = developments.map((d) => ({
    ...d,
    tortName: getTortName(d.mdl_number),
    tortHref: getTortHref(d.mdl_number),
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-intelligence-teal/10">
          <Newspaper className="h-6 w-6 text-intelligence-teal" />
        </div>
        <div>
          <h1 className="font-heading text-3xl font-bold text-midnight-navy">
            Mass Tort Overview
          </h1>
          <p className="mt-1 text-sm text-slate-gray">
            Recent litigation developments, rulings, and signals across all
            tracked mass torts.
          </p>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Developments" value={kpis.totalDevelopments} />
        <KpiCard label="Active MDLs" value={kpis.activeMdls} />
        <KpiCard label="This Month" value={kpis.thisMonthCount} />
        <KpiCard label="Event Types" value={kpis.eventTypeCount} />
      </div>

      {/* Client-side interactive section: filter pills + timeline */}
      <MassTortOverviewClient
        developments={annotatedDevelopments}
        tortFilters={tortFilters}
        mdlSummaries={mdlSummaries}
      />
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-gray">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-midnight-navy">{value}</p>
    </div>
  );
}
