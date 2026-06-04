import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// POST /api/invites/accept — public, creates account from invitation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, full_name, password } = body;

    if (!token || !full_name?.trim() || !password) {
      return NextResponse.json(
        { error: "Token, full name, and password are required" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const serviceClient = getServiceClient();

    // Validate the token
    const { data: invitation } = await serviceClient
      .from("invitations")
      .select("id, email, role, tenant_id, expires_at, accepted_at, trial_days")
      .eq("token", token)
      .maybeSingle();

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid invitation token" },
        { status: 404 },
      );
    }

    if (invitation.accepted_at) {
      return NextResponse.json(
        { error: "This invitation has already been accepted" },
        { status: 400 },
      );
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 400 },
      );
    }

    // Create the Supabase auth user
    const { data: authData, error: authError } =
      await serviceClient.auth.admin.createUser({
        email: invitation.email,
        password,
        email_confirm: true,
        user_metadata: {
          tenant_id: invitation.tenant_id,
          full_name: full_name.trim(),
          email_verified: true,
        },
      });

    if (authError || !authData.user) {
      const msg = authError?.message ?? "Failed to create user";
      // Handle duplicate user
      if (msg.toLowerCase().includes("already been registered")) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    // Update the profile's role to match the invitation's role
    // (the handle_new_user trigger may default to 'user')
    // Set trial_expires_at for the User tier only — Managers and Admins get
    // unlimited access.
    const profileUpdate: Record<string, unknown> = { role: invitation.role };

    if (invitation.role === "user" && invitation.trial_days != null) {
      const trialExpiresAt = new Date();
      trialExpiresAt.setDate(trialExpiresAt.getDate() + invitation.trial_days);
      profileUpdate.trial_expires_at = trialExpiresAt.toISOString();
    }

    await serviceClient
      .from("profiles")
      .update(profileUpdate)
      .eq("id", authData.user.id);

    // Mark invitation as accepted
    await serviceClient
      .from("invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
