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
import {
  applyPronunciationOverrides,
  type PronunciationOverride,
} from "./pronunciation";
import { getFirmForUser } from "@/lib/firms/server";

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

/* ── One-call helper for TTS routes ───────────────────────────────────── */

/**
 * Apply per-firm + global pronunciation overrides to TTS-bound text.
 *
 * One-stop helper for any route that calls ElevenLabs directly. Loads
 * the per-firm overrides if firmId is supplied AND the user manages
 * the firm (RLS-checked via getFirmForUser), merges with the cached
 * global dictionary, and returns the substituted text.
 *
 * Failure mode: NEVER throws and NEVER returns null. If anything goes
 * wrong (firm fetch fails, dictionary fetch fails, malformed rows),
 * we fall back to the original text. Voiceover generation is the
 * critical path; pronunciation is best-effort enrichment.
 *
 * Use this from every TTS-calling route (currently three:
 * /generate-voiceover, /generate-radio-spot, /generate-pi-radio-spot)
 * so adding a new term to the dictionary affects every channel.
 */
export interface ApplyPronunciationResult {
  /** Text to send to ElevenLabs. Original text on any failure. */
  text: string;
  /** How many per-firm overrides were applied (for analytics). */
  firmOverridesApplied: number;
  /** How many global dictionary entries were available (for analytics). */
  globalOverridesAvailable: number;
}

export async function applyPronunciationToText(
  supabase: SupabaseClient,
  userId: string,
  text: string,
  firmId: string | null | undefined,
): Promise<ApplyPronunciationResult> {
  // Per-firm overrides (best-effort).
  let firmOverrides: PronunciationOverride[] = [];
  if (firmId) {
    try {
      const firm = await getFirmForUser(supabase, userId, firmId);
      // The generated firms type doesn't yet include pronunciation_overrides
      // (column added by migration 20260505000008); cast through any to read.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = (firm as any)?.pronunciation_overrides;
      if (Array.isArray(raw)) {
        firmOverrides = raw.filter(
          (o: unknown): o is PronunciationOverride =>
            !!o &&
            typeof o === "object" &&
            typeof (o as PronunciationOverride).written === "string" &&
            typeof (o as PronunciationOverride).spoken === "string",
        );
      }
    } catch (err) {
      // Don't block TTS on firm lookup failure.
      console.error(
        "applyPronunciationToText: firm fetch failed, ignoring per-firm overrides:",
        err,
      );
    }
  }

  // Global dictionary (cached, fail-soft to []).
  const globalDictionary = await getGlobalPronunciationDictionary(
    supabase,
  ).catch(() => [] as PronunciationOverride[]);

  const merged = mergePronunciationLayers(firmOverrides, globalDictionary);
  const out = applyPronunciationOverrides(text, merged);

  return {
    text: out,
    firmOverridesApplied: firmOverrides.length,
    globalOverridesAvailable: globalDictionary.length,
  };
}
