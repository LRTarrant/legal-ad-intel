import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface VideoScriptRequest {
  duration: "15s" | "30s" | "60s";
  tort_name: string;
  platform: "youtube_ad" | "youtube_short" | "tiktok" | "meta_reel" | "meta_feed";
  firm_name?: string;
  firm_url?: string;
  states?: string[];
}

interface VoiceRecommendation {
  gender: "male" | "female";
  style: string;
  reason: string;
}

interface AudienceContext {
  primary_age_bands: string;
  audience_note: string;
}

const SYSTEM_PROMPT = `You are an expert direct-response video advertising copywriter for legal services.
You write compelling scripts for AI avatar-presented video ads that drive immediate action.

Rules:
- {duration} spots: exactly {word count} words
- The script will be read by an AI avatar speaking directly to camera
- Start with an attention-grabbing hook IN THE FIRST SENTENCE (critical for social platforms)
- Clearly state the legal issue and who qualifies
- Include the firm name naturally 2-3 times
- End with a strong call-to-action
- Tone: {derived tone from audience profile}
- Do NOT use the word "lawsuit" — use "legal rights" or "compensation"
- Include "You may be entitled to compensation"
- Write in a conversational, direct-to-camera style — this is NOT a radio voiceover, it's a person speaking TO the viewer
- Keep sentences short and punchy for avatar delivery
- For vertical/social formats: front-load the hook, use shorter sentences

Respond with ONLY the script text — no JSON, no markdown, no explanation.`;

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

