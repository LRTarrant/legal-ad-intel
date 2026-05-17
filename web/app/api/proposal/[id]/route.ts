/**
 * GET    /api/proposal/[id]?include=blocks  — fetch a proposal (+ blocks)
 * PUT    /api/proposal/[id]                  — update title/description
 * DELETE /api/proposal/[id]                  — delete a proposal
 *
 * RLS scopes every operation to the caller's tenant. A row that isn't
 * in the caller's tenant looks identical to "not found" (no ownership
 * leak).
 *
 * Errors:
 *   401 — Unauthorized
 *   400 — Validation failed
 *   404 — Not found (or other tenant's row)
 *   500 — DB error
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getAuthenticatedUser,
  resolveBrandingFromRequest,
} from "@/lib/proposal-builder/server";
import {
  validateUpdateProposal,
  type ProposalBlockRow,
  type GetProposalResponse,
  type UpdateProposalRequest,
  type UpdateProposalResponse,
} from "@/lib/proposal-builder/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const auth = await getAuthenticatedUser(supabase);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const includeBlocks =
    new URL(req.url).searchParams.get("include") === "blocks";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: proposal, error } = (await db
    .from("proposals")
    .select("id, title, description, created_at, updated_at")
    .eq("id", id)
    .single()) as {
    data: {
      id: string;
      title: string;
      description: string | null;
      created_at: string;
      updated_at: string;
    } | null;
    error: { message: string; code?: string } | null;
  };

  if (error) {
    if (error.code === "PGRST116" || error.message?.includes("0 rows")) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Query failed", details: error.message },
      { status: 500 },
    );
  }

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  let blocks: ProposalBlockRow[] | undefined;
  if (includeBlocks) {
    const { data: blockRows, error: blockErr } = (await db
      .from("proposal_blocks")
      .select("*")
      .eq("proposal_id", id)
      .order("order", { ascending: true })) as {
      data: ProposalBlockRow[] | null;
      error: { message: string } | null;
    };
    if (blockErr) {
      return NextResponse.json(
        { error: "Block query failed", details: blockErr.message },
        { status: 500 },
      );
    }
    blocks = blockRows ?? [];
  }

  const branding = await resolveBrandingFromRequest(req);

  const response: GetProposalResponse = {
    id: proposal.id,
    title: proposal.title,
    description: proposal.description,
    created_at: proposal.created_at,
    updated_at: proposal.updated_at,
    ...(blocks !== undefined ? { blocks } : {}),
    tenant_branding: branding,
  };
  return NextResponse.json(response);
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const auth = await getAuthenticatedUser(supabase);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: UpdateProposalRequest;
  try {
    body = (await req.json()) as UpdateProposalRequest;
  } catch {
    return NextResponse.json(
      { error: "Request body must be JSON" },
      { status: 400 },
    );
  }

  const validation = validateUpdateProposal(body);
  if (!validation.ok) {
    return NextResponse.json(
      { error: "Validation failed", errors: validation.errors },
      { status: 400 },
    );
  }

  const payload: Record<string, unknown> = {};
  if (body.title !== undefined) payload.title = body.title.trim();
  if (body.description !== undefined) {
    payload.description = body.description?.trim() || null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data, error } = (await db
    .from("proposals")
    .update(payload)
    .eq("id", id)
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
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  const response: UpdateProposalResponse = { updated_at: data[0]!.updated_at };
  return NextResponse.json(response);
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const auth = await getAuthenticatedUser(supabase);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Blocks are removed by ON DELETE CASCADE. .select() confirms a row
  // was actually deleted (RLS blocks cross-tenant deletes → 0 rows).
  const { data, error } = (await db
    .from("proposals")
    .delete()
    .eq("id", id)
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
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
