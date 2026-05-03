"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { Save, RefreshCw, ListFilter } from "lucide-react";

type Lifecycle =
  | "evaluating"
  | "emerging"
  | "active"
  | "mature"
  | "winding_down"
  | "dropped";
type MdlStage =
  | "pre_mdl"
  | "newly_consolidated"
  | "bellwether"
  | "settlement"
  | "wind_down"
  | null;
type Tier = "tier_1" | "tier_2" | "tier_3" | "tier_4" | null;
type Fraud = "low" | "medium" | "high" | null;

interface TortRow {
  tort_id: string;
  tort_slug: string | null;
  lifecycle_stage: Lifecycle;
  mdl_stage: MdlStage;
  priority_score: number | null;
  priority_tier: Tier;
  firm_interest_count: number | null;
  outreach_reply_rate: number | null;
  pipeline_deals: number | null;
  closed_deals: number | null;
  inventory_committed: number | null;
  est_cpl_usd: number | null;
  est_cpa_usd: number | null;
  est_cpk_usd: number | null;
  payout_per_case_usd: number | null;
  fraud_risk: Fraud;
  has_landing_page: boolean | null;
  has_intake_script: boolean | null;
  has_creative: boolean | null;
  has_cost_benchmarks: boolean | null;
  owner: string | null;
  notes: string | null;
  mass_torts?: {
    id: string;
    name: string;
    slug: string | null;
    category: string | null;
    status: string | null;
    visible: boolean | null;
  } | null;
}

interface QueueRow {
  tort_id: string;
  tort_name: string;
  tort_slug: string | null;
  category: string | null;
  mass_tort_status: string | null;
  lifecycle_stage: Lifecycle;
  mdl_stage: MdlStage;
  priority_tier: Tier;
  priority_score: number | null;
  firm_interest_count: number | null;
  outreach_reply_rate: number | null;
  pipeline_deals: number | null;
  closed_deals: number | null;
  inventory_committed: number | null;
  est_cpk_usd: number | null;
  payout_per_case_usd: number | null;
  est_margin_per_case: number | null;
  fraud_risk: Fraud;
  has_landing_page: boolean | null;
  has_intake_script: boolean | null;
  has_creative: boolean | null;
  has_cost_benchmarks: boolean | null;
  owner: string | null;
  rank_score: number;
}

const LIFECYCLE_OPTIONS: Lifecycle[] = [
  "evaluating",
  "emerging",
  "active",
  "mature",
  "winding_down",
  "dropped",
];
const MDL_OPTIONS: Exclude<MdlStage, null>[] = [
  "pre_mdl",
  "newly_consolidated",
  "bellwether",
  "settlement",
  "wind_down",
];
const TIER_OPTIONS: Exclude<Tier, null>[] = [
  "tier_1",
  "tier_2",
  "tier_3",
  "tier_4",
];
const FRAUD_OPTIONS: Exclude<Fraud, null>[] = ["low", "medium", "high"];

const LIFECYCLE_BADGE: Record<Lifecycle, string> = {
  evaluating: "bg-slate-100 text-slate-700",
  emerging: "bg-amber-100 text-amber-800",
  active: "bg-blue-100 text-blue-800",
  mature: "bg-green-100 text-green-800",
  winding_down: "bg-violet-100 text-violet-800",
  dropped: "bg-rose-100 text-rose-800",
};

const FRAUD_BADGE: Record<NonNullable<Fraud>, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-rose-100 text-rose-800",
};

