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
  form_pages?: { label: string; questionIds: string[] }[];
  disqualify_message?: string;
  qualify_message?: string;
  brand_colors?: {
    primary: string | null;
    secondary: string | null;
    accent: string | null;
  };
}

function buildSinglePageSystemPrompt(audienceNotes: string | null): string {
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

CRITICAL VISUAL GUIDANCE:
- Any visual descriptions, hero imagery, or background references must be tort-specific and audience-appropriate.
- Do NOT reference courtrooms, gavels, legal scales, law firm offices, people in suits, or generic legal imagery.
- Instead, reference imagery relevant to the specific tort and its affected demographic.
- For example: Roundup → outdoor/agricultural scenes; Depo-Provera → women's health settings; Hair Relaxer → beauty/personal care settings.

IMPORTANT: Return ONLY valid JSON with exactly two keys: "html" (the complete HTML document as a string) and "title" (a short page title). Do not include markdown, code fences, or any text outside the JSON object.`;
}

const MULTI_PAGE_SYSTEM_PROMPT = `You are an expert legal marketing web designer who creates high-converting multi-page landing experiences for mass tort litigation campaigns. You produce complete, self-contained HTML files with inline CSS.

You will generate THREE separate HTML pages that form a cohesive landing page funnel:

PAGE 1 — LANDING PAGE (slug: "landing"):
- Hero section with a tort-specific headline and sub-headline
- Key messaging about the tort and potential compensation
- Trust signals: "Free Consultation", "No Fee Unless We Win", "Experienced Legal Team", "Confidential Case Review"
- Strong CTA button: "See If You Qualify" (link text only — no href needed)
- NO qualification form on this page
- Footer with legal disclaimer
- This page is marketing-focused: compelling copy, professional layout

PAGE 2 — QUALIFICATION PAGE (slug: "qualify"):
- Clean, focused page — minimal distractions
- Brief intro heading: "Do You Qualify?" or similar
- Include the exact HTML comment <!-- QUALIFICATION_FORM --> where the multi-step qualification form should appear
- Do NOT generate any qualification form, screening questions, or form fields
- The qualification form will be injected separately from a tested template
- Firm branding (logo, colors) consistent with Page 1
- Minimal footer with disclaimer

PAGE 3 — THANK YOU PAGE (slug: "thank-you"):
- Confirmation message: "Thank you. A member of our legal team will contact you within 24 hours."
- Next steps information
- Additional trust signals
- Contact information as backup (phone placeholder: (800) 555-0199)
- Firm branding consistent with Pages 1 and 2

ALL PAGES must:
- Be fully self-contained: all CSS inline in a <style> tag, no external dependencies
- Be mobile-responsive using CSS media queries
- Follow legal advertising best practices
- Include proper HTML5 document structure (<!DOCTYPE html>, <html>, <head>, <body>)
- Use system font stack for maximum compatibility
- Share consistent branding: same color scheme, same header/footer style, same logo placement

CRITICAL VISUAL GUIDANCE:
- Any visual descriptions, hero imagery, or background references must be tort-specific and audience-appropriate.
- Do NOT reference courtrooms, gavels, legal scales, law firm offices, people in suits, or generic legal imagery.
- Instead, reference imagery relevant to the specific tort and its affected demographic.
- For example: Roundup → outdoor/agricultural scenes; Depo-Provera → women's health settings; Hair Relaxer → beauty/personal care settings.

IMPORTANT: Return ONLY valid JSON with this exact structure:
{
  "pages": [
    {"slug": "landing", "html": "<complete HTML>", "title": "<short title>"},
    {"slug": "qualify", "html": "<complete HTML>", "title": "<short title>"},
    {"slug": "thank-you", "html": "<complete HTML>", "title": "<short title>"}
  ],
  "title": "<overall campaign title>"
}
Do not include markdown, code fences, or any text outside the JSON object.`;

function hasQualificationForm(req: LandingPageRequest): boolean {
  return !!(req.qualification_style && req.screening_questions?.length);
}

interface AudienceProfile {
  profile_name?: string;
  age_band_weights?: Record<string, number>;
  notes?: string;
}

function buildAudienceSection(
  req: LandingPageRequest,
  audienceProfile: AudienceProfile | null,
): string {
  const parts: string[] = [];
  if (req.audience?.age_ranges?.length) {
    parts.push(`TARGET AGE RANGES: ${req.audience.age_ranges.join(", ")}`);
  }
  if (req.audience?.demographics) {
    parts.push(`DEMOGRAPHICS: ${req.audience.demographics}`);
  }
  if (audienceProfile) {
    if (audienceProfile.profile_name) {
      parts.push(`AUDIENCE PROFILE: ${audienceProfile.profile_name}`);
    }
    if (audienceProfile.age_band_weights) {
      const sorted = Object.entries(audienceProfile.age_band_weights)
        .filter(([, w]) => w > 0.1)
        .sort(([, a], [, b]) => b - a);
      if (sorted.length) {
        parts.push(
          `KEY AGE BANDS: ${sorted.map(([band, w]) => `${band} (${Math.round(w * 100)}%)`).join(", ")}`,
        );
      }
    }
    if (audienceProfile.notes) {
      parts.push(`AUDIENCE TONE/NOTES: ${audienceProfile.notes}`);
    }
  }
  return parts.length ? "\n" + parts.join("\n") : "";
}

function buildSharedPromptSections(req: LandingPageRequest): string {
  const { tort_name, states, firm_name, firm_url, messaging, budget_info, logo_url, brand_colors } = req;

  const firmSection = firm_name
    ? `\nFIRM/COMPANY NAME: ${firm_name}${firm_url ? `\nFIRM WEBSITE: ${firm_url}` : ""}
IMPORTANT: Use "${firm_name}" throughout:
- Display the firm name in the header/nav area${firm_url ? ` and link it to ${firm_url}` : ""}
- Use "${firm_name}" in the footer
- Use "Contact ${firm_name} Today" style CTAs instead of generic ones
- Reference the firm name naturally in headings and trust signals (e.g., "Why Choose ${firm_name}?")`
    : "";

  const colorScheme = brand_colors?.primary
    ? `Color scheme: Use the firm's brand colors — Primary: ${brand_colors.primary}${brand_colors.secondary ? `, Secondary: ${brand_colors.secondary}` : ""}${brand_colors.accent ? `, Accent: ${brand_colors.accent}` : ""}. Apply the primary color for headers and key CTAs, secondary for supporting elements, accent for highlights. Use white backgrounds and light gray (#F8FAFC) for section alternation.`
    : "Color scheme: Navy (#0B1D3A) primary, Teal (#1A8C96) accent, white backgrounds, light gray (#F8FAFC) section alternation";

  return `TORT TYPE: ${tort_name}
TARGET GEOGRAPHY: ${states.join(", ")}${firmSection}
${messaging?.strategic_brief ? `\nCAMPAIGN BRIEF: ${messaging.strategic_brief}` : ""}
${messaging?.headlines?.length ? `\nHEADLINES TO USE: ${messaging.headlines.join(" | ")}` : ""}
${messaging?.body_options?.length ? `\nMESSAGING: ${messaging.body_options.join(" ")}` : ""}
${messaging?.ctas?.length ? `\nCTA OPTIONS: ${messaging.ctas.join(", ")}` : ""}
${budget_info?.monthly_budget ? `\nMONTHLY BUDGET: $${budget_info.monthly_budget.toLocaleString()}` : ""}
${logo_url ? `\nBRAND LOGO: Include this logo in the header/navbar area using an <img> tag with src="${logo_url}". Style it with max-height: 48px and auto width, placed in the top-left of the header.` : ""}
${colorScheme}`;
}

