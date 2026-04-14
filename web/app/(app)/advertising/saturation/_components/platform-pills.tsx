"use client";

const PLATFORM_STYLE: Record<string, { label: string; bg: string; text: string }> = {
  google_ads: {
    label: "Google Ads",
    bg: "bg-blue-500/20 border-blue-500/40",
    text: "text-blue-300",
  },
  google_ads_transparency: {
    label: "Google Transparency",
    bg: "bg-blue-600/20 border-blue-600/40",
    text: "text-blue-200",
  },
  tiktok_ads: {
    label: "TikTok Ads",
    bg: "bg-teal-500/20 border-teal-500/40",
    text: "text-teal-300",
  },
  meta_ad_library: {
    label: "Meta Ads",
    bg: "bg-sky-500/20 border-sky-500/40",
    text: "text-sky-300",
  },
  mediaradar: {
    label: "MediaRadar",
    bg: "bg-orange-500/20 border-orange-500/40",
    text: "text-orange-300",
  },
  ispot: {
    label: "iSpot",
    bg: "bg-pink-500/20 border-pink-500/40",
    text: "text-pink-300",
  },
  vivvix: {
    label: "Vivvix",
    bg: "bg-violet-500/20 border-violet-500/40",
    text: "text-violet-300",
  },
  manual: {
    label: "Manual",
    bg: "bg-zinc-600/20 border-zinc-600/40",
    text: "text-zinc-300",
  },
};

export function PlatformPills({ platforms }: { platforms: string[] }) {
  if (!platforms || platforms.length === 0) {
    return <span className="text-xs text-zinc-500">&mdash;</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {platforms.map((p) => {
        const style = PLATFORM_STYLE[p] ?? {
          label: p,
          bg: "bg-zinc-700/40 border-zinc-600/40",
          text: "text-zinc-300",
        };
        return (
          <span
            key={p}
            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium leading-tight ${style.bg} ${style.text}`}
          >
            {style.label}
          </span>
        );
      })}
    </div>
  );
}
