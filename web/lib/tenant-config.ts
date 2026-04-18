// Shared tenant types and constants — safe for both server and client components.

export interface TenantBranding {
  tenantId: string;
  slug: string;
  companyName: string;
  tagline: string | null;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  darkPrimaryColor: string | null;
  darkAccentColor: string | null;
  darkBackgroundColor: string | null;
  darkSurfaceColor: string | null;
  darkTextColor: string | null;
  fontHeading: string;
  fontBody: string;
  productName: string | null;
  footerText: string | null;
  loginHeadline: string | null;
}

export const DEFAULT_LMI_BRANDING: TenantBranding = {
  tenantId: "",
  slug: "lmi",
  companyName: "Legal Marketing Intelligence",
  tagline: "Competitive ad intelligence for plaintiff law firms",
  logoUrl: "/logo-horizontal-white.svg",
  logoDarkUrl: "/logo-horizontal.svg",
  faviconUrl: "/favicon.ico",
  primaryColor: "#0B1D3A",
  accentColor: "#1A8C96",
  backgroundColor: "#F1F5F9",
  surfaceColor: "#FFFFFF",
  textColor: "#1E1E2E",
  darkPrimaryColor: null,
  darkAccentColor: null,
  darkBackgroundColor: null,
  darkSurfaceColor: null,
  darkTextColor: null,
  fontHeading: "DM Sans",
  fontBody: "Inter",
  productName: "Legal Marketing Intelligence",
  footerText: null,
  loginHeadline: null,
};
