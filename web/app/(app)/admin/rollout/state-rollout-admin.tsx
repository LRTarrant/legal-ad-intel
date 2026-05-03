"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { Save, RefreshCw, ListFilter } from "lucide-react";

type Status =
  | "backlog"
  | "scoping"
  | "in_build"
  | "launched"
  | "maintenance"
  | "paused";
type Tier = "tier_1" | "tier_2" | "tier_3" | "tier_4" | null;

interface StateRow {
  state_code: string;
  state_name: string;
  region: string | null;
  status: Status;
  priority_score: number | null;
  priority_tier: Tier;
  population_rank: number | null;
  data_coverage_pct: number | null;
  has_ad_data: boolean | null;
  has_serp_data: boolean | null;
  has_judicial_data: boolean | null;
  has_mdl_data: boolean | null;
  target_launch_date: string | null;
  launched_at: string | null;
  owner: string | null;
  blockers: string | null;
  notes: string | null;
}

interface QueueRow extends StateRow {
  rank_score: number;
}

const STATUS_OPTIONS: Status[] = [
  "backlog",
  "scoping",
  "in_build",
  "launched",
  "maintenance",
  "paused",
];
const TIER_OPTIONS: Exclude<Tier, null>[] = [
  "tier_1",
  "tier_2",
  "tier_3",
  "tier_4",
];

const STATUS_BADGE: Record<Status, string> = {
  backlog: "bg-slate-100 text-slate-700",
  scoping: "bg-amber-100 text-amber-800",
  in_build: "bg-blue-100 text-blue-800",
  launched: "bg-green-100 text-green-800",
  maintenance: "bg-violet-100 text-violet-800",
  paused: "bg-rose-100 text-rose-800",
};

