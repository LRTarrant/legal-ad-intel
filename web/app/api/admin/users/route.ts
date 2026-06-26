import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { canManageUsers } from "@/lib/roles";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// GET /api/admin/users — list active users for the caller's tenant
export async function GET() {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();

    if (!profile || !canManageUsers(profile.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceClient = getServiceClient();

    // Get all profiles for this tenant (email lives in auth.users, not profiles)
    const { data: profiles, error } = await serviceClient
      .from("profiles")
      .select("id, full_name, role, created_at")
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 },
      );
    }

    // Fetch email and last_sign_in_at from auth.users via admin API
    const userIds = (profiles ?? []).map((p) => p.id);
    const authResults = await Promise.allSettled(
      userIds.map((uid) => serviceClient.auth.admin.getUserById(uid)),
    );

    const authMap = new Map<string, { email: string | null; last_sign_in_at: string | null }>();
    authResults.forEach((result, i) => {
      if (result.status === "fulfilled" && result.value.data?.user) {
        const authUser = result.value.data.user;
        authMap.set(userIds[i], {
          email: authUser.email ?? null,
          last_sign_in_at: authUser.last_sign_in_at ?? null,
        });
      }
    });

    // Entitlement summary per user (campaign-builder access). Drives the
    // super-admin "Access" column. One subscription row per user_id.
    type Entitlement = {
      campaign_builder_pi: boolean;
      campaign_builder_mass_tort: boolean;
      geo_scope_unlimited: boolean;
      geo_scope_states: string[] | null;
      status: string;
      campaign_builder_monthly_cap: number | null;
    };
    const entMap = new Map<string, Entitlement>();
    if (userIds.length > 0) {
      const { data: subs } = await serviceClient
        .from("subscriptions")
        .select(
          "user_id, campaign_builder_pi, campaign_builder_mass_tort, geo_scope_unlimited, geo_scope_states, status, campaign_builder_monthly_cap",
        )
        .in("user_id", userIds);
      for (const s of (subs ?? []) as Array<Entitlement & { user_id: string }>) {
        entMap.set(s.user_id, {
          campaign_builder_pi: s.campaign_builder_pi,
          campaign_builder_mass_tort: s.campaign_builder_mass_tort,
          geo_scope_unlimited: s.geo_scope_unlimited,
          geo_scope_states: s.geo_scope_states,
          status: s.status,
          campaign_builder_monthly_cap: s.campaign_builder_monthly_cap,
        });
      }
    }

    const users = (profiles ?? []).map((p) => ({
      id: p.id,
      full_name: p.full_name,
      email: authMap.get(p.id)?.email ?? null,
      role: p.role,
      last_sign_in_at: authMap.get(p.id)?.last_sign_in_at ?? null,
      created_at: p.created_at,
      entitlements: entMap.get(p.id) ?? null,
    }));

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