function buildSinglePageUserPrompt(
  req: LandingPageRequest,
  audienceProfile: AudienceProfile | null,
): string {
  const useFormTemplate = hasQualificationForm(req);
  const audienceSection = buildAudienceSection(req, audienceProfile);

  const qualificationPlaceholder = useFormTemplate
    ? `

QUALIFICATION FORM PLACEHOLDER:
- Include the exact HTML comment <!-- QUALIFICATION_FORM --> after the hero section and before the trust signals/footer.
- Do NOT generate any qualification form, screening questions, contact form, or multi-step wizard.
- The qualification form will be injected separately from a tested template.
- Only generate marketing content: hero, messaging, trust signals, and footer.`
    : "";

  return `Create a complete, self-contained HTML landing page for a mass tort legal advertising campaign with these details:

${buildSharedPromptSections(req)}${audienceSection}${qualificationPlaceholder}

The HTML landing page must include:
1. A compelling hero section with a tort-specific headline and sub-headline
${useFormTemplate ? "2. The <!-- QUALIFICATION_FORM --> placeholder immediately after the hero section (the form will be injected automatically)" : "2. A \"Do You Qualify?\" or similar qualification section with bullet points"}
3. Key messaging points about the tort and potential compensation
${useFormTemplate ? "4. Do NOT include any contact form — the qualification form template handles this" : "4. A prominent call-to-action section (phone number placeholder: (800) 555-0199, form with Name, Phone, Email fields)"}
5. Trust signals section: "Free Consultation", "No Fee Unless We Win", "Experienced Legal Team", "Confidential Case Review"
6. A professional footer with required legal disclaimer: "This is a paid advertisement. The information on this page does not constitute legal advice. Past results do not guarantee future outcomes. Each case is different. You may be contacted by a licensed attorney."
7. Mobile-responsive design (looks great on phones, tablets, and desktops)
8. Clean typography with proper hierarchy
9. A sticky/fixed header with phone CTA on mobile

Return JSON: {"html": "<complete HTML document>", "title": "<short page title>"}`;
}

