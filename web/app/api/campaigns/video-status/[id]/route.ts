import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
        { error: "Video service not configured" },
        { status: 503 },
      );
    }

    const { id } = await params;

    const response = await fetch(`https://api.synthesia.io/v2/videos/${id}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      console.error("Synthesia status error:", response.status, errBody);
      return NextResponse.json(
        { error: "Failed to check video status" },
        { status: 502 },
      );
    }

    const data = await response.json();

    // Map Synthesia status to our simplified status
    let status: "in_progress" | "complete" | "failed" = "in_progress";
    if (data.status === "complete") {
      status = "complete";
    } else if (data.status === "failed" || data.status === "error") {
      status = "failed";
    }

    return NextResponse.json({
      status,
      downloadUrl: status === "complete" ? data.download : null,
      duration: data.duration ?? null,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
