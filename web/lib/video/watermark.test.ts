/**
 * Unit tests for lib/video/watermark.ts (PR F).
 *
 * Run via the project's tsx-based test shim:
 *   npx tsx --tsconfig tsconfig.json /tmp/run_tests.mjs \
 *     "/home/user/workspace/legal-ad-intel/web/lib/video/watermark.test.ts"
 */

import {
  buildWatermarkFilter,
  logoExtFromUrl,
  normalizeWatermark,
} from "./watermark";

declare const test: (name: string, fn: () => void) => void;
declare const expect: (a: unknown) => {
  toBe: (e: unknown) => void;
  toContain: (s: string) => void;
  not: { toBe: (e: unknown) => void };
};

/* ── normalizeWatermark ─────────────────────────────────────────────── */

test("normalizeWatermark: returns null for null", () => {
  expect(normalizeWatermark(null)).toBe(null);
});

test("normalizeWatermark: returns null for undefined", () => {
  expect(normalizeWatermark(undefined)).toBe(null);
});

test("normalizeWatermark: returns null when logoUrl is empty", () => {
  expect(normalizeWatermark({ logoUrl: "" })).toBe(null);
});

test("normalizeWatermark: rejects file:// URLs", () => {
  expect(normalizeWatermark({ logoUrl: "file:///etc/passwd" })).toBe(null);
});

test("normalizeWatermark: rejects data: URLs", () => {
  expect(normalizeWatermark({ logoUrl: "data:image/png;base64,abcd" })).toBe(null);
});

test("normalizeWatermark: rejects javascript: URLs", () => {
  expect(normalizeWatermark({ logoUrl: "javascript:alert(1)" })).toBe(null);
});

test("normalizeWatermark: applies sensible defaults", () => {
  const out = normalizeWatermark({ logoUrl: "https://x.com/l.png" });
  expect(out?.logoUrl).toBe("https://x.com/l.png");
  expect(out?.position).toBe("bottom-right");
  expect(out?.sizePct).toBe(12);
  expect(out?.opacity).toBe(0.7);
  expect(out?.marginPx).toBe(20);
});

test("normalizeWatermark: clamps sizePct below 5", () => {
  expect(
    normalizeWatermark({ logoUrl: "https://a/b.png", sizePct: 1 })?.sizePct,
  ).toBe(5);
});

test("normalizeWatermark: clamps sizePct above 30", () => {
  expect(
    normalizeWatermark({ logoUrl: "https://a/b.png", sizePct: 99 })?.sizePct,
  ).toBe(30);
});

test("normalizeWatermark: clamps opacity below 0.1", () => {
  expect(
    normalizeWatermark({ logoUrl: "https://a/b.png", opacity: 0 })?.opacity,
  ).toBe(0.1);
});

test("normalizeWatermark: clamps opacity above 1", () => {
  expect(
    normalizeWatermark({ logoUrl: "https://a/b.png", opacity: 5 })?.opacity,
  ).toBe(1);
});

test("normalizeWatermark: rejects unknown positions, falls back to bottom-right", () => {
  const out = normalizeWatermark({
    logoUrl: "https://a/b.png",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    position: "middle" as any,
  });
  expect(out?.position).toBe("bottom-right");
});

test("normalizeWatermark: preserves valid position top-left", () => {
  const out = normalizeWatermark({
    logoUrl: "https://a/b.png",
    position: "top-left",
  });
  expect(out?.position).toBe("top-left");
});

test("normalizeWatermark: preserves valid position top-right", () => {
  const out = normalizeWatermark({
    logoUrl: "https://a/b.png",
    position: "top-right",
  });
  expect(out?.position).toBe("top-right");
});

test("normalizeWatermark: preserves valid position bottom-left", () => {
  const out = normalizeWatermark({
    logoUrl: "https://a/b.png",
    position: "bottom-left",
  });
  expect(out?.position).toBe("bottom-left");
});

test("normalizeWatermark: trims whitespace from logoUrl", () => {
  const out = normalizeWatermark({ logoUrl: "  https://a/b.png  " });
  expect(out?.logoUrl).toBe("https://a/b.png");
});

/* ── buildWatermarkFilter ───────────────────────────────────────────── */

const baseWm = {
  logoUrl: "https://a/b.png",
  position: "bottom-right" as const,
  sizePct: 12,
  opacity: 0.7,
  marginPx: 20,
};

