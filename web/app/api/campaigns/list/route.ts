/**
 * GET /api/campaigns/list
 *
 * Returns the current user's campaigns, sorted by created_at DESC.
 * Cursor pagination via the last item's id; small page sizes (default
 * 25, max 100) keep response payloads bounded.
 *
 * Query params:
 *   practice_area  — optional filter ('mass_tort' | 'personal_injury')
 *   status         — optional filter ('draft' | 'active' | 'archived')
 *   limit          — page size (1-100, default 25)
 *   cursor         — id of the last item from the previous page
 *
 * Response: { campaigns: CampaignRow[], next_cursor: string | null }
 *
 * Errors:
 *   401 — Unauthorized
 *   400 — Bad query params
 *   500 — DB error
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  CampaignRow,
  ListCampaignsResponse,
} from "@/lib/campaign-builder/types";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const practiceArea = url.searchParams.get("practice_area");
  const status = url.searchParams.get("status");
  const cursor = url.searchParams.get("cursor");
  const limitRaw = url.searchParams.get("limit");

  // Parse + clamp limit
  let limit = DEFAULT_LIMIT;
  if (limitRaw) {
    const parsed = parseInt(limitRaw, 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      return NextResponse.json(
        { error: "limit must be a positive integer" },
        { status: 400 },
      );
    }
    limit = Math.min(parsed, MAX_LIMIT);
  }

  if (practiceArea && practiceArea !== "mass_tort" && practiceArea !== "personal_injury") {
    return NextResponse.json(
      { error: "practice_area must be 'mass_tort' or 'personal_injury'" },
      { status: 400 },
    );
  }

  if (status && !["draft", "active", "archived"].includes(status)) {
    return NextResponse.json(
      { error: "status must be 'draft', 'active', or 'archived'" },
      { status: 400 },
    );
  }

  // Cursor pagination: fetch one extra row to detect "more available".
  // If we get limit+1 rows, the last is dropped from the response and
  // its id becomes next_cursor.
  //
  // We use `any` here for the query builder — consistent with the
  // existing plan/route.ts pattern. The `campaigns` table isn't yet
  // in the generated Database types, so strict typing would force
  // verbose casts at every step.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  let query = db.from("campaigns").select("*").eq("user_id", user.id);

  if (practiceArea) {
    query = query.eq("practice_area", practiceArea);
  }

  if (status) {
    query = query.eq("status", status);
  }

  // Cursor: only return rows older than the cursor row.
  // UUIDs aren't time-ordered, so we look up the cursor's created_at
  // and use that as the pagination boundary.
  if (cursor) {
    const cursorLookup = await db
      .from("campaigns")
      .select("created_at")
      .eq("id", cursor)
      .eq("user_id", user.id)
      .single();

    if (cursorLookup.data) {
      query = query.lt("created_at", cursorLookup.data.created_at);
    }
    // If cursor row doesn't exist or isn't theirs, ignore it and
    // start from the top (safer than returning an error for stale
    // cursors after deletes).
  }

  const { data, error } = (await query
    .order("created_at", { ascending: false })
    .limit(limit + 1)) as { data: CampaignRow[] | null; error: { message: string } | null };

  if (error) {
    return NextResponse.json(
      { error: "Query failed", details: error.message },
      { status: 500 },
    );
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const campaigns = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? campaigns[campaigns.length - 1]!.id : null;

  const response: ListCampaignsResponse = {
    campaigns,
    next_cursor: nextCursor,
  };
  return NextResponse.json(response);
}
