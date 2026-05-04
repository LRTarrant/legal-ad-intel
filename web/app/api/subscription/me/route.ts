/**
 * GET /api/subscription/me
 *
 * Returns the current user's subscription row, or null if they don't
 * have one yet (e.g. internal/admin user, freshly invited user).
 *
 * The Campaign Builder UI uses this to decide which practice area
 * tabs to show as unlocked vs. locked.
 *
 * RLS on the subscriptions table scopes reads to the current user.
 *
 * Errors:
 *   401 — Unauthorized
 *   500 — DB error
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  DemoModeAccessDenied,
  readDemoModeOverride,
} from "@/lib/admin/demo-mode";

/**
 * Subset of the subscriptions table that's safe to expose to the client.
 * Excludes Stripe IDs and other billing internals.
 */
export interface ClientSubscription {
  buyer_type: "media_company" | "ad_agency" | "law_firm";
  subscription_tier: string;
  billing_cycle: "monthly" | "annual";
  campaign_builder_mass_tort: boolean;
  campaign_builder_pi: boolean;
  campaign_builder_monthly_cap: number | null;
  campaign_builder_white_label: boolean;
  campaign_builder_api_access: boolean;
  geo_scope_states: string[] | null;
  geo_scope_unlimited: boolean;
  seats_included: number;
  seats_used: number;
  active_tort_addons: string[];
  status: "trialing" | "active" | "past_due" | "cancelled";
}

export interface SubscriptionMeResponse {
  subscription: ClientSubscription | null;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Demo-mode override (admin-only). When active, we synthesize a
  // ClientSubscription instead of querying the DB. Spoofing throws 403.
  let demoMode;
  try {
    demoMode = await readDemoModeOverride(supabase, request, user.id);
  } catch (e) {
    if (e instanceof DemoModeAccessDenied) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    throw e;
  }

  if (demoMode) {
    const synthetic: ClientSubscription = {
      buyer_type: demoMode.buyer_type,
      // Fixed display values for demo mode — the UI treats these as
      // strings only; no real billing implications.
      subscription_tier: "demo",
      billing_cycle: "monthly",
      campaign_builder_mass_tort: demoMode.mt_access,
      campaign_builder_pi: demoMode.pi_access,
      campaign_builder_monthly_cap: demoMode.monthly_cap,
      // Demo mode doesn't toggle these; reasonable defaults.
      campaign_builder_white_label: demoMode.buyer_type === "media_company",
      campaign_builder_api_access: false,
      geo_scope_states: demoMode.geo_scope_states,
      geo_scope_unlimited: demoMode.geo_scope_unlimited,
      seats_included: 1,
      seats_used: 1,
      active_tort_addons: [],
      status: "active",
    };
    const response: SubscriptionMeResponse = { subscription: synthetic };
    return NextResponse.json(response);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data, error } = (await db
    .from("subscriptions")
    .select(
      "buyer_type, subscription_tier, billing_cycle, " +
        "campaign_builder_mass_tort, campaign_builder_pi, " +
        "campaign_builder_monthly_cap, campaign_builder_white_label, " +
        "campaign_builder_api_access, geo_scope_states, geo_scope_unlimited, " +
        "seats_included, seats_used, active_tort_addons, status",
    )
    .eq("user_id", user.id)
    .single()) as {
    data: ClientSubscription | null;
    error: { message: string; code?: string } | null;
  };

  // PGRST116 = no rows. That's a valid state (e.g. internal/admin user
  // with no subscription record); return null instead of erroring.
  if (error && error.code !== "PGRST116" && !error.message?.includes("0 rows")) {
    return NextResponse.json(
      { error: "Query failed", details: error.message },
      { status: 500 },
    );
  }

  const response: SubscriptionMeResponse = { subscription: data ?? null };
  return NextResponse.json(response);
}
