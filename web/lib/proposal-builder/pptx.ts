/**
 * PPTX generation for the Proposal Builder.
 *
 * Pure-JS (pptxgenjs) so it runs on Vercel's Node runtime with no
 * native/Chromium dependency. The deck = a branded cover + one or more
 * slides per block. Block renderers (lib/proposal-builder/block-renderers)
 * resolve real data into SlideSpec; this writer only lays out a SlideSpec
 * (stats strip → native chart / table → bullets → footnote). Charts are
 * native pptxgenjs bar/line/doughnut — no image rendering.
 */

import PptxGenJS from "pptxgenjs";
import type { TenantBranding } from "@/lib/tenant-config";
import type { SlideSpec } from "@/lib/proposal-builder/slide-spec";

/** pptxgenjs wants 6-char hex with no leading '#'. */
function hex(color: string | null | undefined, fallback: string): string {
  const c = (color ?? "").replace(/^#/, "").trim();
  return /^[0-9a-fA-F]{6}$/.test(c) ? c.toUpperCase() : fallback;
}

export interface BuildDeckArgs {
  title: string;
  description: string | null;
  slides: SlideSpec[];
  branding: TenantBranding;
}

const MUTED = "9CA3AF";

export async function buildProposalPptx(
  args: BuildDeckArgs,
): Promise<Buffer> {
  const { title, description, slides, branding } = args;

  const primary = hex(branding.primaryColor, "0B1D3A");
  const accent = hex(branding.accentColor, "1A8C96");
  const textColor = hex(branding.textColor, "1E1E2E");
  const company = branding.companyName || "Legal Marketing Intelligence";
  const footer = branding.footerText || `${company} — Confidential`;

  const pptx = new PptxGenJS();
  pptx.author = company;
  pptx.company = company;
  pptx.subject = title;
  pptx.title = title;
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in

  pptx.defineSlideMaster({
    title: "LMI_MASTER",
    background: { color: "FFFFFF" },
    objects: [
      {
        rect: {
          x: 0,
          y: 7.0,
          w: "100%",
          h: 0.5,
          fill: { color: primary },
        },
      },
      {
        text: {
          text: footer,
          options: {
            x: 0.4,
            y: 7.0,
            w: 9,
            h: 0.5,
            color: "FFFFFF",
            fontSize: 9,
            valign: "middle",
          },
        },
      },
    ],
    slideNumber: { x: 12.4, y: 7.05, color: "FFFFFF", fontSize: 9 },
  });

  // ── Cover ────────────────────────────────────────────────────────────
  const cover = pptx.addSlide();
  cover.background = { color: primary };
  cover.addText(company.toUpperCase(), {
    x: 0.6,
    y: 0.6,
    w: 12,
    h: 0.5,
    color: accent,
    fontSize: 16,
    bold: true,
    charSpacing: 2,
  });
  cover.addText(title, {
    x: 0.6,
    y: 2.6,
    w: 12.1,
    h: 1.6,
    color: "FFFFFF",
    fontSize: 40,
    bold: true,
  });
  if (description) {
    cover.addText(description, {
      x: 0.6,
      y: 4.3,
      w: 12.1,
      h: 1.5,
      color: "E5E7EB",
      fontSize: 18,
    });
  }
  cover.addText(
    new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    { x: 0.6, y: 6.2, w: 6, h: 0.4, color: accent, fontSize: 12 },
  );

  if (slides.length === 0) {
    const empty = pptx.addSlide({ masterName: "LMI_MASTER" });
    empty.addText("This deck has no blocks yet.", {
      x: 0.6,
      y: 3,
      w: 12,
      h: 1,
      color: textColor,
      fontSize: 24,
      align: "center",
    });
  }

  slides.forEach((spec, idx) => {
    const slide = pptx.addSlide({ masterName: "LMI_MASTER" });

    slide.addShape("rect", {
      x: 0.6,
      y: 0.55,
      w: 1.4,
      h: 0.08,
      fill: { color: accent },
    });

    if (spec.kicker) {
      slide.addText(spec.kicker.toUpperCase(), {
        x: 0.6,
        y: 0.72,
        w: 11,
        h: 0.35,
        color: spec.fallback ? MUTED : accent,
        fontSize: 12,
        bold: true,
        charSpacing: 2,
      });
    }

    slide.addText(spec.heading, {
      x: 0.6,
      y: 1.05,
      w: 12.1,
      h: 0.9,
      color: spec.fallback ? MUTED : primary,
      fontSize: 26,
      bold: true,
    });

    let cursorY = 1.95;
    if (spec.subheading) {
      slide.addText(spec.subheading, {
        x: 0.6,
        y: cursorY,
        w: 12.1,
        h: 0.35,
        color: MUTED,
        fontSize: 13,
      });
      cursorY += 0.4;
    }

    // ── Stats strip ────────────────────────────────────────────────────
    const stats = (spec.stats ?? []).slice(0, 4);
    if (stats.length > 0) {
      const gap = 0.2;
      const totalW = 12.13;
      const cardW = (totalW - gap * (stats.length - 1)) / stats.length;
      stats.forEach((s, i) => {
        const x = 0.6 + i * (cardW + gap);
        slide.addShape("roundRect", {
          x,
          y: cursorY,
          w: cardW,
          h: 0.95,
          rectRadius: 0.06,
          fill: { color: "F1F5F9" },
          line: { color: "E2E8F0", width: 0.5 },
        });
        slide.addText(s.value, {
          x: x + 0.12,
          y: cursorY + 0.1,
          w: cardW - 0.24,
          h: 0.42,
          color: spec.fallback ? MUTED : primary,
          fontSize: 19,
          bold: true,
        });
        slide.addText(
          [
            { text: s.label, options: { color: "64748B", fontSize: 9 } },
            ...(s.delta
              ? [
                  {
                    text: `  ${s.delta}`,
                    options: { color: accent, fontSize: 9, bold: true },
                  },
                ]
              : []),
          ],
          {
            x: x + 0.12,
            y: cursorY + 0.52,
            w: cardW - 0.24,
            h: 0.35,
            valign: "top",
          },
        );
      });
      cursorY += 1.2;
    }

    const bodyTop = cursorY;
    const bodyBottom = 6.7;
    const hasChart = !!spec.chart && spec.chart.series.length > 0;
    const hasTable =
      !!spec.table && spec.table.rows.length > 0;
    const bullets = (spec.bullets ?? []).filter((b) => b.length > 0);

    if (hasChart && hasTable) {
      addChart(pptx, slide, spec.chart!, accent, primary, {
        x: 0.6,
        y: bodyTop,
        w: 6.1,
        h: bodyBottom - bodyTop,
      });
      addTable(slide, spec.table!, {
        x: 6.95,
        y: bodyTop,
        w: 5.78,
        primary,
        textColor,
      });
    } else if (hasChart) {
      const chartW = bullets.length > 0 ? 7.4 : 12.13;
      addChart(pptx, slide, spec.chart!, accent, primary, {
        x: 0.6,
        y: bodyTop,
        w: chartW,
        h: bodyBottom - bodyTop,
      });
      if (bullets.length > 0) {
        addBullets(slide, bullets, {
          x: 8.2,
          y: bodyTop,
          w: 4.5,
          h: bodyBottom - bodyTop,
          textColor,
        });
      }
    } else if (hasTable) {
      addTable(slide, spec.table!, {
        x: 0.6,
        y: bodyTop,
        w: 12.13,
        primary,
        textColor,
      });
      if (bullets.length > 0) {
        addBullets(slide, bullets, {
          x: 0.6,
          y: Math.min(bodyTop + 3.4, bodyBottom - 1),
          w: 12.13,
          h: 1,
          textColor,
        });
      }
    } else if (bullets.length > 0) {
      addBullets(slide, bullets, {
        x: 0.6,
        y: bodyTop,
        w: 12.13,
        h: bodyBottom - bodyTop,
        textColor,
      });
    }

    if (spec.footnote) {
      slide.addText(spec.footnote, {
        x: 0.6,
        y: 6.72,
        w: 11.5,
        h: 0.25,
        color: MUTED,
        fontSize: 8,
        italic: true,
      });
    }

    slide.addText(`${idx + 1} / ${slides.length}`, {
      x: 11.4,
      y: 0.62,
      w: 1.3,
      h: 0.35,
      color: MUTED,
      fontSize: 10,
      align: "right",
    });
  });

  const out = (await pptx.write({
    outputType: "nodebuffer",
  })) as unknown as Buffer;
  return Buffer.isBuffer(out) ? out : Buffer.from(out as Uint8Array);
}

/* ── Section helpers ─────────────────────────────────────────────────── */

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function addChart(
  pptx: PptxGenJS,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  slide: any,
  chart: NonNullable<SlideSpec["chart"]>,
  accent: string,
  primary: string,
  box: Box,
): void {
  const data = chart.series.map((s) => ({
    name: s.name,
    labels: s.labels,
    values: s.values,
  }));

  // pptxgenjs ChartType enum lives on the instance in v3.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CT = (pptx as any).ChartType ?? {
    bar: "bar",
    line: "line",
    doughnut: "doughnut",
  };

  const palette = [
    accent,
    primary,
    "F59E0B",
    "6366F1",
    "10B981",
    "EF4444",
  ];

  const chartH = chart.caption ? box.h - 0.3 : box.h;

  if (chart.type === "doughnut") {
    slide.addChart(CT.doughnut, data, {
      x: box.x,
      y: box.y,
      w: box.w,
      h: chartH,
      holeSize: 55,
      showLegend: true,
      legendPos: "r",
      legendFontSize: 9,
      showPercent: true,
      dataLabelColor: "FFFFFF",
      dataLabelFontSize: 9,
      chartColors: palette,
    });
  } else if (chart.type === "line") {
    slide.addChart(CT.line, data, {
      x: box.x,
      y: box.y,
      w: box.w,
      h: chartH,
      lineSmooth: true,
      lineDataSymbol: "circle",
      lineDataSymbolSize: 5,
      showLegend: false,
      chartColors: [accent],
      catAxisLabelFontSize: 9,
      valAxisLabelFontSize: 9,
      valAxisMinVal: 0,
    });
  } else {
    slide.addChart(CT.bar, data, {
      x: box.x,
      y: box.y,
      w: box.w,
      h: chartH,
      barDir: "bar",
      showValue: true,
      dataLabelFontSize: 9,
      dataLabelColor: "1E1E2E",
      showLegend: false,
      chartColors: [accent],
      catAxisLabelFontSize: 9,
      valAxisLabelFontSize: 9,
      valAxisMinVal: 0,
      barGapWidthPct: 40,
    });
  }

  if (chart.caption) {
    slide.addText(chart.caption, {
      x: box.x,
      y: box.y + chartH,
      w: box.w,
      h: 0.3,
      color: MUTED,
      fontSize: 8,
      italic: true,
      align: "center",
    });
  }
}

