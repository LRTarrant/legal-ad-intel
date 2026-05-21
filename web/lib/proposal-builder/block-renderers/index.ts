/**
 * Block-renderer dispatcher.
 *
 * Each block type resolves to an ordered array of SlideSpec. A renderer that
 * throws (deleted tort slug, missing table, network blip) is caught here and
 * degraded to a single fallback slide — one bad block never fails the whole
 * export.
 *
 * The Supabase client passed in is the service-role client (see the export
 * route): renderers join across tort / ad / state tables without per-user
 * RLS gaps. `campaigns` RLS is per-user, so the Campaign block stays
 * label-only by design (deferred to a later PR).
 */

import type { TenantBranding } from "@/lib/tenant-config";
import type { ProposalBlockRow } from "@/lib/proposal-builder/types";
import {
  type SlideSpec,
  fallbackSlide,
} from "@/lib/proposal-builder/slide-spec";
import type { SupabaseLike } from "./shared";
import { renderTortPage } from "./tort-page";
import { renderStateIntel } from "./state-intel";
import { renderAdIntel } from "./ad-intel";

export type { SlideSpec } from "@/lib/proposal-builder/slide-spec";

function blockLabel(block: ProposalBlockRow): string {
  const d = block.block_data ?? {};
  if (typeof d.label === "string" && d.label) return d.label;
  if (typeof d.title === "string" && d.title) return d.title;
  return (
    String(
      d.tort_slug ?? d.state_abbr ?? d.surface ?? d.campaign_id ?? "Block",
    ) || "Block"
  );
}

function renderCustomText(block: ProposalBlockRow): SlideSpec[] {
  const d = block.block_data ?? {};
  return [
    {
      heading: String(d.title ?? "Untitled"),
      bullets: String(d.content ?? "")
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean),
    },
  ];
}

function renderCampaign(
  block: ProposalBlockRow,
  campaignNames: Map<string, string>,
): SlideSpec[] {
  const d = block.block_data ?? {};
  const cid = String(d.campaign_id ?? "");
  const name =
    campaignNames.get(cid) || String(d.label ?? "") || "Campaign";
  return [
    {
      kicker: "Campaign",
      heading: name,
      bullets: [
        "Saved campaign plan from the Campaign Builder.",
        cid ? `Campaign ID: ${cid}` : "",
      ].filter(Boolean),
    },
  ];
}

export interface RenderContext {
  branding: TenantBranding;
  /** Best-effort id → name map for campaign blocks (RLS-gated). */
  campaignNames: Map<string, string>;
}

export async function renderBlock(
  block: ProposalBlockRow,
  supabase: SupabaseLike,
  ctx: RenderContext,
): Promise<SlideSpec[]> {
  try {
    switch (block.block_type) {
      case "tort_page":
        return await renderTortPage(block, supabase);
      case "state_intel":
        return await renderStateIntel(block, supabase);
      case "ad_intel":
        return await renderAdIntel(block, supabase);
      case "campaign":
        return renderCampaign(block, ctx.campaignNames);
      case "custom_text":
        return renderCustomText(block);
      default:
        return [
          fallbackSlide(
            blockLabel(block),
            `Unsupported block type: ${block.block_type}`,
          ),
        ];
    }
  } catch (e) {
    return [
      fallbackSlide(
        blockLabel(block),
        `Couldn't resolve data for this block (${
          e instanceof Error ? e.message : String(e)
        }). The rest of the deck exported normally.`,
      ),
    ];
  }
}
