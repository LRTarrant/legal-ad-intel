import {
  getCancerBySite,
  getCancerByState,
  getCancerDistinctSites,
  getCancerDistinctStates,
  getCancerTotals,
  getCancerTrendingSites,
  type CancerFilters,
  type CancerOption,
  type CancerSiteSummary,
  type CancerStateSummary,
  type CancerTotals,
} from "@/lib/queries";
import Link from "next/link";
import { AdvertisingInsight } from "../components/advertising-insight";
import { CancerFilterBar } from "./cancer-filter-bar";
import { CancerStateTable } from "./cancer-state-table";
import { TortMarketPanel } from "./tort-market-panel";
import { TortSelector } from "./tort-selector";
import { TORTS, parseTortId } from "./tort-data";
import { HeartPulse } from "lucide-react";
import { AskAIPanel } from "../components/ask-ai-panel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cancer Incidence by County | Legal Marketing Intelligence",
};

const massTortConnections = [
  {
    cancerSite: "Non-Hodgkin Lymphoma",
    mdls: [{ label: "Roundup/Monsanto", number: 2741 }],
  },
  {
    cancerSite: "Kidney & Renal Pelvis",
    mdls: [
      { label: "Camp Lejeune", number: 3049 },
      { label: "AFFF", number: 2885 },
    ],
  },
  {
    cancerSite: "Bladder",
    mdls: [
      { label: "Camp Lejeune", number: 3049 },
      { label: "AFFF", number: 2885 },
    ],
  },
  {
    cancerSite: "Ovary",
    mdls: [{ label: "Talc/J&J", number: 2738 }],
  },
  {
    cancerSite: "Lung & Bronchus",
    mdls: [{ label: "Asbestos", number: 875 }],
  },
  {
    cancerSite: "Prostate",
    mdls: [{ label: "AFFF", number: 2885 }],
  },
];

const TORT_INSIGHTS: Record<string, string> = {
  roundup:
    "Target agricultural states with elevated NHL rates. Iowa, Minnesota, and the Dakotas show NHL rates 20-45% above the national average \u2014 correlating with intensive glyphosate herbicide use. Early Roundup settlers in these states are still in their litigation prime.",
  pfas:
    "Military community advertising near documented AFFF contamination sites produces the highest case quality for PFAS claims. Focus on counties within 5 miles of affected military bases where public water tests confirmed PFAS contamination.",
  camp_lejeune:
    "The 2-year Camp Lejeune filing window under the CLJA has mostly closed \u2014 focus on states with the highest concentration of Marines and family members who lived at Lejeune between 1953 and 1987.",
  talc:
    "Southern states with both high ovarian cancer incidence and strong historical J&J product market penetration represent the highest-density opportunity for talc litigation acquisition.",
};

const DEFAULT_INSIGHT =
  "Cancer incidence data reveals where potential mass tort claimants live. Counties with elevated rates of specific cancers linked to active MDLs \u2014 such as Non-Hodgkin Lymphoma near agricultural regions or kidney cancer near military bases \u2014 represent high-value targeting opportunities for case acquisition campaigns.";

type SearchParams = Promise<{
  cancerSite?: string | string[];
  state?: string | string[];
  tort?: string | string[];
}>;

function getSingleValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function CancerIncidencePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const tortId = parseTortId(getSingleValue(params.tort) ?? undefined);
  const tort = tortId ? TORTS[tortId] : null;

  const rawState = getSingleValue(params.state)?.trim().toUpperCase() || null;
  const rawCancerSite = getSingleValue(params.cancerSite)?.trim() || null;

  const filters: CancerFilters = {
    state: rawState,
    cancerSites: tort ? tort.cancerSites : null,
    cancerSite: tort ? null : rawCancerSite,
  };

  let states: CancerOption[] = [];
  let cancerSites: CancerOption[] = [];
  let totals: CancerTotals = {
    average_incidence_rate: 0,
    counties_reporting: 0,
    total_annual_cases: 0,
  };
  let stateRows: CancerStateSummary[] = [];
  let siteRows: CancerSiteSummary[] = [];
  let trendingSites: CancerSiteSummary[] = [];

  try {
    [
      states,
      cancerSites,
      totals,
      stateRows,
      siteRows,
      trendingSites,
    ] = await Promise.all([
      getCancerDistinctStates(),
      getCancerDistinctSites(),
      getCancerTotals(filters),
      getCancerByState(filters),
      getCancerBySite(filters),
      getCancerTrendingSites(filters),
    ]);
  } catch {
    // The migration may exist before data is loaded. Render an empty dashboard gracefully.
  }

  const filterSummary = rawState
    ? `${rawState}${rawCancerSite ? ` \u00b7 ${rawCancerSite}` : tort ? ` \u00b7 ${tort.shortLabel}` : ""}`
    : tort
      ? tort.shortLabel
      : rawCancerSite ?? "Nationwide";

  const insightText = tortId ? TORT_INSIGHTS[tortId] : DEFAULT_INSIGHT;

  return (
    <div className="space-y-8">
      <div className="mb-6 flex items-center gap-3">
        <HeartPulse className="h-7 w-7 shrink-0 text-intelligence-teal" />
        <div>
          <h1 className="font-heading text-2xl font-bold text-midnight-navy">
            Cancer Incidence by County
          </h1>
          <p className="text-sm text-slate-gray">
            County-level cancer incidence rates from NCI State Cancer Profiles (2018–2022), mapped to active mass tort litigation
          </p>
        </div>
      </div>

      <TortSelector />

      {tort && (
        <div
          className="rounded-lg p-4 border-l-4"
          style={{
            borderColor: tort.color,
            background: tort.color + "10",
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: tort.color }}
            >
              {tort.label}
            </span>
            {tort.mdls.map((m) => (
              <Link
                key={m.number}
                href={`/mdl-tracker/${m.number}`}
                className="text-xs text-intelligence-teal hover:underline"
              >
                MDL {m.number} &#8599;
              </Link>
            ))}
          </div>
          <p className="text-sm text-midnight-navy">{tort.description}</p>
          <p className="text-xs mt-1 text-slate-gray italic">{tort.tagline}</p>
        </div>
      )}

      {tort && (
        <TortMarketPanel tort={tort} stateData={stateRows} />
      )}

      <CancerFilterBar
        states={states}
        cancerSites={cancerSites}
        selectedState={rawState}
        selectedCancerSite={tort ? null : rawCancerSite}
        tortCancerSites={tort ? tort.cancerSites : undefined}
      />

      <AdvertisingInsight>
        <p>{insightText}</p>
      </AdvertisingInsight>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Counties Reporting"
          value={totals.counties_reporting.toLocaleString()}
          sub={filterSummary}
        />
        <SummaryCard
          label="Average Incidence Rate"
          value={totals.average_incidence_rate.toFixed(1)}
          sub="per 100K"
        />
        <SummaryCard
          label="Total Annual Cases"
          value={Math.round(totals.total_annual_cases).toLocaleString()}
          sub={filterSummary}
        />
        <SummaryCard
          label="Cancer Sites Tracked"
          value={cancerSites.length.toLocaleString()}
          sub="Mass tort-relevant cancers"
        />
      </div>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-midnight-navy/5">
        <div>
          <h2 className="font-heading text-xl font-semibold text-midnight-navy">
            Mass Tort Connections
          </h2>
          <p className="mt-1 text-sm text-slate-gray">
            Cancer sites mapped to active or historically important mass tort dockets.
          </p>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {massTortConnections.map((connection) => (
            <div
              key={connection.cancerSite}
              className="rounded-xl border border-midnight-navy/10 bg-cloud p-4"
            >
              <p className="font-heading font-semibold text-midnight-navy">
                {connection.cancerSite}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {connection.mdls.map((mdl) => (
                  <a
                    key={`${connection.cancerSite}-${mdl.number}`}
                    href={`/mdl-tracker?mdl=${mdl.number}`}
                    className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-intelligence-teal ring-1 ring-intelligence-teal/20"
                  >
                    {mdl.label} (MDL {mdl.number})
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Geo heatmap placeholder — county centroids not yet loaded */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold" style={{ fontFamily: "var(--font-dm-sans)", color: "#0B1D3A" }}>
            County-Level Geo Heatmap
          </h2>
          <span
            className="text-xs font-semibold uppercase tracking-widest rounded-full px-3 py-1"
            style={{ background: "#F1F5F9", color: "#6B7280" }}
          >
            Coming Soon
          </span>
        </div>
        <p className="text-sm" style={{ color: "#6B7280" }}>
          Geographic heatmap will display cancer incidence hotspots by county once coordinate
          enrichment is complete. County centroid lat/lon will be joined from Census TIGER data
          in a future data update.
        </p>
      </div>

      <CancerStateTable rows={stateRows} />

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-midnight-navy/5">
        <h2 className="font-heading text-xl font-semibold text-midnight-navy">
          Cancer Site Breakdown
        </h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {siteRows.length === 0 ? (
            <p className="text-sm text-slate-gray">
              No cancer site summaries match the current filter.
            </p>
          ) : (
            siteRows.map((site) => (
              <div
                key={site.cancer_site}
                className="rounded-xl border border-midnight-navy/10 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-heading font-semibold text-midnight-navy">
                      {site.cancer_site}
                    </p>
                    <p className="mt-1 text-xs text-slate-gray">
                      {Math.round(site.total_annual_cases).toLocaleString()} annual cases
                    </p>
                  </div>
                  <span className="font-mono text-sm font-semibold text-intelligence-teal">
                    {site.average_incidence_rate.toFixed(1)}
                  </span>
                </div>
                <p className="mt-3 font-mono text-xs text-slate-gray">
                  {trendIcon(site.trend_direction)} {site.trend_direction}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-midnight-navy/5">
        <h2 className="font-heading text-xl font-semibold text-midnight-navy">
          Fastest Rising Cancer Sites
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {trendingSites.slice(0, 8).map((site) => (
            <span
              key={site.cancer_site}
              className="rounded-full bg-cloud px-3 py-1 text-xs font-semibold text-midnight-navy"
            >
              {trendIcon(site.trend_direction)} {site.cancer_site}
            </span>
          ))}
        </div>
      </section>

      <AskAIPanel
        pageContext={{
          pageName: "Cancer Incidence",
          pageDescription:
            "County-level cancer incidence rates from NCI State Cancer Profiles (2018–2022), mapped to active mass tort litigation.",
          dataSummary: `Filter: ${filterSummary}. Counties Reporting: ${totals.counties_reporting.toLocaleString()}. Average Incidence Rate: ${totals.average_incidence_rate.toFixed(1)} per 100K. Total Annual Cases: ${Math.round(totals.total_annual_cases).toLocaleString()}. Cancer Sites Tracked: ${cancerSites.length}. Top states by incidence: ${stateRows.slice(0, 10).map((s) => s.state).join(", ")}. Mass tort connections: ${massTortConnections.map((c) => `${c.cancerSite} → ${c.mdls.map((m) => m.label).join(", ")}`).join("; ")}.`,
        }}
      />
    </div>
  );
}

function trendIcon(direction: string) {
  if (direction === "Rising") return "\u2191";
  if (direction === "Falling") return "\u2193";
  return "\u2192";
}

function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase text-slate-gray">{label}</p>
      <p className="mt-1 font-heading text-2xl font-bold text-midnight-navy">
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-xs text-slate-gray">{sub}</p> : null}
    </div>
  );
}
