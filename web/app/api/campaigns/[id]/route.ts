/**
 * GET /api/campaigns/[id]   — fetch a single campaign
 * DELETE /api/campaigns/[id] — delete a campaign
 *
 * RLS policies on the `campaigns` table ensure the current user can
 * only fetch / delete their own campaigns.
 *
 * Errors:
 *   401 — Unauthorized
 *   404 — Campaign not found (or owned by another user — same response
 *         on purpose; don't leak ownership info)
 *   500 — DB error
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  CampaignRow,
  GetCampaignResponse,
} from "@/lib/campaign-builder/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data, error } = (await db
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .single()) as { data: CampaignRow | null; error: { message: string; code?: string } | null };

  if (error) {
    if (error.code === "PGRST116" || error.message?.includes("0 rows")) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Query failed", details: error.message },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const response: GetCampaignResponse = { campaign: data };
  return NextResponse.json(response);
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Use .select() after delete so we can confirm a row was actually
  // deleted (RLS would block the delete if not owned, returning 0 rows).
  const { data, error } = (await db
    .from("campaigns")
    .delete()
    .eq("id", id)
    .select()) as { data: CampaignRow[] | null; error: { message: string } | null };

  if (error) {
    return NextResponse.json(
      { error: "Delete failed", details: error.message },
      { status: 500 },
    );
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true, id });
}
