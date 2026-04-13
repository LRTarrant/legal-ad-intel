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

  if (collapsed) {
    return (
      <section className="mt-10">
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center gap-2 text-xl font-semibold text-white mb-4 hover:text-slate-300 transition-colors"
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
          {role} Attorneys
          <span className="text-sm font-normal text-slate-400">
            ({attorneys.length})
          </span>
        </button>
      </section>
    );
  }

  const needsTruncation = attorneys.length > VISIBLE_LIMIT;
  const visibleRows = expanded || !needsTruncation ? attorneys : attorneys.slice(0, VISIBLE_LIMIT);

  return (
    <section className="mt-10">
      <button
        onClick={() => setCollapsed(true)}
        className="flex items-center gap-2 text-xl font-semibold text-white mb-4 hover:text-slate-300 transition-colors"
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
        {role} Attorneys
        <span className="text-sm font-normal text-slate-400">
          ({attorneys.length})
        </span>
      </button>

      <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-800 text-left text-xs uppercase tracking-wide text-slate-400">
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