function recommendVoice(notes: string): VoiceRecommendation {
  const notesLower = notes.toLowerCase();

  if (notesLower.includes("women") || notesLower.includes("contraception") || notesLower.includes("uterine") || notesLower.includes("hair relaxer")) {
    return { gender: "female", style: "warm and empathetic", reason: "This tort primarily affects women" };
  }
  if (notesLower.includes("sexual assault") || notesLower.includes("rideshare")) {
    return { gender: "female", style: "empathetic and validating", reason: "Sensitive topic — empathetic female voice builds trust with survivors" };
  }
  if (notesLower.includes("parent")) {
    return { gender: "female", style: "protective and warm", reason: "Parents of affected minors are the primary audience" };
  }
  if (notesLower.includes("veteran") || notesLower.includes("military") || notesLower.includes("firefight")) {
    return { gender: "male", style: "deep and authoritative", reason: "Military/veteran audience responds to authoritative male voice" };
  }
  if (notesLower.includes("older") || notesLower.includes("55+") || notesLower.includes("cancer") || notesLower.includes("chemo")) {
    return { gender: "male", style: "compassionate and mature", reason: "Older demographic with health concerns" };
  }
  if (notesLower.includes("truck") || notesLower.includes("cdl") || notesLower.includes("working")) {
    return { gender: "male", style: "authoritative and direct", reason: "Working-age male-skewing demographic" };
  }

  return { gender: "male", style: "authoritative but empathetic", reason: "General legal advertising voice" };
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

function getPlatformGuidance(platform: string): string {
  switch (platform) {
    case "youtube_ad":
      return "Professional, informational tone. Avatar presents directly to camera in landscape format. Viewer is watching intentionally.";
    case "youtube_short":
    case "tiktok":
    case "meta_reel":
      return "Hook in first 3 seconds. Punchy, caption-friendly. Direct address to viewer. Vertical format — energy and immediacy matter.";
    case "meta_feed":
      return "Scroll-stopping hook. Square format in a busy feed. Clear, concise, and visually compelling language.";
    default:
      return "Professional, informational tone. Avatar presents directly to camera.";
  }
}

function buildUserPrompt(req: VideoScriptRequest, audienceProfile: { notes?: string; age_band_weights?: Record<string, number> } | null): string {
  const durationMap: Record<string, string> = {
    "15s": "15-second (35-40 words)",
    "30s": "30-second (75-80 words)",
    "60s": "60-second (150-160 words)",
  };
  const durationLabel = durationMap[req.duration];
  const firmRef = req.firm_name
    ? `for ${req.firm_name}${req.firm_url ? ` (website: ${req.firm_url.replace(/^https?:\/\//, "").replace(/\/$/, "")})` : ""}`
    : "for a legal firm";
  const statesRef = req.states?.length
    ? `Target geography: ${req.states.join(", ")}.`
    : "";

  const platformGuidance = getPlatformGuidance(req.platform);

  let audienceSection = "";
  if (audienceProfile?.notes) {
    const toneGuidance = deriveToneGuidance(audienceProfile.notes);
    const ageBands = formatAgeBands(audienceProfile.age_band_weights ?? null);
    audienceSection = `

AUDIENCE PROFILE:
- Target demographic: ${audienceProfile.notes}
${ageBands ? `- Primary age bands: ${ageBands}` : ""}
- Tone guidance: ${toneGuidance}

The script MUST speak directly to this audience. Use language, references, and emotional hooks that resonate with this specific demographic. The opening hook should address the viewer as if they are in this demographic.`;
  }

  return `Write a ${durationLabel} video script ${firmRef} regarding ${req.tort_name} litigation.

Platform: ${req.platform.replace(/_/g, " ")} — ${platformGuidance}

${statesRef}

The script will be read by an AI avatar speaking directly to camera.
Format: conversational, direct-to-camera style.
1. Hook — attention-grabbing first sentence (critical for social platforms)
2. Problem — describe the issue and who is affected
3. Solution — how the firm can help
4. CTA — clear call to action with firm name
${audienceSection}

Remember: output ONLY the script text, nothing else.`;
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

    // Fetch audience profile for this tort
    const db = supabase as any;
    const { data: allProfiles } = await db.from("tort_audience_profiles").select("*");

    const tortLower = body.tort_name.toLowerCase();
    const audienceProfile = (allProfiles ?? []).find((p: any) => {
      const tid = (p.tort_id ?? "").toLowerCase();
      const notes = (p.notes ?? "").toLowerCase();
      return tid.includes(tortLower) || tortLower.includes(tid.replace(/_/g, " ")) || notes.includes(tortLower);
    }) ?? null;

    // Derive voice recommendation and audience context
    let voice_recommendation: VoiceRecommendation | null = null;
    let audience_context: AudienceContext | null = null;

    if (audienceProfile) {
      voice_recommendation = recommendVoice(audienceProfile.notes ?? "");
      const ageBands = formatAgeBands(audienceProfile.age_band_weights ?? null);
      audience_context = {
        primary_age_bands: ageBands,
        audience_note: audienceProfile.notes ?? "",
      };
    }

    // Build the system prompt with actual values filled in
    const wordCountMap: Record<string, string> = {
      "15s": "35-40",
      "30s": "75-80",
      "60s": "150-160",
    };
    const durationLabel = body.duration === "15s" ? "15-second" : body.duration === "30s" ? "30-second" : "60-second";
    const toneGuidance = audienceProfile?.notes ? deriveToneGuidance(audienceProfile.notes) : "Authoritative but empathetic. Balance urgency with trustworthiness.";

    const filledSystemPrompt = SYSTEM_PROMPT
      .replace("{duration}", durationLabel)
      .replace("{word count}", wordCountMap[body.duration])
      .replace("{derived tone from audience profile}", toneGuidance);

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
            max_tokens: 500,
            messages: [
              { role: "system", content: filledSystemPrompt },
              { role: "user", content: buildUserPrompt(body, audienceProfile) },
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
      const script = data.choices?.[0]?.message?.content?.trim();

      if (!script) {
        return NextResponse.json(
          { error: "Empty AI response" },
          { status: 502 },
        );
      }

      return NextResponse.json({ script, voice_recommendation, audience_context });
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
