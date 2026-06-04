import { createClient } from "@supabase/supabase-js";
import { cache } from "react";
import { DEFAULT_LMI_BRANDING } from "./tenant-config";
import type { TenantBranding } from "./tenant-config";

export { DEFAULT_LMI_BRANDING } from "./tenant-config";
export type { TenantBranding } from "./tenant-config";

// ---------------------------------------------------------------------------
// Service-role Supabase client (bypasses RLS — used only for tenant lookups)
// ---------------------------------------------------------------------------

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

// ---------------------------------------------------------------------------
// In-memory TTL cache (survives across React `cache()` boundaries within the
// same Node process — useful for ISR / API routes where React cache doesn't
// apply).
// ---------------------------------------------------------------------------

const TTL_MS = 5 * 60 * 1000; // 5 minutes

const memoryCache = new Map<
  string,
  { branding: TenantBranding; expiresAt: number }
>();

function getCached(key: string): TenantBranding | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.branding;
}

function setCached(key: string, branding: TenantBranding) {
  memoryCache.set(key, { branding, expiresAt: Date.now() + TTL_MS });
}

// ---------------------------------------------------------------------------
// Absolute base URL for a tenant (for emails / links)
// ---------------------------------------------------------------------------

/**
 * Canonical https base URL for a tenant, e.g.
 *   { slug: "transport", domain: null } → https://transport.legalmarketingintelligence.com
 *   { slug: "lmi",       domain: null } → https://legalmarketingintelligence.com (apex)
 *   { domain: "foo.com" }               → https://foo.com (custom domain wins)
 *
 * Slug-based (not request-host based) so links are correct regardless of where
 * the admin happens to be browsing — consistent with how `resolveTenant` maps
 * a subdomain back to a tenant slug.
 */
export function tenantBaseUrl(
  tenant: { slug?: string | null; domain?: string | null } | null,
): string {
  // 1. Custom domain wins.
  if (tenant?.domain) return `https://${tenant.domain}`;

  // 2. Branded subdomain from slug.
  const root = (
    process.env.NEXT_PUBLIC_APP_URL ?? "https://www.legalmarketingintelligence.com"
  )
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");

  if (tenant?.slug && tenant.slug !== "lmi") {
    return `https://${tenant.slug}.${root}`;
  }

  // 3. Main/LMI tenant → apex app URL.
  return `https://${root}`;
}

// ---------------------------------------------------------------------------
// Core resolution logic
// ---------------------------------------------------------------------------

