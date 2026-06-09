"use client";

import { useCallback, useEffect, useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { Search, RefreshCw, FileText, LogIn, Activity } from "lucide-react";
import { TimeframeSelector } from "../_components/timeframe-selector";
import {
  resolveTimeframe,
  type ResolvedTimeframe,
} from "@/lib/analytics-timeframe";

interface RosterUser {
  user_id: string;
  tenant_id: string;
  full_name: string | null;
  role: string | null;
  email: string | null;
  firm_name: string | null;
  event_count: number;
  page_view_count: number;
  login_count: number;
  last_event_at: string;
}

interface TimelineEvent {
  created_at: string;
  event_type: string;
  page_path: string | null;
  metadata: Record<string, unknown> | null;
}

interface TimelineHeader {
  user_id: string;
  full_name: string | null;
  role: string | null;
  email: string | null;
  firm_name: string | null;
}

function fmtInt(v: unknown): string {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? Math.round(n).toLocaleString() : "—";
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

function displayName(u: { full_name: string | null; email: string | null }): string {
  return u.full_name || u.email || "Unknown user";
}

export function UserActivityClient() {
  const tenant = useTenant();
  const accentColor = tenant.accentColor ?? "#1A8C96";

  const [timeframe, setTimeframe] = useState<ResolvedTimeframe>(() =>
    resolveTimeframe("30d"),
  );
  const [roster, setRoster] = useState<RosterUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<RosterUser | null>(null);

  const fetchRoster = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        startDate: timeframe.startDate,
        endDate: timeframe.endDate,
      });
      const res = await fetch(`/api/admin/user-activity?${qs}`, {
        cache: "no-store",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? `Request failed (${res.status})`);
        setRoster([]);
        return;
      }
      setRoster((body.users as RosterUser[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load activity");
      setRoster([]);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? roster.filter(
        (u) =>
          (u.full_name ?? "").toLowerCase().includes(q) ||
          (u.email ?? "").toLowerCase().includes(q) ||
          (u.firm_name ?? "").toLowerCase().includes(q),
      )
    : roster;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">User Activity</h1>
          <p className="mt-1 text-sm text-slate-gray">
            Individual user activity across all firms · {fmtInt(roster.length)}{" "}
            active in window
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TimeframeSelector
            value={timeframe}
            onChange={setTimeframe}
            accentColor={accentColor}
            disabled={loading}
          />
          <button
            onClick={fetchRoster}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Roster */}
        <section className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or firm…"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-slate-400"
            />
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      User / Firm
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                      Events
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                      Logins
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                      Last active
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && roster.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">
                        Loading…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">
                        No activity in this window
                      </td>
                    </tr>
                  ) : (
                    filtered.map((u) => {
                      const active = selected?.user_id === u.user_id;
                      return (
                        <tr
                          key={u.user_id}
                          onClick={() => setSelected(u)}
                          className={`cursor-pointer transition ${
                            active ? "bg-slate-50" : "hover:bg-slate-50/60"
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-charcoal">
                              {displayName(u)}
                            </div>
                            <div className="text-xs text-slate-500">
                              {u.firm_name ?? "—"}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-sm tabular-nums text-charcoal">
                            {fmtInt(u.event_count)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm tabular-nums text-charcoal">
                            {fmtInt(u.login_count)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-slate-500">
                            {fmtTime(u.last_event_at)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section>
          {selected ? (
            <UserTimeline
              key={selected.user_id}
              userId={selected.user_id}
              fallback={selected}
              timeframe={timeframe}
              accentColor={accentColor}
            />
          ) : (
            <div className="flex h-full min-h-[200px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
              Select a user to view their activity timeline
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function eventIcon(type: string) {
  if (type === "page_view") return FileText;
  if (type === "login") return LogIn;
  return Activity;
}

function UserTimeline({
  userId,
  fallback,
  timeframe,
  accentColor,
}: {
  userId: string;
  fallback: RosterUser;
  timeframe: ResolvedTimeframe;
  accentColor: string;
}) {
  const [header, setHeader] = useState<TimelineHeader | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);

  const load = useCallback(
    async (offset: number) => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({
          startDate: timeframe.startDate,
          endDate: timeframe.endDate,
          offset: String(offset),
        });
        const res = await fetch(`/api/admin/user-activity/${userId}?${qs}`, {
          cache: "no-store",
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(body.error ?? `Request failed (${res.status})`);
          return;
        }
        setHeader(body.user as TimelineHeader);
        setEvents((prev) =>
          offset === 0
            ? (body.events as TimelineEvent[])
            : [...prev, ...(body.events as TimelineEvent[])],
        );
        setHasMore(Boolean(body.hasMore));
        setNextOffset(Number(body.nextOffset ?? offset));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load timeline");
      } finally {
        setLoading(false);
      }
    },
    [userId, timeframe],
  );

  useEffect(() => {
    load(0);
  }, [load]);

  const name = header
    ? header.full_name || header.email || "Unknown user"
    : fallback.full_name || fallback.email || "Unknown user";
  const firm = header?.firm_name ?? fallback.firm_name;
  const email = header?.email ?? fallback.email;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="text-base font-semibold text-charcoal">{name}</div>
        <div className="text-xs text-slate-500">
          {firm ?? "—"}
          {email ? ` · ${email}` : ""}
        </div>
      </div>

      {error && (
        <div className="px-5 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="max-h-[55vh] overflow-y-auto p-5">
        {loading && events.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
        ) : events.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            No events in this window
          </p>
        ) : (
          <ol className="space-y-3">
            {events.map((ev, i) => {
              const Icon = eventIcon(ev.event_type);
              return (
                <li key={i} className="flex gap-3">
                  <div
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${accentColor}1A` }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: accentColor }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-charcoal">
                      <span className="font-medium">
                        {ev.event_type === "page_view"
                          ? "Viewed"
                          : ev.event_type === "login"
                            ? "Signed in"
                            : ev.event_type}
                      </span>
                      {ev.page_path && (
                        <span className="text-slate-600"> {ev.page_path}</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {fmtTime(ev.created_at)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {hasMore && (
          <button
            onClick={() => load(nextOffset)}
            disabled={loading}
            className="mt-4 w-full rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        )}
      </div>
    </div>
  );
}
