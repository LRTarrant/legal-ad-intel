/**
 * POST /api/campaigns/generate-pi-meta-ad
 *
 * Phase 4a of the PI feature parity project. Generates the TEXT half
 * of a Meta (Facebook/Instagram) feed ad: primary_text, headline,
 * description, cta_label, plus an image_prompt for downstream image
 * generation.
 *
 * Pairs with /api/campaigns/generate-pi-scene-image (Phase 2.1) for
 * the visual half — UI calls both in sequence to assemble the full
 * ad creative. We don't bundle them server-side because:
 *   - User may want to regenerate just the text without re-spending on
 *     a new image, or vice versa
 *   - Image generation has its own entitlement gate + cost profile
 *
 * Pure helpers live in ./testable.ts.
 *
 * Errors:
 *   400 \u2014 missing/invalid input
 *   401 \u2014 unauthenticated
 *   403 \u2014 entitlement denial (locked tab, geo scope) or firm access
 *   429 \u2014 entitlement denial (monthly cap)
 *   502 \u2014 LLM upstream failure or response failed shape validation
 *   504 \u2014 LLM timeout
 *
 * Cost: ~$0.005-0.015 per call (gpt-4o, ~600-1000 tokens in, ~250 out).
 * Tracked in generation_costs with purpose='ad_creative'.
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
import type { PICategory } from "@/lib/campaign-builder/pi-templates/types";
import { getFirmForUser } from "@/lib/firms/server";
import {
  PI_META_AD_SYSTEM_PROMPT,
  brandInputsFromFirm,
  buildPIMetaAdUserPrompt,
  stripJSONWrapper,
  validatePIMetaAdRequest,
  validatePIMetaAdResponse,
  type BrandPromptInputs,
  type CTALabel,
  type PIMetaAdRequest,
} from "./testable";

interface PIMetaAdResponsePayload {
  primary_text: string;
  headline: string;
  description: string;
  cta_label: CTALabel;
  image_prompt: string;
  rationale: string;
  template_source: {
    category: PICategory;
    hook: string;
    problem: string;
    authority: string;
    cta: string;
    disclaimer: string;
  };
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

const LLM_TIMEOUT_MS = 30_000;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PIMetaAdRequest;
  try {
    body = (await req.json()) as PIMetaAdRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const errors = validatePIMetaAdRequest(body);
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


  // Entitlement gate: PI access required, geo scope must include the
  // state. is_create=false: this is compute-only.
  const gate = await checkCampaignBuilderEntitlement(supabase, user.id, {
    practice_area: "personal_injury",
    state: body.state,
    is_create: false,
  }, demoMode);
  if (!gate.ok) {
    const { body: errBody, status } = entitlementErrorBody(gate);
    return NextResponse.json(errBody, { status });
  }

  // Firm verification + brand profile fetch.
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

  const userPrompt = buildPIMetaAdUserPrompt(body, template, brandInputs);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  let llmStartedAt = Date.now();
  let llmData: {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        // gpt-4o keeps tone consistent with the radio + video generators.
        // JSON mode is critical here \u2014 we have 5 distinct fields with
        // hard char limits that need exact-shape parsing.
        model: "gpt-4o",
        temperature: 0.7,
        max_tokens: 700,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: PI_META_AD_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      console.error("OpenAI API error (PI Meta ad):", response.status, errBody);
      return NextResponse.json(
        { error: "AI service unavailable" },
        { status: 502 },
      );
    }

    llmData = await response.json();
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === "AbortError") {
      return NextResponse.json(
        { error: "AI service timed out" },
        { status: 504 },
      );
    }
    console.error("PI Meta ad error:", err);
    return NextResponse.json(
      { error: "Internal error generating ad" },
      { status: 500 },
    );
  }

  const latency_ms = Date.now() - llmStartedAt;

  const rawContent = llmData.choices?.[0]?.message?.content?.trim();
  if (!rawContent) {
    return NextResponse.json({ error: "Empty AI response" }, { status: 502 });
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(stripJSONWrapper(rawContent));
  } catch (err) {
    console.error("PI Meta ad: JSON parse failed:", err, "content:", rawContent);
    return NextResponse.json(
      { error: "AI returned invalid JSON" },
      { status: 502 },
    );
  }

  const result = validatePIMetaAdResponse(parsedJson);
  if (!result.ok) {
    console.error(
      "PI Meta ad: response failed validation:",
      result.errors,
      "raw:",
      rawContent,
    );
    return NextResponse.json(
      { error: "AI response failed validation", errors: result.errors },
      { status: 502 },
    );
  }
  const ad = result.value;

  // Cost tracking. Await so cost_cents lands in the response body.
  const tracked = await trackCall(supabase, {
    user_id: user.id,
    firm_id: resolvedFirmId,
    purpose: "ad_creative",
    provider: "openai",
    model: "gpt-4o",
    usage: {
      input_tokens: llmData.usage?.prompt_tokens ?? 0,
      output_tokens: llmData.usage?.completion_tokens ?? 0,
    },
    latency_ms,
    meta: {
      platform: "meta",
      pi_category: body.pi_category,
      state: body.state,
      market: body.market_display_name,
      language: body.language ?? "en",
      aspect_ratio: body.aspect_ratio ?? "square",
      severity_modifiers: body.severity_modifiers ?? [],
      cta_label: ad.cta_label,
      cta_intent: body.cta_intent ?? null,
      brand_aware: brandInputs !== null && hasAnyBrandSignal(brandInputs),
    },
  });

  const payload: PIMetaAdResponsePayload = {
    ...ad,
    template_source: {
      category: template.category,
      hook: template.hook,
      problem: template.problem,
      authority: template.authority,
      cta: template.cta,
      disclaimer: template.baseDisclaimer,
    },
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

  return NextResponse.json(payload);
}

/**
 * Returns true if at least one brand profile field is non-empty.
 * Mirrors the helper in /generate-pi-radio-script/route.ts.
 */
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
