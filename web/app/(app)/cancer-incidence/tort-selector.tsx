"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition } from "react";
import { TORTS, parseTortId, type TortId } from "./tort-data";

const BUTTONS: { id: TortId | null; label: string; color: string }[] = [
  { id: null, label: "All Sites", color: "#1A8C96" },
  { id: "roundup", label: TORTS.roundup.shortLabel, color: TORTS.roundup.color },
  { id: "pfas", label: TORTS.pfas.shortLabel, color: TORTS.pfas.color },
  { id: "camp_lejeune", label: TORTS.camp_lejeune.shortLabel, color: TORTS.camp_lejeune.color },
  { id: "talc", label: TORTS.talc.shortLabel, color: TORTS.talc.color },
];

export function TortSelector() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTort = parseTortId(searchParams.get("tort") ?? undefined);

  function selectTort(tortId: TortId | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (tortId) {
      params.set("tort", tortId);
    } else {
      params.delete("tort");
    }
    // Remove single-site filter when switching torts
    params.delete("cancerSite");
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname);
    });
  }

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
      {BUTTONS.map((btn) => {
        const isActive = btn.id === activeTort;
        return (
          <button
            key={btn.id ?? "all"}
            type="button"
            onClick={() => selectTort(btn.id)}
            className="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition whitespace-nowrap"
            style={
              isActive
                ? { background: btn.color, color: "#FFFFFF" }
                : {
                    background: "#F1F5F9",
                    color: "#0B1D3A",
                    borderLeft: `3px solid ${btn.color}`,
                  }
            }
          >
            {btn.label}
          </button>
        );
      })}
    </div>
  );
}
