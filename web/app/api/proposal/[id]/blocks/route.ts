/**
 * POST /api/proposal/[id]/blocks
 *
 * Append (or insert at a given order) a block into a proposal.
 *
 * Body: { block_type, block_data, order }
 * Response: { block_id, order }
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
  validateBlock,
  type CreateBlockRequest,
  type CreateBlockResponse,
} from "@/lib/proposal-builder/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const auth = await getAuthenticatedUser(supabase);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateBlockRequest;
  try {
    body = (await req.json()) as CreateBlockRequest;
  } catch {
    return NextResponse.json(
      { error: "Request body must be JSON" },
      { status: 400 },
    );
  }

  const validation = validateBlock(body.block_type, body.block_data);
  if (!validation.ok) {
    return NextResponse.json(
      { error: "Validation failed", errors: validation.errors },
      { status: 400 },
    );
  }

  if (typeof body.order !== "number" || !Number.isFinite(body.order)) {
    return NextResponse.json(
      { error: "order must be a number" },
      { status: 400 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Confirm the proposal exists in the caller's tenant (RLS-scoped).
  // Gives a clean 404 instead of leaking via an RLS-blocked insert.
  const { data: proposal } = (await db
    .from("proposals")
    .select("id")
    .eq("id", id)
    .single()) as { data: { id: string } | null };

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  const { data, error } = (await db
    .from("proposal_blocks")
    .insert({
      proposal_id: id,
      block_type: body.block_type,
      block_data: body.block_data ?? {},
      order: body.order,
    })
    .select("id, order")
    .single()) as {
    data: { id: string; order: number } | null;
    error: { message: string; code?: string } | null;
  };

  if (error) {
    const status = error.code === "42501" ? 404 : 500;
    return NextResponse.json(
      {
        error: status === 404 ? "Proposal not found" : "Insert failed",
        details: error.message,
      },
      { status },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Insert returned no row" },
      { status: 500 },
    );
  }

  const response: CreateBlockResponse = {
    block_id: data.id,
    order: data.order,
  };
  return NextResponse.json(response);
}
