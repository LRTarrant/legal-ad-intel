/**
 * Pure helpers for the video watermark feature (PR F).
 *
 * Kept separate from the render-video route so we can unit-test the
 * filter-graph construction without spinning up ffmpeg.
 */

export type WatermarkPosition =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left";

export interface WatermarkConfig {
  /** Public URL of the logo image (PNG/JPG/SVG/WebP). */
  logoUrl: string;
  /** Where on the frame the logo appears. Defaults to bottom-right. */
  position?: WatermarkPosition;
  /** Logo width as a percentage of video width (clamped 5..30, default 12). */
  sizePct?: number;
  /** Logo opacity 0..1 (clamped 0.1..1, default 0.7). */
  opacity?: number;
  /** Margin from frame edge in pixels (default 20). */
  marginPx?: number;
}

export interface NormalizedWatermark {
  logoUrl: string;
  position: WatermarkPosition;
  sizePct: number;
  opacity: number;
  marginPx: number;
}

const ALLOWED_POSITIONS: ReadonlySet<WatermarkPosition> = new Set([
  "bottom-right",
  "bottom-left",
  "top-right",
  "top-left",
]);

/** Clamp a number to a [min, max] range. */
function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Validate and normalize a watermark config from the request body.
 * Returns null if logoUrl is missing or not http(s) — callers should
 * skip the watermark step entirely in that case.
 */
export function normalizeWatermark(
  raw: WatermarkConfig | null | undefined,
): NormalizedWatermark | null {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.logoUrl !== "string" || raw.logoUrl.trim() === "") return null;
  // Only http(s) — guards against file://, data:, javascript:, etc.
  if (!/^https?:\/\//i.test(raw.logoUrl.trim())) return null;

  const position: WatermarkPosition =
    raw.position && ALLOWED_POSITIONS.has(raw.position)
      ? raw.position
      : "bottom-right";

  const sizePct = clamp(
    typeof raw.sizePct === "number" ? raw.sizePct : 12,
    5,
    30,
  );

  const opacity = clamp(
    typeof raw.opacity === "number" ? raw.opacity : 0.7,
    0.1,
    1,
  );

  const marginPx = clamp(
    typeof raw.marginPx === "number" ? raw.marginPx : 20,
    0,
    200,
  );

  return {
    logoUrl: raw.logoUrl.trim(),
    position,
    sizePct,
    opacity,
    marginPx,
  };
}

/**
 * Build the ffmpeg `-filter_complex` string for compositing a logo
 * watermark onto a video.
 *
 * The graph is:
 *   [1:v] format=rgba, scale=W*sizePct/100:-1, colorchannelmixer=aa=opacity [wm];
 *   [0:v][wm] overlay=<x>:<y> [out]
 *
 * `W` is the input video width (resolved by ffmpeg), and `w`/`h` in the
 * overlay expression are the watermark's own dimensions.
 *
 * @param videoWidthPx  Width of the source video in pixels (used to
 *   compute the watermark width, since `main_w` on the overlay filter
 *   only resolves at composite time, not in scale).
 */
export function buildWatermarkFilter(
  wm: NormalizedWatermark,
  videoWidthPx: number,
): string {
  const wmWidth = Math.max(1, Math.round((videoWidthPx * wm.sizePct) / 100));

  // Position math (using main_w/main_h and overlay w/h, the standard
  // ffmpeg overlay variables).
  const m = wm.marginPx;
  let x: string;
  let y: string;
  switch (wm.position) {
    case "bottom-left":
      x = `${m}`;
      y = `main_h-overlay_h-${m}`;
      break;
    case "top-right":
      x = `main_w-overlay_w-${m}`;
      y = `${m}`;
      break;
    case "top-left":
      x = `${m}`;
      y = `${m}`;
      break;
    case "bottom-right":
    default:
      x = `main_w-overlay_w-${m}`;
      y = `main_h-overlay_h-${m}`;
      break;
  }

  // colorchannelmixer with `aa=opacity` multiplies the alpha channel.
  // format=rgba ensures we have an alpha channel to multiply (PNG with
  // transparency keeps its alpha; opaque JPGs become semi-transparent
  // because we apply the multiplier to a freshly-set alpha=1).
  const opacity = wm.opacity.toFixed(3);

  return [
    `[1:v]format=rgba,scale=${wmWidth}:-1,colorchannelmixer=aa=${opacity}[wm]`,
    `[0:v][wm]overlay=${x}:${y}[out]`,
  ].join(";");
}

/**
 * Pick a sensible local file extension for the downloaded logo based
 * on its URL. Defaults to `.png` (the safest container for ffmpeg).
 */
export function logoExtFromUrl(url: string): string {
  const lower = url.toLowerCase().split("?")[0];
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return ".jpg";
  if (lower.endsWith(".webp")) return ".webp";
  if (lower.endsWith(".svg")) return ".svg";
  // PNG is the safe fallback (transparency support, broadly accepted).
  return ".png";
}
