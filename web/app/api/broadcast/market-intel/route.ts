import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const state = searchParams.get("state");

    if (!state) {
      return NextResponse.json(
        { error: "state parameter is required" },
        { status: 400 },
      );
    }

    const stateUpper = state.toUpperCase();

    // Fetch stations and ad activity data in parallel
    const [stationsResult, adEventsResult, advertisersResult] =
      await Promise.allSettled([
        supabase
          .from("broadcast_stations")
          .select("*")
          .eq("community_state", stateUpper)
          .eq("active", true)
          .order("call_sign", { ascending: true }),
        supabase
          .from("ad_events")
          .select("mass_tort_id, advertiser_name_raw, spend_estimate, platform")
          .eq("state_code", stateUpper)
          .gte(
            "event_date",
            new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
          ),
        supabase
          .from("advertiser_entities")
          .select("canonical_name, entity_type, tort_slugs")
          .contains("tort_slugs", []),
      ]);

    const stations =
      stationsResult.status === "fulfilled"
        ? stationsResult.value.data ?? []
        : [];

    const adEvents =
      adEventsResult.status === "fulfilled"
        ? adEventsResult.value.data ?? []
        : [];

    // Aggregate legal ad activity
    const tortMap = new Map<
      string,
      { count: number; advertisers: Set<string>; spend: number }
    >();
    const advertiserSet = new Set<string>();

    for (const event of adEvents) {
      const tortId = event.mass_tort_id ?? "unknown";
      const existing = tortMap.get(tortId) ?? {
        count: 0,
        advertisers: new Set<string>(),
        spend: 0,
      };
      existing.count += 1;
      if (event.advertiser_name_raw) {
        existing.advertisers.add(event.advertiser_name_raw);
        advertiserSet.add(event.advertiser_name_raw);
      }
      existing.spend += event.spend_estimate ?? 0;
      tortMap.set(tortId, existing);
    }

    const tortActivity = Array.from(tortMap.entries()).map(
      ([tortId, data]) => ({
        tort_id: tortId,
        ad_count: data.count,
        advertiser_count: data.advertisers.size,
        estimated_spend: data.spend,
      }),
    );

    const advertisers =
      advertisersResult.status === "fulfilled"
        ? advertisersResult.value.data ?? []
        : [];

    return NextResponse.json({
      state: stateUpper,
      stations,
      station_count: stations.length,
      legal_ad_activity: {
        total_ad_events: adEvents.length,
        unique_advertisers: advertiserSet.size,
        tort_breakdown: tortActivity,
        data_available: adEvents.length > 0,
      },
      known_advertisers: advertisers.length,
      pitch_summary: {
        state: stateUpper,
        message:
          adEvents.length > 0
            ? `Based on digital advertising data, ${advertiserSet.size} law firms are actively spending in ${stateUpper} across ${tortActivity.length} tort categories. These firms may be good candidates for broadcast advertising.`
            : `Sync station data and check tort pages for ${stateUpper} to identify digital advertising activity and broadcast pitch opportunities.`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
