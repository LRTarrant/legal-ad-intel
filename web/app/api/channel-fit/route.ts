import { NextRequest, NextResponse } from "next/server";
import { getChannelFitScores } from "@/lib/queries/channel-fit";

/**
 * GET /api/channel-fit?tort_id=AUTO_INJURY&profile_name=default&market_id=US_TEST
 *
 * Returns ranked channel-fit scores for the given tort, profile, and market.
 * All params have sensible defaults so you can call with just tort_id.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const tortId = searchParams.get("tort_id");
  if (!tortId) {
    return NextResponse.json(
      { error: "tort_id query parameter is required" },
      { status: 400 }
    );
  }

  const profileName = searchParams.get("profile_name") ?? "default";
  const marketId = searchParams.get("market_id") ?? "US_TEST";

  try {
    const scores = await getChannelFitScores(tortId, profileName, marketId);

    return NextResponse.json({
      tort_id: tortId,
      profile_name: profileName,
      market_id: marketId,
      channels: scores,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
