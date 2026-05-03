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

const SOURCE_TYPES = [
  "serious_injury",
  "hospital_discharge",
  "state_crash_detail",
  "workers_comp",
] as const;

const STATUSES = [
  "wanted",
  "researching",
  "available",
  "negotiating",
  "integrated",
  "blocked",
  "not_available",
] as const;

const EDITABLE = new Set([
  "source_name",
  "status",
  "url",
  "contact",
  "cost",
  "refresh_cadence",
  "last_refreshed_at",
  "data_table_ref",
  "notes",
  "owner",
]);

/**
 * GET /api/admin/state-data-sources?queue=next
 *   queue=next -> v_state_data_sources_to_pursue
 *   default    -> full table joined to state name/tier
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
        .from("v_state_data_sources_to_pursue")
        .select("*");
      if (error) {
        console.error("v_state_data_sources_to_pursue error:", error);
        return NextResponse.json(
          { error: "Failed to fetch queue" },
          { status: 500 },
        );
      }
      return NextResponse.json({ rows: data ?? [] });
    }

    const { data, error } = await serviceClient
      .from("state_data_sources")
      .select(
        "*, state_rollout:state_code ( state_name, priority_tier, population_rank, status )",
      )
      .order("state_code")
      .order("source_type");
    if (error) {
      console.error("state_data_sources fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch state_data_sources" },
        { status: 500 },
      );
    }
    return NextResponse.json({ rows: data ?? [] });
  } catch (e) {
    console.error("GET /api/admin/state-data-sources fatal:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/state-data-sources
 * Body: { state_code, source_type, source_name, status?, ...optional fields }
 * Creates a new source row.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await requireAdmin(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { state_code, source_type, source_name } = body ?? {};

    if (!state_code || typeof state_code !== "string") {
      return NextResponse.json(
        { error: "state_code is required" },
        { status: 400 },
      );
    }
    if (!source_type || !SOURCE_TYPES.includes(source_type)) {
      return NextResponse.json(
        { error: `source_type must be one of: ${SOURCE_TYPES.join(", ")}` },
        { status: 400 },
      );
    }
    if (!source_name || typeof source_name !== "string") {
      return NextResponse.json(
        { error: "source_name is required" },
        { status: 400 },
      );
    }

    const insert: Record<string, unknown> = {
      state_code,
      source_type,
      source_name,
      status:
        body.status && STATUSES.includes(body.status) ? body.status : "wanted",
    };
    for (const k of [
      "url",
      "contact",
      "cost",
      "refresh_cadence",
      "last_refreshed_at",
      "data_table_ref",
      "notes",
      "owner",
    ]) {
      if (k in body) insert[k] = body[k] === "" ? null : body[k];
    }

    const serviceClient = getServiceClient();
    const { data, error } = await serviceClient
      .from("state_data_sources")
      .insert(insert)
      .select()
      .single();
    if (error) {
      console.error("state_data_sources insert error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to insert" },
        { status: 500 },
      );
    }
    return NextResponse.json({ row: data });
  } catch (e) {
    console.error("POST /api/admin/state-data-sources fatal:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/state-data-sources
 * Body: { id, updates: Partial<Row> }
 */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await requireAdmin(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, updates: incoming } = body ?? {};
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    if (!incoming || typeof incoming !== "object") {
      return NextResponse.json({ error: "updates required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(incoming)) {
      if (!EDITABLE.has(k)) continue;
      if (k === "status" && v !== null && !STATUSES.includes(v as never)) {
        return NextResponse.json(
          { error: `Invalid status: ${v}` },
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
    const { data, error } = await serviceClient
      .from("state_data_sources")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.error("state_data_sources update error:", error);
      return NextResponse.json(
        { error: "Failed to update" },
        { status: 500 },
      );
    }
    return NextResponse.json({ row: data });
  } catch (e) {
    console.error("PATCH /api/admin/state-data-sources fatal:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/state-data-sources?id=...
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await requireAdmin(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const serviceClient = getServiceClient();
    const { error } = await serviceClient
      .from("state_data_sources")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("state_data_sources delete error:", error);
      return NextResponse.json(
        { error: "Failed to delete" },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/admin/state-data-sources fatal:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
