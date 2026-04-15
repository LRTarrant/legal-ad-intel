"use client";

import { useState } from "react";
import type { PlaintiffAttorneyRow } from "@/lib/queries/mdl-attorneys";

const FIRMS_VISIBLE_LIMIT = 15;

const LEADERSHIP_ROLES = ["lead counsel", "liaison counsel", "co-lead counsel"];

function isLeadershipRole(role: string | null): boolean {
  if (!role) return false;
  return LEADERSHIP_ROLES.some((lr) => role.toLowerCase().includes(lr));
}

interface FirmGroup {
  firmName: string;
  attorneys: PlaintiffAttorneyRow[];
  hasLeadership: boolean;
  leadershipCount: number;
}

function groupByFirm(attorneys: PlaintiffAttorneyRow[]): FirmGroup[] {
  const map = new Map<string, PlaintiffAttorneyRow[]>();
  for (const a of attorneys) {
    const key = a.firm_name ?? "Unaffiliated";
    const list = map.get(key);
    if (list) {
      list.push(a);
    } else {
      map.set(key, [a]);
    }
  }

  const groups: FirmGroup[] = [];
  for (const [firmName, members] of map) {
    const leadershipCount = members.filter((m) =>
      isLeadershipRole(m.role)
    ).length;
    groups.push({
      firmName,
      attorneys: members,
      hasLeadership: leadershipCount > 0,
      leadershipCount,
    });
  }

  groups.sort((a, b) => b.attorneys.length - a.attorneys.length);
  return groups;
}

interface Props {
  attorneys: PlaintiffAttorneyRow[];
}

export default function PlaintiffFirms({ attorneys }: Props) {
  const [expandedFirms, setExpandedFirms] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  if (attorneys.length === 0) {
    return (
      <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <h2 className="mb-4 text-2xl font-bold text-white">
          Plaintiff Attorneys
        </h2>
        <p className="text-sm text-slate-400">
          No plaintiff attorney data available for this MDL.
        </p>
      </section>
    );
  }

  const firms = groupByFirm(attorneys);
  const totalLeadership = firms.reduce((s, f) => s + f.leadershipCount, 0);
  const needsTruncation = firms.length > FIRMS_VISIBLE_LIMIT;
  const visibleFirms =
    showAll || !needsTruncation
      ? firms
      : firms.slice(0, FIRMS_VISIBLE_LIMIT);

  function toggleFirm(firmName: string) {
    setExpandedFirms((prev) => {
      const next = new Set(prev);
      if (next.has(firmName)) {
        next.delete(firmName);
      } else {
        next.add(firmName);
      }
      return next;
    });
  }

  return (
    <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <h2 className="mb-4 text-2xl font-bold text-white">
        Plaintiff Attorneys
      </h2>

      {/* Scorecard */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Total Firms
          </p>
          <p className="mt-1 text-2xl font-bold text-white">
            {firms.length.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Total Attorneys
          </p>
          <p className="mt-1 text-2xl font-bold text-purple-400">
            {attorneys.length.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Leadership
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-400">
            {totalLeadership.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Firm list */}
      <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 bg-zinc-800 px-4 py-3 text-xs uppercase tracking-wide text-slate-400">
          <div className="col-span-5">Firm</div>
          <div className="col-span-2 text-right">Attorneys</div>
          <div className="col-span-2 text-center">Leadership</div>
          <div className="col-span-3 text-right">Roles</div>
        </div>

        {/* Firm rows */}
        {visibleFirms.map((firm) => {
          const isExpanded = expandedFirms.has(firm.firmName);
          const uniqueRoles = [
            ...new Set(
              firm.attorneys
                .map((a) => a.role)
                .filter((r): r is string => r !== null)
            ),
          ];

          return (
            <div key={firm.firmName}>
              {/* Firm row */}
              <button
                onClick={() => toggleFirm(firm.firmName)}
                className="grid w-full grid-cols-12 items-center gap-2 border-t border-zinc-800 px-4 py-3 text-left transition-colors hover:bg-zinc-800/60"
              >
                <div className="col-span-5 flex items-center gap-2">
                  <svg
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 4.5l7.5 7.5-7.5 7.5"
                    />
                  </svg>
                  <span
                    className={`font-medium ${
                      firm.firmName === "Unaffiliated"
                        ? "italic text-slate-400"
                        : "text-white"
                    }`}
                  >
                    {firm.firmName}
                  </span>
                </div>
                <div className="col-span-2 text-right text-slate-300">
                  {firm.attorneys.length}
                </div>
                <div className="col-span-2 text-center">
                  {firm.hasLeadership ? (
                    <span className="inline-block rounded bg-amber-900/40 px-2 py-0.5 text-xs font-medium text-amber-400">
                      {firm.leadershipCount} leader
                      {firm.leadershipCount !== 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </div>
                <div className="col-span-3 flex flex-wrap justify-end gap-1">
                  {uniqueRoles.slice(0, 2).map((r) => (
                    <span
                      key={r}
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        isLeadershipRole(r)
                          ? "bg-amber-900/40 text-amber-400"
                          : "bg-zinc-800 text-slate-300"
                      }`}
                    >
                      {r}
                    </span>
                  ))}
                  {uniqueRoles.length > 2 && (
                    <span className="text-xs text-slate-500">
                      +{uniqueRoles.length - 2}
                    </span>
                  )}
                </div>
              </button>

              {/* Expanded attorney sub-table */}
              {isExpanded && (
                <div className="border-t border-zinc-800 bg-zinc-950 px-4 py-3">
                  <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-zinc-800 text-left text-xs uppercase tracking-wide text-slate-400">
                          <th className="px-4 py-2">Attorney</th>
                          <th className="px-4 py-2">Role</th>
                          <th className="px-4 py-2">Party</th>
                          <th className="px-4 py-2">Email</th>
                          <th className="px-4 py-2">Phone</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {firm.attorneys.map((a) => (
                          <tr
                            key={a.id}
                            className="transition-colors hover:bg-zinc-800/60"
                          >
                            <td className="px-4 py-2 font-medium text-white">
                              {a.attorney_name}
                            </td>
                            <td className="px-4 py-2">
                              {a.role ? (
                                <span
                                  className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                                    isLeadershipRole(a.role)
                                      ? "bg-amber-900/40 text-amber-400"
                                      : "bg-zinc-800 text-slate-300"
                                  }`}
                                >
                                  {a.role}
                                </span>
                              ) : (
                                <span className="text-slate-500">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-slate-300">
                              {a.party_name ?? "—"}
                            </td>
                            <td className="px-4 py-2 text-slate-300">
                              {a.email ? (
                                <a
                                  href={`mailto:${a.email}`}
                                  className="text-purple-400 hover:text-purple-300 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {a.email}
                                </a>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-4 py-2 text-slate-300">
                              {a.phone ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Show all / Show less toggle */}
      {needsTruncation && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 text-sm font-medium text-purple-400 transition-colors hover:text-purple-300"
        >
          {showAll
            ? "Show fewer firms"
            : `Show all ${firms.length} firms`}
        </button>
      )}
    </section>
  );
}
