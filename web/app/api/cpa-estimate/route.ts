import { NextRequest, NextResponse } from "next/server";
import { estimateTortCpa } from "@/lib/queries/tort-benchmarks";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tort_name, criteria_breadth, geo_scope, lifecycle_phase } = body;

    if (!tort_name || typeof tort_name !== "string") {
      return NextResponse.json(
        { error: "tort_name is required" },
        { status: 400 }
      );
    }

    const result = await estimateTortCpa(tort_name, {
      criteriaBreadth: criteria_breadth ?? "medium",
      geoScope: geo_scope ?? "national",
      lifecyclePhase: lifecycle_phase ?? undefined,
    });

    if (!result) {
      return NextResponse.json(
        { error: "No benchmark data found for this tort" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("CPA estimate error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
