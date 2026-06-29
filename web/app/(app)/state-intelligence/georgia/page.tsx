import { redirect } from "next/navigation";

/**
 * The bespoke Georgia page was migrated onto the shared v2 `[slug]` shell
 * (config: `lib/state-config/georgia.ts`). This legacy route now redirects
 * to the canonical v2 URL so existing links/bookmarks keep working.
 */
export default function GeorgiaLegacyRedirect() {
  redirect("/state-intelligence/v2/georgia");
}
