/**
 * PUT /api/proposal/[id]/blocks/reorder
 *
 * Persist a new ordering for the proposal's blocks.
 *
 * Body: { blocks: [{ id, order }, ...] }
 * Response: { success: true }
 *
 * Each update is scoped to this proposal_id AND gated by RLS, so a
 * block from another proposal/tenant can't be reordered in.
 *
 * Errors:
 *   401 — Unauthorized
 *   400 — Validation failed
 *   404 — Proposal not found (or other tenant's)
 *   500 — DB error
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/proposal-builder/server";
import {
  validateReorder,
  type ReorderBlocksRequest,
} from "@/lib/proposal-builder/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const auth = await getAuthenticatedUser(supabase);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ReorderBlocksRequest;
  try {
    body = (await req.json()) as ReorderBlocksRequest;
  } catch {
    return NextResponse.json(
      { error: "Request body must be JSON" },
      { status: 400 },
    );
  }

  const validation = validateReorder(body);
  if (!validation.ok) {
    return NextResponse.json(
      { error: "Validation failed", errors: validation.errors },
      { status: 400 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Confirm the proposal is in the caller's tenant (RLS-scoped) before
  // touching any blocks.
  const { data: proposal } = (await db
    .from("proposals")
    .select("id")
    .eq("id", id)
    .single()) as { data: { id: string } | null };

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  // No bulk "set different value per row" in PostgREST — issue one
  // scoped update per block. Deck sizes are small (tens of blocks).
  for (const b of body.blocks) {
    const { error } = (await db
      .from("proposal_blocks")
      .update({ order: b.order })
      .eq("id", b.id)
      .eq("proposal_id", id)) as { error: { message: string } | null };

    if (error) {
      return NextResponse.json(
        { error: "Reorder failed", details: error.message },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ success: true });
}
