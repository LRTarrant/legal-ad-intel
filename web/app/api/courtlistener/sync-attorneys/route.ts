import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { extractDocketId, fetchDocketAttorneys } from "@/lib/courtlistener";

/**
 * POST /api/courtlistener/sync-attorneys
 *
 * Body: { mdl_number: number }
 *
 * Looks up the MDL's source_url, extracts the CourtListener docket ID,
 * fetches attorney/party data, and upserts into mdl_attorneys.
 * Returns the count of attorneys synced.
 */
export async function POST(request: Request) {
  let body: { mdl_number?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const mdlNumber = body.mdl_number;
  if (!mdlNumber || typeof mdlNumber !== "number") {
    return NextResponse.json(
      { error: "mdl_number (integer) is required" },
      { status: 400 }
    );
  }

  const supabase = getSupabase();

  // Look up the MDL to get its source_url
  const { data: mdl, error: mdlError } = await supabase
    .from("mdls")
    .select("mdl_number, source_url")
    .eq("mdl_number", mdlNumber)
    .maybeSingle();

  if (mdlError) {
    return NextResponse.json(
      { error: `Failed to look up MDL: ${mdlError.message}` },
      { status: 500 }
    );
  }

  if (!mdl) {
    return NextResponse.json(
      { error: `MDL ${mdlNumber} not found` },
      { status: 404 }
    );
  }

  // Extract docket ID from the source_url
  const docketId = mdl.source_url ? extractDocketId(mdl.source_url) : null;

  // Fetch attorneys (will use stubs if no docket ID or no API token)
  const attorneys = await fetchDocketAttorneys(
    docketId ?? 0,
    mdlNumber
  );

  if (attorneys.length === 0) {
    return NextResponse.json({
      mdl_number: mdlNumber,
      synced: 0,
      message: "No attorney data available for this MDL",
    });
  }

  // Upsert attorneys into mdl_attorneys
  const rows = attorneys.map((att) => ({
    mdl_number: mdlNumber,
    attorney_name: att.attorney_name,
    firm_name: att.firm_name,
    email: att.email,
    phone: att.phone,
    role: att.role,
    party_name: att.party_name,
    cl_attorney_id: att.cl_attorney_id,
    source_url: mdl.source_url,
    fetched_at: new Date().toISOString(),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: upsertError } = await (supabase as any)
    .from("mdl_attorneys")
    .upsert(rows, {
      onConflict: "mdl_number,cl_attorney_id",
      ignoreDuplicates: false,
    });

  if (upsertError) {
    return NextResponse.json(
      { error: `Upsert failed: ${upsertError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    mdl_number: mdlNumber,
    synced: attorneys.length,
    docket_id: docketId,
  });
}
