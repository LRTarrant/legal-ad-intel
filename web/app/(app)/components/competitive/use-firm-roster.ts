"use client";

/* ------------------------------------------------------------------ */
/*  Alabama firm roster.                                               */
/*                                                                    */
/*  Paid Search is genuinely per-DMA, so the set of advertiser domains */
/*  that appear in AL paid search IS the Alabama PI-firm roster. The   */
/*  national channels (SEO / YouTube / Meta) are then firm-scoped to   */
/*  that roster so a state page never shows out-of-state firms.        */
/* ------------------------------------------------------------------ */

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { PiCompetitor, RpcClient } from "./types";

/** Strip protocol, leading www., and path from a domain → registrable host. */
function normDomain(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .trim();
}

/** Second-level label of a domain, e.g. shunnarah.com → "shunnarah". */
function domainLabel(domain: string): string {
  const host = normDomain(domain);
  const parts = host.split(".");
  return parts.length >= 2 ? parts[parts.length - 2] : host;
}

/** Collapse a Facebook page name to comparable alphanumerics. */
function normPageName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export interface FirmRoster {
  /** Normalized registrable domains observed in AL paid search. */
  domains: Set<string>;
  /** Distinct AL `pi_metros.id` values (for scoping creative queries). */
  alMetroIds: string[];
  /** Count of distinct AL advertiser firms (the "advertisers tracked" stat). */
  size: number;
  loading: boolean;
  /** True if a domain (from SEO / YouTube rows) belongs to the AL roster. */
  matchesDomain: (domain: string) => boolean;
  /** Fuzzy match a Meta page name against the roster's firm labels. */
  matchesPageName: (pageName: string) => boolean;
}

export function useFirmRoster(stateCode: string): FirmRoster {
  const [domains, setDomains] = useState<Set<string>>(new Set());
  const [labels, setLabels] = useState<string[]>([]);
  const [alMetroIds, setAlMetroIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const sb = getSupabase() as unknown as RpcClient & {
      from: (t: string) => {
        select: (c: string) => {
          eq: (
            col: string,
            val: string,
          ) => Promise<{ data: { id: string }[] | null }>;
        };
      };
    };

    async function load() {
      setLoading(true);
      // Roster of advertiser domains from AL paid search (all DMAs).
      const { data } = await sb.rpc("get_pi_competitors_by_dma", {
        p_state: stateCode,
        p_dma_code: null,
      });
      const rows = (data as PiCompetitor[] | null) ?? [];
      const domainSet = new Set<string>();
      const labelSet = new Set<string>();
      for (const r of rows) {
        if (!r.advertiser_domain) continue;
        const d = normDomain(r.advertiser_domain);
        domainSet.add(d);
        const label = domainLabel(d);
        // Labels < 4 chars are too generic to fuzzy-match page names safely.
        if (label.length >= 4) labelSet.add(label);
      }

      // AL metro ids — used to scope paid-search creative to the state.
      const { data: metros } = await sb
        .from("pi_metros")
        .select("id")
        .eq("state_abbr", stateCode);
      const ids = ((metros as { id: string }[] | null) ?? []).map((m) => m.id);

      if (active) {
        setDomains(domainSet);
        setLabels([...labelSet]);
        setAlMetroIds(ids);
        setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [stateCode]);

  return {
    domains,
    alMetroIds,
    size: domains.size,
    loading,
    matchesDomain: (domain: string) =>
      domain ? domains.has(normDomain(domain)) : false,
    matchesPageName: (pageName: string) => {
      if (!pageName) return false;
      const norm = normPageName(pageName);
      return labels.some((label) => norm.includes(label));
    },
  };
}
