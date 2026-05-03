"use client";

import Link from "next/link";
import {
  ArrowLeft,
  AlertTriangle,
  Shield,
  MapPin,
  Users,
  Scale,
  FileText,
  ExternalLink,
  Clock,
  TrendingUp,
  DollarSign,
  Globe,
  Search,
  Target,
  Layers,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface ManufacturerDetailData {
  mfr: {
    id: string;
    canonical_name: string;
    slug: string | null;
    parent_name: string | null;
    domicile_state: string | null;
    country: string | null;
    website: string | null;
    aliases: string[];
    notes: string | null;
  };
  kpis: {
    max_stage: number;
    max_stage_label: string;
    total_recalls: number;
    class_i_recalls: number;
    total_cases: number;
    state_count: number;
    specialty_firm_count: number;
    mdl_petition_filed: boolean;
    mdl_formed: boolean;
    first_case_filed_at: string | null;
    last_case_filed_at: string | null;
  };
  linked_torts: {
    tort_id: string;
    tort_slug: string;
    tort_name: string;
    tort_status: string | null;
    confidence: "high" | "medium" | "low";
    notes: string | null;
    serp_organic: number;
    serp_paid: number;
    ad_event_count: number;
    ad_event_spend: number;
    platforms: { name: string; count: number }[];
  }[];
  recalls: {
    id: string;
    product_description: string;
    product_code: string | null;
    recall_class: string | null;
    reason_for_recall: string | null;
    event_date_initiated: string | null;
    status: string | null;
    stage: number;
    stage_label: string;
    case_count: number;
    state_count: number;
    specialty_firm_count: number;
    mdl_petition_filed: boolean;
    mdl_formed: boolean;
  }[];
  cases: {
    id: string;
    case_name: string | null;
    court_name: string | null;
    state_code: string | null;
    case_filed_date: string | null;
    plaintiff_firm_name: string | null;
    is_specialty_firm: boolean;
    docket_url: string | null;
  }[];
  stage_history: {
    id: string;
    recall_id: string;
    from_stage: number;
    to_stage: number;
    from_label: string;
    to_label: string;
    trigger_reason: string | null;
    transitioned_at: string | null;
    case_count_at_transition: number;
  }[];
  generated_at: string;
}

/* ------------------------------------------------------------------ */
/*  Palette (matches main board)                                        */
/* ------------------------------------------------------------------ */

const STAGE_COLORS: Record<number, { bg: string; text: string; border: string; label: string }> = {
  1: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300", label: "Cold" },
  2: { bg: "bg-sky-100", text: "text-sky-700", border: "border-sky-300", label: "Warming" },
  3: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300", label: "Warm" },
  4: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300", label: "Hot" },
  5: { bg: "bg-red-100", text: "text-red-700", border: "border-red-300", label: "Boiling" },
};

const CONFIDENCE_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: "bg-emerald-100", text: "text-emerald-800", label: "Primary" },
  medium: { bg: "bg-sky-100", text: "text-sky-800", label: "Secondary" },
  low: { bg: "bg-slate-100", text: "text-slate-700", label: "Related" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatMoney(n: number): string {
  if (!n) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function ManufacturerDetailClient({ data }: { data: ManufacturerDetailData }) {
  const { mfr, kpis, linked_torts, recalls, cases, stage_history } = data;
  const stageStyle = STAGE_COLORS[kpis.max_stage] ?? STAGE_COLORS[1];

  const primaryTorts = linked_torts.filter((t) => t.confidence === "high" || t.confidence === "medium");
  const relatedTorts = linked_torts.filter((t) => t.confidence === "low");

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/advertising/recall-watchlist"
          className="inline-flex items-center gap-2 text-sm text-slate-gray hover:text-intelligence-teal transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Recall Watchlist
        </Link>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-midnight-navy via-slate-800 to-slate-900 p-8 text-white shadow-lg">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${stageStyle.bg} ${stageStyle.text} ${stageStyle.border}`}
              >
                Stage {kpis.max_stage} — {stageStyle.label}
              </div>
              {mfr.parent_name && (
                <span className="text-xs text-slate-300">
                  subsidiary of {mfr.parent_name}
                </span>
              )}
            </div>
            <h1 className="font-heading text-4xl font-bold tracking-tight">
              {mfr.canonical_name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
              {mfr.domicile_state && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {mfr.domicile_state}
                  {mfr.country && mfr.country !== "US" ? `, ${mfr.country}` : ""}
                </div>
              )}
              {mfr.website && (
                <a
                  href={mfr.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-white"
                >
                  <Globe className="h-4 w-4" />
                  {mfr.website.replace(/^https?:\/\//, "")}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            {mfr.aliases.length > 0 && (
              <p className="text-xs text-slate-400">
                Also known as: {mfr.aliases.slice(0, 5).join(", ")}
              </p>
            )}
          </div>

          {/* Thermometer gauge */}
          <ThermometerGauge stage={kpis.max_stage} />
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <KpiCard icon={<AlertTriangle className="h-5 w-5" />} label="Recalls" value={kpis.total_recalls} sublabel={`${kpis.class_i_recalls} Class I`} />
        <KpiCard icon={<Scale className="h-5 w-5" />} label="Cases filed" value={kpis.total_cases} />
        <KpiCard icon={<MapPin className="h-5 w-5" />} label="States" value={kpis.state_count} />
        <KpiCard icon={<Users className="h-5 w-5" />} label="Plaintiff firms" value={kpis.specialty_firm_count} />
        <KpiCard
          icon={<Shield className="h-5 w-5" />}
          label="JPML status"
          value={kpis.mdl_formed ? "MDL" : kpis.mdl_petition_filed ? "Petition" : "None"}
          sublabel={kpis.mdl_formed ? "Formed" : kpis.mdl_petition_filed ? "Pending" : ""}
          textual
        />
        <KpiCard
          icon={<Clock className="h-5 w-5" />}
          label="First case"
          value={kpis.first_case_filed_at ? formatDate(kpis.first_case_filed_at) : "—"}
          sublabel={kpis.last_case_filed_at ? `Latest ${formatDate(kpis.last_case_filed_at)}` : ""}
          textual
        />
      </div>

      {/* Linked Torts: Primary (Firm Activity badges) */}
      {primaryTorts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-intelligence-teal" />
            <h2 className="font-heading text-xl font-semibold text-midnight-navy">
              Mass Tort Exposure &amp; Firm Activity
            </h2>
          </div>
          <p className="text-sm text-slate-gray">
            Plaintiff-firm advertising signals for torts where {mfr.canonical_name} is a primary or secondary defendant.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {primaryTorts.map((t) => (
              <TortActivityCard key={t.tort_id} tort={t} />
            ))}
          </div>
        </section>
      )}

      {/* Stage History Timeline */}
      {stage_history.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-intelligence-teal" />
            <h2 className="font-heading text-xl font-semibold text-midnight-navy">
              Stage History
            </h2>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white">
            <ul className="divide-y divide-slate-100">
              {stage_history.slice(0, 10).map((h) => {
                const toStyle = STAGE_COLORS[h.to_stage] ?? STAGE_COLORS[1];
                const fromStyle = STAGE_COLORS[h.from_stage] ?? STAGE_COLORS[1];
                const escalated = h.to_stage > h.from_stage;
                return (
                  <li key={h.id} className="flex items-center gap-4 px-4 py-3 text-sm">
                    <div className="text-xs text-slate-gray tabular-nums min-w-[80px]">
                      {formatDate(h.transitioned_at)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded px-2 py-0.5 text-xs ${fromStyle.bg} ${fromStyle.text}`}>
                        {h.from_label}
                      </span>
                      <span className="text-slate-400">→</span>
                      <span className={`rounded px-2 py-0.5 text-xs font-semibold ${toStyle.bg} ${toStyle.text}`}>
                        {h.to_label}
                      </span>
                    </div>
                    <div className="text-xs text-slate-gray flex-1">
                      {escalated ? "Escalated" : "De-escalated"}
                      {h.trigger_reason && (
                        <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">
                          {h.trigger_reason.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-gray tabular-nums">
                      {h.case_count_at_transition} cases
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* Recent Cases */}
      {cases.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-intelligence-teal" />
            <h2 className="font-heading text-xl font-semibold text-midnight-navy">
              Recent Cases ({cases.length}
              {data.cases.length === 100 ? "+" : ""})
            </h2>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-gray">
                <tr>
                  <th className="px-3 py-2 text-left">Case</th>
                  <th className="px-3 py-2 text-left">Court</th>
                  <th className="px-3 py-2 text-left">State</th>
                  <th className="px-3 py-2 text-left">Filed</th>
                  <th className="px-3 py-2 text-left">Plaintiff Firm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cases.slice(0, 25).map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-midnight-navy">
                      {c.docket_url ? (
                        <a
                          href={c.docket_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-intelligence-teal inline-flex items-center gap-1"
                        >
                          {c.case_name ?? "—"}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        c.case_name ?? "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-gray text-xs">
                      {c.court_name ?? "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{c.state_code ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums text-xs">{formatDate(c.case_filed_date)}</td>
                    <td className="px-3 py-2">
                      {c.plaintiff_firm_name ? (
                        <span className="flex items-center gap-2">
                          {c.plaintiff_firm_name}
                          {c.is_specialty_firm && (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">
                              Plaintiff
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs italic">pending enrichment</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {cases.length > 25 && (
            <p className="text-xs text-slate-gray">Showing 25 of {cases.length} cases.</p>
          )}
        </section>
      )}

      {/* Recalls List */}
      {recalls.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-intelligence-teal" />
            <h2 className="font-heading text-xl font-semibold text-midnight-navy">
              Recall Events ({recalls.length})
            </h2>
          </div>
          <div className="space-y-3">
            {recalls.slice(0, 15).map((r) => {
              const rStyle = STAGE_COLORS[r.stage] ?? STAGE_COLORS[1];
              return (
                <div
                  key={r.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {r.recall_class && (
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-semibold ${
                              r.recall_class === "Class I"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {r.recall_class}
                          </span>
                        )}
                        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${rStyle.bg} ${rStyle.text}`}>
                          {rStyle.label}
                        </span>
                        {r.product_code && (
                          <span className="text-xs text-slate-gray tabular-nums">
                            {r.product_code}
                          </span>
                        )}
                        <span className="text-xs text-slate-gray">
                          {formatDate(r.event_date_initiated)}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-midnight-navy">
                        {r.product_description || "Unnamed product"}
                      </h3>
                      {r.reason_for_recall && (
                        <p className="text-xs text-slate-gray line-clamp-2">
                          {r.reason_for_recall}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs tabular-nums min-w-[180px]">
                      <div className="text-center">
                        <div className="text-slate-gray">Cases</div>
                        <div className="font-semibold text-midnight-navy">{r.case_count}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-slate-gray">States</div>
                        <div className="font-semibold text-midnight-navy">{r.state_count}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-slate-gray">Spc. Firms</div>
                        <div className="font-semibold text-midnight-navy">{r.specialty_firm_count}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {recalls.length > 15 && (
              <p className="text-xs text-slate-gray">Showing 15 of {recalls.length} recall events.</p>
            )}
          </div>
        </section>
      )}

      {/* Related Torts (low confidence) */}
      {relatedTorts.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-slate-gray" />
            <h2 className="font-heading text-lg font-semibold text-slate-gray">
              Related Torts
            </h2>
          </div>
          <p className="text-xs text-slate-gray">
            Lower-confidence tort associations (parent/subsidiary or tangential exposure). Shown for context; these don't drive the primary Firm Activity read.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {relatedTorts.map((t) => (
              <div
                key={t.tort_id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-midnight-navy">{t.tort_name}</span>
                  <span className="rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-700">
                    Related
                  </span>
                </div>
                {t.notes && <p className="mt-1 text-xs text-slate-gray">{t.notes}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <p className="text-xs text-slate-400">
        Generated {formatDate(data.generated_at)}. Recall Watchlist v1 (Day 4).
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Subcomponents                                                       */
/* ------------------------------------------------------------------ */

function KpiCard({
  icon,
  label,
  value,
  sublabel,
  textual,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sublabel?: string;
  textual?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-gray">
        <span className="text-intelligence-teal">{icon}</span>
        {label}
      </div>
      <div
        className={`mt-2 font-heading font-bold text-midnight-navy ${
          textual ? "text-lg" : "text-3xl tabular-nums"
        }`}
      >
        {value}
      </div>
      {sublabel && <div className="text-xs text-slate-gray">{sublabel}</div>}
    </div>
  );
}

function ThermometerGauge({ stage }: { stage: number }) {
  const stages = [1, 2, 3, 4, 5];
  const labels = ["Cold", "Warming", "Warm", "Hot", "Boiling"];
  const fillColors: Record<number, string> = {
    1: "bg-slate-400",
    2: "bg-sky-400",
    3: "bg-amber-400",
    4: "bg-orange-500",
    5: "bg-red-500",
  };

  return (
    <div className="flex items-end gap-1.5 min-w-[220px]">
      {stages.map((s) => {
        const active = s <= stage;
        const color = active ? fillColors[s] : "bg-white/10";
        const height = 28 + s * 8;
        return (
          <div key={s} className="flex flex-col items-center gap-1.5">
            <div
              className={`w-8 rounded-t-md transition-all ${color} ${
                s === stage ? "ring-2 ring-white/80" : ""
              }`}
              style={{ height: `${height}px` }}
            />
            <span
              className={`text-[10px] uppercase tracking-wide ${
                s === stage ? "font-bold text-white" : "text-slate-400"
              }`}
            >
              {labels[s - 1]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TortActivityCard({
  tort,
}: {
  tort: ManufacturerDetailData["linked_torts"][number];
}) {
  const style = CONFIDENCE_STYLE[tort.confidence];
  const hasAnyActivity =
    tort.serp_organic > 0 || tort.serp_paid > 0 || tort.ad_event_count > 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/advertising/${tort.tort_slug}`}
            className="font-heading text-lg font-semibold text-midnight-navy hover:text-intelligence-teal transition-colors"
          >
            {tort.tort_name}
          </Link>
          <div className="mt-1 flex items-center gap-2">
            <span className={`rounded px-2 py-0.5 text-xs font-semibold ${style.bg} ${style.text}`}>
              {style.label}
            </span>
            {tort.tort_status && (
              <span className="text-xs text-slate-gray capitalize">
                {tort.tort_status.replace(/_/g, " ")}
              </span>
            )}
          </div>
        </div>
      </div>

      {tort.notes && (
        <p className="mt-2 text-xs text-slate-gray italic">{tort.notes}</p>
      )}

      {/* Firm Activity Metrics */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        <MetricTile
          icon={<Search className="h-3.5 w-3.5" />}
          label="Organic"
          value={tort.serp_organic}
          helper="SERP"
        />
        <MetricTile
          icon={<DollarSign className="h-3.5 w-3.5" />}
          label="Paid"
          value={tort.serp_paid}
          helper="Google Ads"
        />
        <MetricTile
          icon={<Target className="h-3.5 w-3.5" />}
          label="Ad Events"
          value={tort.ad_event_count}
          helper="Meta/iSpot"
        />
        <MetricTile
          icon={<DollarSign className="h-3.5 w-3.5" />}
          label="Spend"
          value={formatMoney(tort.ad_event_spend)}
          helper="Estimated"
          textual
        />
      </div>

      {!hasAnyActivity && (
        <p className="mt-3 rounded bg-slate-50 px-2 py-1.5 text-xs text-slate-gray italic">
          No advertising signals collected yet for this tort. Data backfill pending.
        </p>
      )}

      {tort.platforms.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tort.platforms.slice(0, 5).map((p) => (
            <span
              key={p.name}
              className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
            >
              {p.name}
              <span className="ml-1 tabular-nums text-slate-500">({p.count})</span>
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 border-t border-slate-100 pt-3">
        <Link
          href={`/advertising/${tort.tort_slug}`}
          className="text-xs font-medium text-intelligence-teal hover:underline inline-flex items-center gap-1"
        >
          View full tort intelligence
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function MetricTile({
  icon,
  label,
  value,
  helper,
  textual,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  helper: string;
  textual?: boolean;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-gray">
        <span className="text-intelligence-teal">{icon}</span>
        {label}
      </div>
      <div
        className={`mt-0.5 font-bold text-midnight-navy ${
          textual ? "text-sm" : "text-lg tabular-nums"
        }`}
      >
        {value}
      </div>
      <div className="text-[10px] text-slate-gray">{helper}</div>
    </div>
  );
}
