import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabaseAuth = await createServerClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // media_outlets table exists at runtime but isn't in generated types yet
    const supabase = supabaseAuth as any;

    const { searchParams } = new URL(req.url);
    const market = searchParams.get("market");
    const company = searchParams.get("company");
    const type = searchParams.get("type");
    const genre = searchParams.get("genre");
    const search = searchParams.get("search");
    const summary = searchParams.get("summary");

    // Summary mode: return aggregate stats for a market
    if (summary === "true") {
      if (!market) {
        return NextResponse.json(
          { error: "market parameter is required for summary" },
          { status: 400 },
        );
      }

      const [outletsResult] = await Promise.allSettled([
        supabase
          .from("media_outlets")
          .select("id, media_type, media_company")
          .eq("market", market),
      ]);

      const outlets =
        outletsResult.status === "fulfilled"
          ? outletsResult.value.data ?? []
          : [];

      let radioCount = 0;
      let tvCount = 0;
      let cableCount = 0;
      const companySet = new Set<string>();

      for (const o of outlets) {
        if (o.media_type === "Broadcast Radio") radioCount++;
        else if (o.media_type === "Broadcast TV") tvCount++;
        else if (o.media_type === "Cable TV") cableCount++;
        companySet.add(o.media_company);
      }

      return NextResponse.json({
        market,
        total_outlets: outlets.length,
        radio_count: radioCount,
        tv_count: tvCount,
        cable_count: cableCount,
        company_count: companySet.size,
      });
    }

    // List mode: return full outlet data with filters
    let query = supabase
      .from("media_outlets")
      .select("*")
      .order("call_sign", { ascending: true });

    if (market) {
      query = query.eq("market", market);
    }
    if (company) {
      query = query.eq("media_company", company);
    }
    if (type) {
      const typeMap: Record<string, string> = {
        radio: "Broadcast Radio",
        tv: "Broadcast TV",
        cable: "Cable TV",
      };
      const mapped = typeMap[type.toLowerCase()] ?? type;
      query = query.eq("media_type", mapped);
    }
    if (genre) {
      query = query.eq("format_genre", genre);
    }
    if (search) {
      query = query.or(
        `call_sign.ilike.%${search}%,media_company.ilike.%${search}%,market.ilike.%${search}%`,
      );
    }

    const { data: outlets, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch media outlets" },
        { status: 500 },
      );
    }

    return NextResponse.json({ outlets: outlets ?? [] });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
