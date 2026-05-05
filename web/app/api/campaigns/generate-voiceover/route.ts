import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { trackCall } from "@/lib/cost-tracking/tracker";
import { getFirmForUser } from "@/lib/firms/server";
import {
  applyPronunciationOverrides,
  type PronunciationOverride,
} from "@/lib/voice/pronunciation";
import {
  getGlobalPronunciationDictionary,
  mergePronunciationLayers,
} from "@/lib/voice/pronunciation-dictionary";

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

    // ── Pronunciation overrides ────────────────────────────────────────
    // Resolve the firm BEFORE the TTS call so we can:
    //   1. Apply per-firm pronunciation overrides (firm name, partners,
    //      local cities like Birmingham → "BURR-ming-ham")
    //   2. Merge with the global pronunciation_dictionary (tort + product
    //      names every firm wants pronounced correctly — Depo-Provera,
    //      Paraquat, Talc, etc.)
    //
    // Firm overrides take precedence on overlapping written keys. If
    // anything in this block fails, we fall through to the original
    // text — pronunciation is best-effort, never blocks audio.
    let resolvedFirmId: string | null = null;
    let firmOverrides: PronunciationOverride[] = [];
    if (body.firm_id) {
      const firm = await getFirmForUser(supabase, user.id, body.firm_id).catch(
        () => null,
      );
      resolvedFirmId = firm?.id ?? null;
      // The generated firms type doesn't yet include pronunciation_overrides
      // (column added by migration 20260505000008); cast through any to read.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = (firm as any)?.pronunciation_overrides;
      if (Array.isArray(raw)) {
        firmOverrides = raw.filter(
          (o: unknown): o is PronunciationOverride =>
            !!o &&
            typeof o === "object" &&
            typeof (o as PronunciationOverride).written === "string" &&
            typeof (o as PronunciationOverride).spoken === "string",
        );
      }
    }

    const globalDictionary = await getGlobalPronunciationDictionary(
      supabase,
    ).catch(() => [] as PronunciationOverride[]);
    const mergedOverrides = mergePronunciationLayers(
      firmOverrides,
      globalDictionary,
    );
    const ttsText = applyPronunciationOverrides(body.text, mergedOverrides);

    // ── ElevenLabs TTS ─────────────────────────────────────────────────
    // ttsText has any matching pronunciation overrides already
    // substituted (plain respelling) or wrapped in <phoneme alphabet="ipa">
    // tags. eleven_multilingual_v2 honors phoneme tags.
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
          text: ttsText,
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

    // ── Cost tracking (fire-and-forget) ────────────────────────────────
    // Bill on the actual TTS-input length (post-substitution) since
    // ElevenLabs charges by characters synthesized.
    void trackCall(supabase, {
      user_id: user.id,
      firm_id: resolvedFirmId,
      purpose: "voiceover",
      provider: "elevenlabs",
      model: "eleven_multilingual_v2",
      usage: { characters_synth: ttsText.length },
      meta: {
        voice_id: body.voiceId,
        practice_area: body.practice_area,
        pi_category: body.pi_category,
        scene_number: body.scene_number,
        firm_overrides_applied: firmOverrides.length,
        global_overrides_available: globalDictionary.length,
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
