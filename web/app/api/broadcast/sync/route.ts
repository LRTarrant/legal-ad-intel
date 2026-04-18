import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

interface FCCFacility {
  id: string;
  callSign: string;
  service: string;
  rfChannel: string;
  virtualChannel: string;
  licenseExpirationDate: string;
  status: string;
  communityCity: string;
  communityState: string;
  nielsenDma: string;
  networkAfil: string;
  band: string;
  partyName: string;
  partyAddress1: string;
  partyAddress2: string;
  partyCity: string;
  partyState: string;
  partyZip: string;
  partyPhone: string;
  cenEmail: string;
  activeInd: string;
}

interface FCCResponse {
  status: string;
  results: {
    searchList: Array<{
      facilityList: FCCFacility[];
    }>;
  };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { state } = body;

    if (!state || typeof state !== "string" || state.length !== 2) {
      return NextResponse.json(
        { error: "Valid 2-letter state code is required" },
        { status: 400 },
      );
    }

    const stateUpper = state.toUpperCase();

    // Fetch stations from FCC OPIF API
    const fccUrl = `https://publicfiles.fcc.gov/api/service/tv/facility/search/${stateUpper}`;
    const fccRes = await fetch(fccUrl, {
      headers: { Accept: "application/json" },
    });

    if (!fccRes.ok) {
      return NextResponse.json(
        { error: `FCC API returned ${fccRes.status}` },
        { status: 502 },
      );
    }

    const fccData: FCCResponse = await fccRes.json();

    const facilities: FCCFacility[] = [];
    for (const search of fccData.results?.searchList ?? []) {
      for (const facility of search.facilityList ?? []) {
        facilities.push(facility);
      }
    }

    // Filter to active stations only
    const activeStations = facilities.filter(
      (f) => f.activeInd === "Y",
    );

    if (activeStations.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        message: `No active stations found for ${stateUpper}`,
      });
    }

    // Map FCC fields to our schema
    const rows = activeStations.map((f) => ({
      facility_id: f.id,
      call_sign: f.callSign ?? "",
      service_type: f.service ?? "Digital TV",
      rf_channel: f.rfChannel ?? null,
      virtual_channel: f.virtualChannel ?? null,
      community_city: f.communityCity ?? "",
      community_state: f.communityState ?? stateUpper,
      nielsen_dma: f.nielsenDma ?? null,
      network_affil: f.networkAfil ?? null,
      band: f.band ?? null,
      party_name: f.partyName ?? null,
      party_address: [f.partyAddress1, f.partyAddress2]
        .filter(Boolean)
        .join(", ") || null,
      party_city: f.partyCity ?? null,
      party_state: f.partyState ?? null,
      party_zip: f.partyZip ?? null,
      party_phone: f.partyPhone ?? null,
      party_email: f.cenEmail ?? null,
      status: f.status ?? null,
      license_expiration: f.licenseExpirationDate ?? null,
      active: true,
      last_synced_at: new Date().toISOString(),
    }));

    // Upsert in batches using service role client
    const serviceClient = getServiceClient();
    const batchSize = 50;
    let synced = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error } = await serviceClient
        .from("broadcast_stations")
        .upsert(batch, { onConflict: "facility_id" });

      if (error) {
        errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
      } else {
        synced += batch.length;
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      total_found: activeStations.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
