import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/roles";
import { resolveFromParams, toTimestampRange } from "@/lib/analytics-timeframe";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

interface RouteContext {
  params: Promise<{ userId: string }>;
}

// GET /api/admin/user-activity/[userId] — paginated activity timeline for one user.
export async function GET(req: NextRequest, ctx: RouteContext) {
  const { userId } = await ctx.params;
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!isSuperAdmin(profile?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const { startDate, endDate } = resolveFromParams(
    sp.get("startDate"),
    sp.get("endDate"),
  );
  const { fromISO, toISO } = toTimestampRange(startDate, endDate);

  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(sp.get("limit")) || DEFAULT_LIMIT),
  );
  const offset = Math.max(0, Number(sp.get("offset")) || 0);

  const service = getServiceClient();

  // User header (name + firm) — cross-tenant via service role.
  const { data: targetProfile } = await service
    .from("profiles")
    .select("id, full_name, role, tenant_id, tenants(name)")
    .eq("id", userId)
    .single();

  const { data: authUser } = await service.auth.admin.getUserById(userId);

  // Fetch one extra row to compute hasMore without a count query.
  const { data: rows, error } = await service
    .from("activity_log")
    .select("created_at, event_type, page_path, metadata")
    .eq("user_id", userId)
    .gte("created_at", fromISO)
    .lte("created_at", toISO)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit);

  if (error) {
    console.error("user-activity timeline error:", error);
    return NextResponse.json(
      { error: "Failed to load activity" },
      { status: 502 },
    );
  }

  const events = (rows ?? []).slice(0, limit);
  const hasMore = (rows ?? []).length > limit;

  return NextResponse.json({
    user: {
      user_id: userId,
      full_name: targetProfile?.full_name ?? null,
      role: targetProfile?.role ?? null,
      email: authUser?.user?.email ?? null,
      firm_name:
        (targetProfile?.tenants as { name?: string } | null)?.name ?? null,
    },
    dateRange: { startDate, endDate },
    events,
    hasMore,
    nextOffset: offset + events.length,
  });
}
