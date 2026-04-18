"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  Building2,
  Loader2,
  Radio,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";

interface Station {
  id: string;
  facility_id: string;
  call_sign: string;
  service_type: string;
  rf_channel: string | null;
  virtual_channel: string | null;
  community_city: string;
  community_state: string;
  nielsen_dma: string | null;
  network_affil: string | null;
  party_name: string | null;
  party_phone: string | null;
  party_email: string | null;
  status: string | null;
  license_expiration: string | null;
}

interface TortActivity {
  tort_id: string;
  ad_count: number;
  advertiser_count: number;
  estimated_spend: number;
}

interface MarketIntel {
  state: string;
  stations: Station[];
  station_count: number;
  legal_ad_activity: {
    total_ad_events: number;
    unique_advertisers: number;
    tort_breakdown: TortActivity[];
    data_available: boolean;
  };
  pitch_summary: {
    state: string;
    message: string;
  };
}

type SortField = "call_sign" | "network_affil" | "party_name" | "community_city" | "status";
type SortDir = "asc" | "desc";

const STATE_OPTIONS = [
  { code: "AL", name: "Alabama" },
  { code: "AZ", name: "Arizona" },
  { code: "CA", name: "California" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "NY", name: "New York" },
  { code: "OH", name: "Ohio" },
  { code: "PA", name: "Pennsylvania" },
  { code: "TX", name: "Texas" },
];

