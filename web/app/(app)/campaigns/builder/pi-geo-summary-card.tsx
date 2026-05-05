"use client";

/**
 * PIGeoSummaryCard — slim 5-row summary that sits in the campaign
 * builder, between the strategic brief and the radio script. Hands the
 * user the top counties + metros at a glance, with a deep link to the
 * full /pi-geo-targeting/[state]/[category] page for sortable tables
 * and CSV export.
 *
 * Rendered only when the chosen PI category is one we have FARS data
 * for (motor-vehicle categories: car / truck / motorcycle / pedestrian /
 * bicycle). Other PI categories — slip & fall, dog bite, premises,
 * boating — get hidden because the data isn't comparable.
 */

import { useEffect, useState } from "react";
import { ChevronRight, Loader2, MapPin } from "lucide-react";
import Link from "next/link";
import { fetchWithDemoMode } from "@/lib/admin/demo-mode-client";
import {
  isEntitlementError,
  reasonFromEntitlementError,
  type UpgradeMeta,
  type UpgradeReason,
} from "@/lib/billing/upgrade-copy";
import type {
  GeoTargetCountyRow,
  GeoTargetingReport,
  GeoTargetMetroRow,
} from "@/app/api/pi/geo-targeting/testable";
import type {
  PICategory,
  SeverityModifier,
} from "@/lib/campaign-builder/pi-templates/types";

// Categories with FARS data. Keep in sync with the API's
// SUPPORTED_PI_CATEGORIES.
const SUPPORTED: ReadonlySet<PICategory> = new Set([
  "car_accident",
  "truck_accident",
  "motorcycle_accident",
  "pedestrian_accident",
  "bicycle_accident",
]);

interface PIGeoSummaryCardProps {
  config: {
    pi_category: PICategory;
    state: string;
    market_display_name: string;
    severity_modifiers: SeverityModifier[];
  };
  accentColor: string;
  onEntitlementError?: (params: {
    reason: UpgradeReason;
    meta: UpgradeMeta;
  }) => void;
  /**
   * Optional callback fired with the loaded geo report so the parent
   * builder can include top metros/counties in the bulk-upload export.
   * Fires null when the category is unsupported or fetch errors.
   */
  onReportLoaded?: (report: GeoTargetingReport | null) => void;
}

export function PIGeoSummaryCard({
  config,
  accentColor,
  onEntitlementError,
  onReportLoaded,
}: PIGeoSummaryCardProps) {
  const [report, setReport] = useState<GeoTargetingReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only fetch once we know the category is supported. Re-fetch when
  // the user changes state or category in the config form.
  useEffect(() => {
    if (!SUPPORTED.has(config.pi_category)) {
      setReport(null);
      onReportLoaded?.(null);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    const url = `/api/pi/geo-targeting?state=${encodeURIComponent(config.state)}&pi_category=${encodeURIComponent(config.pi_category)}`;
    fetchWithDemoMode(url)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok) {
          if (isEntitlementError(json) && onEntitlementError) {
            onEntitlementError(reasonFromEntitlementError(json, "personal_injury"));
            return;
          }
          throw new Error(
            json.error ??
              (Array.isArray(json.errors) && json.errors.length > 0
                ? json.errors.join("; ")
                : `Request failed (${res.status})`),
          );
        }
        const r = json as GeoTargetingReport;
        setReport(r);
        onReportLoaded?.(r);
      })
      .catch((e: Error) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.state, config.pi_category]);

  if (!SUPPORTED.has(config.pi_category)) {
    return null;
  }

  const fullPageUrl = `/pi-geo-targeting/${encodeURIComponent(config.state)}/${encodeURIComponent(config.pi_category)}`;

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-start gap-3">
        <div
          className="rounded-md p-2"
          style={{ backgroundColor: `${accentColor}15` }}
        >
          <MapPin className="h-5 w-5" style={{ color: accentColor }} />
        </div>
        <div className="flex-1">
          <h3 className="font-heading text-lg font-semibold text-midnight-navy">
            Top counties &amp; metros
          </h3>
          <p className="mt-0.5 text-xs text-slate-gray">
            FARS-grounded fatal-crash density for {config.state}.
            Click through for the full sortable report + CSV export.
          </p>
        </div>
        <Link
          href={fullPageUrl}
          className="inline-flex items-center gap-1 text-sm font-semibold text-intelligence-teal hover:underline"
        >
          View full report
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-gray">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading FARS data…
        </div>
      )}

      {error && (
        <div className="rounded-md border border-alert/20 bg-alert/5 p-3 text-sm text-alert">
          {error}
        </div>
      )}

      {report && !loading && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SlimList
            title="Top counties"
            items={report.counties.slice(0, 5).map((c) => ({
              key: c.fips_full ?? c.county_name,
              primary: c.county_name,
              metric: c.fatal_crashes.toLocaleString(),
              priority: c.priority,
            }))}
            metricLabel="crashes"
          />
          <SlimList
            title="Top metros"
            items={report.metros.slice(0, 5).map((m) => ({
              key: m.cbsa_code,
              primary: m.cbsa_title,
              metric: m.fatal_crashes.toLocaleString(),
              priority: m.priority,
            }))}
            metricLabel="crashes"
          />
        </div>
      )}

      {report &&
        !loading &&
        report.counties.length === 0 &&
        report.metros.length === 0 && (
          <p className="rounded-md bg-cloud/40 px-3 py-2 text-xs italic text-slate-gray">
            {report.notes ??
              "No FARS data for this state and category. Try a different state or category."}
          </p>
        )}
    </div>
  );
}

/* ── SlimList ──────────────────────────────────────────────────────────── */

interface SlimListItem {
  key: string;
  primary: string;
  metric: string;
  priority: "high" | "medium" | "low";
}

function SlimList({
  title,
  items,
  metricLabel,
}: {
  title: string;
  items: SlimListItem[];
  metricLabel: string;
}) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-gray">
        {title}
      </div>
      {items.length === 0 ? (
        <p className="text-xs italic text-slate-gray">No data.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it, i) => (
            <li
              key={it.key}
              className="flex items-center justify-between gap-2 rounded-md border border-cloud bg-cloud/20 px-3 py-2"
            >
              <span className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-gray">
                  #{i + 1}
                </span>
                <span className="text-sm font-semibold text-midnight-navy">
                  {it.primary}
                </span>
                {it.priority === "high" && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-900">
                    Top
                  </span>
                )}
              </span>
              <span className="text-xs tabular-nums text-slate-gray">
                {it.metric} {metricLabel}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* Static var to keep CountyRow + MetroRow type imports referenced even if
 * tree-shaking gets aggressive. Removing this would be safe but keeps
 * the import block self-documenting. */
export type _GeoSummaryUnused =
  | GeoTargetCountyRow
  | GeoTargetMetroRow;
