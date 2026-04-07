/**
 * Shared color mapping for JPML type badges.
 * Each entry maps a JPML type name to a hex color.
 */
export const TYPE_COLORS: Record<string, string> = {
  "Products Liability": "#1A8C96",
  "Data Breach and Consumer Privacy": "#7C3AED",
  "Intellectual Property": "#2563EB",
  "Employment Practices": "#D97706",
  "Common Disaster": "#DC2626",
  "Sales Practices": "#059669",
  "Air Disaster": "#E11D48",
  Antitrust: "#4F46E5",
  Miscellaneous: "#6B7280",
  Securities: "#0891B2",
  "Insurance": "#B45309",
  "Patent": "#4338CA",
  "Contract": "#0D9488",
  "Marketing & Sales Practices": "#65A30D",
};

/**
 * Shortened display labels for long JPML type names.
 */
export const TYPE_SHORT_LABELS: Record<string, string> = {
  "Products Liability": "Products Liab.",
  "Data Breach and Consumer Privacy": "Data Breach",
  "Intellectual Property": "IP",
  "Employment Practices": "Employment",
  "Common Disaster": "Common Dis.",
  "Sales Practices": "Sales",
  "Air Disaster": "Air Disaster",
  Antitrust: "Antitrust",
  Miscellaneous: "Misc.",
  Securities: "Securities",
  "Marketing & Sales Practices": "Mktg. & Sales",
};

/** Get the color for a JPML type, with a default fallback. */
export function getTypeColor(jpmlType: string): string {
  return TYPE_COLORS[jpmlType] ?? "#6B7280";
}

/** Get the short label for a JPML type, falling back to the full name. */
export function getTypeShortLabel(jpmlType: string): string {
  return TYPE_SHORT_LABELS[jpmlType] ?? jpmlType;
}
