import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RadioScriptRequest {
  tort_name: string;
  states: string[];
  firm_name?: string;
  firm_url?: string;
  duration: "15s" | "30s" | "60s";
}

export interface RadioScriptResponse {
  script: string;
  duration: "15s" | "30s" | "60s";
  word_count: number;
  direction_notes: string;
}

const SYSTEM_PROMPT = `You are a senior legal advertising copywriter specializing in mass tort radio spots. You write compliant, compelling radio scripts that drive calls.

Rules by duration:
- 15-second spots: exactly 35-40 words. Punchy hook + one sentence about the issue + a direct CTA. No room for anything else.
- 30-second spots: exactly 75-85 words. Hook + brief background on the issue + who qualifies + clear CTA with phone/web.
- 60-second spots: exactly 150-170 words. Full narrative — emotional hook, background on the tort, qualification criteria, urgency/deadline pressure, firm credibility, and strong CTA repeated twice.

General rules:
- Use conversational, spoken-word language. Write for the ear, not the eye.
- Include "[PAUSE]" markers where the voice actor should breathe or create emphasis.
- Never use the word "lawsuit" in the first sentence — lead with the human impact.
- Always include a CTA like "Call now" or "Visit [website]".
- Include the legally required "This is an attorney advertisement" or equivalent disclaimer at the end.
- Match the emotional tone to the tort severity — compassionate for injury, urgent for deadlines.

IMPORTANT: Always respond with valid JSON matching the exact schema provided. Do not include markdown, code fences, or any text outside the JSON object.`;

function buildUserPrompt(req: RadioScriptRequest): string {
  const { tort_name, states, firm_name, firm_url, duration } = req;

  const durationLabel =
    duration === "15s"
      ? "15-second (35-40 words)"
      : duration === "30s"
        ? "30-second (75-85 words)"
        : "60-second (150-170 words)";

  const firmLine = firm_name
    ? `\nFIRM NAME: ${firm_name}${firm_url ? ` (${firm_url})` : ""}\nIncorporate the firm name naturally into the script.`
    : "";

  return `Write a ${durationLabel} radio spot for the following mass tort:

TORT: ${tort_name}
TARGET STATES: ${states.join(", ")}${firmLine}

Respond with a JSON object:
{
  "script": "The full radio script with [PAUSE] markers",
  "duration": "${duration}",
  "word_count": <number of words in the script>,
  "direction_notes": "Brief production direction — suggested tone, pacing, music cues"
}`;
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
        { error: "Radio script generation not configured" },
        { status: 503 },
      );
    }

    const body: RadioScriptRequest = await req.json();
    if (!body.tort_name || !body.states || !body.duration) {
      return NextResponse.json(
        { error: "tort_name, states, and duration are required" },
        { status: 400 },
      );
    }

    if (!["15s", "30s", "60s"].includes(body.duration)) {
      return NextResponse.json(
        { error: "duration must be 15s, 30s, or 60s" },
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
            max_tokens: 1000,
            response_format: { type: "json_object" },
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
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        return NextResponse.json(
          { error: "Empty AI response" },
          { status: 502 },
        );
      }

      const result: RadioScriptResponse = JSON.parse(content);

      return NextResponse.json(result);
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
