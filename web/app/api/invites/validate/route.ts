import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// GET /api/invites/validate?token=xxx — public, validates an invite token
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json(
        { valid: false, reason: "not_found" },
        { status: 400 },
      );
    }

    const serviceClient = getServiceClient();

    const { data: invitation } = await serviceClient
      .from("invitations")
      .select("id, email, tenant_id, expires_at, accepted_at")
      .eq("token", token)
      .maybeSingle();

    if (!invitation) {
      return NextResponse.json({ valid: false, reason: "not_found" });
    }

    if (invitation.accepted_at) {
      return NextResponse.json({ valid: false, reason: "accepted" });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, reason: "expired" });
    }

    // Fetch tenant info and branding
    const [tenantResult, brandingResult] = await Promise.allSettled([
      serviceClient
        .from("tenants")
        .select("slug, domain")
        .eq("id", invitation.tenant_id)
        .single(),
      serviceClient
        .from("tenant_branding")
        .select("company_name, product_name, logo_url, accent_color, primary_color, font_heading")
        .eq("tenant_id", invitation.tenant_id)
        .maybeSingle(),
    ]);

    const tenant =
      tenantResult.status === "fulfilled" ? tenantResult.value.data : null;
    const branding =
      brandingResult.status === "fulfilled" ? brandingResult.value.data : null;

    return NextResponse.json({
      valid: true,
      email: invitation.email,
      tenant_name: tenant?.slug ?? "lmi",
      product_name: branding?.product_name ?? "Legal Marketing Intelligence",
      branding: {
        logo_url: branding?.logo_url ?? "/logo-horizontal-white.svg",
        accent_color: branding?.accent_color ?? "#1A8C96",
        primary_color: branding?.primary_color ?? "#0B1D3A",
        font_family: branding?.font_heading ?? "DM Sans",
      },
    });
  } catch {
    return NextResponse.json(
      { valid: false, reason: "not_found" },
      { status: 500 },
    );
  }
}
