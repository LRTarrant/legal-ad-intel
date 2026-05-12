import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  checkCampaignBuilderEntitlement,
  entitlementErrorBody,
} from "@/lib/campaign-builder/entitlements";
import {
  DemoModeAccessDenied,
  readDemoModeOverride,
} from "@/lib/admin/demo-mode";
import { trackCall } from "@/lib/cost-tracking/tracker";

interface VideoScriptRequest {
  duration: "15s" | "30s" | "60s";
  tort_name: string;
  platform: "youtube_ad" | "youtube_short" | "tiktok" | "meta_reel" | "meta_feed";
  firm_name?: string;
  states?: string[];
  language?: "en" | "es";
}

interface VideoScene {
  sceneNumber: number;
  headline: string;
  subheadline: string;
  imagePrompt: string;
  voiceover?: string;
  durationSeconds: number;
}

interface VideoScriptResponse {
  scenes: VideoScene[];
  ctaHeadline: string;
  ctaPhone: string;
  ctaSubline: string;
  disclaimer: string;
}

// English speaking rate used for narration timing.
// ~2.5 words/sec → 12 words for 5s, 25 for 10s, 50 for 20s.
const WORDS_PER_SECOND = 2.5;

// Duration-aware budgets — exactly 3 scenes, evenly distributed.
const SCENE_BUDGETS: Record<"15s" | "30s" | "60s", { perSceneSec: number; perSceneWords: number; totalSec: number; tone: string }> = {
  "15s": {
    perSceneSec: 5,
    perSceneWords: 12,
    totalSec: 15,
    tone: "very concise — one short beat per scene, no wasted words",
  },
  "30s": {
    perSceneSec: 10,
    perSceneWords: 25,
    totalSec: 30,
    tone: "balanced short script across all 3 scenes",
  },
  "60s": {
    perSceneSec: 20,
    perSceneWords: 50,
    totalSec: 60,
    tone: "fuller script, still paced evenly across all 3 scenes",
  },
};

function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function trimToWordLimit(text: string, maxWords: number): string {
  if (!text) return text;
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(" ");
}

function deriveToneGuidance(notes: string): string {
  const notesLower = notes.toLowerCase();

  if (notesLower.includes("women") || notesLower.includes("contraception") || notesLower.includes("uterine")) {
    return 'Empathetic, warm, and empowering. Speak to women who may feel dismissed by the medical system. Use "you deserve answers" framing.';
  }
  if (notesLower.includes("parent") || notesLower.includes("child") || notesLower.includes("minor")) {
    return 'Protective and urgent. Speak to parents concerned about their children\'s safety. Use "as a parent" framing.';
  }
  if (notesLower.includes("military") || notesLower.includes("veteran") || notesLower.includes("firefight")) {
    return 'Respectful and direct. Honor their service while informing them of their rights. Use "you served your country" framing.';
  }
  if (notesLower.includes("young adult") || notesLower.includes("rideshare")) {
    return "Direct and validating. Speak to young adults who may not know their legal rights. Use clear, modern language without legal jargon.";
  }
  if (notesLower.includes("cancer") || notesLower.includes("older") || notesLower.includes("chemo")) {
    return 'Compassionate and authoritative. Speak to people dealing with serious health issues. Use "you trusted" framing — trusted the product, trusted the doctor.';
  }
  if (notesLower.includes("occupational") || notesLower.includes("exposure") || notesLower.includes("landscap")) {
    return 'Working-class solidarity tone. Speak to people who were exposed through their job or daily life. Use "hardworking people like you" framing.';
  }

  return "Authoritative but empathetic. Balance urgency with trustworthiness.";
}

function formatAgeBands(ageBandWeights: Record<string, number> | null): string {
  if (!ageBandWeights || typeof ageBandWeights !== "object") return "";
  const sorted = Object.entries(ageBandWeights)
    .filter(([, v]) => typeof v === "number" && v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);
  if (sorted.length === 0) return "";
  return sorted.map(([band, weight]) => `${band} (${Math.round(weight * 100)}%)`).join(", ");
}

