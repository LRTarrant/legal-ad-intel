/**
 * GET /api/dma-markets
 *
 * Returns Nielsen DMA markets, optionally filtered by state.
 *
 * Query params:
 *   state  — optional two-letter state code (e.g. 'AL'). When provided,
 *            returns DMAs where primary_state matches OR the state is
 *            in states_covered. Without it, returns all DMAs sorted by
 *            rank (ascending = most populated first).
 *
 * The Campaign Builder PI config form calls this after the user picks
 * a state, populating the DMA dropdown with the relevant markets.
 *
 * Auth-required: yes. We don't expose the DMA list to unauthenticated
 * users since this is a paid product feature, even though the data
 * itself is public reference info.
 *
 * Errors:
 *   401 — Unauthorized
 *   400 — Bad state code
 *   500 — DB error
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  DMAMarket,
  ListDMAMarketsResponse,
} from "@/lib/campaign-builder/types";

const STATE_CODE_RE = /^[A-Z]{2}$/;

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const stateRaw = url.searchParams.get("state");
  const state = stateRaw?.toUpperCase();

  if (state && !STATE_CODE_RE.test(state)) {
    return NextResponse.json(
      { error: "state must be a two-letter state code (e.g. 'AL')" },
      { status: 400 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  let result: { data: DMAMarket[] | null; error: { message: string } | null };
  if (state) {
    // primary_state = state OR states_covered contains state.
    // Postgres array containment in PostgREST: cs (contains) operator.
    result = await db
      .from("dma_markets")
      .select("*")
      .or(`primary_state.eq.${state},states_covered.cs.{${state}}`)
      .order("rank", { ascending: true, nullsFirst: false });
  } else {
    result = await db
      .from("dma_markets")
      .select("*")
      .order("rank", { ascending: true, nullsFirst: false });
  }

  if (result.error) {
    return NextResponse.json(
      { error: "Query failed", details: result.error.message },
      { status: 500 },
    );
  }

  const response: ListDMAMarketsResponse = {
    markets: result.data ?? [],
  };
  return NextResponse.json(response);
}
