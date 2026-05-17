/**
 * PUT    /api/proposal/[id]/blocks/[block_id]  — update block_data/order
 * DELETE /api/proposal/[id]/blocks/[block_id]  — remove a block
 *
 * Scoped to the parent proposal_id; RLS gates to the caller's tenant.
 *
 * Errors:
 *   401 — Unauthorized
 *   400 — Validation failed
 *   404 — Block not found (wrong proposal / other tenant)
 *   500 — DB error
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/proposal-builder/server";
import type {
  UpdateBlockRequest,
  UpdateBlockResponse,
} from "@/lib/proposal-builder/types";

interface RouteContext {
  params: Promise<{ id: string; block_id: string }>;
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  const { id, block_id } = await ctx.params;
  const supabase = await createClient();

  const auth = await getAuthenticatedUser(supabase);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: UpdateBlockRequest;
  try {
    body = (await req.json()) as UpdateBlockRequest;
  } catch {
    return NextResponse.json(
      { error: "Request body must be JSON" },
      { status: 400 },
    );
  }

  const payload: Record<string, unknown> = {};
  if (body.block_data !== undefined) {
    if (
      typeof body.block_data !== "object" ||
      body.block_data === null ||
      Array.isArray(body.block_data)
    ) {
      return NextResponse.json(
        { error: "block_data must be an object" },
        { status: 400 },
      );
    }
    payload.block_data = body.block_data;
  }
  if (body.order !== undefined) {
    if (typeof body.order !== "number" || !Number.isFinite(body.order)) {
      return NextResponse.json(
        { error: "order must be a number" },
        { status: 400 },
      );
    }
    payload.order = body.order;
  }
  if (Object.keys(payload).length === 0) {
    return NextResponse.json(
      { error: "provide at least one of block_data or order" },
      { status: 400 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data, error } = (await db
    .from("proposal_blocks")
    .update(payload)
    .eq("id", block_id)
    .eq("proposal_id", id)
    .select("updated_at")) as {
    data: { updated_at: string }[] | null;
    error: { message: string } | null;
  };

  if (error) {
    return NextResponse.json(
      { error: "Update failed", details: error.message },
      { status: 500 },
    );
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Block not found" }, { status: 404 });
  }

  const response: UpdateBlockResponse = { updated_at: data[0]!.updated_at };
  return NextResponse.json(response);
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id, block_id } = await ctx.params;
  const supabase = await createClient();

  const auth = await getAuthenticatedUser(supabase);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data, error } = (await db
    .from("proposal_blocks")
    .delete()
    .eq("id", block_id)
    .eq("proposal_id", id)
    .select("id")) as {
    data: { id: string }[] | null;
    error: { message: string } | null;
  };

  if (error) {
    return NextResponse.json(
      { error: "Delete failed", details: error.message },
      { status: 500 },
    );
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Block not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
