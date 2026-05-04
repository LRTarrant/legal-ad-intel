import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { trackCall } from "@/lib/cost-tracking/tracker";
import { getFirmForUser } from "@/lib/firms/server";

export const maxDuration = 30;

interface VoiceoverRequest {
  text: string;
  voiceId: string;
  /**
   * Optional firm attribution — when supplied, cost lands on this firm
   * (RLS-checked first). Used by the PI video flow so per-scene voiceovers
   * aggregate against the firm we're advertising for.
   */
  firm_id?: string;
  /** Optional context tags for cost analytics. */
  practice_area?: "mass_tort" | "personal_injury";
  pi_category?: string;
  scene_number?: number;
}

export async function POST(req: NextRequest) {
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

    const body: VoiceoverRequest = await req.json();
    if (!body.text || !body.voiceId) {
      return NextResponse.json(
        { error: "text and voiceId are required" },
        { status: 400 },
      );
    }

    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(body.voiceId)}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: body.text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      },
    );

    if (!ttsResponse.ok) {
      const errText = await ttsResponse.text().catch(() => "");
      console.error("ElevenLabs TTS error:", ttsResponse.status, errText);
      return NextResponse.json(
        { error: "Voiceover generation failed" },
        { status: 502 },
      );
    }

    const audioBuffer = await ttsResponse.arrayBuffer();

    // Cost tracking. Firm verification is best-effort — if the supplied
    // firm_id doesn't match a firm the caller manages, we fall back to
    // null attribution rather than failing the audio response (the audio
    // is already generated and the user is waiting on it).
    let resolvedFirmId: string | null = null;
    if (body.firm_id) {
      const firm = await getFirmForUser(supabase, user.id, body.firm_id).catch(
        () => null,
      );
      resolvedFirmId = firm?.id ?? null;
    }
    void trackCall(supabase, {
      user_id: user.id,
      firm_id: resolvedFirmId,
      purpose: "voiceover",
      provider: "elevenlabs",
      model: "eleven_multilingual_v2",
      usage: { characters_synth: body.text.length },
      meta: {
        voice_id: body.voiceId,
        practice_area: body.practice_area,
        pi_category: body.pi_category,
        scene_number: body.scene_number,
      },
    });

    return new NextResponse(Buffer.from(audioBuffer), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.byteLength),
      },
    });
  } catch (err) {
    console.error("Voiceover generation error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
