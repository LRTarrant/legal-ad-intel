"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { Save, RefreshCw, ListFilter, Plus, Trash2, X } from "lucide-react";

type SourceType =
  | "serious_injury"
  | "hospital_discharge"
  | "state_crash_detail"
  | "workers_comp";
type SourceStatus =
  | "wanted"
  | "researching"
  | "available"
  | "negotiating"
  | "integrated"
  | "blocked"
  | "not_available";

interface SourceRow {
  id: string;
  state_code: string;
  source_type: SourceType;
  source_name: string;
  status: SourceStatus;
  url: string | null;
  contact: string | null;
  cost: string | null;
  refresh_cadence: string | null;
  last_refreshed_at: string | null;
  data_table_ref: string | null;
  notes: string | null;
  owner: string | null;
  updated_at: string | null;
  state_rollout?: {
    state_name: string;
    priority_tier: string | null;
    population_rank: number | null;
    status: string | null;
  } | null;
}

interface QueueRow {
  id: string;
  state_code: string;
  state_name: string;
  priority_tier: string | null;
  state_priority_score: number | null;
  population_rank: number | null;
  state_status: string | null;
  source_type: SourceType;
  source_name: string;
  source_status: SourceStatus;
  url: string | null;
  contact: string | null;
  cost: string | null;
  notes: string | null;
  owner: string | null;
  updated_at: string;
  rank_score: number;
}

const SOURCE_TYPE_OPTIONS: SourceType[] = [
  "serious_injury",
  "hospital_discharge",
  "state_crash_detail",
  "workers_comp",
];
const STATUS_OPTIONS: SourceStatus[] = [
  "wanted",
  "researching",
  "available",
  "negotiating",
  "integrated",
  "blocked",
  "not_available",
];

const STATUS_BADGE: Record<SourceStatus, string> = {
  wanted: "bg-slate-100 text-slate-700",
  researching: "bg-amber-100 text-amber-800",
  available: "bg-blue-100 text-blue-800",
  negotiating: "bg-violet-100 text-violet-800",
  integrated: "bg-green-100 text-green-800",
  blocked: "bg-rose-100 text-rose-800",
  not_available: "bg-zinc-100 text-zinc-500",
};

const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  serious_injury: "Serious injury",
  hospital_discharge: "Hospital discharge",
  state_crash_detail: "State crash detail",
  workers_comp: "Workers' comp",
};

const STATE_OPTIONS_FALLBACK: string[] = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH",
  "NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT",
  "VT","VA","WA","WV","WI","WY",
];

