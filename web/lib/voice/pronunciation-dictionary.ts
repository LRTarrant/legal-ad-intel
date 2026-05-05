/**
 * Server-side helper: load the global pronunciation_dictionary and
 * convert it to the shape applyPronunciationOverrides expects.
 *
 * Caching:
 *   We keep a 60-second in-process cache so a burst of voiceovers in the
 *   same Vercel function instance doesn't slam the DB. The dictionary is
 *   small (~30-100 rows in practice) so the cache footprint is trivial.
 *   Cache is per-instance (no shared cache) — that's fine; the data
 *   changes ~once a week max.
 *
 * Failure mode:
 *   If the table query fails for any reason (DB hiccup, table not yet
 *   migrated on a fresh environment), we return [] rather than throwing.
 *   A failed dictionary fetch should NOT block voiceover generation —
 *   the worst case is one or two mangled words, not a 500.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PronunciationOverride } from "./pronunciation";

interface CacheEntry {
  overrides: PronunciationOverride[];
  fetchedAt: number;
}

const CACHE_TTL_MS = 60_000;

// Module-level singleton (per Vercel instance).
let cache: CacheEntry | null = null;

/**
 * Fetch the global dictionary, applying the cache. The Supabase client
 * is passed in so the caller controls auth context — RLS allows SELECT
 * to any authenticated user, so the request-bound client works fine.
 */
export async function getGlobalPronunciationDictionary(
  supabase: SupabaseClient,
): Promise<PronunciationOverride[]> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.overrides;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { data, error } = await db
    .from("pronunciation_dictionary")
    .select("written, spoken")
    .limit(500); // sanity ceiling — the table is admin-curated, not user input

  if (error) {
    // Don't throw — just return empty so TTS still works.
    console.error(
      "pronunciation-dictionary: fetch failed, falling back to empty:",
      error.message,
    );
    return [];
  }

  const rows = (data ?? []) as Array<{ written: unknown; spoken: unknown }>;
  const overrides: PronunciationOverride[] = [];
  for (const r of rows) {
    if (typeof r.written === "string" && typeof r.spoken === "string") {
      overrides.push({ written: r.written, spoken: r.spoken });
    }
  }

  cache = { overrides, fetchedAt: now };
  return overrides;
}

/**
 * Test/dev helper: clear the cache. Production code should never call
 * this — Vercel instances are short-lived and the 60s TTL handles the
 * rest.
 */
export function clearPronunciationDictionaryCache(): void {
  cache = null;
}

/**
 * Merge per-firm overrides with the global dictionary, with firm
 * overrides taking precedence on the same `written` key (case-
 * insensitive). The merged list is what we feed to
 * applyPronunciationOverrides.
 *
 * Why precedence matters: a firm in Birmingham, England might want
 * their script to keep the British pronunciation even though our global
 * dictionary doesn't include "Birmingham". Or: a firm called "Talc &
 * Associates" might want their name spelled out as letters even though
 * the global dictionary says "TALK". Firm wins.
 */
export function mergePronunciationLayers(
  firmOverrides: PronunciationOverride[] | null | undefined,
  globalOverrides: PronunciationOverride[],
): PronunciationOverride[] {
  const seen = new Set<string>();
  const out: PronunciationOverride[] = [];

  // Firm first — if a written value collides, the firm version wins.
  for (const ov of firmOverrides ?? []) {
    const key = ov.written.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ov);
  }
  for (const ov of globalOverrides) {
    const key = ov.written.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ov);
  }
  return out;
}
