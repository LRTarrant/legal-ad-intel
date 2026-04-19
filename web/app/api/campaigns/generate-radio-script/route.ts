import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RadioScriptRequest {
  duration: "30s" | "60s";
  tort_name: string;
  firm_name?: string;
  firm_url?: string;
  states?: string[];
}

const SYSTEM_PROMPT = `You are an expert direct-response radio advertising copywriter for legal services.
You write compelling, broadcast-ready radio scripts that drive immediate action.

Rules:
- 30-second spots: exactly 75-80 words
- 60-second spots: exactly 150-160 words
- Start with an attention-grabbing hook question
- Clearly state the legal issue and who qualifies
- Include the firm name naturally 2-3 times
- End with a strong call-to-action (call now, visit website)
- Tone: urgent but trustworthy, authoritative but empathetic
- Do NOT use the word "lawsuit" — use "legal rights" or "compensation" instead
- Include a disclaimer: "You may be entitled to compensation"
- Format as a single block of script text, ready for voice talent to read
- Do NOT include stage directions, speaker labels, or formatting markers

Respond with ONLY the script text — no JSON, no markdown, no explanation.`;

function buildUserPrompt(req: RadioScriptRequest): string {
  const durationLabel = req.duration === "30s" ? "30-second (75-80 words)" : "60-second (150-160 words)";
  const firmRef = req.firm_name
    ? `for ${req.firm_name}${req.firm_url ? ` (website: ${req.firm_url.replace(/^https?:\/\//, "").replace(/\/$/, "")})` : ""}`
    : "for a legal firm";
  const statesRef = req.states?.length
    ? `Target geography: ${req.states.join(", ")}.`
    : "";

  return `Write a ${durationLabel} radio spot script ${firmRef} regarding ${req.tort_name} litigation.

${statesRef}

The script should follow the direct-response radio ad format:
1. Hook — attention-grabbing question or statement
2. Problem — describe the issue and who is affected
3. Solution — how the firm can help
4. CTA — clear call to action with firm name

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

    const body: RadioScriptRequest = await req.json();
    if (!body.tort_name || !body.duration) {
      return NextResponse.json(
        { error: "tort_name and duration are required" },
        { status: 400 },
      );
    }

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
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: buildUserPrompt(body) },
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

      return NextResponse.json({ script });
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
