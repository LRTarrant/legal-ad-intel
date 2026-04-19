import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* ── Types ──────────────────────────────────────────────────────────────── */

interface RadioScriptRequest {
  duration: number;
  tort_name: string;
  firm_name: string;
  firm_url?: string;
  states: string[];
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

/* ── Audience helpers ──────────────────────────────────────────────────── */

function findBestAudienceMatch(
  rows: Record<string, unknown>[],
  tortName: string,
): Record<string, unknown> | null {
  const needle = tortName.toLowerCase();

  for (const row of rows) {
    const tortId = String(row.tort_id ?? "").toLowerCase();
    const notes = String(row.notes ?? "").toLowerCase();

    // Check if the lowercased tort_name appears within tort_id or notes
    if (tortId.includes(needle) || notes.includes(needle)) {
      return row;
    }

    // Also check if tort_id slug words appear in the tort name
    const slugWords = tortId.replace(/_/g, " ").toLowerCase();
    if (needle.includes(slugWords) || slugWords.includes(needle)) {
      return row;
    }
  }

  // Fallback: partial word match — check if any significant word overlaps
  const needleWords = needle.split(/\s+/).filter((w) => w.length > 3);
  for (const row of rows) {
    const tortId = String(row.tort_id ?? "").toLowerCase().replace(/_/g, " ");
    const notes = String(row.notes ?? "").toLowerCase();
    const combined = `${tortId} ${notes}`;

    if (needleWords.some((w) => combined.includes(w))) {
      return row;
    }
  }

  return null;
}

function formatTopAgeBands(
  ageBands: Record<string, number> | null,
): string {
  if (!ageBands || Object.keys(ageBands).length === 0) return "Not available";

  return Object.entries(ageBands)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([band, weight]) => `${band} (${Math.round(weight * 100)}%)`)
    .join(", ");
}

function deriveToneGuidance(
  notes: string,
  ageBands: Record<string, number>,
): string {
  const notesLower = notes.toLowerCase();

  if (
    notesLower.includes("women") ||
    notesLower.includes("contraception") ||
    notesLower.includes("uterine")
  ) {
    return 'Empathetic, warm, and empowering. Speak to women who may feel dismissed by the medical system. Use "you deserve answers" framing.';
  }

  if (
    notesLower.includes("parent") ||
    notesLower.includes("child") ||
    notesLower.includes("minor")
  ) {
    return 'Protective and urgent. Speak to parents concerned about their children\'s safety. Use "as a parent" framing.';
  }

  if (
    notesLower.includes("military") ||
    notesLower.includes("veteran") ||
    notesLower.includes("firefight")
  ) {
    return 'Respectful and direct. Honor their service while informing them of their rights. Use "you served your country" framing.';
  }

  if (
    notesLower.includes("young adult") ||
    notesLower.includes("rideshare")
  ) {
    return "Direct and validating. Speak to young adults who may not know their legal rights. Use clear, modern language without legal jargon.";
  }

  if (
    notesLower.includes("cancer") ||
    notesLower.includes("older") ||
    notesLower.includes("chemo")
  ) {
    return 'Compassionate and authoritative. Speak to people dealing with serious health issues. Use "you trusted" framing — trusted the product, trusted the doctor.';
  }

  if (
    notesLower.includes("occupational") ||
    notesLower.includes("exposure") ||
    notesLower.includes("landscap")
  ) {
    return 'Working-class solidarity tone. Speak to people who were exposed through their job or daily life. Use "hardworking people like you" framing.';
  }

  return "Authoritative but empathetic. Balance urgency with trustworthiness.";
}

function recommendVoice(
  notes: string,
): VoiceRecommendation {
  const notesLower = notes.toLowerCase();

  // Women-focused
  if (
    notesLower.includes("women") ||
    notesLower.includes("contraception") ||
    notesLower.includes("uterine") ||
    notesLower.includes("hair relaxer")
  ) {
    return {
      gender: "female",
      style: "warm and empathetic",
      reason: "This tort primarily affects women",
    };
  }

  // Young adult / rideshare (skews female in SA cases)
  if (
    notesLower.includes("sexual assault") ||
    notesLower.includes("rideshare")
  ) {
    return {
      gender: "female",
      style: "empathetic and validating",
      reason:
        "Sensitive topic — empathetic female voice builds trust with survivors",
    };
  }

  // Parent-focused
  if (notesLower.includes("parent")) {
    return {
      gender: "female",
      style: "protective and warm",
      reason: "Parents of affected minors are the primary audience",
    };
  }

  // Veteran / military
  if (
    notesLower.includes("veteran") ||
    notesLower.includes("military") ||
    notesLower.includes("firefight")
  ) {
    return {
      gender: "male",
      style: "deep and authoritative",
      reason: "Military/veteran audience responds to authoritative male voice",
    };
  }

  // Older / cancer / medical
  if (
    notesLower.includes("older") ||
    notesLower.includes("55+") ||
    notesLower.includes("cancer") ||
    notesLower.includes("chemo")
  ) {
    return {
      gender: "male",
      style: "compassionate and mature",
      reason: "Older demographic with health concerns",
    };
  }

  // Truck / occupational
  if (
    notesLower.includes("truck") ||
    notesLower.includes("cdl") ||
    notesLower.includes("working")
  ) {
    return {
      gender: "male",
      style: "authoritative and direct",
      reason: "Working-age male-skewing demographic",
    };
  }

  // Default
  return {
    gender: "male",
    style: "authoritative but empathetic",
    reason: "General legal advertising voice",
  };
}

