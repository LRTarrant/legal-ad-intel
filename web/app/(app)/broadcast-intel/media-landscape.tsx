"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  Building2,
  ChevronLeft,
  Loader2,
  Monitor,
  Radio,
  Search,
  Tv,
  X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MediaOutlet {
  id: string;
  call_sign: string;
  media_company: string;
  media_type: string;
  media_category: string;
  media_format: string;
  format_genre: string | null;
  market: string;
}

interface MarketSummary {
  market: string;
  total_outlets: number;
  radio_count: number;
  tv_count: number;
  cable_count: number;
  company_count: number;
}

interface CompanyRow {
  name: string;
  outletCount: number;
  types: string[];
  genres: string[];
}

type OutletSortField = "call_sign" | "media_company" | "media_type" | "format_genre";
type SortDir = "asc" | "desc";
type TypeFilter = "all" | "radio" | "tv" | "cable";

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function MediaLandscape() {
  /* ---- Markets list ---- */
  const [markets, setMarkets] = useState<{ name: string; count: number }[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const [marketSearch, setMarketSearch] = useState("");

  /* ---- Selected market ---- */
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);
  const [summary, setSummary] = useState<MarketSummary | null>(null);
  const [outlets, setOutlets] = useState<MediaOutlet[]>([]);
  const [marketLoading, setMarketLoading] = useState(false);

  /* ---- Outlet directory ---- */
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [outletSearch, setOutletSearch] = useState("");
  const [sortField, setSortField] = useState<OutletSortField>("call_sign");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  /* ---- Company deep dive ---- */
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [companyOutlets, setCompanyOutlets] = useState<MediaOutlet[]>([]);
  const [companyMarkets, setCompanyMarkets] = useState<string[]>([]);
  const [companyLoading, setCompanyLoading] = useState(false);

  /* ---------------------------------------------------------------- */
  /*  Fetch all markets with outlet counts (on mount)                  */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setMarketsLoading(true);
      try {
        const res = await fetch("/api/broadcast/media-outlets");
        if (!res.ok) return;
        const data = await res.json();
        const allOutlets: MediaOutlet[] = data.outlets ?? [];
        const map = new Map<string, number>();
        for (const o of allOutlets) {
          map.set(o.market, (map.get(o.market) ?? 0) + 1);
        }
        const list = Array.from(map.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => a.name.localeCompare(b.name));
        if (!cancelled) setMarkets(list);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setMarketsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Fetch market detail when selected                                */
  /* ---------------------------------------------------------------- */
  const fetchMarketDetail = useCallback(async (market: string) => {
    setMarketLoading(true);
    setSelectedCompany(null);
    try {
      const [summaryRes, outletsRes] = await Promise.allSettled([
        fetch(
          `/api/broadcast/media-outlets?summary=true&market=${encodeURIComponent(market)}`,
        ),
        fetch(
          `/api/broadcast/media-outlets?market=${encodeURIComponent(market)}`,
        ),
      ]);

      if (summaryRes.status === "fulfilled" && summaryRes.value.ok) {
        const s = await summaryRes.value.json();
        setSummary(s);
      }
      if (outletsRes.status === "fulfilled" && outletsRes.value.ok) {
        const d = await outletsRes.value.json();
        setOutlets(d.outlets ?? []);
      }
    } catch {
      // ignore
    } finally {
      setMarketLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedMarket) {
      fetchMarketDetail(selectedMarket);
    }
  }, [selectedMarket, fetchMarketDetail]);

  /* ---------------------------------------------------------------- */
  /*  Company deep-dive                                                */
  /* ---------------------------------------------------------------- */
  const openCompanyDetail = useCallback(
    async (companyName: string) => {
      setSelectedCompany(companyName);
      setCompanyLoading(true);
      try {
        const res = await fetch(
          `/api/broadcast/media-outlets?company=${encodeURIComponent(companyName)}`,
        );
        if (res.ok) {
          const data = await res.json();
          const all: MediaOutlet[] = data.outlets ?? [];
          setCompanyOutlets(all);
          const mktSet = new Set<string>();
          for (const o of all) mktSet.add(o.market);
          setCompanyMarkets(Array.from(mktSet).sort());
        }
      } catch {
        // ignore
      } finally {
        setCompanyLoading(false);
      }
    },
    [],
  );

  /* ---------------------------------------------------------------- */
  /*  Derived data                                                     */
  /* ---------------------------------------------------------------- */
  const filteredMarkets = useMemo(() => {
    if (!marketSearch) return markets;
    const q = marketSearch.toLowerCase();
    return markets.filter((m) => m.name.toLowerCase().includes(q));
  }, [markets, marketSearch]);

  const companies = useMemo(() => {
    const map = new Map<
      string,
      { count: number; types: Set<string>; genres: Set<string> }
    >();
    for (const o of outlets) {
      const entry = map.get(o.media_company) ?? {
        count: 0,
        types: new Set<string>(),
        genres: new Set<string>(),
      };
      entry.count += 1;
      entry.types.add(o.media_type);
      if (o.format_genre) entry.genres.add(o.format_genre);
      map.set(o.media_company, entry);
    }
    const rows: CompanyRow[] = Array.from(map.entries()).map(
      ([name, data]) => ({
        name,
        outletCount: data.count,
        types: Array.from(data.types).sort(),
        genres: Array.from(data.genres).sort(),
      }),
    );
    rows.sort((a, b) => b.outletCount - a.outletCount);
    return rows;
  }, [outlets]);

  const filteredOutlets = useMemo(() => {
    let result = outlets;
    if (typeFilter !== "all") {
      const typeMap: Record<string, string> = {
        radio: "Broadcast Radio",
        tv: "Broadcast TV",
        cable: "Cable TV",
      };
      result = result.filter((o) => o.media_type === typeMap[typeFilter]);
    }
    if (outletSearch) {
      const q = outletSearch.toLowerCase();
      result = result.filter(
        (o) =>
          o.call_sign.toLowerCase().includes(q) ||
          o.media_company.toLowerCase().includes(q) ||
          o.format_genre?.toLowerCase().includes(q),
      );
    }
    result = [...result].sort((a, b) => {
      const aVal = (a[sortField] ?? "").toLowerCase();
      const bVal = (b[sortField] ?? "").toLowerCase();
      const cmp = aVal.localeCompare(bVal);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [outlets, typeFilter, outletSearch, sortField, sortDir]);

  /* --- Company deep dive: genre distribution --- */
  const companyGenreDistribution = useMemo(() => {
    if (!selectedCompany) return [];
    const inMarket = companyOutlets.filter(
      (o) => o.market === selectedMarket,
    );
    const map = new Map<string, number>();
    for (const o of inMarket) {
      const g = o.format_genre ?? "Unknown";
      map.set(g, (map.get(g) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count);
  }, [selectedCompany, companyOutlets, selectedMarket]);

  const companyOutletsInMarket = useMemo(() => {
    if (!selectedCompany || !selectedMarket) return [];
    return companyOutlets.filter((o) => o.market === selectedMarket);
  }, [selectedCompany, selectedMarket, companyOutlets]);

  /* ---------------------------------------------------------------- */
  /*  Sorting handler                                                  */
  /* ---------------------------------------------------------------- */
  function handleSort(field: OutletSortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Company deep dive view                                           */
  /* ---------------------------------------------------------------- */
  if (selectedCompany) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedCompany(null)}
          className="flex items-center gap-1 text-sm text-intelligence-teal hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to {selectedMarket}
        </button>

        <div>
          <h3 className="text-lg font-semibold text-midnight-navy">
            {selectedCompany}
          </h3>
          <p className="text-sm text-slate-gray">
            Company deep dive &mdash; {selectedMarket}
          </p>
        </div>

        {companyLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-intelligence-teal" />
          </div>
        ) : (
          <>
            {/* Outlets in this market */}
            <div className="rounded-lg bg-white p-5 shadow-sm">
              <h4 className="text-sm font-semibold text-midnight-navy mb-3">
                Outlets in {selectedMarket} ({companyOutletsInMarket.length})
              </h4>
              {companyOutletsInMarket.length === 0 ? (
                <p className="text-sm text-slate-gray">No outlets found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-4 py-2 text-left font-medium text-slate-gray">
                          Call Sign
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-slate-gray">
                          Type
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-slate-gray">
                          Format / Genre
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {companyOutletsInMarket.map((o) => (
                        <tr
                          key={o.id}
                          className="border-b border-gray-50 hover:bg-gray-50/50"
                        >
                          <td className="px-4 py-2 font-medium text-midnight-navy">
                            {o.call_sign}
                          </td>
                          <td className="px-4 py-2">
                            <TypeBadge type={o.media_type} />
                          </td>
                          <td className="px-4 py-2 text-slate-gray">
                            {o.format_genre ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Genre distribution */}
            {companyGenreDistribution.length > 0 && (
              <div className="rounded-lg bg-white p-5 shadow-sm">
                <h4 className="text-sm font-semibold text-midnight-navy mb-3">
                  Genre / Format Distribution
                </h4>
                <div className="space-y-2">
                  {companyGenreDistribution.map((g) => (
                    <div
                      key={g.genre}
                      className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0"
                    >
                      <span className="text-sm text-midnight-navy">
                        {g.genre}
                      </span>
                      <span className="text-xs text-slate-gray">
                        {g.count} outlet{g.count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All markets for this company */}
            <div className="rounded-lg bg-white p-5 shadow-sm">
              <h4 className="text-sm font-semibold text-midnight-navy mb-3">
                All Markets ({companyMarkets.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {companyMarkets.map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setSelectedMarket(m);
                      setSelectedCompany(null);
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      m === selectedMarket
                        ? "bg-intelligence-teal text-white"
                        : "bg-gray-100 text-midnight-navy hover:bg-gray-200"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Market not yet selected — show market selector                   */
  /* ---------------------------------------------------------------- */
  if (!selectedMarket) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-gray">
          Select a market to explore its media landscape — radio stations, TV
          broadcasters, cable channels, and the companies that own them.
        </p>

        {marketsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-intelligence-teal" />
          </div>
        ) : (
          <>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-gray/50" />
              <input
                type="text"
                value={marketSearch}
                onChange={(e) => setMarketSearch(e.target.value)}
                placeholder="Search markets..."
                className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm text-midnight-navy focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filteredMarkets.map((m) => (
                <button
                  key={m.name}
                  onClick={() => setSelectedMarket(m.name)}
                  className="flex items-center justify-between rounded-lg bg-white px-4 py-3 text-left shadow-sm hover:shadow-md transition-shadow"
                >
                  <span className="text-sm font-medium text-midnight-navy truncate">
                    {m.name}
                  </span>
                  <span className="ml-3 shrink-0 rounded-full bg-intelligence-teal/10 px-2.5 py-0.5 text-xs font-semibold text-intelligence-teal">
                    {m.count}
                  </span>
                </button>
              ))}
            </div>

            {filteredMarkets.length === 0 && (
              <div className="rounded-lg bg-white p-8 text-center shadow-sm">
                <Search className="mx-auto h-10 w-10 text-slate-gray/40" />
                <p className="mt-3 text-sm text-slate-gray">
                  No markets found matching &ldquo;{marketSearch}&rdquo;.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Market selected — show full landscape view                       */
  /* ---------------------------------------------------------------- */
  return (
    <div className="space-y-6">
      {/* Market header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            setSelectedMarket(null);
            setSummary(null);
            setOutlets([]);
            setTypeFilter("all");
            setOutletSearch("");
          }}
          className="flex items-center gap-1 text-sm text-intelligence-teal hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          All Markets
        </button>
        <h3 className="text-lg font-semibold text-midnight-navy">
          {selectedMarket}
        </h3>
      </div>

      {marketLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-intelligence-teal" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          {summary && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <SummaryStatCard
                label="Total Outlets"
                value={summary.total_outlets}
                Icon={Building2}
              />
              <SummaryStatCard
                label="Radio Stations"
                value={summary.radio_count}
                Icon={Radio}
              />
              <SummaryStatCard
                label="TV Stations"
                value={summary.tv_count}
                Icon={Tv}
              />
              <SummaryStatCard
                label="Cable Channels"
                value={summary.cable_count}
                Icon={Monitor}
              />
              <SummaryStatCard
                label="Parent Companies"
                value={summary.company_count}
                Icon={Building2}
              />
            </div>
          )}

          {/* Media Companies table */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <Building2 className="h-5 w-5 text-intelligence-teal" />
              <h4 className="text-base font-semibold text-midnight-navy">
                Media Companies
              </h4>
              <span className="text-sm text-slate-gray">
                {companies.length} compan{companies.length !== 1 ? "ies" : "y"}
              </span>
            </div>

            {companies.length === 0 ? (
              <div className="rounded-lg bg-white p-8 text-center shadow-sm">
                <Building2 className="mx-auto h-10 w-10 text-slate-gray/40" />
                <p className="mt-3 text-sm text-slate-gray">
                  No media companies found in this market.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-3 text-left font-medium text-slate-gray">
                        Company
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-slate-gray">
                        <button
                          onClick={() => {
                            /* Companies already sorted by count desc. Toggle here would be nice but we keep it simple */
                          }}
                          className="flex items-center gap-1"
                        >
                          Outlets
                          <ArrowUpDown className="h-3 w-3 opacity-30" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-slate-gray">
                        Types
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-slate-gray">
                        Genres
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((c) => (
                      <tr
                        key={c.name}
                        onClick={() => openCompanyDetail(c.name)}
                        className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-midnight-navy">
                          {c.name}
                        </td>
                        <td className="px-4 py-3 text-midnight-navy font-semibold">
                          {c.outletCount}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {c.types.map((t) => (
                              <TypeBadge key={t} type={t} />
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-gray text-xs max-w-64 truncate">
                          {c.genres.join(", ") || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Outlet Directory */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <Radio className="h-5 w-5 text-intelligence-teal" />
              <h4 className="text-base font-semibold text-midnight-navy">
                Outlet Directory
              </h4>
              <span className="text-sm text-slate-gray">
                {filteredOutlets.length} outlet
                {filteredOutlets.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Filters row */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex gap-1">
                {(
                  [
                    ["all", "All"],
                    ["radio", "Radio"],
                    ["tv", "TV"],
                    ["cable", "Cable"],
                  ] as [TypeFilter, string][]
                ).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setTypeFilter(val)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      typeFilter === val
                        ? "bg-intelligence-teal text-white"
                        : "bg-gray-100 text-midnight-navy hover:bg-gray-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="relative flex-1 min-w-48 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-gray/50" />
                <input
                  type="text"
                  value={outletSearch}
                  onChange={(e) => setOutletSearch(e.target.value)}
                  placeholder="Search call sign, company, genre..."
                  className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm text-midnight-navy focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
                />
                {outletSearch && (
                  <button
                    onClick={() => setOutletSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="h-3.5 w-3.5 text-slate-gray/50 hover:text-slate-gray" />
                  </button>
                )}
              </div>
            </div>

            {filteredOutlets.length === 0 ? (
              <div className="rounded-lg bg-white p-8 text-center shadow-sm">
                <Radio className="mx-auto h-10 w-10 text-slate-gray/40" />
                <p className="mt-3 text-sm text-slate-gray">
                  No outlets match your filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <OutletSortHeader
                        label="Call Sign"
                        field="call_sign"
                        currentSort={sortField}
                        currentDir={sortDir}
                        onClick={handleSort}
                      />
                      <OutletSortHeader
                        label="Company"
                        field="media_company"
                        currentSort={sortField}
                        currentDir={sortDir}
                        onClick={handleSort}
                      />
                      <OutletSortHeader
                        label="Type"
                        field="media_type"
                        currentSort={sortField}
                        currentDir={sortDir}
                        onClick={handleSort}
                      />
                      <OutletSortHeader
                        label="Format / Genre"
                        field="format_genre"
                        currentSort={sortField}
                        currentDir={sortDir}
                        onClick={handleSort}
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOutlets.map((o) => (
                      <tr
                        key={o.id}
                        className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-midnight-navy">
                          {o.call_sign}
                        </td>
                        <td className="px-4 py-3 text-slate-gray max-w-48 truncate">
                          <button
                            onClick={() => openCompanyDetail(o.media_company)}
                            className="text-intelligence-teal hover:underline text-left"
                          >
                            {o.media_company}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <TypeBadge type={o.media_type} />
                        </td>
                        <td className="px-4 py-3 text-slate-gray">
                          {o.format_genre ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SummaryStatCard({
  label,
  value,
  Icon,
}: {
  label: string;
  value: number;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-intelligence-teal" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-gray">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-midnight-navy">{value}</p>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  let color: string;
  let label: string;
  switch (type) {
    case "Broadcast Radio":
      color = "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20";
      label = "Radio";
      break;
    case "Broadcast TV":
      color = "bg-purple-50 text-purple-700 ring-1 ring-purple-600/20";
      label = "TV";
      break;
    case "Cable TV":
      color = "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20";
      label = "Cable";
      break;
    default:
      color = "bg-gray-50 text-gray-700 ring-1 ring-gray-600/20";
      label = type;
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${color}`}
    >
      {label}
    </span>
  );
}

function OutletSortHeader({
  label,
  field,
  currentSort,
  currentDir,
  onClick,
}: {
  label: string;
  field: OutletSortField;
  currentSort: OutletSortField;
  currentDir: SortDir;
  onClick: (field: OutletSortField) => void;
}) {
  const isActive = currentSort === field;
  return (
    <th className="px-4 py-3 text-left">
      <button
        onClick={() => onClick(field)}
        className="flex items-center gap-1 font-medium text-slate-gray hover:text-midnight-navy transition-colors"
      >
        {label}
        <ArrowUpDown
          className={`h-3 w-3 ${isActive ? "text-intelligence-teal" : "opacity-30"}`}
        />
        {isActive && (
          <span className="text-[10px] text-intelligence-teal">
            {currentDir === "asc" ? "\u2191" : "\u2193"}
          </span>
        )}
      </button>
    </th>
  );
}
