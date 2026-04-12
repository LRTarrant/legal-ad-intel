"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

type Tort = { id: string; slug: string; label: string };

interface TortSelectorProps {
  torts: Tort[];
  activeTort: string;
}

export function TortSelector({ torts, activeTort }: TortSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSelect = useCallback(
    (slug: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tort", slug);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex flex-wrap gap-2">
      {torts.map((tort) => (
        <button
          key={tort.slug}
          onClick={() => handleSelect(tort.slug)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            activeTort === tort.slug
              ? "bg-purple-600 text-white"
              : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
          }`}
        >
          {tort.label}
        </button>
      ))}
    </div>
  );
}
