import { NextRequest, NextResponse } from "next/server";
import {
  resolveTenant,
  resolveTenantBySlug,
  DEFAULT_LMI_BRANDING,
} from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const domain = searchParams.get("domain");
  const slug = searchParams.get("slug");

  if (!domain && !slug) {
    return NextResponse.json(
      { error: "Provide ?domain= or ?slug= parameter" },
      { status: 400 },
    );
  }

  try {
    const branding = slug
      ? await resolveTenantBySlug(slug)
      : await resolveTenant(domain!);

    return NextResponse.json(branding, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch {
    return NextResponse.json(DEFAULT_LMI_BRANDING);
  }
}
