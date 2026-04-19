import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getQualificationCriteriaByName,
  type ScreeningQuestion,
} from "@/lib/data/tort-qualification-criteria";
import { buildQualificationFormHtml } from "@/lib/templates/qualification-form-template";

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
  brand_colors?: {
    primary: string | null;
    secondary: string | null;
    accent: string | null;
  };
}

function buildSystemPrompt(audienceNotes: string | null): string {
  const audienceContext = audienceNotes
    ? `\nAUDIENCE CONTEXT: ${audienceNotes}. Tailor the tone, language complexity, and emotional appeal to this demographic.`
    : "";

  return `You are an expert legal marketing web designer who creates high-converting landing pages for mass tort litigation campaigns. You produce complete, self-contained HTML files with inline CSS.

Your landing pages must:
- Be fully self-contained: all CSS inline in a <style> tag, no external dependencies
- Be mobile-responsive using CSS media queries
- Use a professional, trust-evoking color scheme (navy/blue tones with a teal accent)
- Follow legal advertising best practices
- Include proper HTML5 document structure (<!DOCTYPE html>, <html>, <head>, <body>)
- Use system font stack for maximum compatibility
${audienceContext}

VISUAL IMAGERY GUIDANCE:
- Any image references or visual descriptions should be tort-contextual, NOT generic legal imagery.
- Do NOT reference or describe: courtrooms, gavels, legal scales, law firm conference rooms, people in business suits, handshakes, or generic "justice" imagery.
- Instead, reference imagery that matches the specific tort and its affected audience (e.g., outdoor/agricultural scenes for herbicide torts, medical settings for pharmaceutical torts, family/home settings for consumer product torts).

IMPORTANT ABOUT QUALIFICATION FORMS:
- Do NOT generate any qualification form, screening questions, or multi-step form.
- Instead, include the exact HTML comment <!-- QUALIFICATION_FORM --> where the qualification form should appear (typically after the hero section and before the trust signals section).
- The qualification form will be injected separately from a tested template.
- Focus on what you do best: compelling marketing copy, professional layout, and trust signals.

IMPORTANT: Return ONLY valid JSON with exactly two keys: "html" (the complete HTML document as a string) and "title" (a short page title). Do not include markdown, code fences, or any text outside the JSON object.`;
}

function hasQualificationForm(req: LandingPageRequest): boolean {
  return !!(req.qualification_style && req.screening_questions?.length);
}

function buildUserPrompt(req: LandingPageRequest): string {
  const { tort_name, states, firm_name, firm_url, messaging, audience, budget_info, logo_url, brand_colors } = req;
  const useFormTemplate = hasQualificationForm(req);

  const firmSection = firm_name
    ? `\nFIRM/COMPANY NAME: ${firm_name}${firm_url ? `\nFIRM WEBSITE: ${firm_url}` : ""}
IMPORTANT: Use "${firm_name}" throughout the landing page:
- Display the firm name in the header/nav area${firm_url ? ` and link it to ${firm_url}` : ""}
- Use "${firm_name}" in the footer
- Use "Contact ${firm_name} Today" style CTAs instead of generic ones
- Reference the firm name naturally in headings and trust signals (e.g., "Why Choose ${firm_name}?")`
    : "";

  const qualificationPlaceholder = useFormTemplate
    ? `

QUALIFICATION FORM PLACEHOLDER:
- Include the exact HTML comment <!-- QUALIFICATION_FORM --> after the hero section and before the trust signals/footer.
- Do NOT generate any qualification form, screening questions, contact form, or multi-step wizard.
- The qualification form will be injected separately from a tested template.
- Only generate marketing content: hero, messaging, trust signals, and footer.`
    : "";

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
${qualificationPlaceholder}

The HTML landing page must include:
1. A compelling hero section with a tort-specific headline and sub-headline
${useFormTemplate ? "2. The <!-- QUALIFICATION_FORM --> placeholder immediately after the hero section (the form will be injected automatically)" : "2. A \"Do You Qualify?\" or similar qualification section with bullet points"}
3. Key messaging points about the tort and potential compensation
${useFormTemplate ? "4. Do NOT include any contact form — the qualification form template handles this" : "4. A prominent call-to-action section (phone number placeholder: (800) 555-0199, form with Name, Phone, Email fields)"}
5. Trust signals section: "Free Consultation", "No Fee Unless We Win", "Experienced Legal Team", "Confidential Case Review"
6. A professional footer with required legal disclaimer: "This is a paid advertisement. The information on this page does not constitute legal advice. Past results do not guarantee future outcomes. Each case is different. You may be contacted by a licensed attorney."
7. Mobile-responsive design (looks great on phones, tablets, and desktops)
${brand_colors?.primary ? `8. Color scheme: Use the firm's brand colors — Primary: ${brand_colors.primary}${brand_colors.secondary ? `, Secondary: ${brand_colors.secondary}` : ""}${brand_colors.accent ? `, Accent: ${brand_colors.accent}` : ""}. Apply the primary color for headers and key CTAs, secondary for supporting elements, accent for highlights. Use white backgrounds and light gray (#F8FAFC) for section alternation.` : "8. Color scheme: Navy (#0B1D3A) primary, Teal (#1A8C96) accent, white backgrounds, light gray (#F8FAFC) section alternation"}
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

    // Fetch audience profile for this tort
    let audienceNotes: string | null = null;
    try {
      const { data: profile } = await (supabase as any)
        .from("tort_audience_profiles")
        .select("notes, age_band_weights")
        .ilike("profile_name", `%${body.tort_name}%`)
        .limit(1)
        .maybeSingle();
      if (profile?.notes) {
        audienceNotes = profile.notes;
      }
    } catch {
      // Non-blocking: proceed without audience context
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    try {
      const systemPrompt = buildSystemPrompt(audienceNotes);
      const userPrompt = buildUserPrompt(body);

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
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
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

      /* ── Inject qualification form template ───────────────────────── */
      if (
        hasQualificationForm(body) &&
        body.screening_questions?.length
      ) {
        const criteria = body.tort_name
          ? getQualificationCriteriaByName(body.tort_name)
          : undefined;
        const questions = body.screening_questions;
        const formHtml = buildQualificationFormHtml({
          screeningQuestions: questions,
          firmName: body.firm_name ?? "Our Legal Team",
          firmUrl: body.firm_url,
          tortName: body.tort_name,
          disqualifyMessage:
            body.disqualify_message ??
            criteria?.disqualifyMessage ??
            "Based on your answers, you may not meet the current criteria. We recommend consulting with a legal professional.",
          qualifyMessage:
            body.qualify_message ??
            criteria?.qualifyMessage ??
            "Based on your answers, you may qualify. Please provide your contact information for a free case review.",
          style: body.qualification_style!,
        });
        result.html = result.html.replace(
          "<!-- QUALIFICATION_FORM -->",
          formHtml,
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
