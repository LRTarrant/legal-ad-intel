import { getStateConfig } from "@/lib/state-config";
import { assertStateAccess } from "@/lib/entitlements/guards";

/**
 * Single access-guard point for EVERY state page. All state URLs resolve to
 * this v2 `[slug]` segment (the legacy per-state routes are redirect-only shims
 * that forward here), so one layout gates them all.
 *
 * Maps the slug → state code via the shared registry, then renders the page
 * only when the user's account has purchased that state. A denied user gets
 * <AccessDenied /> and the child page's data fetching never runs (Next doesn't
 * execute the page RSC when the layout doesn't render `children`).
 */
export default async function StateAccessLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const config = getStateConfig(slug);
  // Unknown slug → let the page's own notFound() handle it.
  if (!config) return <>{children}</>;

  const denied = await assertStateAccess(config.stateCode, config.stateName);
  if (denied) return denied;

  return <>{children}</>;
}
