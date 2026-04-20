import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

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

    if (
      !callerProfile ||
      !["tenant_admin", "super_admin"].includes(callerProfile.role)
    ) {
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

    // Cannot remove a super_admin
    if (targetProfile.role === "super_admin") {
      return NextResponse.json(
        { error: "Cannot remove a super admin" },
        { status: 403 },
      );
    }

    // tenant_admin can only remove members
    if (
      callerProfile.role === "tenant_admin" &&
      targetProfile.role !== "member"
    ) {
      return NextResponse.json(
        { error: "You can only remove members" },
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