const SYSTEM_PROMPT = `You are generating a legal video ad storyboard with exactly 3 scenes for a selected runtime of :15, :30, or :60.
Keep the existing visual workflow unchanged. Do not make decisions about image sourcing or visual asset selection.
Your job is to produce duration-aware scene copy only. Write scene-by-scene narration that fits naturally within the
selected total runtime, distribute copy evenly across all 3 scenes, and avoid front-loading the first scene or leaving
later scenes sparse. For each scene, provide visual placeholder text, on-screen text, voiceover, and target duration.

Rules:
- Generate EXACTLY 3 scenes for a {duration} video (total runtime ~{total_sec}s).
- Each scene has a per-scene budget of ~{per_scene_sec}s and ~{per_scene_words} words of voiceover (English ~2.5 words/sec).
- Distribute spoken copy evenly across all 3 scenes — do not overload scene 1 while leaving scenes 2 and 3 sparse.
- Each scene returns: headline (on-screen text, 2-5 words), subheadline (5-10 words), imagePrompt (visual placeholder description),
  voiceover (the spoken narration sized to the per-scene word budget), and durationSeconds (the per-scene budget).
- Scene 1 hooks the viewer; scene 2 builds the case; scene 3 sets up the CTA.
- Pacing guidance: {pacing_tone}.
- Do NOT use the word "lawsuit" — use "legal rights" or "compensation".
- Tone: {tone_guidance}.
- CRITICAL: Only reference the specific injury/disease provided in the tort context. Do NOT guess or add other medical conditions.

IMAGE PROMPT RULES (visual placeholder only — the existing visual pipeline handles image selection):
- NO courtrooms, NO gavels, NO legal scales, NO suits, NO handshakes
- NO generic "justice" or "legal" imagery
- Describe real people in real settings relevant to the tort
- NO text, words, letters, or logos in the image description

Respond with ONLY valid JSON matching this exact structure:
{
  "scenes": [
    { "sceneNumber": 1, "headline": "...", "subheadline": "...", "imagePrompt": "...", "voiceover": "...", "durationSeconds": {per_scene_sec} },
    { "sceneNumber": 2, "headline": "...", "subheadline": "...", "imagePrompt": "...", "voiceover": "...", "durationSeconds": {per_scene_sec} },
    { "sceneNumber": 3, "headline": "...", "subheadline": "...", "imagePrompt": "...", "voiceover": "...", "durationSeconds": {per_scene_sec} }
  ],
  "ctaHeadline": "CALL NOW",
  "ctaPhone": "1-800-YOUR-FIRM",
  "ctaSubline": "24/7 • Free Consultation • No Fee Unless You Win",
  "disclaimer": "Attorney advertising. Prior results do not guarantee a similar outcome."
}`;