test("buildWatermarkFilter: scale width is videoWidth * sizePct / 100", () => {
  const f = buildWatermarkFilter({ ...baseWm, sizePct: 10 }, 1920);
  expect(f).toContain("scale=192:-1");
});

test("buildWatermarkFilter: rounds scale width", () => {
  const f = buildWatermarkFilter({ ...baseWm, sizePct: 7 }, 1920);
  // 1920 * 7 / 100 = 134.4 → 134
  expect(f).toContain("scale=134:-1");
});

test("buildWatermarkFilter: applies opacity via colorchannelmixer", () => {
  const f = buildWatermarkFilter({ ...baseWm, opacity: 0.5 }, 1920);
  expect(f).toContain("colorchannelmixer=aa=0.500");
});

test("buildWatermarkFilter: bottom-right uses main_w/main_h-overlay-margin", () => {
  const f = buildWatermarkFilter(
    { ...baseWm, position: "bottom-right", marginPx: 25 },
    1920,
  );
  expect(f).toContain("overlay=main_w-overlay_w-25:main_h-overlay_h-25");
});

test("buildWatermarkFilter: bottom-left x is margin", () => {
  const f = buildWatermarkFilter(
    { ...baseWm, position: "bottom-left", marginPx: 30 },
    1920,
  );
  expect(f).toContain("overlay=30:main_h-overlay_h-30");
});

test("buildWatermarkFilter: top-right y is margin", () => {
  const f = buildWatermarkFilter(
    { ...baseWm, position: "top-right", marginPx: 15 },
    1920,
  );
  expect(f).toContain("overlay=main_w-overlay_w-15:15");
});

test("buildWatermarkFilter: top-left both x and y are margin", () => {
  const f = buildWatermarkFilter(
    { ...baseWm, position: "top-left", marginPx: 10 },
    1920,
  );
  expect(f).toContain("overlay=10:10");
});

test("buildWatermarkFilter: includes the [1:v] watermark input pad", () => {
  const f = buildWatermarkFilter(baseWm, 1920);
  expect(f).toContain("[1:v]");
});

test("buildWatermarkFilter: emits the [out] mapped pad", () => {
  const f = buildWatermarkFilter(baseWm, 1920);
  expect(f).toContain("[out]");
});

test("buildWatermarkFilter: scale width is at least 1 even with tiny videos", () => {
  const f = buildWatermarkFilter({ ...baseWm, sizePct: 5 }, 10);
  // 10 * 5 / 100 = 0.5 → rounded to 1 (Math.max-clamped)
  expect(f).toContain("scale=1:-1");
});

test("buildWatermarkFilter: opacity formatted with 3 decimal places at full", () => {
  const f = buildWatermarkFilter({ ...baseWm, opacity: 1 }, 1920);
  expect(f).toContain("colorchannelmixer=aa=1.000");
});

/* ── logoExtFromUrl ─────────────────────────────────────────────────── */

test("logoExtFromUrl: detects png", () => {
  expect(logoExtFromUrl("https://x.com/logo.png")).toBe(".png");
});

test("logoExtFromUrl: detects jpg", () => {
  expect(logoExtFromUrl("https://x.com/logo.jpg")).toBe(".jpg");
});

test("logoExtFromUrl: detects jpeg", () => {
  expect(logoExtFromUrl("https://x.com/logo.jpeg")).toBe(".jpg");
});

test("logoExtFromUrl: detects webp", () => {
  expect(logoExtFromUrl("https://x.com/logo.webp")).toBe(".webp");
});

test("logoExtFromUrl: detects svg", () => {
  expect(logoExtFromUrl("https://x.com/logo.svg")).toBe(".svg");
});

test("logoExtFromUrl: strips query strings", () => {
  expect(logoExtFromUrl("https://x.com/logo.jpg?v=123")).toBe(".jpg");
});

test("logoExtFromUrl: falls back to .png for unknown extensions", () => {
  expect(logoExtFromUrl("https://x.com/logo.bmp")).toBe(".png");
});

test("logoExtFromUrl: falls back to .png when no extension present", () => {
  expect(logoExtFromUrl("https://x.com/logo")).toBe(".png");
});

test("logoExtFromUrl: case-insensitive PNG", () => {
  expect(logoExtFromUrl("https://x.com/LOGO.PNG")).toBe(".png");
});

test("logoExtFromUrl: case-insensitive JPG", () => {
  expect(logoExtFromUrl("https://x.com/LOGO.JPG")).toBe(".jpg");
});
