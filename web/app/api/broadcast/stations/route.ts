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
    const dma = searchParams.get("dma");
    const network = searchParams.get("network");
    const serviceType = searchParams.get("service_type");

    let query = supabase
      .from("broadcast_stations")
      .select("*")
      .eq("active", true)
      .order("call_sign", { ascending: true });

    if (state) {
      query = query.eq("community_state", state.toUpperCase());
    }
    if (dma) {
      query = query.ilike("nielsen_dma", `%${dma}%`);
    }
    if (network) {
      query = query.ilike("network_affil", `%${network}%`);
    }
    if (serviceType) {
      query = query.eq("service_type", serviceType);
    }

    const { data: stations, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch stations" },
        { status: 500 },
      );
    }

    return NextResponse.json({ stations: stations ?? [] });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
