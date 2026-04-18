import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
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
    "/((?!api/courtlistener|api/tenant-branding|_next/static|_next/image|favicon.ico|robots\\.txt|sitemap\\.xml|apple-touch-icon\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