export function BroadcastIntelClient() {
  const [selectedState, setSelectedState] = useState("FL");
  const [intel, setIntel] = useState<MarketIntel | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [networkFilter, setNetworkFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("call_sign");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const fetchIntel = useCallback(async (state: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/broadcast/market-intel?state=${state}`);
      if (res.ok) {
        const data: MarketIntel = await res.json();
        setIntel(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedState) {
      fetchIntel(selectedState);
    }
  }, [selectedState, fetchIntel]);

  async function handleSync() {
    setSyncing(true);
    setSyncMessage("");
    try {
      const res = await fetch("/api/broadcast/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: selectedState }),
      });
      const data = await res.json();
      if (res.ok) {
        setSyncMessage(`Synced ${data.synced} stations from FCC`);
        await fetchIntel(selectedState);
      } else {
        setSyncMessage(data.error || "Sync failed");
      }
    } catch {
      setSyncMessage("Sync failed — check connection");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(""), 5000);
    }
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const networks = useMemo(() => {
    if (!intel?.stations) return [];
    const set = new Set<string>();
    for (const s of intel.stations) {
      if (s.network_affil) set.add(s.network_affil);
    }
    return Array.from(set).sort();
  }, [intel?.stations]);

  const serviceTypes = useMemo(() => {
    if (!intel?.stations) return [];
    const set = new Set<string>();
    for (const s of intel.stations) {
      if (s.service_type) set.add(s.service_type);
    }
    return Array.from(set).sort();
  }, [intel?.stations]);

  const filteredStations = useMemo(() => {
    if (!intel?.stations) return [];
    let stations = intel.stations;

    if (networkFilter) {
      stations = stations.filter((s) => s.network_affil === networkFilter);
    }
    if (serviceFilter) {
      stations = stations.filter((s) => s.service_type === serviceFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      stations = stations.filter(
        (s) =>
          s.call_sign.toLowerCase().includes(q) ||
          s.party_name?.toLowerCase().includes(q) ||
          s.community_city.toLowerCase().includes(q) ||
          s.nielsen_dma?.toLowerCase().includes(q),
      );
    }

    stations.sort((a, b) => {
      const aVal = (a[sortField] ?? "").toLowerCase();
      const bVal = (b[sortField] ?? "").toLowerCase();
      const cmp = aVal.localeCompare(bVal);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return stations;
  }, [intel?.stations, networkFilter, serviceFilter, searchQuery, sortField, sortDir]);

  return (
    <div className="mt-6 space-y-8">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-gray mb-1">
            State
          </label>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-midnight-navy focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
          >
            {STATE_OPTIONS.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 rounded-md bg-intelligence-teal px-4 py-2 text-sm font-medium text-white hover:bg-intelligence-teal/90 transition-colors disabled:opacity-50"
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {syncing ? "Syncing..." : "Sync Stations"}
          </button>
          {syncMessage && (
            <span className="text-sm text-slate-gray">{syncMessage}</span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-intelligence-teal" />
        </div>
      ) : intel ? (
        <>
          {/* Section 1: Station Directory */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Radio className="h-5 w-5 text-intelligence-teal" />
              <h2 className="text-xl font-semibold text-midnight-navy">
                Station Directory
              </h2>
              <span className="text-sm text-slate-gray">
                {filteredStations.length} station
                {filteredStations.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="relative flex-1 min-w-48 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-gray/50" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search call sign, owner, city..."
                  className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm text-midnight-navy focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
                />
              </div>
              <select
                value={networkFilter}
                onChange={(e) => setNetworkFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-midnight-navy focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
              >
                <option value="">All Networks</option>
                {networks.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-midnight-navy focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
              >
                <option value="">All Service Types</option>
                {serviceTypes.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {filteredStations.length === 0 ? (
              <div className="rounded-lg bg-white p-8 text-center shadow-sm">
                <Radio className="mx-auto h-10 w-10 text-slate-gray/40" />
                <p className="mt-3 text-sm text-slate-gray">
                  No stations found. Click &ldquo;Sync Stations&rdquo; to fetch
                  station data from the FCC for{" "}
                  {STATE_OPTIONS.find((s) => s.code === selectedState)?.name ??
                    selectedState}
                  .
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <SortHeader
                        label="Call Sign"
                        field="call_sign"
                        currentSort={sortField}
                        currentDir={sortDir}
                        onClick={handleSort}
                      />
                      <SortHeader
                        label="Network"
                        field="network_affil"
                        currentSort={sortField}
                        currentDir={sortDir}
                        onClick={handleSort}
                      />
                      <SortHeader
                        label="Owner"
                        field="party_name"
                        currentSort={sortField}
                        currentDir={sortDir}
                        onClick={handleSort}
                      />
                      <SortHeader
                        label="City"
                        field="community_city"
                        currentSort={sortField}
                        currentDir={sortDir}
                        onClick={handleSort}
                      />
                      <th className="px-4 py-3 text-left font-medium text-slate-gray">
                        Phone
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-slate-gray">
                        Email
                      </th>
                      <SortHeader
                        label="Status"
                        field="status"
                        currentSort={sortField}
                        currentDir={sortDir}
                        onClick={handleSort}
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStations.map((station) => (
                      <tr
                        key={station.id}
                        className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-midnight-navy">
                          {station.call_sign}
                        </td>
                        <td className="px-4 py-3 text-slate-gray">
                          {station.network_affil || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-gray max-w-48 truncate">
                          {station.party_name || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-gray">
                          {station.community_city}
                        </td>
                        <td className="px-4 py-3 text-slate-gray">
                          {station.party_phone ? formatPhone(station.party_phone) : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-gray max-w-48 truncate">
                          {station.party_email ? (
                            <a
                              href={`mailto:${station.party_email}`}
                              className="text-intelligence-teal hover:underline"
                            >
                              {station.party_email}
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={station.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Section 2: Legal Ad Activity */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="h-5 w-5 text-intelligence-teal" />
              <h2 className="text-xl font-semibold text-midnight-navy">
                Legal Ad Activity
              </h2>
            </div>

            {intel.legal_ad_activity.data_available ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <SummaryCard
                    label="Active Torts Being Advertised"
                    value={intel.legal_ad_activity.tort_breakdown.length}
                    Icon={Radio}
                  />
                  <SummaryCard
                    label="Law Firms Running Digital Ads"
                    value={intel.legal_ad_activity.unique_advertisers}
                    Icon={Users}
                  />
                  <SummaryCard
                    label="Total Ad Events (90 days)"
                    value={intel.legal_ad_activity.total_ad_events}
                    Icon={TrendingUp}
                  />
                </div>

                {intel.legal_ad_activity.tort_breakdown.length > 0 && (
                  <div className="rounded-lg bg-white p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-midnight-navy mb-3">
                      Tort Breakdown
                    </h3>
                    <div className="space-y-2">
                      {intel.legal_ad_activity.tort_breakdown
                        .sort((a, b) => b.ad_count - a.ad_count)
                        .map((tort) => (
                          <div
                            key={tort.tort_id}
                            className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0"
                          >
                            <span className="text-sm text-midnight-navy capitalize">
                              {tort.tort_id.replace(/-/g, " ")}
                            </span>
                            <div className="flex items-center gap-4 text-xs text-slate-gray">
                              <span>{tort.ad_count} ads</span>
                              <span>{tort.advertiser_count} firms</span>
                              {tort.estimated_spend > 0 && (
                                <span>
                                  ${(tort.estimated_spend / 1000).toFixed(1)}k
                                  est.
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg bg-white p-8 text-center shadow-sm">
                <TrendingUp className="mx-auto h-10 w-10 text-slate-gray/40" />
                <p className="mt-3 text-sm text-slate-gray">
                  No legal advertising data available for this state yet. Check
                  the tort pages for current advertiser activity.
                </p>
              </div>
            )}
          </section>

          {/* Section 3: Pitch Opportunities */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="h-5 w-5 text-intelligence-teal" />
              <h2 className="text-xl font-semibold text-midnight-navy">
                Pitch Opportunities
              </h2>
            </div>

            <div className="rounded-lg bg-gradient-to-br from-midnight-navy to-midnight-navy/90 p-6 text-white shadow-sm">
              <p className="text-sm leading-relaxed opacity-90">
                {intel.pitch_summary.message}
              </p>
              <p className="mt-4 text-sm leading-relaxed opacity-70">
                Check the individual tort pages for detailed advertiser
                breakdowns and creative insights. Stations in{" "}
                {STATE_OPTIONS.find((s) => s.code === selectedState)?.name ??
                  selectedState}{" "}
                can use this data to identify law firms already investing in
                digital and approach them about broadcast placements.
              </p>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function SortHeader({
  label,
  field,
  currentSort,
  currentDir,
  onClick,
}: {
  label: string;
  field: SortField;
  currentSort: SortField;
  currentDir: SortDir;
  onClick: (field: SortField) => void;
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

function SummaryCard({
  label,
  value,
  Icon,
}: {
  label: string;
  value: number;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <Icon className="h-5 w-5 text-intelligence-teal" />
        <span className="text-xs font-medium uppercase tracking-wider text-slate-gray">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-midnight-navy">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-slate-gray">—</span>;
  const isLicensed = status.toUpperCase() === "LICENSED";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        isLicensed
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
          : "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20"
      }`}
    >
      {status}
    </span>
  );
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}