export function StateRolloutAdmin() {
  const tenant = useTenant();
  const accentColor = tenant.accentColor ?? "#1A8C96";

  const [view, setView] = useState<"queue" | "all">("queue");
  const [rows, setRows] = useState<StateRow[]>([]);
  const [queueRows, setQueueRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [edits, setEdits] = useState<
    Record<string, Partial<StateRow>>
  >({});
  const [toast, setToast] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");

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
          fetch("/api/admin/state-rollout"),
          fetch("/api/admin/state-rollout?queue=next"),
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

  const stage = useCallback(
    (code: string, patch: Partial<StateRow>) => {
      setEdits((prev) => ({
        ...prev,
        [code]: { ...prev[code], ...patch },
      }));
    },
    [],
  );

  const save = useCallback(
    async (code: string) => {
      const updates = edits[code];
      if (!updates || Object.keys(updates).length === 0) return;
      setSavingCode(code);
      try {
        const res = await fetch("/api/admin/state-rollout", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state_code: code, updates }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Save failed");
        }
        const j = await res.json();
        setRows((prev) =>
          prev.map((r) => (r.state_code === code ? { ...r, ...j.row } : r)),
        );
        setEdits((prev) => {
          const next = { ...prev };
          delete next[code];
          return next;
        });
        showToast("success", `${code} saved`);
        // refresh queue silently to reflect new ranking
        fetch("/api/admin/state-rollout?queue=next")
          .then((r) => r.json())
          .then((j) => setQueueRows(j.rows ?? []))
          .catch(() => {});
      } catch (e) {
        showToast("error", (e as Error).message);
      } finally {
        setSavingCode(null);
      }
    },
    [edits, showToast],
  );

  const regions = useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => r.region).filter(Boolean) as string[]),
      ).sort(),
    [rows],
  );

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (regionFilter !== "all" && r.region !== regionFilter) return false;
      return true;
    });
  }, [rows, statusFilter, regionFilter]);

  const counts = useMemo(() => {
    const by: Record<string, number> = {};
    rows.forEach((r) => {
      by[r.status] = (by[r.status] ?? 0) + 1;
    });
    return by;
  }, [rows]);

  function renderCell(code: string, row: StateRow) {
    const e = edits[code] ?? {};
    const merged: StateRow = { ...row, ...e };
    const dirty = Object.keys(e).length > 0;

    return (
      <tr
        key={code}
        className={`border-b border-slate-100 ${dirty ? "bg-amber-50/40" : ""}`}
      >
        <td className="px-3 py-2 font-mono text-xs">{code}</td>
        <td className="px-3 py-2 text-sm text-charcoal">{row.state_name}</td>
        <td className="px-3 py-2 text-xs text-slate-500">{row.region ?? "—"}</td>
        <td className="px-3 py-2">
          <select
            value={merged.status}
            onChange={(ev) =>
              stage(code, { status: ev.target.value as Status })
            }
            className={`rounded-md border-0 px-2 py-1 text-xs font-medium ${STATUS_BADGE[merged.status]}`}
          >
            {STATUS_OPTIONS.map((s) => (
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
              stage(code, {
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
              stage(code, { priority_score: Number(ev.target.value) })
            }
            className="w-20 rounded-md border border-slate-200 px-2 py-1 text-xs"
          />
        </td>
        <td className="px-3 py-2 text-xs text-slate-500">
          {row.population_rank ?? "—"}
        </td>
        <td className="px-3 py-2">
          <input
            type="number"
            min="0"
            max="100"
            value={merged.data_coverage_pct ?? ""}
            onChange={(ev) =>
              stage(code, {
                data_coverage_pct:
                  ev.target.value === "" ? null : Number(ev.target.value),
              })
            }
            className="w-16 rounded-md border border-slate-200 px-2 py-1 text-xs"
            placeholder="—"
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="text"
            value={merged.owner ?? ""}
            onChange={(ev) =>
              stage(code, { owner: ev.target.value || null })
            }
            className="w-32 rounded-md border border-slate-200 px-2 py-1 text-xs"
            placeholder="—"
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="text"
            value={merged.blockers ?? ""}
            onChange={(ev) =>
              stage(code, { blockers: ev.target.value || null })
            }
            className="w-40 rounded-md border border-slate-200 px-2 py-1 text-xs"
            placeholder="—"
          />
        </td>
        <td className="px-3 py-2">
          <button
            disabled={!dirty || savingCode === code}
            onClick={() => save(code)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-white disabled:opacity-30"
            style={{ backgroundColor: accentColor }}
          >
            <Save className="h-3 w-3" />
            {savingCode === code ? "Saving…" : "Save"}
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
        <h1 className="text-3xl font-bold text-midnight-navy">State Rollout</h1>
        <p className="mt-2 text-sm text-slate-gray">
          Operating queue for the LMI state-by-state build. Rows are seeded for
          all 50 states + DC. Edit <code>priority_score</code> or{" "}
          <code>priority_tier</code> to influence the &ldquo;build next&rdquo;
          queue.
        </p>
      </div>

      {/* Status counts */}
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((s) => (
          <span
            key={s}
            className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_BADGE[s]}`}
          >
            {s}: {counts[s] ?? 0}
          </span>
        ))}
      </div>

      {/* View toggle */}
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
          Build next queue
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
          All states
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
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">State</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Tier</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Pop rank</th>
                <th className="px-3 py-2">Coverage %</th>
                <th className="px-3 py-2">Rank score</th>
              </tr>
            </thead>
            <tbody>
              {queueRows.map((r, idx) => (
                <tr
                  key={r.state_code}
                  className="border-b border-slate-100 hover:bg-slate-50/50"
                >
                  <td className="px-3 py-2 text-xs text-slate-400">{idx + 1}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {r.state_code}
                  </td>
                  <td className="px-3 py-2 text-sm text-charcoal">
                    {r.state_name}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status]}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">{r.priority_tier ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">
                    {r.priority_score ?? 0}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {r.population_rank ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {r.data_coverage_pct ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs font-medium text-charcoal">
                    {Number(r.rank_score ?? 0).toFixed(1)}
                  </td>
                </tr>
              ))}
              {queueRows.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-8 text-center text-sm text-slate-500"
                  >
                    No states currently in backlog / scoping / in_build.
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
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as Status | "all")
              }
              className="rounded-md border border-slate-200 px-2 py-1 text-xs"
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="rounded-md border border-slate-200 px-2 py-1 text-xs"
            >
              <option value="all">All regions</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
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
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">State</th>
                  <th className="px-3 py-2">Region</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Tier</th>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2">Pop</th>
                  <th className="px-3 py-2">Cov %</th>
                  <th className="px-3 py-2">Owner</th>
                  <th className="px-3 py-2">Blockers</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => renderCell(r.state_code, r))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
