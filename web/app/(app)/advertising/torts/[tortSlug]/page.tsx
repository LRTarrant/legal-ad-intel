import { permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Legacy route: /advertising/torts/{slug}
 *
 * All tort advertising pages now live at /advertising/{slug} (flat canonical pattern).
 * This page issues a 308 permanent redirect to the canonical URL.
 */
export default async function TortLegacyRedirect({
  params,
}: {
  params: Promise<{ tortSlug: string }>;
}) {
  const { tortSlug } = await params;
  permanentRedirect(`/advertising/${tortSlug}`);
}
