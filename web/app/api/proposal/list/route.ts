/**
 * GET /api/proposal/list?limit=20&offset=0
 *
 * List the caller's tenant's proposals, newest first. RLS scopes the
 * query to the caller's tenant.
 *
 * Response: { proposals: ProposalRow[], total: number }
 *
 * Errors:
 *   401 — Unauthorized
 *   400 — Bad query params
 *   500 — DB error
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/proposal-builder/server";
import type {
  ProposalRow,
  ListProposalsResponse,
} from "@/lib/proposal-builder/types";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const auth = await getAuthenticatedUser(supabase);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const limitRaw = url.searchParams.get("limit");
  const offsetRaw = url.searchParams.get("offset");

  let limit = DEFAULT_LIMIT;
  if (limitRaw !== null) {
    const parsed = parseInt(limitRaw, 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      return NextResponse.json(
        { error: "limit must be a positive integer" },
        { status: 400 },
      );
    }
    limit = Math.min(parsed, MAX_LIMIT);
  }

  let offset = 0;
  if (offsetRaw !== null) {
    const parsed = parseInt(offsetRaw, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      return NextResponse.json(
        { error: "offset must be a non-negative integer" },
        { status: 400 },
      );
    }
    offset = parsed;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data, error, count } = (await db
    .from("proposals")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)) as {
    data: ProposalRow[] | null;
    error: { message: string } | null;
    count: number | null;
  };

  if (error) {
    return NextResponse.json(
      { error: "Query failed", details: error.message },
      { status: 500 },
    );
  }

  const response: ListProposalsResponse = {
    proposals: data ?? [],
    total: count ?? 0,
  };
  return NextResponse.json(response);
}
