// Shared timeframe logic for the admin analytics surfaces (GA4 dashboard +
// internal user-activity views). One resolver produces absolute `YYYY-MM-DD`
// ranges that GA4's Data API accepts directly and that also convert cleanly to
// `activity_log` timestamp bounds.

export type TimeframePreset =
  | "7d"
  | "30d"
  | "90d"
  | "this_month"
  | "last_month"
  | "custom";

export interface ResolvedTimeframe {
  startDate: string; // YYYY-MM-DD (inclusive)
  endDate: string; // YYYY-MM-DD (inclusive)
  preset: TimeframePreset;
}

export const PRESET_LABELS: Record<TimeframePreset, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  this_month: "This month",
  last_month: "Last month",
  custom: "Custom range",
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;
const MAX_SPAN_DAYS = 400;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Format a Date to YYYY-MM-DD in UTC. */
function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/**
 * Validate a custom absolute range. Returns the normalized range or `null` if
 * the inputs aren't well-formed (`YYYY-MM-DD`, start ≤ end, span ≤ 400 days).
 * Server-side guard so query params can't inject arbitrary strings into GA4.
 */
export function validateRange(
  from?: string | null,
  to?: string | null,
): { startDate: string; endDate: string } | null {
  if (!from || !to || !DATE_RE.test(from) || !DATE_RE.test(to)) return null;
  const f = new Date(`${from}T00:00:00Z`);
  const t = new Date(`${to}T00:00:00Z`);
  if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime())) return null;
  if (f.getTime() > t.getTime()) return null;
  if ((t.getTime() - f.getTime()) / MS_PER_DAY > MAX_SPAN_DAYS) return null;
  return { startDate: from, endDate: to };
}

/**
 * Resolve a preset (or a validated custom range) to absolute dates. Falls back
 * to the last-30-days default for unknown presets or invalid custom ranges, so
 * callers can pass raw query params safely.
 */
export function resolveTimeframe(
  preset?: string | null,
  from?: string | null,
  to?: string | null,
): ResolvedTimeframe {
  const now = new Date();
  const today = ymd(now);
  const daysAgo = (n: number): string => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - n);
    return ymd(d);
  };

  switch (preset) {
    case "7d":
      return { startDate: daysAgo(6), endDate: today, preset: "7d" };
    case "90d":
      return { startDate: daysAgo(89), endDate: today, preset: "90d" };
    case "this_month": {
      const start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
      );
      return { startDate: ymd(start), endDate: today, preset: "this_month" };
    }
    case "last_month": {
      const start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
      );
      // Day 0 of the current month == last day of the previous month.
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
      return { startDate: ymd(start), endDate: ymd(end), preset: "last_month" };
    }
    case "custom": {
      const v = validateRange(from, to);
      if (v) return { ...v, preset: "custom" };
      break;
    }
    default:
      break;
  }
  return { startDate: daysAgo(29), endDate: today, preset: "30d" };
}

/**
 * Resolve a range from raw `startDate`/`endDate` query params (absolute dates
 * the client already computed). Defaults to last-30-days when absent/invalid.
 */
export function resolveFromParams(
  startDate?: string | null,
  endDate?: string | null,
): ResolvedTimeframe {
  const v = validateRange(startDate, endDate);
  if (v) return { ...v, preset: "custom" };
  return resolveTimeframe("30d");
}

/** Inclusive day count for a resolved range (used for display labels). */
export function daysBetween(startDate: string, endDate: string): number {
  const f = new Date(`${startDate}T00:00:00Z`).getTime();
  const t = new Date(`${endDate}T00:00:00Z`).getTime();
  return Math.round((t - f) / MS_PER_DAY) + 1;
}

/** Convert an absolute date range to inclusive UTC timestamp bounds for SQL. */
export function toTimestampRange(
  startDate: string,
  endDate: string,
): { fromISO: string; toISO: string } {
  return {
    fromISO: `${startDate}T00:00:00.000Z`,
    toISO: `${endDate}T23:59:59.999Z`,
  };
}
