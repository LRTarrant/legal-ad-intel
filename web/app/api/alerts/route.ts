import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

async function getAuthenticatedUser(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, tenant_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) return null;
  return { user, profile };
}

// POST /api/alerts — Create alert config
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const auth = await getAuthenticatedUser(supabase);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { tort_slug, state_code, alert_name, email_enabled, in_app_enabled } = body;

    if (!tort_slug || !alert_name) {
      return NextResponse.json(
        { error: "tort_slug and alert_name are required" },
        { status: 400 },
      );
    }

    const { data: alert, error } = await supabase
      .from("alert_configs")
      .insert({
        tenant_id: auth.profile.tenant_id,
        user_id: auth.user.id,
        tort_slug,
        state_code: state_code || null,
        alert_name,
        email_enabled: email_enabled ?? true,
        in_app_enabled: in_app_enabled ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error("Alert insert error:", error.message, error.code);
      const status = error.code === "42501" ? 403 : 500;
      return NextResponse.json(
        { error: status === 403 ? "Permission denied — check RLS policies" : "Failed to create alert" },
        { status },
      );
    }

    return NextResponse.json({ success: true, alert });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// GET /api/alerts — List user's alert configs with recent event counts
export async function GET() {
  try {
    const supabase = await createServerClient();
    const auth = await getAuthenticatedUser(supabase);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [alertsResult, eventsResult] = await Promise.allSettled([
      supabase
        .from("alert_configs")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("alert_events")
        .select("alert_config_id, created_at")
        .eq("user_id", auth.user.id)
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    const alerts =
      alertsResult.status === "fulfilled" ? alertsResult.value.data ?? [] : [];
    const recentEvents =
      eventsResult.status === "fulfilled" ? eventsResult.value.data ?? [] : [];

    // Count events per alert config in the last 30 days
    const eventCounts: Record<string, number> = {};
    for (const event of recentEvents) {
      eventCounts[event.alert_config_id] =
        (eventCounts[event.alert_config_id] || 0) + 1;
    }

    const alertsWithCounts = alerts.map((alert) => ({
      ...alert,
      recent_event_count: eventCounts[alert.id] || 0,
    }));

    return NextResponse.json({ alerts: alertsWithCounts });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
