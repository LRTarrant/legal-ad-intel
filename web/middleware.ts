import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Redirect white-label tenant subdomains from "/" to "/login"
  if (request.nextUrl.pathname === "/") {
    const host = request.headers.get("host") ?? "";
    const hostname = host.split(":")[0]; // strip port for localhost
    const parts = hostname.split(".");
    // If there are 3+ parts (sub.domain.tld) and the subdomain isn't "www",
    // this is a tenant subdomain — skip the public homepage.
    if (parts.length >= 3 && parts[0] !== "www") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - api/courtlistener (public CourtListener sync endpoints)
     * - favicon.ico (favicon file)
     * - public files (images, robots.txt, sitemap, etc.)
     */
    "/((?!api/courtlistener|api/tenant-branding|api/invites/validate|api/invites/accept|_next/static|_next/image|favicon.ico|robots\\.txt|sitemap\\.xml|apple-touch-icon\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