function fmtUsd(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return `$${Number(n).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;
}

export function TortTractionAdmin() {
  const tenant = useTenant();
  const accentColor = tenant.accentColor ?? "#1A8C96";

  const [view, setView] = useState<"queue" | "all">("queue");
  const [rows, setRows] = useState<TortRow[]>([]);
  const [queueRows, setQueueRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<TortRow>>>({});
  const [toast, setToast] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);
  const [lifecycleFilter, setLifecycleFilter] = useState<Lifecycle | "all">(
    "all",
  );

  const showToast = useCallback(
    (type: "success" | "error", message: string) => {
      setToast({ type, message });
      setTimeout(() => setToast(null), 3500);
    },
    [],
  );

  const fetchData = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) setLoading(true);
      try {
        const [allRes, queueRes] = await Promise.all([
          fetch("/api/admin/tort-traction"),
          fetch("/api/admin/tort-traction?queue=next"),
        ]);
        if (allRes.ok) {
          const j = await allRes.json();
          setRows(j.rows ?? []);
        }
        if (queueRes.ok) {
          const j = await queueRes.json();
          setQueueRows(j.rows ?? []);
        }
      } catch {
        showToast("error", "Failed to load");
      } finally {
        setLoading(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await fetchData();
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  const stage = useCallback((id: string, patch: Partial<TortRow>) => {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const save = useCallback(
    async (id: string) => {
      const updates = edits[id];
      if (!updates || Object.keys(updates).length === 0) return;
      setSavingId(id);
      try {
        const res = await fetch("/api/admin/tort-traction", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tort_id: id, updates }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Save failed");
        }
        const j = await res.json();
        setRows((prev) =>
          prev.map((r) => (r.tort_id === id ? { ...r, ...j.row } : r)),
        );
        setEdits((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        showToast("success", "Saved");
        fetch("/api/admin/tort-traction?queue=next")
          .then((r) => r.json())
          .then((j) => setQueueRows(j.rows ?? []))
          .catch(() => {});
      } catch (e) {
        showToast("error", (e as Error).message);
      } finally {
        setSavingId(null);
      }
    },
    [edits, showToast],
  );

  const filteredRows = useMemo(() => {
    return rows.filter((r) =>
      lifecycleFilter === "all" ? true : r.lifecycle_stage === lifecycleFilter,
    );
  }, [rows, lifecycleFilter]);

  const counts = useMemo(() => {
    const by: Record<string, number> = {};
    rows.forEach((r) => {
      by[r.lifecycle_stage] = (by[r.lifecycle_stage] ?? 0) + 1;
    });
    return by;
  }, [rows]);

  function renderEditableRow(r: TortRow) {
    const e = edits[r.tort_id] ?? {};
    const merged: TortRow = { ...r, ...e };
    const dirty = Object.keys(e).length > 0;
    const name = r.mass_torts?.name ?? r.tort_slug ?? r.tort_id;

    return (
      <tr
        key={r.tort_id}
        className={`border-b border-slate-100 ${dirty ? "bg-amber-50/40" : ""}`}
      >
        <td className="px-3 py-2 text-sm text-charcoal">
          <div className="font-medium">{name}</div>
          <div className="font-mono text-[10px] text-slate-400">
            {r.tort_slug}
          </div>
        </td>
        <td className="px-3 py-2">
          <select
            value={merged.lifecycle_stage}
            onChange={(ev) =>
              stage(r.tort_id, {
                lifecycle_stage: ev.target.value as Lifecycle,
              })
            }
            className={`rounded-md border-0 px-2 py-1 text-xs font-medium ${LIFECYCLE_BADGE[merged.lifecycle_stage]}`}
          >
            {LIFECYCLE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2">
          <select
            value={merged.mdl_stage ?? ""}
            onChange={(ev) =>
              stage(r.tort_id, {
                mdl_stage: (ev.target.value || null) as MdlStage,
              })
            }
            className="rounded-md border border-slate-200 px-2 py-1 text-xs"
          >
            <option value="">—</option>
            {MDL_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2">
          <select
            value={merged.priority_tier ?? ""}
            onChange={(ev) =>
              stage(r.tort_id, {
                priority_tier: (ev.target.value || null) as Tier,
              })
            }
            className="rounded-md border border-slate-200 px-2 py-1 text-xs"
          >
            <option value="">—</option>
            {TIER_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2">
          <input
            type="number"
            step="1"
            value={merged.priority_score ?? 0}
            onChange={(ev) =>
              stage(r.tort_id, { priority_score: Number(ev.target.value) })
            }
            className="w-20 rounded-md border border-slate-200 px-2 py-1 text-xs"
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="number"
            min="0"
            value={merged.firm_interest_count ?? 0}
            onChange={(ev) =>
              stage(r.tort_id, {
                firm_interest_count: Number(ev.target.value),
              })
            }
            className="w-16 rounded-md border border-slate-200 px-2 py-1 text-xs"
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="number"
            min="0"
            value={merged.pipeline_deals ?? 0}
            onChange={(ev) =>
              stage(r.tort_id, { pipeline_deals: Number(ev.target.value) })
            }
            className="w-16 rounded-md border border-slate-200 px-2 py-1 text-xs"
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="number"
            min="0"
            value={merged.closed_deals ?? 0}
            onChange={(ev) =>
              stage(r.tort_id, { closed_deals: Number(ev.target.value) })
            }
            className="w-16 rounded-md border border-slate-200 px-2 py-1 text-xs"
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="number"
            min="0"
            value={merged.est_cpk_usd ?? ""}
            onChange={(ev) =>
              stage(r.tort_id, {
                est_cpk_usd:
                  ev.target.value === "" ? null : Number(ev.target.value),
              })
            }
            className="w-20 rounded-md border border-slate-200 px-2 py-1 text-xs"
            placeholder="—"
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="number"
            min="0"
            value={merged.payout_per_case_usd ?? ""}
            onChange={(ev) =>
              stage(r.tort_id, {
                payout_per_case_usd:
                  ev.target.value === "" ? null : Number(ev.target.value),
              })
            }
            className="w-20 rounded-md border border-slate-200 px-2 py-1 text-xs"
            placeholder="—"
          />
        </td>
        <td className="px-3 py-2">
          <select
            value={merged.fraud_risk ?? ""}
            onChange={(ev) =>
              stage(r.tort_id, {
                fraud_risk: (ev.target.value || null) as Fraud,
              })
            }
            className={`rounded-md border-0 px-2 py-1 text-xs font-medium ${
              merged.fraud_risk
                ? FRAUD_BADGE[merged.fraud_risk]
                : "bg-slate-100 text-slate-500"
            }`}
          >
            <option value="">—</option>
            {FRAUD_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2">
          <input
            type="text"
            value={merged.owner ?? ""}
            onChange={(ev) =>
              stage(r.tort_id, { owner: ev.target.value || null })
            }
            className="w-28 rounded-md border border-slate-200 px-2 py-1 text-xs"
            placeholder="—"
          />
        </td>
        <td className="px-3 py-2">
          <button
            disabled={!dirty || savingId === r.tort_id}
            onClick={() => save(r.tort_id)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-white disabled:opacity-30"
            style={{ backgroundColor: accentColor }}
          >
            <Save className="h-3 w-3" />
            {savingId === r.tort_id ? "Saving…" : "Save"}
          </button>
        </td>
      </tr>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "border border-green-500/30 bg-green-500/10 text-green-700"
              : "border border-red-500/30 bg-red-500/10 text-red-700"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold text-midnight-navy">
          Tort Prioritization
        </h1>
        <p className="mt-2 text-sm text-slate-gray">
          Operating queue for which torts to work on next. Edit traction signals
          (firm interest, pipeline deals, CPK, payout) to drive the
          &ldquo;prioritize next&rdquo; ranking.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {LIFECYCLE_OPTIONS.map((s) => (
          <span
            key={s}
            className={`rounded-full px-3 py-1 text-xs font-medium ${LIFECYCLE_BADGE[s]}`}
          >
            {s}: {counts[s] ?? 0}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setView("queue")}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
            view === "queue"
              ? "border-current text-charcoal"
              : "border-transparent text-slate-500"
          }`}
          style={view === "queue" ? { color: accentColor } : undefined}
        >
          Prioritize next queue
        </button>
        <button
          onClick={() => setView("all")}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
            view === "all"
              ? "border-current text-charcoal"
              : "border-transparent text-slate-500"
          }`}
          style={view === "all" ? { color: accentColor } : undefined}
        >
          All torts
        </button>
        <button
          onClick={() => fetchData()}
          className="ml-auto inline-flex items-center gap-1 text-xs text-slate-500 hover:text-charcoal"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-slate-gray">Loading…</p>
      ) : view === "queue" ? (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Tort</th>
                <th className="px-3 py-2">Lifecycle</th>
                <th className="px-3 py-2">MDL stage</th>
                <th className="px-3 py-2">Tier</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Firms</th>
                <th className="px-3 py-2">Pipeline</th>
                <th className="px-3 py-2">Closed</th>
                <th className="px-3 py-2">CPK</th>
                <th className="px-3 py-2">Payout</th>
                <th className="px-3 py-2">Margin</th>
                <th className="px-3 py-2">Fraud</th>
                <th className="px-3 py-2">Rank</th>
              </tr>
            </thead>
            <tbody>
              {queueRows.map((r, idx) => (
                <tr
                  key={r.tort_id}
                  className="border-b border-slate-100 hover:bg-slate-50/50"
                >
                  <td className="px-3 py-2 text-xs text-slate-400">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <div className="font-medium text-charcoal">
                      {r.tort_name}
                    </div>
                    <div className="font-mono text-[10px] text-slate-400">
                      {r.tort_slug}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${LIFECYCLE_BADGE[r.lifecycle_stage]}`}
                    >
                      {r.lifecycle_stage}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {r.mdl_stage ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.priority_tier ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.priority_score ?? 0}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.firm_interest_count ?? 0}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.pipeline_deals ?? 0}
                  </td>
                  <td className="px-3 py-2 text-xs">{r.closed_deals ?? 0}</td>
                  <td className="px-3 py-2 text-xs">
                    {fmtUsd(r.est_cpk_usd)}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {fmtUsd(r.payout_per_case_usd)}
                  </td>
                  <td className="px-3 py-2 text-xs font-medium">
                    {fmtUsd(r.est_margin_per_case)}
                  </td>
                  <td className="px-3 py-2">
                    {r.fraud_risk ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${FRAUD_BADGE[r.fraud_risk]}`}
                      >
                        {r.fraud_risk}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs font-medium text-charcoal">
                    {Number(r.rank_score ?? 0).toFixed(1)}
                  </td>
                </tr>
              ))}
              {queueRows.length === 0 && (
                <tr>
                  <td
                    colSpan={14}
                    className="px-3 py-8 text-center text-sm text-slate-500"
                  >
                    No torts currently in evaluating / emerging / active.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <ListFilter className="h-4 w-4 text-slate-400" />
            <select
              value={lifecycleFilter}
              onChange={(e) =>
                setLifecycleFilter(e.target.value as Lifecycle | "all")
              }
              className="rounded-md border border-slate-200 px-2 py-1 text-xs"
            >
              <option value="all">All lifecycle stages</option>
              {LIFECYCLE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500">
              {filteredRows.length} of {rows.length}
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2">Tort</th>
                  <th className="px-3 py-2">Lifecycle</th>
                  <th className="px-3 py-2">MDL</th>
                  <th className="px-3 py-2">Tier</th>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2">Firms</th>
                  <th className="px-3 py-2">Pipe</th>
                  <th className="px-3 py-2">Closed</th>
                  <th className="px-3 py-2">CPK</th>
                  <th className="px-3 py-2">Payout</th>
                  <th className="px-3 py-2">Fraud</th>
                  <th className="px-3 py-2">Owner</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>{filteredRows.map(renderEditableRow)}</tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
