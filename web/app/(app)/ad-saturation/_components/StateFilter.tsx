"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronDown, Search, X } from "lucide-react";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL",
  "GA","HI","ID","IL","IN","IA","KS","KY","LA","ME",
  "MD","MA","MI","MN","MS","MO","MT","NE","NV","NH",
  "NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI",
  "SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
] as const;

const STATE_NAMES: Record<string, string> = {
  AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",
  CO:"Colorado",CT:"Connecticut",DE:"Delaware",DC:"District of Columbia",FL:"Florida",
  GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",
  IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",
  MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",
  MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",
  NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",
  OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",
  SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",
  VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",
};

export function StateFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const statesParam = searchParams.get("states") ?? "";
  const selectedStates = useMemo(() => {
    if (!statesParam) return new Set<string>();
    return new Set(statesParam.split(",").filter((s) => US_STATES.includes(s as typeof US_STATES[number])));
  }, [statesParam]);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredStates = useMemo(() => {
    if (!search) return [...US_STATES];
    const q = search.toLowerCase();
    return US_STATES.filter(
      (s) => s.toLowerCase().includes(q) || STATE_NAMES[s].toLowerCase().includes(q)
    );
  }, [search]);

  const allSelected = selectedStates.size === US_STATES.length;
  const noneSelected = selectedStates.size === 0;
  const effectiveLabel = noneSelected || allSelected ? "All States" : `${selectedStates.size} state${selectedStates.size > 1 ? "s" : ""}`;

  const pushStates = useCallback(
    (next: Set<string>) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.size === 0 || next.size === US_STATES.length) {
        params.delete("states");
      } else {
        params.set("states", Array.from(next).sort().join(","));
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, searchParams, pathname]
  );

  const toggle = useCallback(
    (abbr: string) => {
      const next = new Set(selectedStates);
      if (next.has(abbr)) {
        next.delete(abbr);
      } else {
        next.add(abbr);
      }
      pushStates(next);
    },
    [selectedStates, pushStates]
  );

  const toggleAll = useCallback(() => {
    if (allSelected || noneSelected) {
      // If all or none selected, select all
      if (allSelected) {
        pushStates(new Set());
      } else {
        pushStates(new Set(US_STATES));
      }
    } else {
      pushStates(new Set(US_STATES));
    }
  }, [allSelected, noneSelected, pushStates]);

  const deselectAll = useCallback(() => {
    pushStates(new Set());
  }, [pushStates]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <span className="text-sm font-medium text-zinc-400 mr-2">STATES</span>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:border-zinc-500 transition-colors"
      >
        {effectiveLabel}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Selected chips */}
      {!noneSelected && !allSelected && (
        <div className="mt-2 flex flex-wrap gap-1">
          {Array.from(selectedStates).sort().map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => toggle(st)}
              className="inline-flex items-center gap-1 rounded-full border border-purple-500/40 bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-300 hover:bg-purple-500/30 transition-colors"
            >
              {st}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-64 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
          {/* Search input */}
          <div className="border-b border-zinc-700 p-2">
            <div className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1">
              <Search className="h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search states..."
                className="flex-1 bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-500"
                autoFocus
              />
            </div>
          </div>

          {/* Select All / Deselect All */}
          <div className="flex items-center gap-2 border-b border-zinc-700 px-3 py-2">
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors"
            >
              Select All
            </button>
            <span className="text-zinc-600">|</span>
            <button
              type="button"
              onClick={deselectAll}
              className="text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors"
            >
              Deselect All
            </button>
          </div>

          {/* State list */}
          <div className="max-h-60 overflow-y-auto py-1">
            {filteredStates.map((st) => {
              const checked = selectedStates.has(st);
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => toggle(st)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-zinc-800 transition-colors"
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded border text-xs ${
                      checked
                        ? "border-purple-500 bg-purple-600 text-white"
                        : "border-zinc-600 bg-zinc-800 text-transparent"
                    }`}
                  >
                    {checked ? "\u2713" : ""}
                  </span>
                  <span className={checked ? "text-zinc-100" : "text-zinc-400"}>
                    {st}
                  </span>
                  <span className="text-xs text-zinc-500">{STATE_NAMES[st]}</span>
                </button>
              );
            })}
            {filteredStates.length === 0 && (
              <p className="px-3 py-2 text-sm text-zinc-500">No states match your search.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
