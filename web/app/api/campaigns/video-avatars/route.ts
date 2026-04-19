import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface SynthesiaAvatar {
  id: string;
  name: string;
  thumbnail_url: string;
  gender: string;
  style: string;
}

interface AvatarOption {
  id: string;
  name: string;
  thumbnail: string;
  gender: string;
}

let cachedAvatars: AvatarOption[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function GET() {
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
        { error: "Synthesia not configured" },
        { status: 503 },
      );
    }

    // Return cached avatars if still fresh
    if (cachedAvatars && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
      return NextResponse.json({ avatars: cachedAvatars });
    }

    const response = await fetch("https://api.synthesia.io/v2/avatars", {
      headers: {
        Authorization: apiKey,
      },
    });

    if (!response.ok) {
      console.error("Synthesia avatars error:", response.status);
      return NextResponse.json(
        { error: "Failed to fetch avatars" },
        { status: 502 },
      );
    }

    const data = await response.json();
    const avatarList = data.avatars ?? data;

    const avatars: AvatarOption[] = (Array.isArray(avatarList) ? avatarList : []).map(
      (a: SynthesiaAvatar) => ({
        id: a.id,
        name: a.name ?? a.id,
        thumbnail: a.thumbnail_url ?? "",
        gender: (a.gender ?? "").toLowerCase(),
      }),
    );

    // Sort alphabetically by name
    avatars.sort((a, b) => a.name.localeCompare(b.name));

    cachedAvatars = avatars;
    cacheTimestamp = Date.now();

    return NextResponse.json({ avatars });
  } catch (err) {
    console.error("Avatars fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
