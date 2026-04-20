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

const FALLBACK_AVATARS: AvatarOption[] = [
  { id: "49dc8f46-8c08-45f1-8608-57069c173827", name: "Ada", thumbnail: "", gender: "female" },
  { id: "2f17a7d7-bba5-4cc8-9c4e-c9e91c81dad5", name: "Alex", thumbnail: "", gender: "female" },
  { id: "894c9b8a-e3a7-40b7-b7e6-7441faceb46e", name: "Jaz", thumbnail: "", gender: "male" },
  { id: "0d2356ca-b688-419a-b08b-9264e5a6a94e", name: "Joshua", thumbnail: "", gender: "male" },
  { id: "9fd70b49-1ab4-494e-9872-90d831ad31b7", name: "Julia", thumbnail: "", gender: "female" },
  { id: "277766da-bb79-4a75-9193-ed45a03b372e", name: "Kayla", thumbnail: "", gender: "female" },
  { id: "6381592b-36bc-448d-aca2-1ffd33611ec2", name: "Paloma", thumbnail: "", gender: "female" },
  { id: "b3d74452-7011-4e8e-b3bf-12f7406f8f22", name: "Talia", thumbnail: "", gender: "female" },
  { id: "4e904b0a-f86d-47be-b654-adc6a6db6511", name: "Francesca", thumbnail: "", gender: "female" },
  { id: "3c07df3e-2a1a-45f1-a78d-c9f50fee6d15", name: "Marcus", thumbnail: "", gender: "male" },
  { id: "a8c69540-00e0-4fb3-b162-f76e726d29e1", name: "David", thumbnail: "", gender: "male" },
  { id: "19ea6181-887d-45bc-a07d-249baab948a5", name: "Santa", thumbnail: "", gender: "male" },
  { id: "3bfcb449-0181-40aa-b9d1-511a58397c08", name: "Srishti", thumbnail: "", gender: "female" },
  { id: "1c5584a3-cb65-4b8a-ab62-a91cea54c7a0", name: "Yasmin", thumbnail: "", gender: "female" },
];

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

    if (response.ok) {
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
    } else {
      // API failed — use hardcoded fallback
      console.warn("Synthesia avatars API unavailable, using fallback list");
      cachedAvatars = FALLBACK_AVATARS;
      cacheTimestamp = Date.now();
      return NextResponse.json({ avatars: FALLBACK_AVATARS });
    }
  } catch (err) {
    console.error("Avatars fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
