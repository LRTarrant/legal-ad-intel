/**
 * POST /api/campaigns/save
 *
 * Save a campaign configuration. If `id` is provided, updates that
 * campaign (RLS prevents updates to campaigns owned by other users).
 * Otherwise, creates a new campaign owned by the current user.
 *
 * Request body: SaveCampaignRequest (see web/lib/campaign-builder/types.ts)
 *
 * Response: { campaign: CampaignRow }
 *
 * Errors:
 *   401 — Unauthorized (no auth.users session)
 *   400 — Validation failed (see body.errors[])
 *   404 — Update target not found / not owned by user
 *   500 — Unexpected DB error
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  validateSaveCampaign,
  type CampaignRow,
  type SaveCampaignRequest,
  type SaveCampaignResponse,
} from "@/lib/campaign-builder/types";
import {
  checkCampaignBuilderEntitlement,
  entitlementErrorBody,
} from "@/lib/campaign-builder/entitlements";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: SaveCampaignRequest;
  try {
    body = (await req.json()) as SaveCampaignRequest;
  } catch {
    return NextResponse.json(
      { error: "Request body must be JSON" },
      { status: 400 },
    );
  }

  const validation = validateSaveCampaign(body);
  if (!validation.ok) {
    return NextResponse.json(
      { error: "Validation failed", errors: validation.errors },
      { status: 400 },
    );
  }

  // Server-side entitlement gate. /save is the canonical "create" surface
  // for campaigns, so we set is_create=true when no id is supplied so the
  // monthly cap is enforced. Updates (id present) bypass the cap so users
  // at the cap can still edit existing rows.
  {
    const gate = await checkCampaignBuilderEntitlement(supabase, user.id, {
      practice_area: body.practice_area,
      state: body.state ?? null,
      is_create: !body.id,
    });
    if (!gate.ok) {
      const { body: errBody, status } = entitlementErrorBody(gate);
      return NextResponse.json(errBody, { status });
    }
  }

  // Build the row payload. Only include fields the caller actually sent
  // so updates can be partial (e.g. just changing the status to 'active').
  const payload: Record<string, unknown> = {
    practice_area: body.practice_area,
  };
  if (body.tort_slug !== undefined) payload.tort_slug = body.tort_slug;
  if (body.pi_category !== undefined) payload.pi_category = body.pi_category;
  if (body.state !== undefined) payload.state = body.state;
  if (body.market_dma_code !== undefined) payload.market_dma_code = body.market_dma_code;
  if (body.market_display_name !== undefined) payload.market_display_name = body.market_display_name;
  if (body.severity_modifiers !== undefined) payload.severity_modifiers = body.severity_modifiers;
  if (body.config !== undefined) payload.config = body.config;
  if (body.name !== undefined) payload.name = body.name;
  if (body.status !== undefined) payload.status = body.status;

  // Cast to any: campaigns table not yet in generated Database types.
  // Consistent with the existing plan/route.ts pattern.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  if (body.id) {
    // Update path. RLS policy `campaigns_update_own` ensures the user
    // can only update their own row. If the row is not theirs (or
    // doesn't exist), the update returns no row.
    const { data, error } = (await db
      .from("campaigns")
      .update(payload)
      .eq("id", body.id)
      .select()
      .single()) as { data: CampaignRow | null; error: { message: string; code?: string } | null };

    if (error) {
      // PGRST116 = no rows; either not found or RLS blocked
      if (error.message?.includes("0 rows") || error.message?.includes("PGRST116")) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }
      return NextResponse.json(
        { error: "Update failed", details: error.message },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const response: SaveCampaignResponse = { campaign: data };
    return NextResponse.json(response);
  }

  // Insert path. user_id is added explicitly; RLS policy will also
  // enforce auth.uid() = user_id at the DB layer.
  const insertPayload = { ...payload, user_id: user.id };

  const { data, error } = (await db
    .from("campaigns")
    .insert(insertPayload)
    .select()
    .single()) as { data: CampaignRow | null; error: { message: string } | null };

  if (error) {
    return NextResponse.json(
      { error: "Insert failed", details: error.message },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Insert returned no row" },
      { status: 500 },
    );
  }

  const response: SaveCampaignResponse = { campaign: data };
  return NextResponse.json(response);
}
