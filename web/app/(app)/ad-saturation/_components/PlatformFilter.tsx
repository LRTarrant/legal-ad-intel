"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const PLATFORMS = [
  { key: "all", label: "All" },
  { key: "meta_ad_library", label: "Meta Ads" },
  { key: "google_ads", label: "Google Ads" },
  { key: "google_ads_transparency", label: "Google Transparency" },
  { key: "tiktok_ads", label: "TikTok Ads" },
  { key: "mediaradar", label: "MediaRadar" },
  { key: "ispot", label: "iSpot" },
  { key: "vivvix", label: "Vivvix" },
  { key: "manual", label: "Manual" },
] as const;

export function PlatformFilter({ active }: { active: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const handleSelect = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (key === "all") {
        params.delete("platform");
      } else {
        params.set("platform", key);
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, searchParams, pathname]
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm font-medium text-zinc-400 mr-1">PLATFORM</span>
      {PLATFORMS.map((p) => (
        <button
          key={p.key}
          onClick={() => handleSelect(p.key)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            active === p.key
              ? "bg-purple-600 text-white ring-1 ring-purple-300/60 shadow-[0_0_16px_rgba(168,85,247,0.45)]"
              : p.key === "all" && active !== "all"
                ? "bg-zinc-900 text-zinc-500"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
          }`}
        >
          {p.label}
        </button>
      ))}
      {active !== "all" && (
        <button
          onClick={() => handleSelect("all")}
          className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:border-zinc-500 hover:text-white"
        >
          <span className="text-sm leading-none">×</span>
          Clear
        </button>
      )}
    </div>
  );
}
