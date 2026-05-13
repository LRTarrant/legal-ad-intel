import {
  type RecallSource,
  type SeverityVisual,
  severityForRecall,
  sourceBadgeClass,
  sourceBadgeLabel,
} from "@/lib/recall-watchlist/badges";

/* ------------------------------------------------------------------ */
/*  SeverityBadge                                                       */
/* ------------------------------------------------------------------ */

interface SeverityBadgeProps {
  source: RecallSource;
  recall_class?: string | null;
  severity_tier?: string | null;
  /** Optional override label (e.g. "FDA Class I"). Useful for tests / storybook. */
  label?: string;
  className?: string;
}

/**
 * Source-honest severity chip. Color encodes urgency; label always
 * names the source ("FDA Class I" / "CPSC Tier A") to avoid implying
 * the two scales are equivalent.
 */
export function SeverityBadge({
  source,
  recall_class,
  severity_tier,
  label,
  className = "",
}: SeverityBadgeProps) {
  const visual: SeverityVisual = severityForRecall({
    source,
    recall_class,
    severity_tier,
  });
  return (
    <span
      title={
        source === "cpsc"
          ? "CPSC severity is a computed proxy (hazard keywords + units recalled). Not the FDA Class I/II/III statutory scale — same color signals same urgency, not equivalent methodology."
          : "FDA recall class (I/II/III) is the statutory severity rating assigned by openFDA."
      }
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${visual.badgeClass} ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          visual.color === "red"
            ? "bg-red-600"
            : visual.color === "orange"
              ? "bg-orange-500"
              : visual.color === "yellow"
                ? "bg-yellow-500"
                : "bg-slate-400"
        }`}
      />
      {label ?? visual.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  SourceBadge                                                         */
/* ------------------------------------------------------------------ */

interface SourceBadgeProps {
  source: RecallSource;
  className?: string;
}

/**
 * Compact "FDA" / "CPSC" provenance chip — subtle outline so it sits
 * next to the manufacturer name without competing with the severity
 * badge.
 */
export function SourceBadge({ source, className = "" }: SourceBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wider ${sourceBadgeClass(source)} ${className}`}
    >
      {sourceBadgeLabel(source)}
    </span>
  );
}
