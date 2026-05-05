import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { applyPronunciationToText } from "@/lib/voice/pronunciation-dictionary";

interface RadioSpotRequest {
  script: string;
  voiceId: string;
  duration: "30s" | "60s";
  /**
   * Optional firm attribution — currently the mass-tort radio flow
   * doesn't pass it, but accepting it here lets a future caller route
   * per-firm pronunciation overrides through this endpoint without
   * another schema bump.
   */
  firm_id?: string;
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

    const body: RadioSpotRequest = await req.json();
    if (!body.script || !body.voiceId) {
      return NextResponse.json(
        { error: "script and voiceId are required" },
        { status: 400 },
      );
    }

    // Apply pronunciation overrides (per-firm + global dictionary).
    // Best-effort — falls back to original script on any failure.
    const pronunciation = await applyPronunciationToText(
      supabase,
      user.id,
      body.script,
      body.firm_id ?? null,
    );

    // ── DIAGNOSTIC LOGGING (TEMPORARY) ─────────────────────────────────
    // Mass tort radio route doesn't write to generation_costs, so we have
    // no DB record of whether the substitution fired. This logs a single
    // line per request that we can inspect via Vercel logs to confirm:
    //   - global dictionary was loaded (count)
    //   - any per-firm overrides applied (count)
    //   - whether the script changed at all (length delta + first 200 chars
    //     of the post-substitution text)
    //
    // Remove after we confirm the dictionary is firing on this route.
    console.log(
      JSON.stringify({
        msg: "pronunciation_diag",
        route: "generate-radio-spot",
        user_id: user.id,
        firm_id: body.firm_id ?? null,
        global_overrides_available: pronunciation.globalOverridesAvailable,
        firm_overrides_applied: pronunciation.firmOverridesApplied,
        original_len: body.script.length,
        substituted_len: pronunciation.text.length,
        changed: body.script !== pronunciation.text,
        sample_before: body.script.slice(0, 200),
        sample_after: pronunciation.text.slice(0, 200),
      }),
    );

    // Call ElevenLabs TTS API
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${body.voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: pronunciation.text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true,
          },
        }),
      },
    );

    if (!ttsResponse.ok) {
      const errText = await ttsResponse.text().catch(() => "");
      console.error("ElevenLabs TTS error:", ttsResponse.status, errText);
      return NextResponse.json(
        { error: "Audio generation failed" },
        { status: 502 },
      );
    }

    // Get the audio as ArrayBuffer
    const audioBuffer = await ttsResponse.arrayBuffer();

    // Upload to Supabase Storage
    const tenantId = user.id;
    const timestamp = Date.now();
    const filePath = `${tenantId}/radio-spots/${timestamp}.mp3`;

    const { error: uploadError } = await supabase.storage
      .from("campaign-assets")
      .upload(filePath, Buffer.from(audioBuffer), {
        contentType: "audio/mpeg",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      // Fall back to returning audio as base64 data URL
      const base64 = Buffer.from(audioBuffer).toString("base64");
      return NextResponse.json({
        audioUrl: `data:audio/mpeg;base64,${base64}`,
        storagePath: null,
      });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("campaign-assets").getPublicUrl(filePath);

    return NextResponse.json({
      audioUrl: publicUrl,
      storagePath: filePath,
    });
  } catch (err) {
    console.error("Radio spot generation error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
