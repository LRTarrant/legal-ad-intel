import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireAdmin(supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["tenant_admin", "super_admin"].includes(profile.role)) {
    return null;
  }
  return user;
}

const ALLOWED_STATUS = [
  "backlog",
  "scoping",
  "in_build",
  "launched",
  "maintenance",
  "paused",
] as const;
const ALLOWED_TIER = ["tier_1", "tier_2", "tier_3", "tier_4"] as const;

const EDITABLE_FIELDS = new Set([
  "status",
  "priority_score",
  "priority_tier",
  "data_coverage_pct",
  "has_ad_data",
  "has_serp_data",
  "has_judicial_data",
  "has_mdl_data",
  "target_launch_date",
  "launched_at",
  "owner",
  "blockers",
  "notes",
]);

/**
 * GET /api/admin/state-rollout?queue=next
 *   queue=next  -> read from v_states_to_build_next (ranked queue)
 *   default     -> read full state_rollout table
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await requireAdmin(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const queue = req.nextUrl.searchParams.get("queue");
    const serviceClient = getServiceClient();

    if (queue === "next") {
      const { data, error } = await serviceClient
        .from("v_states_to_build_next")
        .select("*");
      if (error) {
        console.error("v_states_to_build_next error:", error);
        return NextResponse.json(
          { error: "Failed to fetch queue" },
          { status: 500 },
        );
      }
      return NextResponse.json({ rows: data ?? [] });
    }

    const { data, error } = await serviceClient
      .from("state_rollout")
      .select("*")
      .order("population_rank", { ascending: true, nullsFirst: false });

    if (error) {
      console.error("state_rollout fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch state_rollout" },
        { status: 500 },
      );
    }
    return NextResponse.json({ rows: data ?? [] });
  } catch (e) {
    console.error("GET /api/admin/state-rollout fatal:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/state-rollout
 * Body: { state_code: string, updates: Partial<Row> }
 * Only whitelisted fields can be updated.
 */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await requireAdmin(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const stateCode = body?.state_code;
    const incoming = body?.updates ?? {};

    if (!stateCode || typeof stateCode !== "string") {
      return NextResponse.json(
        { error: "state_code is required" },
        { status: 400 },
      );
    }

    const updates: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(incoming)) {
      if (!EDITABLE_FIELDS.has(k)) continue;
      if (k === "status" && v !== null && !ALLOWED_STATUS.includes(v as never)) {
        return NextResponse.json(
          { error: `Invalid status: ${v}` },
          { status: 400 },
        );
      }
      if (
        k === "priority_tier" &&
        v !== null &&
        !ALLOWED_TIER.includes(v as never)
      ) {
        return NextResponse.json(
          { error: `Invalid priority_tier: ${v}` },
          { status: 400 },
        );
      }
      updates[k] = v === "" ? null : v;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No editable fields provided" },
        { status: 400 },
      );
    }

    const serviceClient = getServiceClient();

    // Auto-stamp launched_at = today when status flips to 'launched'
    // and the caller hasn't explicitly provided a date.
    if (updates.status === "launched" && !("launched_at" in updates)) {
      const { data: existing } = await serviceClient
        .from("state_rollout")
        .select("launched_at")
        .eq("state_code", stateCode)
        .single();
      if (!existing?.launched_at) {
        updates.launched_at = new Date().toISOString().slice(0, 10);
      }
    }
    const { data, error } = await serviceClient
      .from("state_rollout")
      .update(updates)
      .eq("state_code", stateCode)
      .select()
      .single();

    if (error) {
      console.error("state_rollout update error:", error);
      return NextResponse.json(
        { error: "Failed to update row" },
        { status: 500 },
      );
    }

    return NextResponse.json({ row: data });
  } catch (e) {
    console.error("PATCH /api/admin/state-rollout fatal:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