function buildUserPrompt(
  req: VideoScriptRequest,
  audienceProfile: { notes?: string; age_band_weights?: Record<string, number> } | null,
  matchedTort: { name?: string; disease_or_injury?: string; product_or_exposure?: string; status?: string; notes?: string } | null,
): string {
  const firmRef = req.firm_name ? `for ${req.firm_name}` : "for a legal firm";
  const statesRef = req.states?.length ? `Target geography: ${req.states.join(", ")}.` : "";

  let audienceSection = "";
  if (audienceProfile?.notes) {
    const toneGuidance = deriveToneGuidance(audienceProfile.notes);
    const ageBands = formatAgeBands(audienceProfile.age_band_weights ?? null);
    audienceSection = `

AUDIENCE PROFILE:
- Target demographic: ${audienceProfile.notes}
${ageBands ? `- Primary age bands: ${ageBands}` : ""}
- Tone guidance: ${toneGuidance}

The scenes MUST visually and textually speak to this audience. Image prompts should depict people matching this demographic in settings relevant to their lives.`;
  }

  let tortContextSection = "";
  if (matchedTort) {
    tortContextSection = `

TORT MEDICAL/LEGAL CONTEXT:
- Product/Exposure: ${matchedTort.product_or_exposure ?? "N/A"}
- Injury/Disease: ${matchedTort.disease_or_injury ?? "N/A"}
- CRITICAL: Only reference the injury/disease listed above. Do NOT mention other side effects or medical conditions not listed here.`;
  }

  const languageInstruction = req.language === "es"
    ? `\n\nLANGUAGE: Spanish (Español)\nIMPORTANT: Generate all scene headlines, subheadlines, ctaHeadline, ctaSubline, and disclaimer text in natural, culturally appropriate Spanish — not a direct translation from English. Image prompts should remain in English (they are used for image generation). The JSON keys must remain in English. Keep the firm name as-is (do not translate it).`
    : "";

  const budget = SCENE_BUDGETS[req.duration];
  return `Generate a scene-by-scene video script breakdown ${firmRef} regarding ${req.tort_name} litigation.

Duration: ${req.duration} total — exactly 3 scenes, ~${budget.perSceneSec}s each (~${budget.perSceneWords} voiceover words per scene).
Platform: ${req.platform.replace(/_/g, " ")}
${statesRef}
${audienceSection}
${tortContextSection}${languageInstruction}

Remember: output ONLY the JSON, nothing else.`;
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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Script generation not configured" },
        { status: 503 },
      );
    }

    const body: VideoScriptRequest = await req.json();
    if (!body.tort_name || !body.duration || !body.platform) {
      return NextResponse.json(
        { error: "tort_name, duration, and platform are required" },
        { status: 400 },
      );
    }

    // Server-side entitlement gate (see entitlements.ts). Mass-tort path.
    {
      const stateForCheck =
        Array.isArray(body.states) && body.states.length === 1
          ? body.states[0]
          : null;
  // Admin demo-mode override (super_admin only). Spoofed headers
  // surface as 403; absent headers => real subscription path.
  let demoMode;
  try {
    demoMode = await readDemoModeOverride(supabase, req, user.id);
  } catch (e) {
    if (e instanceof DemoModeAccessDenied) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    throw e;
  }

      const gate = await checkCampaignBuilderEntitlement(supabase, user.id, {
        practice_area: "mass_tort",
        state: stateForCheck,
        is_create: false,
      }, demoMode);
      if (!gate.ok) {
        const { body: errBody, status } = entitlementErrorBody(gate);
        return NextResponse.json(errBody, { status });
      }
    }

    // Fetch audience profile and tort medical context in parallel
    const db = supabase as any;
    const [profileResult, tortResult] = await Promise.allSettled([
      db.from("tort_audience_profiles").select("*"),
      db.from("mass_torts").select("name, disease_or_injury, product_or_exposure, status, notes"),
    ]);

    const allProfiles = profileResult.status === "fulfilled" ? profileResult.value.data : null;
    const tortData = tortResult.status === "fulfilled" ? tortResult.value.data : null;

    const tortLower = body.tort_name.toLowerCase();
    const audienceProfile = (allProfiles ?? []).find((p: any) => {
      const tid = (p.tort_id ?? "").toLowerCase();
      const notes = (p.notes ?? "").toLowerCase();
      return tid.includes(tortLower) || tortLower.includes(tid.replace(/_/g, " ")) || notes.includes(tortLower);
    }) ?? null;

    const matchedTort = (tortData ?? []).find((t: any) => {
      const tname = (t.name ?? "").toLowerCase();
      return tname.includes(tortLower) || tortLower.includes(tname);
    }) ?? null;

    const toneGuidance = audienceProfile?.notes
      ? deriveToneGuidance(audienceProfile.notes)
      : "Authoritative but empathetic. Balance urgency with trustworthiness.";

    const budget = SCENE_BUDGETS[body.duration];
    if (!budget) {
      return NextResponse.json(
        { error: "duration must be one of 15s, 30s, 60s" },
        { status: 400 },
      );
    }

    const filledSystemPrompt = SYSTEM_PROMPT
      .replace(/\{duration\}/g, body.duration)
      .replace(/\{total_sec\}/g, String(budget.totalSec))
      .replace(/\{per_scene_sec\}/g, String(budget.perSceneSec))
      .replace(/\{per_scene_words\}/g, String(budget.perSceneWords))
      .replace(/\{pacing_tone\}/g, budget.tone)
      .replace(/\{tone_guidance\}/g, toneGuidance);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            temperature: 0.7,
            max_tokens: 1000,
            messages: [
              { role: "system", content: filledSystemPrompt },
              { role: "user", content: buildUserPrompt(body, audienceProfile, matchedTort) },
            ],
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeout);

      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        console.error("OpenAI API error:", response.status, errBody);
        return NextResponse.json(
          { error: "AI service unavailable" },
          { status: 502 },
        );
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim();

      if (!content) {
        return NextResponse.json(
          { error: "Empty AI response" },
          { status: 502 },
        );
      }

      // Cost tracking (fire-and-forget). See radio-script for the same pattern.
      void trackCall(supabase, {
        user_id: user.id,
        purpose: "mt_video_script",
        provider: "openai",
        model: "gpt-4o",
        called_from: "api/campaigns/generate-video-script",
        usage: {
          input_tokens: data.usage?.prompt_tokens ?? 0,
          output_tokens: data.usage?.completion_tokens ?? 0,
        },
        meta: {
          tort_name: body.tort_name,
          duration: body.duration,
          platform: body.platform,
        },
      });

      // Parse the JSON response
      let parsed: VideoScriptResponse;
      try {
        // Strip markdown code fences if present
        const jsonStr = content.replace(/^```json?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
        parsed = JSON.parse(jsonStr);
      } catch {
        return NextResponse.json(
          { error: "Failed to parse AI response" },
          { status: 502 },
        );
      }

      // Fill in firm-specific CTA if firm name provided
      if (body.firm_name && parsed.ctaPhone === "1-800-YOUR-FIRM") {
        parsed.ctaPhone = "1-800-555-0100";
      }

      // Normalize to exactly 3 scenes with even per-scene duration budgets so
      // the timeline has no gaps and voiceover length fits each scene's clip.
      const incoming = Array.isArray(parsed.scenes) ? parsed.scenes : [];
      const normalizedScenes: VideoScene[] = [];
      for (let i = 0; i < 3; i++) {
        const src = incoming[i] ?? incoming[incoming.length - 1] ?? {
          sceneNumber: i + 1,
          headline: "",
          subheadline: "",
          imagePrompt: "",
          durationSeconds: budget.perSceneSec,
        };
        const voiceoverRaw = typeof (src as VideoScene).voiceover === "string"
          ? ((src as VideoScene).voiceover as string)
          : `${src.headline ?? ""} ${src.subheadline ?? ""}`.trim();
        // Cap voiceover to per-scene word budget so spoken length fits the clip.
        const voiceover = trimToWordLimit(voiceoverRaw, budget.perSceneWords);
        // Pin every scene's clip to the per-scene budget — even spacing across
        // 3 scenes is what removes the awkward pause after scene 1 and the
        // dead air on scenes 2 and 3. We log a warning if the trimmed
        // narration would still over-run the budget.
        if (countWords(voiceover) / WORDS_PER_SECOND > budget.perSceneSec + 0.5) {
          console.warn(`[generate-video-script] scene ${i + 1} voiceover exceeds budget`);
        }
        normalizedScenes.push({
          sceneNumber: i + 1,
          headline: src.headline ?? "",
          subheadline: src.subheadline ?? "",
          imagePrompt: src.imagePrompt ?? "",
          voiceover,
          durationSeconds: budget.perSceneSec,
        });
      }
      parsed.scenes = normalizedScenes;

      return NextResponse.json(parsed);
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof DOMException && err.name === "AbortError") {
        return NextResponse.json(
          { error: "AI request timed out" },
          { status: 504 },
        );
      }
      throw err;
    }
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
