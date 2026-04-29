"use client";

import { useState, useMemo, useCallback } from "react";
import {
  BarChart3,
  Search,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export interface InjuryRow {
  county: string;
  year: number;
  fatal: number;
  seriousInjury: number;
  minorInjury: number;
  possibleInjury: number;
  noInjury: number;
  unknown: number;
  total: number;
}

type SortableKey = keyof Pick<
  InjuryRow,
  "county" | "fatal" | "seriousInjury" | "minorInjury" | "possibleInjury" | "total"
>;

export interface StateInjuryTableProps {
  data: InjuryRow[];
  years: number[];
  latestCompleteYear: number;
  partialYearLabels?: Record<number, string>;
  stateName: string;
  statewideSentinel?: string;
  sourceLabel?: string;
  sourceUrl?: string;
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return "\u2014";
  return n.toLocaleString();
}

export function StateInjuryTable({
  data,
  years,
  latestCompleteYear,
  partialYearLabels,
  stateName,
  statewideSentinel,
  sourceLabel,
  sourceUrl,
}: StateInjuryTableProps) {
  const sentinel = statewideSentinel ?? `${stateName.toUpperCase()} STATEWIDE`;
  const [selectedYear, setSelectedYear] = useState(latestCompleteYear);
  const [sortKey, setSortKey] = useState<SortableKey>("seriousInjury");
  const [sortAsc, setSortAsc] = useState(false);
  const [filter, setFilter] = useState("");

  const handleSort = useCallback(
    (key: SortableKey) => {
      if (sortKey === key) {
        setSortAsc(!sortAsc);
      } else {
        setSortKey(key);
        setSortAsc(key === "county");
      }
    },
    [sortKey, sortAsc]
  );

  const yearData = useMemo(
    () => data.filter((r) => r.year === selectedYear),
    [data, selectedYear]
  );

  const statewideRow = useMemo(
    () => yearData.find((r) => r.county === sentinel) ?? null,
    [yearData, sentinel]
  );

  const countyRows = useMemo(
    () => yearData.filter((r) => r.county !== sentinel),
    [yearData, sentinel]
  );

  const top10 = useMemo(() => {
    const stateTotal = statewideRow?.seriousInjury ?? 1;
    return [...countyRows]
      .sort((a, b) => b.seriousInjury - a.seriousInjury)
      .slice(0, 10)
      .map((r) => ({
        county: r.county,
        seriousInjury: r.seriousInjury,
        pct: ((r.seriousInjury / stateTotal) * 100).toFixed(1),
      }));
  }, [countyRows, statewideRow]);

  const filteredData = useMemo(() => {
    let rows = [...countyRows];
    if (filter.trim()) {
      const f = filter.toLowerCase();
      rows = rows.filter((r) => r.county.toLowerCase().includes(f));
    }
    rows.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortAsc
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
    return rows;
  }, [countyRows, filter, sortKey, sortAsc]);

  if (data.length === 0) return null;

  const partialLabel = partialYearLabels?.[selectedYear];
  const yearLabel = partialLabel
    ? `${selectedYear} ${partialLabel}`
    : String(selectedYear);

  return (
    <div className="rounded-lg border-2 border-intelligence-teal/30 bg-gradient-to-br from-intelligence-teal/[0.06] to-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 className="w-4.5 h-4.5 text-intelligence-teal" />
        <h2 className="font-heading text-2xl font-bold text-midnight-navy">
          Counties Ranked by Serious Injuries
        </h2>
      </div>
      <p className="mb-4 text-sm text-slate-gray max-w-3xl">
        Suspected Serious Injury counts by county from the {stateName}{" "}
        Department of Safety &amp; Homeland Security crash data. Select a year
        to view the top-10 chart and full county table.
      </p>

      {/* Year selector */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
          Year:
        </span>
        {years.map((y) => {
          const label = partialYearLabels?.[y]
            ? `${y} ${partialYearLabels[y]}`
            : String(y);
          return (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedYear === y
                  ? "bg-intelligence-teal text-white shadow-sm"
                  : "bg-white text-midnight-navy/70 border border-cloud hover:bg-cloud/60"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {partialLabel && selectedYear !== latestCompleteYear && (
        <div className="mb-4 rounded-md border-l-4 border-amber-500 bg-amber-50 px-4 py-2">
          <p className="text-xs text-midnight-navy/80">
            {selectedYear} data is preliminary {partialLabel}. Use{" "}
            {latestCompleteYear} for the latest complete-year comparison.
          </p>
        </div>
      )}

      {/* Top-10 horizontal bar chart */}
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-bold text-midnight-navy">
          Top 10 Counties by Serious Injury ({yearLabel})
        </h3>
        <ResponsiveContainer width="100%" height={340}>
          <BarChart
            data={top10}
            layout="vertical"
            margin={{ top: 0, right: 60, bottom: 0, left: 0 }}
          >
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="county"
              width={100}
              tick={{ fontSize: 11, fill: "#1B2A4A" }}
            />
            <Tooltip
              contentStyle={{ fontSize: 12 }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, _name: any, props: any) => [
                `${Number(value).toLocaleString()} (${props.payload.pct}% of statewide)`,
                "Serious Injuries",
              ]}
            />
            <Bar dataKey="seriousInjury" radius={[0, 4, 4, 0]}>
              {top10.map((_entry, index) => (
                <Cell key={index} fill={index === 0 ? "#0F766E" : "#14B8A6"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Sortable searchable table */}
      <h3 className="mb-2 text-sm font-bold text-midnight-navy">
        All Counties ({yearLabel})
      </h3>
      <div className="mb-3 flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-gray" />
        <input
          type="text"
          placeholder="Search county..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-md border border-cloud bg-white px-3 py-1.5 text-sm text-midnight-navy placeholder:text-slate-gray/60 focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-gradient-to-br from-intelligence-teal/[0.06] to-white">
            <tr className="border-b border-cloud">
              {([
                { key: "county" as const, label: "County" },
                { key: "fatal" as const, label: "Fatal" },
                { key: "seriousInjury" as const, label: "Serious Injury" },
                { key: "minorInjury" as const, label: "Minor Injury" },
                { key: "possibleInjury" as const, label: "Possible Injury" },
                { key: "total" as const, label: "Total" },
              ] as { key: SortableKey; label: string }[]).map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="cursor-pointer whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-gray hover:text-midnight-navy"
                >
                  {col.label}
                  {sortKey === col.key &&
                    (sortAsc ? (
                      <ChevronUp className="w-3 h-3 inline ml-0.5" />
                    ) : (
                      <ChevronDown className="w-3 h-3 inline ml-0.5" />
                    ))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {statewideRow && (
              <tr className="border-b-2 border-intelligence-teal/30 bg-intelligence-teal/[0.08] font-semibold">
                <td className="py-2.5 px-3 text-midnight-navy">
                  {statewideRow.county}
                </td>
                <td className="py-2.5 px-3 text-midnight-navy">
                  {fmtNum(statewideRow.fatal)}
                </td>
                <td className="py-2.5 px-3 text-intelligence-teal">
                  {fmtNum(statewideRow.seriousInjury)}
                </td>
                <td className="py-2.5 px-3 text-midnight-navy">
                  {fmtNum(statewideRow.minorInjury)}
                </td>
                <td className="py-2.5 px-3 text-midnight-navy">
                  {fmtNum(statewideRow.possibleInjury)}
                </td>
                <td className="py-2.5 px-3 text-midnight-navy">
                  {fmtNum(statewideRow.total)}
                </td>
              </tr>
            )}
            {filteredData.map((row) => (
              <tr
                key={row.county}
                className="border-b border-cloud/60 hover:bg-cloud/30 transition-colors"
              >
                <td className="py-2.5 px-3 font-medium text-midnight-navy">
                  {row.county}
                </td>
                <td className="py-2.5 px-3 text-midnight-navy/80">
                  {fmtNum(row.fatal)}
                </td>
                <td className="py-2.5 px-3 font-semibold text-intelligence-teal">
                  {fmtNum(row.seriousInjury)}
                </td>
                <td className="py-2.5 px-3 text-midnight-navy/80">
                  {fmtNum(row.minorInjury)}
                </td>
                <td className="py-2.5 px-3 text-midnight-navy/80">
                  {fmtNum(row.possibleInjury)}
                </td>
                <td className="py-2.5 px-3 text-midnight-navy/80">
                  {fmtNum(row.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Source attribution */}
      {sourceLabel && (
        <div className="mt-4 space-y-1">
          <p className="text-[11px] text-slate-gray">
            Source:{" "}
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-intelligence-teal"
              >
                {sourceLabel}
              </a>
            ) : (
              sourceLabel
            )}
          </p>
          <p className="text-[11px] text-slate-gray/80">
            Suspected Serious Injury follows the federal MMUCC standard for
            incapacitating injuries &mdash; the metric most relevant to
            plaintiff PI case acquisition.
          </p>
        </div>
      )}
    </div>
  );
}
