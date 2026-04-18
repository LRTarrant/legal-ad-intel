import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

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

    if (
      !profile ||
      !["tenant_admin", "super_admin"].includes(profile.role)
    ) {
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

    const users = (profiles ?? []).map((p) => ({
      id: p.id,
      full_name: p.full_name,
      email: authMap.get(p.id)?.email ?? null,
      role: p.role,
      last_sign_in_at: authMap.get(p.id)?.last_sign_in_at ?? null,
      created_at: p.created_at,
    }));

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
