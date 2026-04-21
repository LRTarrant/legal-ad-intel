import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  durationSeconds: number;
}

interface VideoScriptResponse {
  scenes: VideoScene[];
  ctaHeadline: string;
  ctaPhone: string;
  ctaSubline: string;
  disclaimer: string;
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

function getSceneCount(duration: string): string {
  switch (duration) {
    case "15s": return "exactly 2";
    case "30s": return "3-4";
    case "60s": return "5-6";
    default: return "3-4";
  }
}

const SYSTEM_PROMPT = `You are an expert direct-response video advertising scriptwriter for legal services.
You generate scene-by-scene breakdowns for multi-scene video compositions.

Rules:
- Generate {scene_count} scenes for a {duration} video
- Each scene has a HEADLINE (2-5 words, bold, attention-grabbing) and SUBHEADLINE (5-10 words, supporting detail)
- Each scene has an imagePrompt describing the background image for that scene
- Scene durations must sum to approximately the total video duration
- First scene MUST hook the viewer immediately
- Last content scene should set up the CTA
- Do NOT use the word "lawsuit" — use "legal rights" or "compensation"
- Tone: {tone_guidance}
- CRITICAL: Only reference the specific injury/disease provided in the tort context. Do NOT guess or add other medical conditions.

IMAGE PROMPT RULES (CRITICAL):
- NO courtrooms, NO gavels, NO legal scales, NO suits, NO handshakes
- NO generic "justice" or "legal" imagery
- Images must be tort-contextual and demographic-appropriate
- Describe real people in real settings relevant to the tort
- NO text, words, letters, or logos in the image description
- Focus on emotional, relatable scenes that connect with the target audience

Respond with ONLY valid JSON matching this exact structure:
{
  "scenes": [
    { "sceneNumber": 1, "headline": "...", "subheadline": "...", "imagePrompt": "...", "durationSeconds": 8 }
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

  return `Generate a scene-by-scene video script breakdown ${firmRef} regarding ${req.tort_name} litigation.

Duration: ${req.duration} (${getSceneCount(req.duration)} scenes)
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

    const filledSystemPrompt = SYSTEM_PROMPT
      .replace("{scene_count}", getSceneCount(body.duration))
      .replace("{duration}", body.duration)
      .replace("{tone_guidance}", toneGuidance);

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
