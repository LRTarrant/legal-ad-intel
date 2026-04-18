import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface LandingPageRequest {
  tort_name: string;
  states: string[];
  messaging?: {
    strategic_brief?: string;
    headlines?: string[];
    body_options?: string[];
    ctas?: string[];
  };
  audience?: {
    age_ranges?: string[];
    demographics?: string;
  };
  budget_info?: {
    monthly_budget?: number;
    avg_cpl?: number;
  };
}

const SYSTEM_PROMPT = `You are an expert legal marketing web designer who creates high-converting landing pages for mass tort litigation campaigns. You produce complete, self-contained HTML files with inline CSS.

Your landing pages must:
- Be fully self-contained: all CSS inline in a <style> tag, no external dependencies
- Be mobile-responsive using CSS media queries
- Use a professional, trust-evoking color scheme (navy/blue tones with a teal accent)
- Follow legal advertising best practices
- Include proper HTML5 document structure (<!DOCTYPE html>, <html>, <head>, <body>)
- Use system font stack for maximum compatibility

IMPORTANT: Return ONLY valid JSON with exactly two keys: "html" (the complete HTML document as a string) and "title" (a short page title). Do not include markdown, code fences, or any text outside the JSON object.`;

function buildUserPrompt(req: LandingPageRequest): string {
  const { tort_name, states, messaging, audience, budget_info } = req;

  return `Create a complete, self-contained HTML landing page for a mass tort legal advertising campaign with these details:

TORT TYPE: ${tort_name}
TARGET GEOGRAPHY: ${states.join(", ")}
${messaging?.strategic_brief ? `\nCAMPAIGN BRIEF: ${messaging.strategic_brief}` : ""}
${messaging?.headlines?.length ? `\nHEADLINES TO USE: ${messaging.headlines.join(" | ")}` : ""}
${messaging?.body_options?.length ? `\nMESSAGING: ${messaging.body_options.join(" ")}` : ""}
${messaging?.ctas?.length ? `\nCTA OPTIONS: ${messaging.ctas.join(", ")}` : ""}
${audience?.age_ranges?.length ? `\nTARGET AGE RANGES: ${audience.age_ranges.join(", ")}` : ""}
${audience?.demographics ? `\nDEMOGRAPHICS: ${audience.demographics}` : ""}
${budget_info?.monthly_budget ? `\nMONTHLY BUDGET: $${budget_info.monthly_budget.toLocaleString()}` : ""}

The HTML landing page must include:
1. A compelling hero section with a tort-specific headline and sub-headline
2. A "Do You Qualify?" or similar qualification section with bullet points
3. Key messaging points about the tort and potential compensation
4. A prominent call-to-action section (phone number placeholder: (800) 555-0199, form with Name, Phone, Email fields)
5. Trust signals section: "Free Consultation", "No Fee Unless We Win", "Experienced Legal Team", "Confidential Case Review"
6. A professional footer with required legal disclaimer: "This is a paid advertisement. The information on this page does not constitute legal advice. Past results do not guarantee future outcomes. Each case is different. You may be contacted by a licensed attorney."
7. Mobile-responsive design (looks great on phones, tablets, and desktops)
8. Color scheme: Navy (#0B1D3A) primary, Teal (#1A8C96) accent, white backgrounds, light gray (#F8FAFC) section alternation
9. Clean typography with proper hierarchy
10. A sticky/fixed header with phone CTA on mobile

Return JSON: {"html": "<complete HTML document>", "title": "<short page title>"}`;
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
        { error: "Landing page generation not configured" },
        { status: 503 },
      );
    }

    const body: LandingPageRequest = await req.json();
    if (!body.tort_name || !body.states?.length) {
      return NextResponse.json(
        { error: "tort_name and states are required" },
        { status: 400 },
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

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
            max_tokens: 4000,
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

      const result: { html: string; title: string } = JSON.parse(content);

      if (!result.html || !result.title) {
        return NextResponse.json(
          { error: "Invalid AI response format" },
          { status: 502 },
        );
      }

      return NextResponse.json(result);
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof DOMException && err.name === "AbortError") {
        return NextResponse.json(
          { error: "Landing page generation timed out" },
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
