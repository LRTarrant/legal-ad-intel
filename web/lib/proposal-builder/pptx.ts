/**
 * PPTX generation for the Proposal Builder.
 *
 * Pure-JS (pptxgenjs) so it runs on Vercel's Node runtime with no
 * native/Chromium dependency. Builds a branded title slide plus one
 * slide per block. v1 renders each block's selected target + label;
 * deep data pulls per surface can be layered in later.
 */

import PptxGenJS from "pptxgenjs";
import type { TenantBranding } from "@/lib/tenant-config";
import {
  AD_INTEL_SURFACES,
  type ProposalBlockRow,
} from "@/lib/proposal-builder/types";

const SURFACE_LABELS: Record<string, string> = Object.fromEntries(
  AD_INTEL_SURFACES.map((s) => [s.id, s.label]),
);

/** pptxgenjs wants 6-char hex with no leading '#'. */
function hex(color: string | null | undefined, fallback: string): string {
  const c = (color ?? "").replace(/^#/, "").trim();
  return /^[0-9a-fA-F]{6}$/.test(c) ? c.toUpperCase() : fallback;
}

function titleCase(slug: string): string {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

interface BlockRenderInfo {
  kicker: string;
  heading: string;
  body: string[];
}

function describeBlock(
  block: ProposalBlockRow,
  campaignNames: Map<string, string>,
): BlockRenderInfo {
  const d = block.block_data ?? {};
  switch (block.block_type) {
    case "tort_page": {
      const slug = String(d.tort_slug ?? "");
      return {
        kicker: "Tort Spotlight",
        heading: String(d.label ?? titleCase(slug) ?? "Tort"),
        body: [
          `Mass-tort advertising & litigation intelligence for ${
            d.label ?? titleCase(slug)
          }.`,
          slug ? `Source surface: /advertising/${slug}` : "",
        ].filter(Boolean),
      };
    }
    case "state_intel": {
      const st = String(d.state_abbr ?? "");
      return {
        kicker: "State Intelligence",
        heading: String(d.label ?? st),
        body: [
          `Injury, litigation, and ad-market signals for ${
            d.label ?? st
          }.`,
          st ? `Source surface: /state-intelligence (${st})` : "",
        ].filter(Boolean),
      };
    }
    case "ad_intel": {
      const surface = String(d.surface ?? "");
      const label = SURFACE_LABELS[surface] ?? titleCase(surface);
      return {
        kicker: "Ad Intelligence",
        heading: String(d.label ?? label),
        body: [
          `Competitive advertising intelligence — ${label}.`,
          surface ? `Source surface: /advertising/${surface}` : "",
        ].filter(Boolean),
      };
    }
    case "campaign": {
      const cid = String(d.campaign_id ?? "");
      const name = campaignNames.get(cid) ?? String(d.label ?? "Campaign");
      return {
        kicker: "Campaign",
        heading: name,
        body: [
          "Saved campaign plan from the Campaign Builder.",
          cid ? `Campaign ID: ${cid}` : "",
        ].filter(Boolean),
      };
    }
    case "custom_text":
    default: {
      return {
        kicker: "",
        heading: String(d.title ?? "Untitled"),
        body: [String(d.content ?? "")],
      };
    }
  }
}

export interface BuildDeckArgs {
  title: string;
  description: string | null;
  blocks: ProposalBlockRow[];
  branding: TenantBranding;
  /** Optional id -> display name map for campaign blocks. */
  campaignNames?: Map<string, string>;
}

/**
 * Build the deck and return it as a Node Buffer ready to stream.
 */
export async function buildProposalPptx(
  args: BuildDeckArgs,
): Promise<Buffer> {
  const { title, description, blocks, branding } = args;
  const campaignNames = args.campaignNames ?? new Map<string, string>();

  const primary = hex(branding.primaryColor, "0B1D3A");
  const accent = hex(branding.accentColor, "1A8C96");
  const textColor = hex(branding.textColor, "1E1E2E");
  const company = branding.companyName || "Legal Marketing Intelligence";
  const footer =
    branding.footerText ||
    `${company} — Confidential`;

  const pptx = new PptxGenJS();
  pptx.author = company;
  pptx.company = company;
  pptx.subject = title;
  pptx.title = title;
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in

  // Slide master with branded footer band.
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

  // ── Title slide ──────────────────────────────────────────────────────
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

  // ── Content slides ───────────────────────────────────────────────────
  if (blocks.length === 0) {
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

  blocks.forEach((block, idx) => {
    const info = describeBlock(block, campaignNames);
    const slide = pptx.addSlide({ masterName: "LMI_MASTER" });

    // Accent rule
    slide.addShape("rect", {
      x: 0.6,
      y: 0.6,
      w: 1.4,
      h: 0.08,
      fill: { color: accent },
    });

    if (info.kicker) {
      slide.addText(info.kicker.toUpperCase(), {
        x: 0.6,
        y: 0.8,
        w: 11,
        h: 0.4,
        color: accent,
        fontSize: 13,
        bold: true,
        charSpacing: 2,
      });
    }

    slide.addText(info.heading, {
      x: 0.6,
      y: 1.25,
      w: 12.1,
      h: 1.1,
      color: primary,
      fontSize: 30,
      bold: true,
    });

    const bodyText = info.body.join("\n").trim();
    if (bodyText) {
      slide.addText(
        info.body.map((line) => ({
          text: line,
          options: { bullet: block.block_type !== "custom_text" },
        })),
        {
          x: 0.6,
          y: 2.6,
          w: 12.1,
          h: 4.0,
          color: textColor,
          fontSize: block.block_type === "custom_text" ? 16 : 18,
          valign: "top",
          lineSpacingMultiple: 1.2,
        },
      );
    }

    slide.addText(`${idx + 1} / ${blocks.length}`, {
      x: 11.4,
      y: 0.7,
      w: 1.3,
      h: 0.4,
      color: "9CA3AF",
      fontSize: 11,
      align: "right",
    });
  });

  // pptxgenjs returns a Buffer/Uint8Array for the 'nodebuffer' output.
  const out = (await pptx.write({
    outputType: "nodebuffer",
  })) as unknown as Buffer;
  return Buffer.isBuffer(out) ? out : Buffer.from(out as Uint8Array);
}
