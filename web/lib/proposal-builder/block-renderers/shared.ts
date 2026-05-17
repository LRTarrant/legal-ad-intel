/**
 * Shared helpers for block renderers.
 *
 * The Supabase client handed to renderers is the service-role client (see
 * the export route): it can join across tort / ad / state tables without
 * per-user RLS gaps. We type it loosely — the generated Database types don't
 * cover every table/RPC the surfaces use, the same `as any` escape hatch the
 * existing queries lib relies on.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
export type SupabaseLike = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface ResolvedRange {
  date_from: string;
  date_to: string;
  /** Human label, e.g. "Mar 1 – May 17, 2026". */
  label: string;
}

export function rangeLabel(date_from: string, date_to: string): string {
  const fmt = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  return `${fmt(date_from)} – ${fmt(date_to)}`;
}

export function fmtInt(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return Number.isFinite(v) ? Math.round(v).toLocaleString("en-US") : "0";
}

export function fmtUsd(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "$0";
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${Math.round(v).toLocaleString("en-US")}`;
}

export function pctDelta(curr: number, prev: number): string {
  if (!prev) return curr > 0 ? "new" : "—";
  const d = ((curr - prev) / prev) * 100;
  const sign = d > 0 ? "+" : "";
  return `${sign}${d.toFixed(0)}%`;
}

/**
 * Bucket an `ad_events.source` / channel value into the four pitch-facing
 * channels plus an Other catch-all. Mirrors how the advertising surfaces
 * talk about the mix (TV / Digital / Radio / CTV).
 */
export function channelBucket(
  source: string | null | undefined,
  channel?: string | null,
): "TV" | "Digital" | "Radio" | "CTV" | "Other" {
  const s = `${source ?? ""} ${channel ?? ""}`.toLowerCase();
  if (s.includes("ctv") || s.includes("connected")) return "CTV";
  if (s.includes("radio") || s.includes("audio") || s.includes("podcast"))
    return "Radio";
  if (
    s.includes("meta") ||
    s.includes("google") ||
    s.includes("facebook") ||
    s.includes("tiktok") ||
    s.includes("digital") ||
    s.includes("search") ||
    s.includes("youtube")
  )
    return "Digital";
  if (s.includes("tv") || s.includes("broadcast") || s.includes("linear"))
    return "TV";
  return "Other";
}

/**
 * Page through a Supabase table select to defeat the 1k PostgREST row cap —
 * the same paginated-range pattern the Recall Watchlist reads with.
 */
export async function pagedSelect<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  pageSize = 1000,
  hardCap = 20_000,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < hardCap; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) throw error;
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

/** ISO week key (Mon-anchored) for bucketing a time series. */
export function weekKey(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7; // 0 = Monday
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
