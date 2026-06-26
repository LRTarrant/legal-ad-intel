/**
 * PATCH /api/admin/users/[id]/subscription
 *
 * Manage a user's campaign-builder entitlements (PI / Mass Tort access, geo
 * scope, status, monthly cap). Entitlements determine paid access, so this is
 * gated to **super_admin only** — a tenant_admin must not be able to grant
 * their own tenant paid access. super_admin is LMI-system-wide, so there is no
 * tenant restriction on the target.
 *
 * Upserts the row in `subscriptions` (keyed by user_id). When no row exists,
 * a new one is created with sensible defaults for the NOT-NULL billing columns
 * (buyer_type, subscription_tier) and marked as an admin grant.
 *
 * Errors: 400 invalid · 401 unauthenticated · 403 not super_admin · 404 user
 * not found · 500 write failure.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/roles";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

const STATUSES = new Set(["trialing", "active", "past_due", "cancelled"]);
const BUYER_TYPES = new Set(["media_company", "ad_agency", "law_firm"]);

interface SubscriptionPatchBody {
  campaign_builder_pi?: boolean;
  campaign_builder_mass_tort?: boolean;
  geo_scope_unlimited?: boolean;
  geo_scope_states?: string[];
  status?: string;
  campaign_builder_monthly_cap?: number | null;
  buyer_type?: string;
  subscription_tier?: string;
}

function cleanStates(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(
    new Set(
      raw
        .map((s) => String(s).trim().toUpperCase())
        .filter((s) => /^[A-Z]{2}$/.test(s)),
    ),
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: targetUserId } = await params;
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!callerProfile || !isSuperAdmin(callerProfile.role)) {
      return NextResponse.json(
        { error: "Only super admins can manage entitlements" },
        { status: 403 },
      );
    }

    let body: SubscriptionPatchBody;
    try {
      body = (await req.json()) as SubscriptionPatchBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (body.status && !STATUSES.has(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    if (body.buyer_type && !BUYER_TYPES.has(body.buyer_type)) {
      return NextResponse.json({ error: "Invalid buyer_type" }, { status: 400 });
    }
    if (
      body.campaign_builder_monthly_cap != null &&
      (typeof body.campaign_builder_monthly_cap !== "number" ||
        body.campaign_builder_monthly_cap < 0)
    ) {
      return NextResponse.json({ error: "Invalid monthly cap" }, { status: 400 });
    }

    const service = getServiceClient();

    const { data: target } = await service
      .from("profiles")
      .select("id")
      .eq("id", targetUserId)
      .single();
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data: existing } = await service
      .from("subscriptions")
      .select("user_id")
      .eq("user_id", targetUserId)
      .maybeSingle();

    const states = body.geo_scope_states !== undefined ? cleanStates(body.geo_scope_states) : undefined;

    if (existing) {
      // Update only the fields actually supplied.
      const fields: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (typeof body.campaign_builder_pi === "boolean") fields.campaign_builder_pi = body.campaign_builder_pi;
      if (typeof body.campaign_builder_mass_tort === "boolean") fields.campaign_builder_mass_tort = body.campaign_builder_mass_tort;
      if (typeof body.geo_scope_unlimited === "boolean") fields.geo_scope_unlimited = body.geo_scope_unlimited;
      if (states !== undefined) fields.geo_scope_states = states.length > 0 ? states : null;
      if (body.status) fields.status = body.status;
      if (body.campaign_builder_monthly_cap !== undefined) fields.campaign_builder_monthly_cap = body.campaign_builder_monthly_cap;

      const { error } = await service
        .from("subscriptions")
        .update(fields)
        .eq("user_id", targetUserId);
      if (error) {
        return NextResponse.json({ error: "Failed to update entitlements" }, { status: 500 });
      }
    } else {
      // Create a fresh admin-granted subscription with the supplied access.
      const insert = {
        user_id: targetUserId,
        buyer_type: body.buyer_type ?? "law_firm",
        subscription_tier: body.subscription_tier ?? "admin_granted",
        status: body.status ?? "active",
        campaign_builder_pi: !!body.campaign_builder_pi,
        campaign_builder_mass_tort: !!body.campaign_builder_mass_tort,
        geo_scope_unlimited: !!body.geo_scope_unlimited,
        geo_scope_states: states && states.length > 0 ? states : null,
        campaign_builder_monthly_cap:
          typeof body.campaign_builder_monthly_cap === "number"
            ? body.campaign_builder_monthly_cap
            : null,
      };
      const { error } = await service.from("subscriptions").insert(insert);
      if (error) {
        return NextResponse.json({ error: "Failed to create entitlements" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
