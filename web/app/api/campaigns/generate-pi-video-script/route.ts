/**
 * POST /api/campaigns/generate-pi-video-script
 *
 * Generates a 3-scene PI video storyboard, brand-aware, state-compliant,
 * with English/Spanish support. Each scene returns headline, subheadline,
 * imagePrompt, voiceover, durationSeconds. The response also includes a
 * 5-second CTA card (ctaHeadline / ctaPhone / ctaSubline / disclaimer).
 *
 * The LLM polishes the structured PI template into scene-shaped prose;
 * it does NOT invent facts. Disclaimer is preserved verbatim from the
 * template (state compliance never gets paraphrased away).
 *
 * Pure helpers + types live in ./testable.ts; this file is the I/O shell.
 *
 * Errors:
 *   400 \u2014 missing / invalid input
 *   401 \u2014 unauthenticated
 *   403 \u2014 entitlement denial (PI tab locked, geo scope) or firm access
 *   429 \u2014 entitlement denial (monthly cap)
 *   502 \u2014 upstream LLM failure or malformed response shape
 *   504 \u2014 LLM timeout
 */

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
import { routePracticeArea } from "@/lib/campaign-builder/practice-area-router";
import { getFirmForUser } from "@/lib/firms/server";
import {
  PI_VIDEO_SYSTEM_PROMPT,
  brandInputsFromFirm,
  buildPIVideoUserPrompt,
  stripJSONWrapper,
  validatePIVideoRequest,
  validateVideoScriptResponse,
  type BrandPromptInputs,
  type PIVideoScriptRequest,
  type PIVideoScriptResponse,
} from "./testable";

interface PIVideoScriptResult extends PIVideoScriptResponse {
  /** Compliance flags surfaced for review (warning + review-level items). */
  compliance: {
    state: string;
    state_name: string;
    has_explicit_rules: boolean;
    flags: Array<{
      severity: "warning" | "review";
      summary: string;
      detail?: string;
    }>;
  };
  cost_cents: number;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PIVideoScriptRequest;
  try {
    body = (await req.json()) as PIVideoScriptRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const errors = validatePIVideoRequest(body);
  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Validation failed", errors },
      { status: 400 },
    );
  }
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


  // Entitlement gate \u2014 PI access required, geo scope must include the
  // state. is_create=false because this is compute-only (no row).
  const gate = await checkCampaignBuilderEntitlement(supabase, user.id, {
    practice_area: "personal_injury",
    state: body.state,
    is_create: false,
  }, demoMode);
  if (!gate.ok) {
    const { body: errBody, status } = entitlementErrorBody(gate);
    return NextResponse.json(errBody, { status });
  }

  // Firm verification + brand profile fetch (Phase 1.5 pattern).
  let resolvedFirmId: string | null = null;
  let brandInputs: BrandPromptInputs | null = null;
  if (body.firm_id) {
    const firm = await getFirmForUser(supabase, user.id, body.firm_id);
    if (!firm) {
      return NextResponse.json(
        { error: "firm_id not found or you don't manage that firm" },
        { status: 403 },
      );
    }
    resolvedFirmId = firm.id;
    brandInputs = brandInputsFromFirm(firm);
  }

  // Route through the practice-area router so we get the rendered PI
  // template (vars substituted, severity layered, compliance applied).
  let routed: ReturnType<typeof routePracticeArea>;
  try {
    routed = routePracticeArea({
      practice_area: "personal_injury",
      pi_category: body.pi_category,
      market_display_name: body.market_display_name.trim(),
      market_dma_code: "",
      state: body.state,
      state_full_name: "",
      firm_name: body.firm_name.trim(),
      severity_modifiers: body.severity_modifiers ?? [],
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Template assembly failed: ${(e as Error).message}` },
      { status: 400 },
    );
  }

  if (routed.practice_area !== "personal_injury") {
    return NextResponse.json(
      { error: "Internal: router returned wrong practice area" },
      { status: 500 },
    );
  }

  const template = routed.template;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 500 },
    );
  }

  const userPrompt = buildPIVideoUserPrompt(body, template, brandInputs);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

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
          max_tokens: 1500,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: PI_VIDEO_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
        }),
        signal: controller.signal,
      },
    );

    clearTimeout(timeout);

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      console.error("OpenAI API error (PI video):", response.status, errBody);
      return NextResponse.json(
        { error: "AI service unavailable" },
        { status: 502 },
      );
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content?.trim();
    if (!rawContent) {
      return NextResponse.json(
        { error: "Empty AI response" },
        { status: 502 },
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripJSONWrapper(rawContent));
    } catch (e) {
      console.error("PI video JSON parse failed:", e, rawContent.slice(0, 500));
      return NextResponse.json(
        { error: "AI returned malformed JSON" },
        { status: 502 },
      );
    }

    const validation = validateVideoScriptResponse(parsed);
    if (!validation.ok) {
      console.error("PI video shape validation failed:", validation.errors);
      return NextResponse.json(
        { error: "AI returned an invalid storyboard shape" },
        { status: 502 },
      );
    }

    // Cost tracking (Phase 0.5). gpt-4o; await so cost lands in the response.
    const tracked = await trackCall(supabase, {
      user_id: user.id,
      firm_id: resolvedFirmId,
      purpose: "mt_video_script", // shares purpose label with mass tort
                                  // \u2014 keeps COGS comparable across paths.
                                  // PI is identifiable via pi_category in meta.
      provider: "openai",
      model: "gpt-4o",
      called_from: "api/campaigns/generate-pi-video-script",
      usage: {
        input_tokens: data.usage?.prompt_tokens ?? 0,
        output_tokens: data.usage?.completion_tokens ?? 0,
      },
      meta: {
        practice_area: "personal_injury",
        pi_category: body.pi_category,
        state: body.state,
        market: body.market_display_name,
        platform: body.platform,
        duration: body.duration,
        language: body.language ?? "en",
        severity_modifiers: body.severity_modifiers ?? [],
        brand_aware: brandInputs !== null && hasAnyBrandSignal(brandInputs),
      },
    });

    const result: PIVideoScriptResult = {
      ...validation.value,
      compliance: {
        state: routed.compliance_state,
        state_name: routed.compliance_state_name,
        has_explicit_rules: routed.compliance_has_explicit_rules,
        flags: routed.compliance_flags.map((f) => ({
          severity: f.severity,
          summary: f.summary,
          detail: f.detail,
        })),
      },
      cost_cents: tracked.cost_cents,
    };

    return NextResponse.json(result);
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === "AbortError") {
      return NextResponse.json(
        { error: "AI service timed out" },
        { status: 504 },
      );
    }
    console.error("PI video script error:", err);
    return NextResponse.json(
      { error: "Internal error generating video script" },
      { status: 500 },
    );
  }
}

function hasAnyBrandSignal(b: BrandPromptInputs): boolean {
  return Boolean(
    b.tagline?.trim() ||
      (b.voice_descriptors && b.voice_descriptors.length > 0) ||
      (b.differentiators && b.differentiators.length > 0) ||
      (b.partner_names && b.partner_names.length > 0) ||
      (b.signature_phrases && b.signature_phrases.length > 0) ||
      (b.service_areas && b.service_areas.length > 0),
  );
}
