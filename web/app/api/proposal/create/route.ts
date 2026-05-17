/**
 * POST /api/proposal/create
 *
 * Create a new proposal deck owned by the caller's tenant.
 *
 * Body: { title, description? }
 * Response: { id, created_at }
 *
 * Errors:
 *   401 — Unauthorized (no session / no profile)
 *   400 — Validation failed (body.errors[])
 *   500 — DB error
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/proposal-builder/server";
import {
  validateCreateProposal,
  type CreateProposalRequest,
  type CreateProposalResponse,
} from "@/lib/proposal-builder/types";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const auth = await getAuthenticatedUser(supabase);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateProposalRequest;
  try {
    body = (await req.json()) as CreateProposalRequest;
  } catch {
    return NextResponse.json(
      { error: "Request body must be JSON" },
      { status: 400 },
    );
  }

  const validation = validateCreateProposal(body);
  if (!validation.ok) {
    return NextResponse.json(
      { error: "Validation failed", errors: validation.errors },
      { status: 400 },
    );
  }

  // proposals/proposal_blocks aren't in the generated Database types yet;
  // use the same `as any` escape hatch as the campaigns routes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data, error } = (await db
    .from("proposals")
    .insert({
      tenant_id: auth.profile.tenant_id,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      created_by: auth.user.id,
    })
    .select("id, created_at")
    .single()) as {
    data: { id: string; created_at: string } | null;
    error: { message: string; code?: string } | null;
  };

  if (error) {
    const status = error.code === "42501" ? 403 : 500;
    return NextResponse.json(
      { error: "Insert failed", details: error.message },
      { status },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Insert returned no row" },
      { status: 500 },
    );
  }

  const response: CreateProposalResponse = {
    id: data.id,
    created_at: data.created_at,
  };
  return NextResponse.json(response);
}
