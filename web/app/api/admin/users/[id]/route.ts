import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { canManageUsers, canRemoveUser, canChangeRole } from "@/lib/roles";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// DELETE /api/admin/users/[id] — remove a user from the tenant
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: targetUserId } = await params;
    const supabase = await createServerClient();

    // Authenticate the caller
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Cannot remove yourself
    if (user.id === targetUserId) {
      return NextResponse.json(
        { error: "Cannot remove yourself" },
        { status: 400 },
      );
    }

    // Get caller's profile
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();

    if (!callerProfile || !canManageUsers(callerProfile.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceClient = getServiceClient();

    // Get target user's profile
    const { data: targetProfile } = await serviceClient
      .from("profiles")
      .select("id, tenant_id, role")
      .eq("id", targetUserId)
      .single();

    if (!targetProfile) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 },
      );
    }

    // Target must be in the same tenant
    if (targetProfile.tenant_id !== callerProfile.tenant_id) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 },
      );
    }

    // Enforce the role hierarchy: nobody removes a super_admin; Admins remove
    // Managers + Users (not other Admins); Managers remove Users only.
    if (!canRemoveUser(callerProfile.role, targetProfile.role)) {
      return NextResponse.json(
        { error: "You are not allowed to remove this user" },
        { status: 403 },
      );
    }

    // Delete the profile
    const { error: deleteError } = await serviceClient
      .from("profiles")
      .delete()
      .eq("id", targetUserId);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to remove user" },
        { status: 500 },
      );
    }

    // Try to delete the auth user too (best effort)
    try {
      await serviceClient.auth.admin.deleteUser(targetUserId);
    } catch {
      // If auth user deletion fails, the profile is already gone.
      // The orphaned auth user is harmless.
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PATCH /api/admin/users/[id] — change a user's role (Admin-only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: targetUserId } = await params;
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Cannot change your own role (prevents accidental self-lockout)
    if (user.id === targetUserId) {
      return NextResponse.json(
        { error: "Cannot change your own role" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const newRole = body.role;
    if (typeof newRole !== "string") {
      return NextResponse.json({ error: "Role is required" }, { status: 400 });
    }

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();

    if (!callerProfile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceClient = getServiceClient();

    const { data: targetProfile } = await serviceClient
      .from("profiles")
      .select("id, tenant_id, role")
      .eq("id", targetUserId)
      .single();

    if (!targetProfile || targetProfile.tenant_id !== callerProfile.tenant_id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Enforce the role hierarchy: Admin-only, may only assign roles they could
    // invite, and must outrank the current target (no touching super_admins or
    // peer admins).
    if (!canChangeRole(callerProfile.role, targetProfile.role, newRole)) {
      return NextResponse.json(
        { error: "You are not allowed to set that role" },
        { status: 403 },
      );
    }

    // Promotion to Manager/Admin clears any trial (they get full access);
    // changing to User leaves trial_expires_at untouched.
    const update: Record<string, unknown> = {
      role: newRole,
      updated_at: new Date().toISOString(),
    };
    if (newRole === "manager" || newRole === "tenant_admin") {
      update.trial_expires_at = null;
    }

    const { error: updateError } = await serviceClient
      .from("profiles")
      .update(update)
      .eq("id", targetUserId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update role" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, role: newRole });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
