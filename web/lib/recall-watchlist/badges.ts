/**
 * Source-honest severity mapping for the merged FDA + CPSC recall list.
 *
 * Same urgency signal across sources (same color = same urgency), but
 * never collapse the source. FDA Class I and CPSC Tier A both render red;
 * the displayed label always identifies its origin so plaintiff firms see
 * the methodology, not just the rank.
 *
 * Decision context: see docs/data-sources/cpsc.md §4 (CPSC severity is a
 * computed proxy, NOT the FDA Class I/II/III statutory taxonomy). Tooltip
 * copy MUST NOT imply equivalence.
 */

export type RecallSource = "fda" | "cpsc";

export type SeverityColor = "red" | "orange" | "yellow" | "gray";

export interface SeverityVisual {
  color: SeverityColor;
  label: string;
  /** Tailwind classes for the badge (bg + text + border). */
  badgeClass: string;
}

const COLOR_CLASSES: Record<SeverityColor, string> = {
  red: "bg-red-100 text-red-800 border-red-200",
  orange: "bg-orange-100 text-orange-800 border-orange-200",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
  gray: "bg-slate-100 text-slate-700 border-slate-200",
};

/**
 * Map an FDA recall_class string to (color, label). Returns `null` if the
 * input doesn't look like a known FDA class — caller should treat as
 * unknown and render the gray "Unclassified" default.
 */
function mapFdaClass(recallClass: string | null | undefined): SeverityVisual {
  switch (recallClass) {
    case "Class I":
      return { color: "red", label: "FDA Class I", badgeClass: COLOR_CLASSES.red };
    case "Class II":
      return { color: "orange", label: "FDA Class II", badgeClass: COLOR_CLASSES.orange };
    case "Class III":
      return { color: "yellow", label: "FDA Class III", badgeClass: COLOR_CLASSES.yellow };
    default:
      return {
        color: "gray",
        label: "FDA Unclassified",
        badgeClass: COLOR_CLASSES.gray,
      };
  }
}

function mapCpscTier(tier: string | null | undefined): SeverityVisual {
  switch (tier) {
    case "A":
      return { color: "red", label: "CPSC Tier A", badgeClass: COLOR_CLASSES.red };
    case "B":
      return { color: "orange", label: "CPSC Tier B", badgeClass: COLOR_CLASSES.orange };
    case "C":
      return { color: "yellow", label: "CPSC Tier C", badgeClass: COLOR_CLASSES.yellow };
    case "D":
    default:
      return { color: "gray", label: "CPSC Tier D", badgeClass: COLOR_CLASSES.gray };
  }
}

/**
 * Resolve the source-honest severity visual for a recall row. The shape
 * is permissive on purpose so this helper works for both the rich Heat
 * Board recall objects and the flatter `FlatRecallRow` used by the new
 * "All Recalls" section.
 */
export function severityForRecall(input: {
  source: RecallSource;
  recall_class?: string | null;
  severity_tier?: string | null;
}): SeverityVisual {
  if (input.source === "cpsc") {
    return mapCpscTier(input.severity_tier);
  }
  return mapFdaClass(input.recall_class);
}

/**
 * Visual treatment for the small "FDA"/"CPSC" provenance chip rendered
 * next to each row. Subtle outline so it doesn't compete with the
 * severity badge.
 */
export function sourceBadgeClass(source: RecallSource): string {
  return source === "fda"
    ? "bg-white text-slate-700 border-slate-300"
    : "bg-white text-indigo-700 border-indigo-200";
}

export function sourceBadgeLabel(source: RecallSource): string {
  return source === "fda" ? "FDA" : "CPSC";
}
