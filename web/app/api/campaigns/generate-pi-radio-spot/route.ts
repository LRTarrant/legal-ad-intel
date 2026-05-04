/**
 * POST /api/campaigns/generate-pi-radio-spot
 *
 * The audio sizzle. Takes a polished PI script + a chosen ElevenLabs
 * voice and returns a playable .mp3 URL. Phase 1.6 of the PI feature
 * parity project — first time PI campaigns produce playable audio.
 *
 * Why a separate route from the existing /generate-radio-spot:
 *   - Cost attribution: PI generations need to land on the right firm
 *     for COGS tracking (Phase 0.5 wired LLM cost; this wires audio cost)
 *   - firm_id verification: agencies generating for a managed client
 *     need their own attribution path
 *   - Meta tagging: pi_category, state, severity, brand_aware go onto
 *     the generation_costs row so we can later answer "what % of audio
 *     spend is brand-aware PI?"
 *
 * Pattern matches mass tort /generate-radio-spot:
 *   1. ElevenLabs TTS \u2192 mp3 audio buffer
 *   2. Upload to Supabase storage under {user_id}/pi-radio-spots/...
 *   3. Return public URL
 *   4. Fall back to base64 data URL if storage upload fails
 *
 * Errors:
 *   400 \u2014 missing/invalid input
 *   401 \u2014 unauthenticated
 *   403 \u2014 firm_id supplied but caller doesn't manage it
 *   502 \u2014 upstream ElevenLabs failure
 *   503 \u2014 ELEVENLABS_API_KEY not configured
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { trackCall } from "@/lib/cost-tracking/tracker";
import { getFirmForUser } from "@/lib/firms/server";

interface PIRadioSpotRequest {
  /** The polished PI script to synthesize. */
  script: string;
  /** ElevenLabs voice id. */
  voiceId: string;
  /** Spot length \u2014 used for analytics, not audio config. */
  duration: "15s" | "30s" | "60s";
  /** Optional firm attribution. RLS-checked when present. */
  firm_id?: string;
  /** Analytics meta. All optional but recommended. */
  pi_category?: string;
  state?: string;
  severity_modifiers?: string[];
  language?: "en" | "es";
}

const MAX_SCRIPT_CHARS = 4000;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PIRadioSpotRequest;
  try {
    body = (await req.json()) as PIRadioSpotRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Input validation
  if (!body.script?.trim()) {
    return NextResponse.json(
      { error: "script is required" },
      { status: 400 },
    );
  }
  if (body.script.length > MAX_SCRIPT_CHARS) {
    return NextResponse.json(
      {
        error: `script exceeds ${MAX_SCRIPT_CHARS} characters; ElevenLabs caps a single TTS request`,
      },
      { status: 400 },
    );
  }
  if (!body.voiceId?.trim()) {
    return NextResponse.json(
      { error: "voiceId is required" },
      { status: 400 },
    );
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ElevenLabs not configured" },
      { status: 503 },
    );
  }

  // Verify firm access (if a firm_id was supplied)
  let resolvedFirmId: string | null = null;
  if (body.firm_id) {
    const firm = await getFirmForUser(supabase, user.id, body.firm_id);
    if (!firm) {
      return NextResponse.json(
        { error: "firm_id not found or you don't manage that firm" },
        { status: 403 },
      );
    }
    resolvedFirmId = firm.id;
  }

  // Voice selection in ElevenLabs is the same model whether the language
  // is English or Spanish; eleven_multilingual_v2 handles both. We pass
  // it through unconditionally and rely on the script text language.
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
        text: body.script,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          // Stability 0.5 + similarity 0.75 matches mass tort's defaults.
          // style + speaker_boost are tuned slightly higher for PI \u2014
          // PI scripts benefit from a touch more emotional inflection
          // than the dry mass-tort cancer-ad register.
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.55,
          use_speaker_boost: true,
        },
      }),
    },
  );

  if (!ttsResponse.ok) {
    const errText = await ttsResponse.text().catch(() => "");
    console.error("ElevenLabs TTS error (PI):", ttsResponse.status, errText);
    return NextResponse.json(
      { error: "Audio generation failed" },
      { status: 502 },
    );
  }

  const audioBuffer = await ttsResponse.arrayBuffer();
  const characters_synth = body.script.length;

  // Cost tracking. We await so cost makes it into the response payload.
  // trackCall never throws on DB failure \u2014 it's observability, not txn.
  const tracked = await trackCall(supabase, {
    user_id: user.id,
    firm_id: resolvedFirmId,
    purpose: "voiceover",
    provider: "elevenlabs",
    model: "eleven_multilingual_v2",
    usage: { characters_synth },
    meta: {
      voice_id: body.voiceId,
      duration: body.duration,
      pi_category: body.pi_category,
      state: body.state,
      severity_modifiers: body.severity_modifiers ?? [],
      language: body.language ?? "en",
    },
  });

  // Upload to Supabase storage under a PI-specific prefix so PI assets
  // are easy to filter from mass-tort assets in the future.
  const timestamp = Date.now();
  const filePath = `${user.id}/pi-radio-spots/${timestamp}.mp3`;

  const { error: uploadError } = await supabase.storage
    .from("campaign-assets")
    .upload(filePath, Buffer.from(audioBuffer), {
      contentType: "audio/mpeg",
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("Supabase upload error (PI):", uploadError);
    // Fall back to a base64 data URL so the user still hears their spot
    // even if storage is misconfigured. The cost row is still recorded
    // \u2014 we don't want users re-charged because of an upload glitch.
    const base64 = Buffer.from(audioBuffer).toString("base64");
    return NextResponse.json({
      audioUrl: `data:audio/mpeg;base64,${base64}`,
      storagePath: null,
      cost_cents: tracked.cost_cents,
      characters_synth,
    });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("campaign-assets").getPublicUrl(filePath);

  return NextResponse.json({
    audioUrl: publicUrl,
    storagePath: filePath,
    cost_cents: tracked.cost_cents,
    characters_synth,
  });
}
