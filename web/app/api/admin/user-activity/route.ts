import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/roles";
import {
  resolveFromParams,
  toTimestampRange,
  daysBetween,
} from "@/lib/analytics-timeframe";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

interface SummaryRow {
  user_id: string;
  tenant_id: string;
  event_count: number;
  page_view_count: number;
  login_count: number;
  last_event_at: string;
}

// GET /api/admin/user-activity — founder-global per-user activity roster.
export async function GET(req: NextRequest) {
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

  // Aggregate via the super_admin-gated RPC, invoked with the caller's session
  // (the RPC's internal is_super_admin() guard requires a real auth.uid()).
  // The function isn't in the generated database.types.ts until the migration's
  // types are regenerated post-merge, so cast around the typed rpc() signature.
  const { data: rows, error: rpcError } = await supabase.rpc(
    "get_activity_user_summary" as never,
    { p_from: fromISO, p_to: toISO } as never,
  );

  if (rpcError) {
    console.error("user-activity summary rpc error:", rpcError);
    return NextResponse.json(
      { error: "Failed to load activity summary" },
      { status: 502 },
    );
  }

  const summary = (rows ?? []) as unknown as SummaryRow[];

  if (summary.length === 0) {
    return NextResponse.json({
      dateRange: { startDate, endDate, days: daysBetween(startDate, endDate) },
      users: [],
    });
  }

  // Resolve names, firms, and emails with the service role (cross-tenant).
  const service = getServiceClient();
  const userIds = summary.map((r) => r.user_id);
  const tenantIds = Array.from(new Set(summary.map((r) => r.tenant_id)));

  const [{ data: profiles }, { data: tenants }, authResults] =
    await Promise.all([
      service
        .from("profiles")
        .select("id, full_name, role, tenant_id")
        .in("id", userIds),
      service.from("tenants").select("id, name").in("id", tenantIds),
      Promise.allSettled(
        userIds.map((uid) => service.auth.admin.getUserById(uid)),
      ),
    ]);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p as { full_name: string | null; role: string }]),
  );
  const tenantMap = new Map(
    (tenants ?? []).map((t) => [t.id, t.name as string]),
  );
  const emailMap = new Map<string, string | null>();
  authResults.forEach((res, i) => {
    if (res.status === "fulfilled" && res.value.data?.user) {
      emailMap.set(userIds[i], res.value.data.user.email ?? null);
    }
  });

  const users = summary.map((r) => ({
    user_id: r.user_id,
    tenant_id: r.tenant_id,
    full_name: profileMap.get(r.user_id)?.full_name ?? null,
    role: profileMap.get(r.user_id)?.role ?? null,
    email: emailMap.get(r.user_id) ?? null,
    firm_name: tenantMap.get(r.tenant_id) ?? null,
    event_count: Number(r.event_count ?? 0),
    page_view_count: Number(r.page_view_count ?? 0),
    login_count: Number(r.login_count ?? 0),
    last_event_at: r.last_event_at,
  }));

  return NextResponse.json({
    dateRange: { startDate, endDate, days: daysBetween(startDate, endDate) },
    users,
  });
}