function addTable(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  slide: any,
  table: NonNullable<SlideSpec["table"]>,
  opts: { x: number; y: number; w: number; primary: string; textColor: string },
): void {
  const header = table.columns.map((c) => ({
    text: c,
    options: {
      bold: true,
      color: "FFFFFF",
      fill: { color: opts.primary },
      fontSize: 10,
    },
  }));
  const body = table.rows.slice(0, 12).map((r, ri) =>
    r.map((cell) => ({
      text: cell,
      options: {
        color: opts.textColor,
        fontSize: 10,
        fill: { color: ri % 2 === 0 ? "FFFFFF" : "F8FAFC" },
      },
    })),
  );
  slide.addTable([header, ...body], {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    border: { type: "solid", color: "E2E8F0", pt: 0.5 },
    align: "left",
    valign: "middle",
    autoPage: false,
    rowH: 0.32,
  });
}

function addBullets(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  slide: any,
  bullets: string[],
  opts: { x: number; y: number; w: number; h: number; textColor: string },
): void {
  slide.addText(
    bullets.slice(0, 10).map((line) => {
      const isHeader = line.endsWith(":");
      const isSub = line.startsWith("•");
      return {
        text: isSub ? line.replace(/^•\s*/, "") : line,
        options: {
          bullet: !isHeader && !isSub ? { code: "2022" } : isSub,
          bold: isHeader,
          indentLevel: isSub ? 1 : 0,
          color: opts.textColor,
          fontSize: 12,
          paraSpaceAfter: 6,
        },
      };
    }),
    {
      x: opts.x,
      y: opts.y,
      w: opts.w,
      h: opts.h,
      valign: "top",
      lineSpacingMultiple: 1.15,
    },
  );
}
