"use client";

/**
 * DMASelector — fetches DMAs for the selected state and renders a
 * dropdown.
 *
 * - Disabled until a state is selected (DMAs are state-scoped)
 * - Shows full_name in the option label (so users see "Birmingham
 *   (Anniston, Tuscaloosa)") but stores dma_code AND display_name
 *   on the parent so we have what we need for both DB and scripts
 * - Auto-clears when state changes (the previous DMA may not exist
 *   in the new state)
 *
 * Per SPEC §2.6, scripts MUST use display_name (the colloquial single
 * name) and never full_name or dma_code. We pull both back here so
 * the script generator can use display_name while the DB stores
 * dma_code as a foreign key.
 */

import { useEffect, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import type { DMAMarket, ListDMAMarketsResponse } from "@/lib/campaign-builder/types";
import { fetchWithDemoMode } from "@/lib/admin/demo-mode-client";

export interface SelectedDMA {
  dma_code: string;
  display_name: string;
  full_name: string;
}

interface DMASelectorProps {
  state: string | null;
  /** Current selection, or null if none. */
  value: SelectedDMA | null;
  onChange: (next: SelectedDMA | null) => void;
  accentColor: string;
  /** Deep-link default DMA code (e.g. Strategy Engine handoff). Auto-selected
   *  once the state's markets load, only if nothing is selected yet. */
  initialDmaCode?: string;
}

export function DMASelector({
  state,
  value,
  onChange,
  accentColor,
  initialDmaCode,
}: DMASelectorProps) {
  const [markets, setMarkets] = useState<DMAMarket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch DMAs whenever the parent's state selection changes.
  useEffect(() => {
    if (!state) {
      setMarkets([]);
      // Clear any stale selection from a previous state
      if (value !== null) onChange(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchWithDemoMode(`/api/dma-markets?state=${encodeURIComponent(state)}`, {
      credentials: "same-origin",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`DMA fetch failed: ${res.status}`);
        return (await res.json()) as ListDMAMarketsResponse;
      })
      .then((data) => {
        if (cancelled) return;
        setMarkets(data.markets ?? []);
        setLoading(false);
        // If the current selection isn't in the new state's DMA list,
        // clear it so the user has to re-pick.
        if (
          value &&
          !data.markets.some((m) => m.dma_code === value.dma_code)
        ) {
          onChange(null);
        } else if (!value && initialDmaCode) {
          // Pre-select a deep-linked DMA (Strategy Engine handoff), using the
          // fetched market row so full_name is correct.
          const match = (data.markets ?? []).find((m) => m.dma_code === initialDmaCode);
          if (match) {
            onChange({
              dma_code: match.dma_code,
              display_name: match.display_name,
              full_name: match.full_name,
            });
          }
        }
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // We intentionally exclude `value` and `onChange` from deps —
    // we only want to refetch when `state` changes, not when the
    // selection inside it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const handleSelect = (dma_code: string) => {
    if (!dma_code) {
      onChange(null);
      return;
    }
    const market = markets.find((m) => m.dma_code === dma_code);
    if (!market) return;
    onChange({
      dma_code: market.dma_code,
      display_name: market.display_name,
      full_name: market.full_name,
    });
  };

  return (
    <div>
      <label
        htmlFor="dma-select"
        className="block text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1.5"
      >
        DMA / Metro <span className="text-alert">*</span>
      </label>
      <div className="relative">
        <select
          id="dma-select"
          value={value?.dma_code ?? ""}
          onChange={(e) => handleSelect(e.target.value)}
          disabled={!state || loading || markets.length === 0}
          className="w-full appearance-none rounded-md border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm text-midnight-navy disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:ring-1"
          style={{
            ...({ "--tw-ring-color": accentColor } as React.CSSProperties),
          }}
        >
          <option value="" disabled>
            {!state
              ? "Select a state first"
              : loading
                ? "Loading markets…"
                : markets.length === 0
                  ? "No markets available for this state"
                  : "Select a market…"}
          </option>
          {markets.map((m) => (
            <option key={m.dma_code} value={m.dma_code}>
              {m.full_name}
            </option>
          ))}
        </select>
        {loading ? (
          <Loader2
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400"
            aria-hidden="true"
          />
        ) : (
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
            aria-hidden="true"
          />
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-alert">
          Couldn&apos;t load markets: {error}
        </p>
      )}
      {value && (
        <p className="mt-1.5 text-xs text-slate-gray">
          Scripts will reference this market as{" "}
          <strong className="text-midnight-navy">{value.display_name}</strong>
        </p>
      )}
    </div>
  );
}