async function resolveTenantFromDb(
  hostname: string,
): Promise<TenantBranding> {
  const supabase = getServiceClient();
  if (!supabase) return DEFAULT_LMI_BRANDING;

  // Extract subdomain: e.g. "transport.legalmarketingintelligence.com" → "transport"
  const parts = hostname.replace(/:\d+$/, "").split(".");
  const subdomain = parts.length >= 3 ? parts[0] : null;

  // Try custom domain first, then subdomain — run in parallel
  const [domainResult, subdomainResult] = await Promise.allSettled([
    supabase
      .from("tenants")
      .select("id, slug")
      .eq("domain", hostname.replace(/:\d+$/, ""))
      .eq("status", "active")
      .limit(1)
      .maybeSingle(),
    subdomain
      ? supabase
          .from("tenants")
          .select("id, slug")
          .eq("slug", subdomain)
          .eq("status", "active")
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  // Pick the first match: custom domain takes priority
  let tenant: { id: string; slug: string } | null = null;

  if (domainResult.status === "fulfilled" && domainResult.value.data) {
    tenant = domainResult.value.data;
  } else if (
    subdomainResult.status === "fulfilled" &&
    subdomainResult.value.data
  ) {
    tenant = subdomainResult.value.data;
  }

  // No match → LMI default
  if (!tenant) return DEFAULT_LMI_BRANDING;

  // Fetch branding for the matched tenant
  const { data: branding } = await supabase
    .from("tenant_branding")
    .select("*")
    .eq("tenant_id", tenant.id)
    .limit(1)
    .maybeSingle();

  if (!branding) return DEFAULT_LMI_BRANDING;

  return {
    tenantId: tenant.id,
    slug: tenant.slug,
    companyName: branding.company_name ?? DEFAULT_LMI_BRANDING.companyName,
    tagline: branding.tagline ?? null,
    logoUrl: branding.logo_url ?? DEFAULT_LMI_BRANDING.logoUrl,
    logoDarkUrl: branding.logo_dark_url ?? DEFAULT_LMI_BRANDING.logoDarkUrl,
    faviconUrl: branding.favicon_url ?? DEFAULT_LMI_BRANDING.faviconUrl,
    primaryColor: branding.primary_color ?? DEFAULT_LMI_BRANDING.primaryColor,
    accentColor: branding.accent_color ?? DEFAULT_LMI_BRANDING.accentColor,
    backgroundColor:
      branding.background_color ?? DEFAULT_LMI_BRANDING.backgroundColor,
    surfaceColor: branding.surface_color ?? DEFAULT_LMI_BRANDING.surfaceColor,
    textColor: branding.text_color ?? DEFAULT_LMI_BRANDING.textColor,
    darkPrimaryColor: branding.dark_primary_color ?? null,
    darkAccentColor: branding.dark_accent_color ?? null,
    darkBackgroundColor: branding.dark_background_color ?? null,
    darkSurfaceColor: branding.dark_surface_color ?? null,
    darkTextColor: branding.dark_text_color ?? null,
    fontHeading: branding.font_heading ?? DEFAULT_LMI_BRANDING.fontHeading,
    fontBody: branding.font_body ?? DEFAULT_LMI_BRANDING.fontBody,
    productName: branding.product_name ?? DEFAULT_LMI_BRANDING.productName,
    footerText: branding.footer_text ?? null,
    loginHeadline: branding.login_headline ?? null,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve tenant branding from a hostname. Uses React `cache()` for
 * request-level dedup in Server Components, plus a 5-minute in-memory TTL
 * cache across requests.
 */
export const resolveTenant = cache(
  async (hostname: string): Promise<TenantBranding> => {
    const cached = getCached(hostname);
    if (cached) return cached;

    try {
      const branding = await resolveTenantFromDb(hostname);
      setCached(hostname, branding);
      return branding;
    } catch {
      return DEFAULT_LMI_BRANDING;
    }
  },
);

/**
 * Resolve tenant by slug directly (for API route usage).
 */
export async function resolveTenantBySlug(
  slug: string,
): Promise<TenantBranding> {
  const cached = getCached(`slug:${slug}`);
  if (cached) return cached;

  const supabase = getServiceClient();
  if (!supabase) return DEFAULT_LMI_BRANDING;

  try {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, slug")
      .eq("slug", slug)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (!tenant) return DEFAULT_LMI_BRANDING;

    const { data: branding } = await supabase
      .from("tenant_branding")
      .select("*")
      .eq("tenant_id", tenant.id)
      .limit(1)
      .maybeSingle();

    if (!branding) return DEFAULT_LMI_BRANDING;

    const result: TenantBranding = {
      tenantId: tenant.id,
      slug: tenant.slug,
      companyName: branding.company_name ?? DEFAULT_LMI_BRANDING.companyName,
      tagline: branding.tagline ?? null,
      logoUrl: branding.logo_url ?? DEFAULT_LMI_BRANDING.logoUrl,
      logoDarkUrl: branding.logo_dark_url ?? DEFAULT_LMI_BRANDING.logoDarkUrl,
      faviconUrl: branding.favicon_url ?? DEFAULT_LMI_BRANDING.faviconUrl,
      primaryColor: branding.primary_color ?? DEFAULT_LMI_BRANDING.primaryColor,
      accentColor: branding.accent_color ?? DEFAULT_LMI_BRANDING.accentColor,
      backgroundColor:
        branding.background_color ?? DEFAULT_LMI_BRANDING.backgroundColor,
      surfaceColor:
        branding.surface_color ?? DEFAULT_LMI_BRANDING.surfaceColor,
      textColor: branding.text_color ?? DEFAULT_LMI_BRANDING.textColor,
      darkPrimaryColor: branding.dark_primary_color ?? null,
      darkAccentColor: branding.dark_accent_color ?? null,
      darkBackgroundColor: branding.dark_background_color ?? null,
      darkSurfaceColor: branding.dark_surface_color ?? null,
      darkTextColor: branding.dark_text_color ?? null,
      fontHeading: branding.font_heading ?? DEFAULT_LMI_BRANDING.fontHeading,
      fontBody: branding.font_body ?? DEFAULT_LMI_BRANDING.fontBody,
      productName: branding.product_name ?? DEFAULT_LMI_BRANDING.productName,
      footerText: branding.footer_text ?? null,
      loginHeadline: branding.login_headline ?? null,
    };

    setCached(`slug:${slug}`, result);
    return result;
  } catch {
    return DEFAULT_LMI_BRANDING;
  }
}
