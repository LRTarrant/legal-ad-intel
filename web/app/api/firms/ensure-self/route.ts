/**
 * POST /api/firms/ensure-self
 *
 * Idempotent: ensures the calling user has the right number of firms
 * for their buyer_type, and returns whatever they should see in their
 * firm picker.
 *
 *   law_firm        \u2192 mints a single 'owner' firm if missing,
 *                     labelled with their email-prefix or 'My Firm'
 *   ad_agency       \u2192 no-op; returns current managed list (empty is OK)
 *   media_company   \u2192 no-op; same
 *
 * Called by:
 *   - Campaign Builder on mount (so first-time law firm users don't
 *     hit a "no firm available" error when they save)
 *   - Settings \u2192 My Firm page on first load
 *
 * The route doesn't take any input \u2014 buyer_type is read from the
 * subscriptions table. Users with no subscription row are treated as
 * legacy law firm users (matches the entitlements module's bypass).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ensureSelfFirmForLawFirm,
  listFirmsForUser,
} from "@/lib/firms/server";
import { getSubscriptionForUser } from "@/lib/campaign-builder/entitlements";
import {
  DemoModeAccessDenied,
  readDemoModeOverride,
} from "@/lib/admin/demo-mode";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin demo-mode: lets super_admin users impersonate a buyer_type
  // without swapping their real subscription row. Throws if a non-admin
  // tries to spoof headers — we surface that as a 403.
  let demoMode;
  try {
    demoMode = await readDemoModeOverride(supabase, request, user.id);
  } catch (e) {
    if (e instanceof DemoModeAccessDenied) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    throw e;
  }

  try {
    const sub = await getSubscriptionForUser(supabase, user.id, demoMode);
    const buyerType = sub?.buyer_type ?? "law_firm";

    // Default label for law firm self-firm: email prefix ("jdoe" from
    // jdoe@firm.com), falling back to "My Firm" inside the helper if
    // empty.
    const emailPrefix = user.email?.split("@")[0] ?? "";

    const selfFirm = await ensureSelfFirmForLawFirm(
      supabase,
      user.id,
      buyerType,
      emailPrefix,
    );

    // Always return the current managed list so the caller can hydrate
    // the firm picker in one round trip.
    const firms = await listFirmsForUser(supabase, user.id);

    return NextResponse.json({
      buyer_type: buyerType,
      self_firm: selfFirm,
      firms,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
