"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const PLATFORMS = [
  { key: "all", label: "All" },
  { key: "meta_ad_library", label: "Meta Ads" },
  { key: "google_ads", label: "Google Ads (Search + YouTube)" },
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
              ? "bg-purple-500 text-white shadow-sm shadow-purple-500/30"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
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
