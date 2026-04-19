import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ScreeningQuestion {
  id: string;
  question: string;
  type: "yes_no" | "select" | "text" | "date";
  options?: string[];
  disqualifyOn?: string[];
  helpText?: string;
}

interface LandingPageRequest {
  tort_name: string;
  states: string[];
  firm_name?: string;
  firm_url?: string;
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
  logo_url?: string;
  qualification_style?: "multi-step" | "single-page";
  screening_questions?: ScreeningQuestion[];
  disqualify_message?: string;
  qualify_message?: string;
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

function buildQualificationPrompt(req: LandingPageRequest): string {
  const { qualification_style, screening_questions, disqualify_message, qualify_message } = req;
  if (!qualification_style || !screening_questions?.length) return "";

  const questionsBlock = screening_questions
    .map((q, i) => {
      let desc = `  Q${i + 1}: "${q.question}" (type: ${q.type})`;
      if (q.options?.length) desc += `\n    Options: ${q.options.join(", ")}`;
      if (q.disqualifyOn?.length) desc += `\n    DISQUALIFY if answer is: ${q.disqualifyOn.join(" OR ")}`;
      if (q.helpText) desc += `\n    Help text: ${q.helpText}`;
      return desc;
    })
    .join("\n");

  if (qualification_style === "multi-step") {
    return `

QUALIFICATION FORM — MULTI-STEP (CRITICAL SECTION):
Include a multi-step qualification form with inline JavaScript. This is the primary conversion element.

SCREENING QUESTIONS (in order):
${questionsBlock}

MULTI-STEP FORM REQUIREMENTS:
- Show 1-2 questions per screen with a progress bar ("Step X of Y")
- Use large button-style answer selectors (not small radio buttons) — each option is a large clickable button
- For yes_no questions: two large buttons side by side ("Yes" / "No")
- For select questions: each option is a full-width large button that advances to the next step when clicked
- BRANCHING LOGIC: When a user selects a disqualifying answer, immediately show a soft disqualification screen with this message: "${disqualify_message ?? "Based on your answers, you may not meet the current criteria. We recommend consulting with a legal professional."}"
- The disqualification screen should be gentle and include a "Back" button to change their answer
- If the user passes all screening questions, show: "${qualify_message ?? "Based on your answers, you may qualify. Please provide your contact information for a free case review."}"
- FINAL STEP: Contact info collection (First Name, Last Name, Phone, Email) with a "Get Free Case Review" submit button
- All JavaScript must be inline in a <script> tag — no external dependencies
- Add smooth transitions between steps (CSS opacity/transform)
- The form container should be prominently placed in the hero or immediately after it`;
  }

  // single-page
  return `

QUALIFICATION FORM — SINGLE-PAGE (CRITICAL SECTION):
Include a single-page qualification checklist form. This is the primary conversion element.

SCREENING QUESTIONS (in order):
${questionsBlock}

SINGLE-PAGE FORM REQUIREMENTS:
- Display ALL screening questions on one page as a form
- For yes_no questions: use toggle-style buttons or large Yes/No button pairs
- For select questions: use a dropdown or button group
- Contact info section at the bottom: First Name, Last Name, Phone, Email
- Submit button: "Get Free Case Review" or "See If You Qualify"
- The form should be prominently placed on the page
- DISQUALIFICATION MESSAGE (shown after submission if disqualified): "${disqualify_message ?? "Based on your answers, you may not meet the current criteria."}"
- QUALIFICATION MESSAGE (shown after submission if qualified): "${qualify_message ?? "Based on your answers, you may qualify. We will contact you shortly."}"
- Include inline JavaScript to handle form validation and show qualification result on submit
- All JavaScript must be inline — no external dependencies`;
}

function buildUserPrompt(req: LandingPageRequest): string {
  const { tort_name, states, firm_name, firm_url, messaging, audience, budget_info, logo_url } = req;

  const firmSection = firm_name
    ? `\nFIRM/COMPANY NAME: ${firm_name}${firm_url ? `\nFIRM WEBSITE: ${firm_url}` : ""}
IMPORTANT: Use "${firm_name}" throughout the landing page:
- Display the firm name in the header/nav area${firm_url ? ` and link it to ${firm_url}` : ""}
- Use "${firm_name}" in the footer
- Use "Contact ${firm_name} Today" style CTAs instead of generic ones
- Reference the firm name naturally in headings and trust signals (e.g., "Why Choose ${firm_name}?")`
    : "";

  const qualificationSection = buildQualificationPrompt(req);

  return `Create a complete, self-contained HTML landing page for a mass tort legal advertising campaign with these details:

TORT TYPE: ${tort_name}
TARGET GEOGRAPHY: ${states.join(", ")}${firmSection}
${messaging?.strategic_brief ? `\nCAMPAIGN BRIEF: ${messaging.strategic_brief}` : ""}
${messaging?.headlines?.length ? `\nHEADLINES TO USE: ${messaging.headlines.join(" | ")}` : ""}
${messaging?.body_options?.length ? `\nMESSAGING: ${messaging.body_options.join(" ")}` : ""}
${messaging?.ctas?.length ? `\nCTA OPTIONS: ${messaging.ctas.join(", ")}` : ""}
${audience?.age_ranges?.length ? `\nTARGET AGE RANGES: ${audience.age_ranges.join(", ")}` : ""}
${audience?.demographics ? `\nDEMOGRAPHICS: ${audience.demographics}` : ""}
${budget_info?.monthly_budget ? `\nMONTHLY BUDGET: $${budget_info.monthly_budget.toLocaleString()}` : ""}
${logo_url ? `\nBRAND LOGO: Include this logo in the header/navbar area of the landing page using an <img> tag with src="${logo_url}". Style it with max-height: 48px and auto width, placed in the top-left of the header.` : ""}
${qualificationSection}

The HTML landing page must include:
1. A compelling hero section with a tort-specific headline and sub-headline
${qualificationSection ? "2. The qualification form as specified above — this replaces any generic contact form" : "2. A \"Do You Qualify?\" or similar qualification section with bullet points"}
3. Key messaging points about the tort and potential compensation
${qualificationSection ? "4. The contact info fields are part of the qualification form (final step for multi-step, bottom section for single-page)" : "4. A prominent call-to-action section (phone number placeholder: (800) 555-0199, form with Name, Phone, Email fields)"}
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
            max_tokens: body.qualification_style ? 8000 : 4000,
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
