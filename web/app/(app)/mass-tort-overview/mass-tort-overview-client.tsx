"use client";

import { useState } from "react";
import Link from "next/link";

type AnnotatedDevelopment = {
  id: string;
  mdl_number: number;
  title: string;
  summary: string | null;
  source_name: string | null;
  source_url: string | null;
  event_date: string;
  event_type: string;
  created_at: string | null;
  tortName: string;
  tortHref: string;
};

type TortFilter = {
  mdlNumber: number;
  name: string;
};

type MdlSummary = {
  mdlNumber: number;
  name: string;
  href: string;
  count: number;
  latestEventType: string;
};

const EVENT_TYPE_COLORS: Record<
  string,
  { bg: string; text: string; dot: string; label: string }
> = {
  ruling: { bg: "#EFF6FF", text: "#2563EB", dot: "#2563EB", label: "Ruling" },
  verdict: {
    bg: "#F0FDF4",
    text: "#16A34A",
    dot: "#16A34A",
    label: "Verdict",
  },
  settlement: {
    bg: "#FFFBEB",
    text: "#D97706",
    dot: "#D97706",
    label: "Settlement",
  },
  "bellwether trial": {
    bg: "#FAF5FF",
    text: "#7C3AED",
    dot: "#7C3AED",
    label: "Bellwether Trial",
  },
  filing: { bg: "#F9FAFB", text: "#6B7280", dot: "#6B7280", label: "Filing" },
  regulatory: {
    bg: "#FFF1F2",
    text: "#E11D48",
    dot: "#E11D48",
    label: "Regulatory",
  },
};

const DEFAULT_EVENT_COLOR = {
  bg: "#F1F5F9",
  text: "#6B7280",
  dot: "#6B7280",
  label: "Event",
};

function getEventColor(eventType: string) {
  return EVENT_TYPE_COLORS[eventType] ?? DEFAULT_EVENT_COLOR;
}

function formatEventDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  return `${monthNames[m - 1]} ${d}, ${year}`;
}

function groupByDate(
  developments: AnnotatedDevelopment[]
): { date: string; formattedDate: string; items: AnnotatedDevelopment[] }[] {
  const groups = new Map<string, AnnotatedDevelopment[]>();
  for (const dev of developments) {
    const existing = groups.get(dev.event_date);
    if (existing) {
      existing.push(dev);
    } else {
      groups.set(dev.event_date, [dev]);
    }
  }
  return Array.from(groups.entries()).map(([date, items]) => ({
    date,
    formattedDate: formatEventDate(date),
    items,
  }));
}

export function MassTortOverviewClient({
  developments,
  tortFilters,
  mdlSummaries,
}: {
  developments: AnnotatedDevelopment[];
  tortFilters: TortFilter[];
  mdlSummaries: MdlSummary[];
}) {
  const [selectedMdl, setSelectedMdl] = useState<number | null>(null);

  const filtered = selectedMdl
    ? developments.filter((d) => d.mdl_number === selectedMdl)
    : developments;

  const dateGroups = groupByDate(filtered);

  return (
    <>
      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedMdl(null)}
          className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
            selectedMdl === null
              ? "border-intelligence-teal bg-intelligence-teal text-white"
              : "border-slate-200 bg-white text-slate-600 hover:border-intelligence-teal hover:text-intelligence-teal"
          }`}
        >
          All
        </button>
        {tortFilters.map((tf) => (
          <button
            key={tf.mdlNumber}
            onClick={() => setSelectedMdl(tf.mdlNumber)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              selectedMdl === tf.mdlNumber
                ? "border-intelligence-teal bg-intelligence-teal text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-intelligence-teal hover:text-intelligence-teal"
            }`}
          >
            {tf.name}
          </button>
        ))}
      </div>

      {/* Development Timeline */}
      <section className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-midnight-navy">
          Development Timeline
        </h2>

        {filtered.length === 0 ? (
          <p className="mt-4 text-sm text-slate-gray">
            No developments found.
          </p>
        ) : (
          <div className="mt-6 space-y-6">
            {dateGroups.map((group) => (
              <div key={group.date}>
                {/* Date header with horizontal rules */}
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex-1 border-t border-slate-200" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {group.formattedDate}
                  </span>
                  <div className="flex-1 border-t border-slate-200" />
                </div>

                {/* Timeline items for this date */}
                <div className="border-l-2 border-slate-200 pl-4">
                  {group.items.map((dev, i) => {
                    const color = getEventColor(dev.event_type);
                    const isLast = i === group.items.length - 1;
                    return (
                      <div
                        key={dev.id}
                        className={`relative ${isLast ? "" : "pb-6"}`}
                      >
                        {/* Timeline dot */}
                        <span
                          className="absolute left-[-21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white"
                          style={{ backgroundColor: color.dot }}
                        />

                        {/* Badges row */}
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Event type badge */}
                          <span
                            className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor: color.bg,
                              color: color.text,
                            }}
                          >
                            {color.label}
                          </span>

                          {/* Tort name pill */}
                          <Link
                            href={dev.tortHref}
                            className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
                          >
                            {dev.tortName}
                          </Link>
                        </div>

                        {/* Title */}
                        <p className="mt-1.5 text-base font-semibold text-midnight-navy">
                          {dev.title}
                        </p>

                        {/* Summary */}
                        {dev.summary && (
                          <p className="mt-1 line-clamp-3 text-sm text-slate-600">
                            {dev.summary}
                          </p>
                        )}

                        {/* Source link */}
                        {dev.source_url && dev.source_name && (
                          <a
                            href={dev.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1.5 inline-block text-xs font-medium text-intelligence-teal hover:underline"
                          >
                            {dev.source_name} ↗
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Active MDLs Quick Reference */}
      <section>
        <h2 className="font-heading text-lg font-semibold text-midnight-navy">
          Active MDLs Quick Reference
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mdlSummaries.map((mdl) => {
            const color = getEventColor(mdl.latestEventType);
            return (
              <div
                key={mdl.mdlNumber}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <h3 className="font-semibold text-midnight-navy">
                  {mdl.name}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  MDL {mdl.mdlNumber}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-sm text-slate-600">
                    {mdl.count} development{mdl.count !== 1 ? "s" : ""}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: color.bg,
                      color: color.text,
                    }}
                  >
                    {color.label}
                  </span>
                </div>
                <Link
                  href={`/mdl-tracker/${mdl.mdlNumber}`}
                  className="mt-3 inline-block text-sm font-medium text-intelligence-teal hover:underline"
                >
                  View MDL →
                </Link>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
