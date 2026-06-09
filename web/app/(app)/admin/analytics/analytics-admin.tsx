"use client";

import { useEffect, useState, useCallback } from "react";
import { useTenant } from "@/contexts/TenantContext";
import {
  Users,
  MousePointerClick,
  FileText,
  Activity,
  RefreshCw,
} from "lucide-react";

type GaRow = Record<string, string | number | null>;

interface SummaryResponse {
  generatedAt: string;
  dateRange: { startDate: string; endDate: string; days: number };
  overview: {
    activeUsers: number;
    sessions: number;
    screenPageViews: number;
    engagementRate: number;
  };
  sources: GaRow[];
  pages: GaRow[];
  countries: GaRow[];
  geoSplit: { totalUsers: number; usUsers: number; nonUsUsers: number };
  states: GaRow[];
  cities: GaRow[];
}

function fmtInt(v: unknown): string {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString();
}

function fmtPct(v: unknown): string {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

export function AnalyticsAdmin() {
  const tenant = useTenant();
  const accentColor = tenant.accentColor ?? "#1A8C96";

  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/analytics/summary", {
        cache: "no-store",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? `Request failed (${res.status})`);
        setData(null);
        return;
      }
      setData(body as SummaryResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const kpis = [
    {
      label: "Active Users",
      value: fmtInt(data?.overview.activeUsers),
      Icon: Users,
    },
    {
      label: "Sessions",
      value: fmtInt(data?.overview.sessions),
      Icon: MousePointerClick,
    },
    {
      label: "Page Views",
      value: fmtInt(data?.overview.screenPageViews),
      Icon: FileText,
    },
    {
      label: "Engagement Rate",
      value: fmtPct(data?.overview.engagementRate),
      Icon: Activity,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Site Analytics</h1>
          <p className="mt-1 text-sm text-slate-gray">
            Google Analytics 4 — last 30 days
            {data?.generatedAt && (
              <span className="ml-2 text-slate-400">
                · updated {new Date(data.generatedAt).toLocaleString()}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* KPI cards */}
      <section>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map(({ label, value, Icon }) => (
            <div
              key={label}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  {label}
                </p>
                <Icon className="h-4 w-4 text-slate-400" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-charcoal">
                {loading && !data ? "—" : value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Top pages */}
      <DataTable
        title="Top Pages"
        columns={[
          { key: "pagePath", label: "Path", className: "max-w-[280px] truncate" },
          { key: "pageTitle", label: "Title", className: "max-w-[280px] truncate" },
          { key: "activeUsers", label: "Users", numeric: true, format: fmtInt },
          { key: "sessions", label: "Sessions", numeric: true, format: fmtInt },
          { key: "screenPageViews", label: "Views", numeric: true, format: fmtInt },
          {
            key: "engagementRate",
            label: "Engagement",
            numeric: true,
            format: fmtPct,
          },
        ]}
        rows={data?.pages ?? []}
        loading={loading && !data}
      />

      {/* Traffic sources */}
      <DataTable
        title="Traffic Sources"
        columns={[
          { key: "sessionSourceMedium", label: "Source / Medium" },
          { key: "activeUsers", label: "Users", numeric: true, format: fmtInt },
          { key: "sessions", label: "Sessions", numeric: true, format: fmtInt },
          { key: "screenPageViews", label: "Views", numeric: true, format: fmtInt },
          {
            key: "engagementRate",
            label: "Engagement",
            numeric: true,
            format: fmtPct,
          },
        ]}
        rows={data?.sources ?? []}
        loading={loading && !data}
      />

      {/* Country summary with US split */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-charcoal">Geography</h2>
          {data && (
            <p className="text-xs text-slate-500">
              <span className="font-medium text-charcoal">
                {fmtInt(data.geoSplit.usUsers)}
              </span>{" "}
              U.S. users ·{" "}
              <span className="font-medium text-charcoal">
                {fmtInt(data.geoSplit.nonUsUsers)}
              </span>{" "}
              non-U.S. users
            </p>
          )}
        </div>
        {data && (
          <div
            className="mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-200"
            aria-label="US vs non-US user share"
          >
            <div
              className="h-full"
              style={{
                width:
                  data.geoSplit.totalUsers > 0
                    ? `${(data.geoSplit.usUsers / data.geoSplit.totalUsers) * 100}%`
                    : "0%",
                backgroundColor: accentColor,
              }}
            />
          </div>
        )}
        <DataTable
          columns={[
            { key: "country", label: "Country" },
            { key: "activeUsers", label: "Users", numeric: true, format: fmtInt },
            { key: "sessions", label: "Sessions", numeric: true, format: fmtInt },
            {
              key: "screenPageViews",
              label: "Views",
              numeric: true,
              format: fmtInt,
            },
            {
              key: "engagementRate",
              label: "Engagement",
              numeric: true,
              format: fmtPct,
            },
          ]}
          rows={data?.countries ?? []}
          loading={loading && !data}
        />
      </section>

      {/* Top US states */}
      <DataTable
        title="Top U.S. States"
        columns={[
          { key: "region", label: "State" },
          { key: "activeUsers", label: "Users", numeric: true, format: fmtInt },
          { key: "sessions", label: "Sessions", numeric: true, format: fmtInt },
          {
            key: "screenPageViews",
            label: "Views",
            numeric: true,
            format: fmtInt,
          },
          {
            key: "engagementRate",
            label: "Engagement",
            numeric: true,
            format: fmtPct,
          },
        ]}
        rows={data?.states ?? []}
        loading={loading && !data}
      />

      {/* Top US cities */}
      <DataTable
        title="Top U.S. Cities"
        columns={[
          { key: "city", label: "City" },
          { key: "region", label: "State" },
          { key: "activeUsers", label: "Users", numeric: true, format: fmtInt },
          { key: "sessions", label: "Sessions", numeric: true, format: fmtInt },
          {
            key: "screenPageViews",
            label: "Views",
            numeric: true,
            format: fmtInt,
          },
          {
            key: "engagementRate",
            label: "Engagement",
            numeric: true,
            format: fmtPct,
          },
        ]}
        rows={data?.cities ?? []}
        loading={loading && !data}
      />
    </div>
  );
}

interface Column {
  key: string;
  label: string;
  numeric?: boolean;
  className?: string;
  format?: (v: unknown) => string;
}

function DataTable({
  title,
  columns,
  rows,
  loading,
}: {
  title?: string;
  columns: Column[];
  rows: GaRow[];
  loading: boolean;
}) {
  return (
    <section>
      {title && (
        <h2 className="mb-4 text-lg font-semibold text-charcoal">{title}</h2>
      )}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={`px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 ${
                      c.numeric ? "text-right" : "text-left"
                    }`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-sm text-slate-400"
                  >
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-sm text-slate-400"
                  >
                    No data
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr key={i}>
                    {columns.map((c) => {
                      const raw = row[c.key];
                      const display = c.format
                        ? c.format(raw)
                        : raw == null || raw === ""
                          ? "—"
                          : String(raw);
                      return (
                        <td
                          key={c.key}
                          className={`whitespace-nowrap px-4 py-3 text-sm ${
                            c.numeric
                              ? "text-right font-medium text-charcoal tabular-nums"
                              : "text-slate-700"
                          } ${c.className ?? ""}`}
                          title={
                            c.className?.includes("truncate") && raw
                              ? String(raw)
                              : undefined
                          }
                        >
                          {display}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
