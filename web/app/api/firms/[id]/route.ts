/**
 * GET   /api/firms/[id]  \u2014 fetch one firm with caller's role
 * PATCH /api/firms/[id]  \u2014 update brand profile / metadata
 *
 * Both routes go through the server module (firms/server.ts) so RLS
 * rejection surfaces as a clean 404, not an opaque Postgres error.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFirmForUser, updateFirm } from "@/lib/firms/server";
import { validateCreateFirm, type UpdateFirmInput } from "@/lib/firms/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const firm = await getFirmForUser(supabase, user.id, id);
    if (!firm) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ firm });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: UpdateFirmInput;
  try {
    body = (await req.json()) as UpdateFirmInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Reuse the create validator for shape checks. label is required there
  // but optional on update \u2014 give it a safe default so validation passes
  // when the user is only updating brand profile fields.
  const validation = validateCreateFirm({
    label: body.label ?? "placeholder",
    ...body,
  });
  if (!validation.ok) {
    return NextResponse.json(
      { error: "Validation failed", errors: validation.errors },
      { status: 400 },
    );
  }

  try {
    const firm = await updateFirm(supabase, user.id, id, body);
    return NextResponse.json({ firm });
  } catch (e) {
    const msg = (e as Error).message;
    const status =
      msg.includes("not found") ? 404 : msg.includes("viewers") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
