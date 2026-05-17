/**
 * POST /api/proposal/[id]/export
 *
 * Body: { format: 'pptx' | 'pdf' }
 * Streams the generated file directly (no async jobs).
 *
 * - pptx → generated with pptxgenjs (pure JS, Vercel-safe).
 * - pdf  → 501 for now (deferred; see handoff notes).
 *
 * Errors:
 *   401 — Unauthorized
 *   400 — Bad/unknown format
 *   404 — Proposal not found (or other tenant's)
 *   500 — Generation error
 *   501 — PDF not yet implemented
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  getAuthenticatedUser,
  resolveBrandingFromRequest,
} from "@/lib/proposal-builder/server";
import { buildProposalPptx } from "@/lib/proposal-builder/pptx";
import { renderBlock } from "@/lib/proposal-builder/block-renderers";
import type { SlideSpec } from "@/lib/proposal-builder/slide-spec";
import type {
  ExportRequest,
  ProposalBlockRow,
} from "@/lib/proposal-builder/types";

/**
 * Service-role client for the data joins. The proposal + block rows are
 * still fetched RLS-scoped (caller's tenant only); only the cross-table
 * content reads (tort / ad / state dims) use the elevated client so a
 * join never silently drops rows behind per-user RLS. Falls back to the
 * RLS client if the service key is unset (degraded, never crashing).
 */
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, {
    auth: { persistSession: false },
  });
}

// pptxgenjs is Node-only — pin this handler to the Node runtime.
export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function safeFileName(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "proposal";
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const auth = await getAuthenticatedUser(supabase);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ExportRequest;
  try {
    body = (await req.json()) as ExportRequest;
  } catch {
    return NextResponse.json(
      { error: "Request body must be JSON" },
      { status: 400 },
    );
  }

  if (body.format !== "pptx" && body.format !== "pdf") {
    return NextResponse.json(
      { error: "format must be 'pptx' or 'pdf'" },
      { status: 400 },
    );
  }

  if (body.format === "pdf") {
    return NextResponse.json(
      {
        error:
          "PDF export is not yet implemented. Export to PPTX for now.",
      },
      { status: 501 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: proposal, error } = (await db
    .from("proposals")
    .select("id, title, description")
    .eq("id", id)
    .single()) as {
    data: { id: string; title: string; description: string | null } | null;
    error: { message: string; code?: string } | null;
  };

  if (error || !proposal) {
    if (
      error &&
      error.code !== "PGRST116" &&
      !error.message?.includes("0 rows")
    ) {
      return NextResponse.json(
        { error: "Query failed", details: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  const { data: blocks } = (await db
    .from("proposal_blocks")
    .select("*")
    .eq("proposal_id", id)
    .order("order", { ascending: true })) as {
    data: ProposalBlockRow[] | null;
  };

  const blockRows = blocks ?? [];

  // Best-effort campaign name enrichment. campaigns RLS is per-user, so
  // names resolve when the exporter owns the referenced campaigns; we
  // fall back to the block's label/id otherwise.
  const campaignIds = blockRows
    .filter((b) => b.block_type === "campaign")
    .map((b) => String(b.block_data?.campaign_id ?? ""))
    .filter(Boolean);

  const campaignNames = new Map<string, string>();
  if (campaignIds.length > 0) {
    const { data: campaigns } = (await db
      .from("campaigns")
      .select("id, name")
      .in("id", campaignIds)) as {
      data: { id: string; name: string | null }[] | null;
    };
    for (const c of campaigns ?? []) {
      if (c.name) campaignNames.set(c.id, c.name);
    }
  }

  const branding = await resolveBrandingFromRequest(req);

  // Service-role client for cross-table content joins; fall back to the
  // RLS-scoped client so a missing service key degrades instead of 500ing.
  const dataClient = getServiceClient() ?? db;

  const slides: SlideSpec[] = [];
  for (const block of blockRows) {
    const blockSlides = await renderBlock(block, dataClient, {
      branding,
      campaignNames,
    });
    slides.push(...blockSlides);
  }

  let buffer: Buffer;
  try {
    buffer = await buildProposalPptx({
      title: proposal.title,
      description: proposal.description,
      slides,
      branding,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: "PPTX generation failed",
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }

  const filename = `${safeFileName(proposal.title)}.pptx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
    },
  });
}
