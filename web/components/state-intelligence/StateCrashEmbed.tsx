"use client";

import { useState, useCallback } from "react";
import { Activity } from "lucide-react";

export interface CrashEmbed {
  name: string;
  iframeSrc: string;
  height: number;
  description?: string;
}

export interface StateCrashEmbedProps {
  embeds: CrashEmbed[];
  stateName: string;
  sourceLabel?: string;
  sourceUrl?: string;
}

export function StateCrashEmbed({
  embeds,
  stateName,
  sourceLabel,
  sourceUrl,
}: StateCrashEmbedProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [mountedTabs, setMountedTabs] = useState<Set<number>>(
    () => new Set([0])
  );
  const [loadedSrcs, setLoadedSrcs] = useState<Set<string>>(new Set());

  const handleTabClick = useCallback(
    (index: number) => {
      setActiveIndex(index);
      setMountedTabs((prev) => {
        if (prev.has(index)) return prev;
        const next = new Set(prev);
        next.add(index);
        return next;
      });
    },
    []
  );

  if (embeds.length === 0) return null;

  const showTabs = embeds.length > 1;

  return (
    <div className="rounded-lg border-2 border-intelligence-teal/30 bg-gradient-to-br from-intelligence-teal/[0.06] to-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Activity className="w-4.5 h-4.5 text-intelligence-teal" />
        <h2 className="font-heading text-2xl font-bold text-midnight-navy">
          {stateName}{" "}Crash Intelligence
        </h2>
      </div>
      <p className="mb-4 text-sm text-slate-gray max-w-3xl">
        {stateName}{" "}publishes one of the most comprehensive and current state
        crash datasets in the U.S. &mdash; including serious-injury crashes,
        which are rarely available elsewhere.
      </p>

      {showTabs && (
        <div className="flex flex-wrap gap-2 mb-4">
          {embeds.map((embed, i) => (
            <button
              key={i}
              onClick={() => handleTabClick(i)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeIndex === i
                  ? "bg-intelligence-teal text-white shadow-sm"
                  : "bg-white text-midnight-navy/70 border border-cloud hover:bg-cloud/60"
              }`}
            >
              {embed.name}
            </button>
          ))}
        </div>
      )}

      {embeds.map((embed, i) => {
        const isActive = activeIndex === i;
        const isMounted = mountedTabs.has(i);
        if (!isMounted) return null;
        return (
          <div key={i} style={{ display: isActive ? "block" : "none" }}>
            {embed.description && (
              <p className="mb-3 text-xs text-midnight-navy/60">
                {embed.description}
              </p>
            )}
            <div className="relative w-full overflow-hidden rounded-lg border bg-white">
              {!loadedSrcs.has(embed.iframeSrc) && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50">
                  <div className="flex flex-col items-center gap-3 text-slate-500">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-intelligence-teal" />
                    <p className="text-sm">Loading dashboard&hellip;</p>
                    <p className="text-xs text-slate-400">
                      Some embeds with large datasets may take 15–30 seconds.
                    </p>
                  </div>
                </div>
              )}
              <iframe
                src={embed.iframeSrc}
                width="100%"
                height={embed.height}
                frameBorder="0"
                loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                className="max-w-full"
                title={embed.name}
                onLoad={() =>
                  setLoadedSrcs((prev) => {
                    if (prev.has(embed.iframeSrc)) return prev;
                    const next = new Set(prev);
                    next.add(embed.iframeSrc);
                    return next;
                  })
                }
              />
            </div>
            {sourceLabel && (
              <p className="mt-2 text-[11px] text-slate-gray">
                Source:{" "}
                {sourceUrl ? (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-intelligence-teal"
                  >
                    {sourceLabel}
                  </a>
                ) : (
                  sourceLabel
                )}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
