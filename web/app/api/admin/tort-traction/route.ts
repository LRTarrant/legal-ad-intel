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

const ALLOWED_LIFECYCLE = [
  "evaluating",
  "emerging",
  "active",
  "mature",
  "winding_down",
  "dropped",
] as const;
const ALLOWED_MDL_STAGE = [
  "pre_mdl",
  "newly_consolidated",
  "bellwether",
  "settlement",
  "wind_down",
] as const;
const ALLOWED_TIER = ["tier_1", "tier_2", "tier_3", "tier_4"] as const;
const ALLOWED_FRAUD = ["low", "medium", "high"] as const;
const ALLOWED_STRICTNESS = ["loose", "standard", "strict"] as const;

const EDITABLE_FIELDS = new Set([
  "lifecycle_stage",
  "mdl_stage",
  "priority_score",
  "priority_tier",
  "firm_interest_count",
  "outreach_reply_rate",
  "pipeline_deals",
  "closed_deals",
  "inventory_committed",
  "est_cpl_usd",
  "est_cpa_usd",
  "est_cpk_usd",
  "payout_per_case_usd",
  "fraud_risk",
  "criteria_strictness",
  "has_landing_page",
  "has_intake_script",
  "has_creative",
  "has_cost_benchmarks",
  "data_freshness_days",
  "owner",
  "last_reviewed_at",
  "notes",
]);

function validateEnum(
  field: string,
  value: unknown,
  allowed: readonly string[],
): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !allowed.includes(value)) {
    return `Invalid ${field}: ${String(value)}`;
  }
  return null;
}

/**
 * GET /api/admin/tort-traction?queue=next
 *   queue=next  -> read from v_torts_to_prioritize_next (ranked queue)
 *   default     -> full join of tort_traction + mass_torts
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
        .from("v_torts_to_prioritize_next")
        .select("*");
      if (error) {
        console.error("v_torts_to_prioritize_next error:", error);
        return NextResponse.json(
          { error: "Failed to fetch queue" },
          { status: 500 },
        );
      }
      return NextResponse.json({ rows: data ?? [] });
    }

    const { data, error } = await serviceClient
      .from("tort_traction")
      .select("*, mass_torts:tort_id ( id, name, slug, category, status, visible )")
      .order("priority_score", { ascending: false, nullsFirst: false });

    if (error) {
      console.error("tort_traction fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch tort_traction" },
        { status: 500 },
      );
    }
    return NextResponse.json({ rows: data ?? [] });
  } catch (e) {
    console.error("GET /api/admin/tort-traction fatal:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/tort-traction
 * Body: { tort_id: string, updates: Partial<Row> }
 */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await requireAdmin(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const tortId = body?.tort_id;
    const incoming = body?.updates ?? {};

    if (!tortId || typeof tortId !== "string") {
      return NextResponse.json(
        { error: "tort_id is required" },
        { status: 400 },
      );
    }

    const updates: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(incoming)) {
      if (!EDITABLE_FIELDS.has(k)) continue;

      let err: string | null = null;
      if (k === "lifecycle_stage")
        err = validateEnum(k, v, ALLOWED_LIFECYCLE);
      else if (k === "mdl_stage") err = validateEnum(k, v, ALLOWED_MDL_STAGE);
      else if (k === "priority_tier") err = validateEnum(k, v, ALLOWED_TIER);
      else if (k === "fraud_risk") err = validateEnum(k, v, ALLOWED_FRAUD);
      else if (k === "criteria_strictness")
        err = validateEnum(k, v, ALLOWED_STRICTNESS);

      if (err) return NextResponse.json({ error: err }, { status: 400 });

      // normalize empty strings to null for nullable enum cols
      updates[k] = v === "" ? null : v;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No editable fields provided" },
        { status: 400 },
      );
    }

    const serviceClient = getServiceClient();
    const { data, error } = await serviceClient
      .from("tort_traction")
      .update(updates)
      .eq("tort_id", tortId)
      .select()
      .single();

    if (error) {
      console.error("tort_traction update error:", error);
      return NextResponse.json(
        { error: "Failed to update row" },
        { status: 500 },
      );
    }

    return NextResponse.json({ row: data });
  } catch (e) {
    console.error("PATCH /api/admin/tort-traction fatal:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
