import { redirect } from "next/navigation";

/**
 * The bespoke Arizona page was migrated onto the shared v2 `[slug]` shell
 * (config: `lib/state-config/arizona.ts`). This legacy route now redirects
 * to the canonical v2 URL so existing links/bookmarks keep working.
 */
export default function ArizonaLegacyRedirect() {
  redirect("/state-intelligence/v2/arizona");
}
