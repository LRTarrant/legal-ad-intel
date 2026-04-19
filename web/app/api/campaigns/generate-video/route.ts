import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface GenerateVideoRequest {
  script: string;
  avatar_id: string;
  platform: "youtube_ad" | "youtube_short" | "tiktok" | "meta_reel" | "meta_feed";
  title?: string;
}

const PLATFORM_DIMENSIONS: Record<string, { width: number; height: number }> = {
  youtube_ad: { width: 1920, height: 1080 },
  youtube_short: { width: 1080, height: 1920 },
  tiktok: { width: 1080, height: 1920 },
  meta_reel: { width: 1080, height: 1920 },
  meta_feed: { width: 1080, height: 1080 },
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.SYNTHESIA_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Video generation not configured" },
        { status: 503 },
      );
    }

    const body: GenerateVideoRequest = await req.json();
    if (!body.script || !body.avatar_id || !body.platform) {
      return NextResponse.json(
        { error: "script, avatar_id, and platform are required" },
        { status: 400 },
      );
    }

    const dimensions = PLATFORM_DIMENSIONS[body.platform] ?? PLATFORM_DIMENSIONS.youtube_ad;

    const response = await fetch("https://api.synthesia.io/v2/videos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({
        title: body.title ?? "Legal Campaign Video",
        description: "AI-generated legal advertising video",
        visibility: "private",
        aspectRatio: dimensions.width === dimensions.height ? "1:1" : dimensions.width > dimensions.height ? "16:9" : "9:16",
        input: [
          {
            scriptText: body.script,
            avatar: body.avatar_id,
            background: "#0B1D3A",
          },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      console.error("Synthesia API error:", response.status, errBody);
      return NextResponse.json(
        { error: "Video generation service unavailable" },
        { status: 502 },
      );
    }

    const data = await response.json();

    return NextResponse.json({
      videoId: data.id,
      status: "in_progress",
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
