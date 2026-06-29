import { redirect } from "next/navigation";

/**
 * The bespoke Tennessee page was migrated onto the shared v2 `[slug]` shell
 * (config: `lib/state-config/tennessee.ts`). This legacy route now redirects
 * to the canonical v2 URL so existing links/bookmarks keep working.
 */
export default function TennesseeLegacyRedirect() {
  redirect("/state-intelligence/v2/tennessee");
}