function buildMultiPageUserPrompt(
  req: LandingPageRequest,
  audienceProfile: AudienceProfile | null,
): string {
  const audienceSection = buildAudienceSection(req, audienceProfile);

  return `Create a 3-page landing page funnel for a mass tort legal advertising campaign with these details:

${buildSharedPromptSections(req)}${audienceSection}

Requirements for all pages:
- Mobile-responsive design
- Clean typography with proper hierarchy
- Consistent branding across all 3 pages (same header, footer style, colors)
- Professional footer with required legal disclaimer: "This is a paid advertisement. The information on this page does not constitute legal advice. Past results do not guarantee future outcomes. Each case is different. You may be contacted by a licensed attorney."

Page 1 (Landing) specifics:
- Compelling hero section with tort-specific headline
- Key messaging about the tort and potential compensation
- Trust signals: "Free Consultation", "No Fee Unless We Win", "Experienced Legal Team"
- Strong CTA button text: "See If You Qualify"
- A sticky/fixed header with phone CTA on mobile
- NO qualification form on this page

Page 2 (Qualify) specifics:
- Clean, focused layout — minimal distractions
- Brief heading like "Do You Qualify?" or "Free Case Review"
- Include the exact HTML comment <!-- QUALIFICATION_FORM --> as the main content area
- Do NOT generate any form fields — the form will be injected separately
- Keep consistent header/branding with Page 1

Page 3 (Thank You) specifics:
- Confirmation heading: "Thank You"
- Message: "A member of our legal team will contact you within 24 hours."
- Next steps information
- Additional trust signals
- Contact phone as backup: (800) 555-0199

Return the JSON with the pages array structure as described in the system prompt.`;
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

    /* ── Fetch audience profile ──────────────────────────────────── */
    let audienceProfile: AudienceProfile | null = null;
    let audienceNotes: string | null = null;
    try {
      const { data: profiles } = await (supabase as any)
        .from("tort_audience_profiles")
        .select("*")
        .ilike("tort_id", `%${body.tort_name}%`);
      if (profiles?.length) {
        const p = profiles[0] as Record<string, unknown>;
        audienceProfile = {
          profile_name: (p.profile_name as string) ?? undefined,
          age_band_weights: (p.age_band_weights as Record<string, number>) ?? undefined,
          notes: (p.notes as string) ?? undefined,
        };
        audienceNotes = audienceProfile.notes ?? null;
      }
    } catch {
      // Non-critical — continue without audience data
    }

    const isMultiPage =
      body.qualification_style === "multi-step" && hasQualificationForm(body);

    const systemPrompt = isMultiPage
      ? MULTI_PAGE_SYSTEM_PROMPT
      : buildSinglePageSystemPrompt(audienceNotes);
    const userPrompt = isMultiPage
      ? buildMultiPageUserPrompt(body, audienceProfile)
      : buildSinglePageUserPrompt(body, audienceProfile);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);

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
            max_tokens: isMultiPage ? 8000 : 4000,
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

      /* ── Build qualification form HTML (shared) ────────────────── */
      let formHtml: string | null = null;
      if (hasQualificationForm(body) && body.screening_questions?.length) {
        const criteria = body.tort_name
          ? getQualificationCriteriaByName(body.tort_name)
          : undefined;
        formHtml = buildQualificationFormHtml({
          screeningQuestions: body.screening_questions,
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
          formPages: body.form_pages,
        });
      }

      if (isMultiPage) {
        /* ── Multi-page response ─────────────────────────────────── */
        const parsed: {
          pages: { slug: string; html: string; title: string }[];
          title: string;
        } = JSON.parse(content);

        if (!parsed.pages?.length || !parsed.title) {
          return NextResponse.json(
            { error: "Invalid AI response format" },
            { status: 502 },
          );
        }

        // Inject qualification form into the qualify page
        if (formHtml) {
          const qualifyPage = parsed.pages.find((p) => p.slug === "qualify");
          if (qualifyPage) {
            qualifyPage.html = qualifyPage.html.replace(
              "<!-- QUALIFICATION_FORM -->",
              formHtml,
            );
          }
        }

        return NextResponse.json(parsed);
      } else {
        /* ── Single-page response (backward compatible) ──────────── */
        const result: { html: string; title: string } = JSON.parse(content);

        if (!result.html || !result.title) {
          return NextResponse.json(
            { error: "Invalid AI response format" },
            { status: 502 },
          );
        }

        if (formHtml) {
          result.html = result.html.replace(
            "<!-- QUALIFICATION_FORM -->",
            formHtml,
          );
        }

        return NextResponse.json(result);
      }
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
