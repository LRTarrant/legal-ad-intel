/**
 * GET  /api/firms          \u2014 list firms the current user manages
 * POST /api/firms          \u2014 create a new firm with caller as manager
 *
 * Use cases:
 *   - GET: Settings \u2192 Client Firms list, Campaign Builder firm picker
 *   - POST: Agency / media co. "Add Client" flow
 *
 * RLS already protects firms + firm_managers, but we go through the
 * server module so business rules (validation, role assignment, audit)
 * live in one place instead of being scattered across Supabase queries.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createFirm,
  listFirmsForUser,
} from "@/lib/firms/server";
import { validateCreateFirm, type CreateFirmInput } from "@/lib/firms/types";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const firms = await listFirmsForUser(supabase, user.id);
    return NextResponse.json({ firms });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateFirmInput;
  try {
    body = (await req.json()) as CreateFirmInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = validateCreateFirm(body);
  if (!validation.ok) {
    return NextResponse.json(
      { error: "Validation failed", errors: validation.errors },
      { status: 400 },
    );
  }

  // For now, anyone can create a firm \u2014 they become the 'manager' of
  // the new row by default. Owners are minted only via the auto-create
  // path (ensureSelfFirmForLawFirm) so the 1-owner-per-firm invariant
  // is preserved.
  try {
    const firm = await createFirm(supabase, user.id, body, "manager");
    return NextResponse.json({ firm }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