export function StateDataSourcesAdmin() {
  const tenant = useTenant();
  const accentColor = tenant.accentColor ?? "#1A8C96";

  const [view, setView] = useState<"queue" | "all">("queue");
  const [rows, setRows] = useState<SourceRow[]>([]);
  const [queueRows, setQueueRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<SourceRow>>>({});
  const [toast, setToast] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);
  const [statusFilter, setStatusFilter] = useState<SourceStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<SourceType | "all">("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newRow, setNewRow] = useState<{
    state_code: string;
    source_type: SourceType;
    source_name: string;
    url: string;
    notes: string;
  }>({
    state_code: "TX",
    source_type: "serious_injury",
    source_name: "",
    url: "",
    notes: "",
  });

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
          fetch("/api/admin/state-data-sources"),
          fetch("/api/admin/state-data-sources?queue=next"),
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

  const stage = useCallback((id: string, patch: Partial<SourceRow>) => {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const save = useCallback(
    async (id: string) => {
      const updates = edits[id];
      if (!updates || Object.keys(updates).length === 0) return;
      setSavingId(id);
      try {
        const res = await fetch("/api/admin/state-data-sources", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, updates }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Save failed");
        }
        const j = await res.json();
        setRows((prev) =>
          prev.map((r) => (r.id === id ? { ...r, ...j.row } : r)),
        );
        setEdits((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        showToast("success", "Saved");
        // refresh queue silently
        fetch("/api/admin/state-data-sources?queue=next")
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

  const deleteRow = useCallback(
    async (id: string) => {
      if (!confirm("Delete this source row? This cannot be undone.")) return;
      try {
        const res = await fetch(
          `/api/admin/state-data-sources?id=${encodeURIComponent(id)}`,
          { method: "DELETE" },
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Delete failed");
        }
        setRows((prev) => prev.filter((r) => r.id !== id));
        showToast("success", "Deleted");
        fetch("/api/admin/state-data-sources?queue=next")
          .then((r) => r.json())
          .then((j) => setQueueRows(j.rows ?? []))
          .catch(() => {});
      } catch (e) {
        showToast("error", (e as Error).message);
      }
    },
    [showToast],
  );

  const addRow = useCallback(async () => {
    if (!newRow.source_name.trim()) {
      showToast("error", "Source name is required");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/admin/state-data-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state_code: newRow.state_code,
          source_type: newRow.source_type,
          source_name: newRow.source_name,
          url: newRow.url || null,
          notes: newRow.notes || null,
          status: "wanted",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to add");
      }
      showToast("success", "Source added");
      setShowAdd(false);
      setNewRow({
        state_code: newRow.state_code,
        source_type: newRow.source_type,
        source_name: "",
        url: "",
        notes: "",
      });
      await fetchData(false);
    } catch (e) {
      showToast("error", (e as Error).message);
    } finally {
      setAdding(false);
    }
  }, [newRow, fetchData, showToast]);

  const stateOptions = useMemo(() => {
    const fromRows = Array.from(new Set(rows.map((r) => r.state_code))).sort();
    return fromRows.length > 0 ? fromRows : STATE_OPTIONS_FALLBACK;
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (typeFilter !== "all" && r.source_type !== typeFilter) return false;
      if (stateFilter !== "all" && r.state_code !== stateFilter) return false;
      return true;
    });
  }, [rows, statusFilter, typeFilter, stateFilter]);

  const counts = useMemo(() => {
    const by: Record<string, number> = {};
    rows.forEach((r) => {
      by[r.status] = (by[r.status] ?? 0) + 1;
    });
    return by;
  }, [rows]);

  function renderEditableRow(r: SourceRow) {
    const e = edits[r.id] ?? {};
    const merged: SourceRow = { ...r, ...e };
    const dirty = Object.keys(e).length > 0;

    return (
      <tr
        key={r.id}
        className={`border-b border-slate-100 ${dirty ? "bg-amber-50/40" : ""}`}
      >
        <td className="px-3 py-2 font-mono text-xs">{r.state_code}</td>
        <td className="px-3 py-2 text-xs text-slate-500">
          {SOURCE_TYPE_LABEL[r.source_type]}
        </td>
        <td className="px-3 py-2">
          <input
            type="text"
            value={merged.source_name ?? ""}
            onChange={(ev) => stage(r.id, { source_name: ev.target.value })}
            className="w-64 rounded-md border border-slate-200 px-2 py-1 text-xs"
          />
        </td>
        <td className="px-3 py-2">
          <select
            value={merged.status}
            onChange={(ev) =>
              stage(r.id, { status: ev.target.value as SourceStatus })
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
          <input
            type="url"
            value={merged.url ?? ""}
            onChange={(ev) => stage(r.id, { url: ev.target.value || null })}
            className="w-48 rounded-md border border-slate-200 px-2 py-1 text-xs"
            placeholder="—"
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="text"
            value={merged.contact ?? ""}
            onChange={(ev) =>
              stage(r.id, { contact: ev.target.value || null })
            }
            className="w-40 rounded-md border border-slate-200 px-2 py-1 text-xs"
            placeholder="—"
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="text"
            value={merged.cost ?? ""}
            onChange={(ev) => stage(r.id, { cost: ev.target.value || null })}
            className="w-24 rounded-md border border-slate-200 px-2 py-1 text-xs"
            placeholder="—"
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="text"
            value={merged.owner ?? ""}
            onChange={(ev) => stage(r.id, { owner: ev.target.value || null })}
            className="w-28 rounded-md border border-slate-200 px-2 py-1 text-xs"
            placeholder="—"
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="text"
            value={merged.notes ?? ""}
            onChange={(ev) => stage(r.id, { notes: ev.target.value || null })}
            className="w-56 rounded-md border border-slate-200 px-2 py-1 text-xs"
            placeholder="—"
          />
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1">
            <button
              disabled={!dirty || savingId === r.id}
              onClick={() => save(r.id)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-white disabled:opacity-30"
              style={{ backgroundColor: accentColor }}
            >
              <Save className="h-3 w-3" />
              {savingId === r.id ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => deleteRow(r.id)}
              className="rounded-md p-1 text-rose-500 hover:bg-rose-50"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
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

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-midnight-navy">
            State Data Sources
          </h1>
          <p className="mt-2 text-sm text-slate-gray">
            Per-state, per-source-type tracker for deep injury / hospital /
            crash / workers&apos; comp datasets to seek out and integrate.
            Drives the &ldquo;sources to pursue&rdquo; queue and the{" "}
            <code>deep_data_count</code> badge on State Rollout.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white shadow-sm"
          style={{ backgroundColor: accentColor }}
        >
          <Plus className="h-4 w-4" />
          Add source
        </button>
      </div>

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
          Sources to pursue
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
          All sources
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
                <th className="px-3 py-2">State</th>
                <th className="px-3 py-2">Tier</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">URL</th>
                <th className="px-3 py-2">Owner</th>
                <th className="px-3 py-2">Notes</th>
                <th className="px-3 py-2">Rank</th>
              </tr>
            </thead>
            <tbody>
              {queueRows.map((r, idx) => (
                <tr
                  key={r.id}
                  className="border-b border-slate-100 hover:bg-slate-50/50"
                >
                  <td className="px-3 py-2 text-xs text-slate-400">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <div className="font-medium text-charcoal">
                      {r.state_code}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {r.state_name}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.priority_tier ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">{r.source_name}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {SOURCE_TYPE_LABEL[r.source_type]}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[r.source_status]}`}
                    >
                      {r.source_status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.url ? (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        link
                      </a>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">{r.owner ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {r.notes ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs font-medium">
                    {Number(r.rank_score ?? 0).toFixed(0)}
                  </td>
                </tr>
              ))}
              {queueRows.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-3 py-8 text-center text-sm text-slate-500"
                  >
                    No sources currently in pursuit (everything is integrated,
                    blocked, or marked not available).
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
                setStatusFilter(e.target.value as SourceStatus | "all")
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
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as SourceType | "all")
              }
              className="rounded-md border border-slate-200 px-2 py-1 text-xs"
            >
              <option value="all">All types</option>
              {SOURCE_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {SOURCE_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="rounded-md border border-slate-200 px-2 py-1 text-xs"
            >
              <option value="all">All states</option>
              {stateOptions.map((s) => (
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
                  <th className="px-3 py-2">State</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Source name</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">URL</th>
                  <th className="px-3 py-2">Contact</th>
                  <th className="px-3 py-2">Cost</th>
                  <th className="px-3 py-2">Owner</th>
                  <th className="px-3 py-2">Notes</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>{filteredRows.map(renderEditableRow)}</tbody>
            </table>
          </div>
        </>
      )}

      {/* Add source modal */}
      {showAdd && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-charcoal">
                Add data source
              </h2>
              <button
                onClick={() => setShowAdd(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-xs font-medium text-slate-700">
                State
                <select
                  value={newRow.state_code}
                  onChange={(e) =>
                    setNewRow({ ...newRow, state_code: e.target.value })
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                >
                  {stateOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-700">
                Source type
                <select
                  value={newRow.source_type}
                  onChange={(e) =>
                    setNewRow({
                      ...newRow,
                      source_type: e.target.value as SourceType,
                    })
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                >
                  {SOURCE_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {SOURCE_TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-span-2 text-xs font-medium text-slate-700">
                Source name
                <input
                  type="text"
                  value={newRow.source_name}
                  onChange={(e) =>
                    setNewRow({ ...newRow, source_name: e.target.value })
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  placeholder="e.g. TX DSHS Trauma Registry"
                />
              </label>
              <label className="col-span-2 text-xs font-medium text-slate-700">
                URL (optional)
                <input
                  type="url"
                  value={newRow.url}
                  onChange={(e) =>
                    setNewRow({ ...newRow, url: e.target.value })
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  placeholder="https://"
                />
              </label>
              <label className="col-span-2 text-xs font-medium text-slate-700">
                Notes (optional)
                <textarea
                  value={newRow.notes}
                  onChange={(e) =>
                    setNewRow({ ...newRow, notes: e.target.value })
                  }
                  rows={3}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowAdd(false)}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={addRow}
                disabled={adding || !newRow.source_name.trim()}
                className="rounded-md px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
                style={{ backgroundColor: accentColor }}
              >
                {adding ? "Adding…" : "Add source"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
