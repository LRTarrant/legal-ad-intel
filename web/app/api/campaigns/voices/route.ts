import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
  preview_url: string;
}

interface VoiceOption {
  id: string;
  name: string;
  description: string;
  category: string;
  previewUrl: string;
}

let cachedVoices: VoiceOption[] | null = null;
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

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ElevenLabs not configured" },
        { status: 503 },
      );
    }

    // Return cached voices if still fresh
    if (cachedVoices && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
      return NextResponse.json({ voices: cachedVoices });
    }

    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "xi-api-key": apiKey,
      },
    });

    if (!response.ok) {
      console.error("ElevenLabs voices error:", response.status);
      return NextResponse.json(
        { error: "Failed to fetch voices" },
        { status: 502 },
      );
    }

    const data = await response.json();
    const voices: VoiceOption[] = (data.voices as ElevenLabsVoice[]).map(
      (v) => {
        const labelParts: string[] = [];
        if (v.labels.gender) labelParts.push(v.labels.gender);
        if (v.labels.accent) labelParts.push(v.labels.accent);
        if (v.labels.description) labelParts.push(v.labels.description);
        if (v.labels.age) labelParts.push(v.labels.age);

        return {
          id: v.voice_id,
          name: v.name,
          description: labelParts.join(", ") || v.category,
          category: v.category,
          previewUrl: v.preview_url,
        };
      },
    );

    // Sort: premade first, then cloned
    voices.sort((a, b) => {
      if (a.category === "premade" && b.category !== "premade") return -1;
      if (a.category !== "premade" && b.category === "premade") return 1;
      return a.name.localeCompare(b.name);
    });

    cachedVoices = voices;
    cacheTimestamp = Date.now();

    return NextResponse.json({ voices });
  } catch (err) {
    console.error("Voices fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
