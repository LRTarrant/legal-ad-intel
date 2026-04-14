"use client";

import { useState } from "react";
import type { MdlAttorneyRow } from "@/lib/queries/mdl-attorneys";

const VISIBLE_LIMIT = 10;

interface Props {
  attorneys: MdlAttorneyRow[];
  defaultCollapsed?: boolean;
  role: string;
}

export default function AttorneyTable({
  attorneys,
  defaultCollapsed = false,
  role,
}: Props) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [expanded, setExpanded] = useState(false);
  const dedupedRole = role.replace(/\bAttorneys\b\s+\bAttorneys\b/gi, "Attorneys").trim();
  const title = /\bAttorneys\b/i.test(dedupedRole)
    ? dedupedRole
    : `${dedupedRole} Attorneys`;

  if (collapsed) {
    return (
      <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <button
          onClick={() => setCollapsed(false)}
          className="mb-4 flex items-center gap-2 text-xl font-bold text-white transition-colors hover:text-slate-300"
        >
          <svg
            className="h-5 w-5 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          {title}
          <span className="inline-flex min-w-9 items-center justify-center rounded-full bg-zinc-700 px-2 py-0.5 text-sm font-semibold text-white">
            ({attorneys.length})
          </span>
        </button>
      </section>
    );
  }

  const needsTruncation = attorneys.length > VISIBLE_LIMIT;
  const visibleRows = expanded || !needsTruncation ? attorneys : attorneys.slice(0, VISIBLE_LIMIT);

  return (
    <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <button
        onClick={() => setCollapsed(true)}
        className="mb-4 flex items-center gap-2 text-xl font-bold text-white transition-colors hover:text-slate-300"
      >
        <svg
          className="h-5 w-5 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
        {title}
        <span className="inline-flex min-w-9 items-center justify-center rounded-full bg-zinc-700 px-2 py-0.5 text-sm font-semibold text-white">
          ({attorneys.length})
        </span>
      </button>

      <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-400">
              <th className="px-4 py-3">Attorney Name</th>
              <th className="px-4 py-3">Firm</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {visibleRows.map((a) => (
              <tr key={a.id} className="hover:bg-zinc-800/60 transition-colors">
                <td className="px-4 py-3 text-white font-medium">{a.attorney_name}</td>
                <td className="px-4 py-3 text-slate-300">{a.firm_name ?? "—"}</td>
                <td className="px-4 py-3 text-slate-300">
                  {a.email ? (
                    <a
                      href={`mailto:${a.email}`}
                      className="text-purple-400 hover:text-purple-300 hover:underline"
                    >
                      {a.email}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-slate-300">{a.phone ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {needsTruncation && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors"
        >
          {expanded
            ? "Show less"
            : `Show all ${attorneys.length} attorneys`}
        </button>
      )}
    </section>
  );
}
