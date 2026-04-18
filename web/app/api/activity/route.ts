import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: true }); // silent — never block client
    }

    const body = await req.json();
    const event_type = body.event_type;
    if (!event_type || typeof event_type !== "string") {
      return NextResponse.json({ ok: true });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ ok: true });
    }

    // Skip super_admin activity for cleaner data
    if (profile.role === "super_admin") {
      return NextResponse.json({ ok: true });
    }

    await supabase.from("activity_log").insert({
      tenant_id: profile.tenant_id,
      user_id: user.id,
      event_type,
      page_path: typeof body.page_path === "string" ? body.page_path : null,
      metadata: body.metadata ?? {},
    });

    return NextResponse.json({ ok: true });
  } catch {
    // Never error to client
    return NextResponse.json({ ok: true });
  }
}
