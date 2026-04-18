import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildAlertEmailHtml } from "@/lib/email-templates/alert";
import { postalToStateName } from "@/lib/usStates";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// POST /api/alerts/check — Alert check engine (protected by API secret or cron header)
export async function POST(req: NextRequest) {
  // Verify authorization: API secret or Vercel cron header
  const authHeader = req.headers.get("authorization");
  const cronSecret = req.headers.get("x-cron-secret");
  const apiSecret = process.env.ALERT_CHECK_SECRET;

  const isAuthorized =
    (apiSecret && authHeader === `Bearer ${apiSecret}`) ||
    (apiSecret && cronSecret === apiSecret) ||
    req.headers.get("x-vercel-cron") === "1";

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://www.legalmarketingintelligence.com";

  try {
    // 1. Get all active alert configs
    const { data: configs, error: configError } = await supabase
      .from("alert_configs")
      .select("*")
      .eq("is_active", true);

    if (configError || !configs?.length) {
      return NextResponse.json({
        success: true,
        message: "No active alert configs",
        events_created: 0,
      });
    }

    // 2. Group configs by unique tort_slug + state_code combos
    const combos = new Map<string, typeof configs>();
    for (const config of configs) {
      const key = `${config.tort_slug}::${config.state_code || "ALL"}`;
      if (!combos.has(key)) combos.set(key, []);
      combos.get(key)!.push(config);
    }

    let totalEventsCreated = 0;
    let totalEmailsSent = 0;

    // 3. For each combo, check for new advertisers
    for (const [key, matchingConfigs] of combos) {
      const [tortSlug, stateCode] = key.split("::");
      const stateFilter = stateCode === "ALL" ? null : stateCode;

      // Get known advertisers for this combo
      let knownQuery = supabase
        .from("alert_known_advertisers")
        .select("advertiser_id")
        .eq("tort_slug", tortSlug)
        .eq("platform", "meta");

      if (stateFilter) {
        knownQuery = knownQuery.eq("state_code", stateFilter);
      } else {
        knownQuery = knownQuery.is("state_code", null);
      }

      const { data: knownAdvertisers } = await knownQuery;
      const knownIds = new Set(
        (knownAdvertisers ?? []).map((a) => a.advertiser_id),
      );

      // Query ad_events for current advertisers for this tort + state
      let adQuery = supabase
        .from("ad_events")
        .select("advertiser_name_raw, firm_id, platform, state_code")
        .eq("source", "meta_ad_library")
        .not("advertiser_name_raw", "is", null);

      // Filter by tort — match on mass_tort_id or via metadata
      // For now, use a broad approach: look for ads in this category
      if (stateFilter) {
        adQuery = adQuery.eq("state_code", stateFilter);
      }

      const { data: currentAds } = await adQuery.limit(1000);

      // Deduplicate by advertiser name
      const currentAdvertisers = new Map<
        string,
        { name: string; count: number; state: string | null }
      >();
      for (const ad of currentAds ?? []) {
        const name = ad.advertiser_name_raw?.trim();
        if (!name) continue;
        const normalizedId = name.toLowerCase().replace(/\s+/g, "_");
        if (!currentAdvertisers.has(normalizedId)) {
          currentAdvertisers.set(normalizedId, {
            name,
            count: 1,
            state: ad.state_code,
          });
        } else {
          currentAdvertisers.get(normalizedId)!.count++;
        }
      }

      // Find NEW advertisers not in known set
      const newAdvertisers: Array<{
        id: string;
        name: string;
        count: number;
        state: string | null;
      }> = [];
      for (const [advId, info] of currentAdvertisers) {
        if (!knownIds.has(advId)) {
          newAdvertisers.push({ id: advId, ...info });
        }
      }

      if (newAdvertisers.length === 0) continue;

      // 4. Create events for each new advertiser, for each matching config
      for (const advertiser of newAdvertisers) {
        const stateName = advertiser.state
          ? postalToStateName[advertiser.state] ?? advertiser.state
          : "All States";

        // Insert into known advertisers (upsert)
        await supabase.from("alert_known_advertisers").upsert(
          {
            tort_slug: tortSlug,
            state_code: stateFilter,
            advertiser_id: advertiser.id,
            advertiser_name: advertiser.name,
            platform: "meta",
            last_seen_at: new Date().toISOString(),
            ad_count: advertiser.count,
          },
          { onConflict: "tort_slug,state_code,advertiser_id,platform" },
        );

        for (const config of matchingConfigs) {
          // Check for duplicate event (idempotency)
          const { data: existing } = await supabase
            .from("alert_events")
            .select("id")
            .eq("alert_config_id", config.id)
            .eq("event_type", "new_competitor")
            .contains("metadata", { advertiser_id: advertiser.id })
            .maybeSingle();

          if (existing) continue;

          const title = `New advertiser detected: ${advertiser.name}`;
          const description = `A new advertiser "${advertiser.name}" was found for ${tortSlug.replace(/-/g, " ")} in ${stateName} with approximately ${advertiser.count} ad(s).`;

          // Create the alert event
          const { error: eventError } = await supabase
            .from("alert_events")
            .insert({
              alert_config_id: config.id,
              tenant_id: config.tenant_id,
              user_id: config.user_id,
              event_type: "new_competitor",
              title,
              description,
              metadata: {
                advertiser_id: advertiser.id,
                advertiser_name: advertiser.name,
                ad_count: advertiser.count,
                tort_slug: tortSlug,
                state_code: stateFilter,
                platform: "meta",
              },
              email_sent: false,
            });

          if (!eventError) {
            totalEventsCreated++;
          }

          // 5. Send email if enabled
          if (config.email_enabled && process.env.RESEND_API_KEY) {
            // Get user email
            const { data: userData } = await supabase.auth.admin.getUserById(
              config.user_id,
            );
            const userEmail = userData?.user?.email;

            if (userEmail) {
              const emailHtml = buildAlertEmailHtml({
                alertName: config.alert_name,
                tortName: tortSlug.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
                stateName,
                advertiserName: advertiser.name,
                firstSeen: new Date().toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                }),
                platform: "Meta / Facebook",
                adCount: advertiser.count,
                dashboardUrl: appUrl,
              });

              const emailResult = await fetch(
                "https://api.resend.com/emails",
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    from: `Legal Marketing Intelligence <noreply@legalmarketingintelligence.com>`,
                    to: [userEmail],
                    subject: `🔔 LMI Alert: New competitor detected for ${tortSlug.replace(/-/g, " ")} in ${stateName}`,
                    html: emailHtml,
                  }),
                },
              );

              if (emailResult.ok) {
                totalEmailsSent++;
                // Mark email as sent
                await supabase
                  .from("alert_events")
                  .update({ email_sent: true })
                  .eq("alert_config_id", config.id)
                  .contains("metadata", { advertiser_id: advertiser.id })
                  .eq("email_sent", false);
              }
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      events_created: totalEventsCreated,
      emails_sent: totalEmailsSent,
    });
  } catch (err) {
    console.error("Alert check error:", err);
    return NextResponse.json(
      { error: "Alert check failed" },
      { status: 500 },
    );
  }
}
