/**
 * POST /api/campaigns/generate-pi-google-rsa
 *
 * Phase 4b of the PI feature parity project. Generates a Google
 * Responsive Search Ad (RSA): up to 15 headlines (≤30 chars each),
 * 4 descriptions (≤90 chars each), and two URL display-path crumbs.
 *
 * Mirrors /generate-pi-meta-ad (Phase 4a) but for Google's text-only
 * search format. No image; no CTA enum (Google constructs CTAs from
 * the headlines automatically). The full ad arrives in one LLM call.
 *
 * Pure helpers live in ./testable.ts.
 *
 * Errors:
 *   400 — missing/invalid input
 *   401 — unauthenticated
 *   403 — entitlement denial (locked tab, geo scope) or firm access
 *   429 — entitlement denial (monthly cap)
 *   502 — LLM upstream failure or response failed shape validation
 *   504 — LLM timeout
 *
 * Cost: ~$0.005-0.015 per call (gpt-4o, ~600-900 tokens in, ~400 out
 * for the headline portfolio). Tracked in generation_costs with
 * purpose='ad_creative'.
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
  PI_GOOGLE_RSA_SYSTEM_PROMPT,
  brandInputsFromFirm,
  buildPIGoogleRSAUserPrompt,
  stripJSONWrapper,
  validatePIGoogleRSARequest,
  validatePIGoogleRSAResponse,
  type BrandPromptInputs,
  type PIGoogleRSARequest,
} from "./testable";

interface PIGoogleRSAResponsePayload {
  headlines: string[];
  descriptions: string[];
  path1: string;
  path2: string;
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

  let body: PIGoogleRSARequest;
  try {
    body = (await req.json()) as PIGoogleRSARequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const errors = validatePIGoogleRSARequest(body);
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
  const gate = await checkCampaignBuilderEntitlement(
    supabase,
    user.id,
    {
      practice_area: "personal_injury",
      state: body.state,
      is_create: false,
    },
    demoMode,
  );
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

  const userPrompt = buildPIGoogleRSAUserPrompt(body, template, brandInputs);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  const llmStartedAt = Date.now();
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
        // gpt-4o keeps tone consistent with the radio/video/meta routes.
        // JSON mode is critical — 15 headlines + 4 descriptions + 2 paths
        // are a wide schema and we need exact-shape parsing.
        // max_tokens bumped to 900 (vs 700 for Meta) because 15 headlines +
        // 4 descriptions + rationale is a lot of output.
        model: "gpt-4o",
        temperature: 0.7,
        max_tokens: 900,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: PI_GOOGLE_RSA_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      console.error(
        "OpenAI API error (PI Google RSA):",
        response.status,
        errBody,
      );
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
    console.error("PI Google RSA error:", err);
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
    console.error(
      "PI Google RSA: JSON parse failed:",
      err,
      "content:",
      rawContent,
    );
    return NextResponse.json(
      { error: "AI returned invalid JSON" },
      { status: 502 },
    );
  }

  const result = validatePIGoogleRSAResponse(parsedJson);
  if (!result.ok) {
    console.error(
      "PI Google RSA: response failed validation:",
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
      platform: "google_rsa",
      pi_category: body.pi_category,
      state: body.state,
      market: body.market_display_name,
      language: body.language ?? "en",
      severity_modifiers: body.severity_modifiers ?? [],
      headline_count: ad.headlines.length,
      description_count: ad.descriptions.length,
      brand_aware: brandInputs !== null && hasAnyBrandSignal(brandInputs),
    },
  });

  const payload: PIGoogleRSAResponsePayload = {
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
 * Mirrors the helper in /generate-pi-meta-ad/route.ts.
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
