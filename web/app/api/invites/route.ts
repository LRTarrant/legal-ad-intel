import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { buildInviteEmailHtml } from "@/lib/email-templates/invite";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

async function getAuthenticatedAdmin(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, tenant_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || !["tenant_admin", "super_admin"].includes(profile.role)) {
    return null;
  }

  return { user, profile };
}

// POST /api/invites — create an invitation and send email
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const auth = await getAuthenticatedAdmin(supabase);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const email = body.email?.trim().toLowerCase();
    const role = body.role === "tenant_admin" ? "tenant_admin" : "member";

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const serviceClient = getServiceClient();
    const { profile } = auth;

    // Check for existing pending invitation for this email + tenant
    const { data: existing } = await serviceClient
      .from("invitations")
      .select("id")
      .eq("tenant_id", profile.tenant_id)
      .eq("email", email)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "A pending invitation already exists for this email" },
        { status: 409 },
      );
    }

    // Create the invitation
    const { data: invitation, error: insertError } = await serviceClient
      .from("invitations")
      .insert({
        tenant_id: profile.tenant_id,
        email,
        role,
        invited_by: auth.user.id,
      })
      .select("id, email, role, token, expires_at")
      .single();

    if (insertError || !invitation) {
      return NextResponse.json(
        { error: "Failed to create invitation" },
        { status: 500 },
      );
    }

    // Fetch tenant branding for the email
    const [tenantResult, brandingResult] = await Promise.allSettled([
      serviceClient
        .from("tenants")
        .select("slug, domain")
        .eq("id", profile.tenant_id)
        .single(),
      serviceClient
        .from("tenant_branding")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .maybeSingle(),
    ]);

    const tenant =
      tenantResult.status === "fulfilled" ? tenantResult.value.data : null;
    const branding =
      brandingResult.status === "fulfilled" ? brandingResult.value.data : null;

    const defaultAppUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      "https://www.legalmarketingintelligence.com";

    // Use tenant custom domain if available, otherwise default
    const appUrl = tenant?.domain
      ? `https://${tenant.domain}`
      : defaultAppUrl;

    // Use tenant-specific email logo (dark logo for white email background).
    // Convention: each tenant has /tenants/{slug}/logo-email.png — a dark logo
    // that renders well on the white email background.
    const tenantSlug = tenant?.slug ?? "lmi";
    const emailLogoUrl = `${appUrl}/tenants/${tenantSlug}/logo-email.png`;

    const emailHtml = buildInviteEmailHtml({
      inviterName: profile.full_name ?? "A team administrator",
      token: invitation.token,
      emailLogoUrl,
      branding: {
        tenantId: profile.tenant_id,
        slug: tenant?.slug ?? "lmi",
        companyName: branding?.company_name ?? "Legal Marketing Intelligence",
        tagline: branding?.tagline ?? null,
        logoUrl: branding?.logo_url ?? "/logo-horizontal.svg",
        logoDarkUrl: branding?.logo_dark_url ?? null,
        faviconUrl: branding?.favicon_url ?? null,
        primaryColor: branding?.primary_color ?? "#0B1D3A",
        accentColor: branding?.accent_color ?? "#1A8C96",
        backgroundColor: branding?.background_color ?? "#F1F5F9",
        surfaceColor: branding?.surface_color ?? "#FFFFFF",
        textColor: branding?.text_color ?? "#1E1E2E",
        darkPrimaryColor: branding?.dark_primary_color ?? null,
        darkAccentColor: branding?.dark_accent_color ?? null,
        darkBackgroundColor: branding?.dark_background_color ?? null,
        darkSurfaceColor: branding?.dark_surface_color ?? null,
        darkTextColor: branding?.dark_text_color ?? null,
        fontHeading: branding?.font_heading ?? "DM Sans",
        fontBody: branding?.font_body ?? "Inter",
        productName: branding?.product_name ?? "Legal Marketing Intelligence",
        footerText: branding?.footer_text ?? null,
        loginHeadline: branding?.login_headline ?? null,
      },
      appUrl,
    });

    const productName =
      branding?.product_name ?? "Legal Marketing Intelligence";

    // Send email via Resend
    if (process.env.RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${productName} <noreply@legalmarketingintelligence.com>`,
          to: [email],
          reply_to: "sales@legalmarketingintelligence.com",
          subject: `You've been invited to ${productName}`,
          html: emailHtml,
        }),
      });
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// GET /api/invites — list invitations for the caller's tenant
export async function GET() {
  try {
    const supabase = await createServerClient();
    const auth = await getAuthenticatedAdmin(supabase);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceClient = getServiceClient();

    const { data: invitations, error } = await serviceClient
      .from("invitations")
      .select("id, email, role, invited_by, expires_at, accepted_at, created_at")
      .eq("tenant_id", auth.profile.tenant_id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch invitations" },
        { status: 500 },
      );
    }

    // Compute status for each invitation
    const now = new Date();
    const withStatus = (invitations ?? []).map((inv) => {
      let status: "accepted" | "expired" | "pending" = "pending";
      if (inv.accepted_at) {
        status = "accepted";
      } else if (new Date(inv.expires_at) < now) {
        status = "expired";
      }
      return { ...inv, status };
    });

    return NextResponse.json({ invitations: withStatus });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