/* ── GPT prompt ────────────────────────────────────────────────────────── */

const SYSTEM_PROMPT = `You are a veteran radio copywriter specialising in legal advertising — mass tort, personal injury, and class action spots. You write scripts that air on AM/FM and streaming radio. Every script MUST:

1. Open with a hook that grabs the listener in the first 3 seconds.
2. State the legal issue clearly and simply.
3. Include a strong call-to-action with the firm name and a phone-friendly instruction ("Call now", "Visit…").
4. Fit the target duration (word count guide: 30s ≈ 75 words, 60s ≈ 150 words).
5. Use short sentences. Avoid legalese. Write for the EAR, not the eye.
6. Include natural pauses marked with "..." for dramatic effect.

IMPORTANT: Always respond with valid JSON matching the exact schema provided. Do not include markdown, code fences, or any text outside the JSON object.`;

function buildUserPrompt(
  req: RadioScriptRequest,
  audienceNotes: string | null,
  topAgeBands: string | null,
  toneGuidance: string | null,
): string {
  const { duration, tort_name, firm_name, firm_url, states } = req;

  const audienceSection =
    audienceNotes && topAgeBands && toneGuidance
      ? `
AUDIENCE PROFILE:
- Target demographic: ${audienceNotes}
- Primary age bands: ${topAgeBands}
- Tone guidance: ${toneGuidance}

The script MUST speak directly to this audience. Use language, references, and emotional hooks that resonate with this specific demographic. The opening hook should address the listener as if they are in this demographic.`
      : "";

  return `Write a ${duration}-second radio spot for ${tort_name} litigation.

FIRM: ${firm_name}${firm_url ? ` (${firm_url})` : ""}
TARGET STATES: ${states.join(", ")}
${audienceSection}

Respond with a JSON object with this exact key:
{
  "script": "The full radio script text here"
}`;
}

/* ── Route handler ─────────────────────────────────────────────────────── */

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
        { error: "Radio script generation not configured" },
        { status: 503 },
      );
    }

    const body: RadioScriptRequest = await req.json();
    const { duration, tort_name, firm_name, states } = body;

    if (!tort_name || !firm_name || !states?.length || !duration) {
      return NextResponse.json(
        { error: "duration, tort_name, firm_name, and states[] are required" },
        { status: 400 },
      );
    }

    // --- Audience profile lookup ---
    const db = supabase as any;
    const [audienceResult] = await Promise.allSettled([
      db.from("tort_audience_profiles").select("*"),
    ]);

    let audienceNotes: string | null = null;
    let ageBands: Record<string, number> | null = null;
    let toneGuidance: string | null = null;
    let voiceRec: VoiceRecommendation = {
      gender: "male",
      style: "authoritative but empathetic",
      reason: "General legal advertising voice",
    };
    let audienceContext: AudienceContext | null = null;

    if (
      audienceResult.status === "fulfilled" &&
      audienceResult.value?.data?.length
    ) {
      const match = findBestAudienceMatch(
        audienceResult.value.data as Record<string, unknown>[],
        tort_name,
      );

      if (match) {
        audienceNotes = (match.notes as string) ?? null;
        ageBands =
          (match.age_band_weights as Record<string, number>) ?? null;

        if (audienceNotes) {
          toneGuidance = deriveToneGuidance(audienceNotes, ageBands ?? {});
          voiceRec = recommendVoice(audienceNotes);
          audienceContext = {
            primary_age_bands: formatTopAgeBands(ageBands),
            audience_note: audienceNotes,
          };
        }
      }
    }

    // --- GPT call ---
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
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              {
                role: "user",
                content: buildUserPrompt(
                  body,
                  audienceNotes,
                  ageBands ? formatTopAgeBands(ageBands) : null,
                  toneGuidance,
                ),
              },
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
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        return NextResponse.json(
          { error: "Empty AI response" },
          { status: 502 },
        );
      }

      const parsed = JSON.parse(content) as { script: string };

      return NextResponse.json({
        script: parsed.script,
        voice_recommendation: voiceRec,
        audience_context: audienceContext,
      });
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
