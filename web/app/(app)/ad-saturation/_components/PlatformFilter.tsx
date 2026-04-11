"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const PLATFORMS = [
  { key: "all", label: "All" },
  { key: "google_ads", label: "Google Ads" },
  { key: "tiktok_ads", label: "TikTok Ads" },
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
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium uppercase text-zinc-500">
        Platform
      </span>
      {PLATFORMS.map(({ key, label }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => handleSelect(key)}
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              isActive
                ? "bg-purple-600 text-white"
                : "border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
