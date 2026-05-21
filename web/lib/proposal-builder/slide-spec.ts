/**
 * SlideSpec — the contract between block renderers and the PPTX writer.
 *
 * Renderers (lib/proposal-builder/block-renderers/*) resolve real data and
 * emit an ordered array of SlideSpec. pptx.ts knows nothing about torts /
 * ad-intel / states — it only knows how to lay out a SlideSpec. This keeps
 * data-fetching and presentation cleanly separated and makes the long tail
 * of Ad Intel sub-surfaces a pure data exercise later.
 *
 * A slide may combine several sections; the writer renders whichever are
 * present (stats strip → chart/table → bullets → footnote).
 */

export interface SlideStat {
  label: string;
  value: string;
  /** Optional delta caption, e.g. "+12% WoW". */
  delta?: string;
}

export interface SlideTable {
  columns: string[];
  rows: string[][];
}

export type SlideChartType = "bar" | "line" | "doughnut";

export interface SlideChartSeries {
  name: string;
  labels: string[];
  values: number[];
}

export interface SlideChart {
  type: SlideChartType;
  series: SlideChartSeries[];
  /** Optional caption rendered under the plot. */
  caption?: string;
}

export interface SlideSpec {
  /** Small uppercase eyebrow, e.g. "Tort Spotlight". */
  kicker?: string;
  heading: string;
  subheading?: string;
  /** KPI strip rendered as cards near the top. */
  stats?: SlideStat[];
  /** Body bullets. */
  bullets?: string[];
  table?: SlideTable;
  chart?: SlideChart;
  /** Source attribution / disclaimer pinned above the footer band. */
  footnote?: string;
  /**
   * Marks a graceful-degradation slide (data could not be resolved). The
   * writer styles it muted; the export still succeeds.
   */
  fallback?: boolean;
}

/** Convenience builder for the "couldn't resolve data" case. */
export function fallbackSlide(
  heading: string,
  note: string,
  kicker?: string,
): SlideSpec {
  return {
    kicker,
    heading,
    bullets: [note],
    fallback: true,
  };
}
