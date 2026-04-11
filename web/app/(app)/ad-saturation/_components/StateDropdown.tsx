"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
  "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM",
  "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA",
  "WV", "WI", "WY",
] as const;

type StateDropdownProps = {
  selectedState: string | null;
  onSelectState: (state: string | null) => void;
};

export function StateDropdown({ selectedState, onSelectState }: StateDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filteredStates = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return [...US_STATES];
    return US_STATES.filter((state) => state.includes(q));
  }, [query]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex min-w-36 items-center justify-between rounded-md border px-3 py-1.5 text-xs font-medium transition ${
          selectedState
            ? "border-purple-500 bg-purple-500/20 text-purple-300"
            : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-500"
        }`}
      >
        <span>{selectedState ?? "All States"}</span>
        <ChevronDown className="ml-2 h-3.5 w-3.5" />
      </button>

      {isOpen && (
        <div className="absolute left-0 z-40 mt-2 w-56 rounded-lg border border-zinc-700 bg-zinc-800 p-2 shadow-xl">
          <div className="mb-2 flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-300">
            <Search className="h-3.5 w-3.5 text-zinc-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search state..."
              className="w-full bg-transparent text-xs text-zinc-100 outline-none placeholder:text-zinc-500"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-zinc-500 transition hover:text-zinc-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-64 space-y-1 overflow-auto">
            <button
              type="button"
              onClick={() => {
                onSelectState(null);
                setIsOpen(false);
              }}
              className={`w-full rounded-md px-2 py-1.5 text-left text-xs transition ${
                selectedState === null
                  ? "bg-purple-500/30 text-purple-200"
                  : "text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              All States
            </button>
            {filteredStates.map((state) => (
              <button
                key={state}
                type="button"
                onClick={() => {
                  onSelectState(state);
                  setIsOpen(false);
                }}
                className={`w-full rounded-md px-2 py-1.5 text-left text-xs transition ${
                  selectedState === state
                    ? "bg-purple-500/30 text-purple-200"
                    : "text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                {state}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
