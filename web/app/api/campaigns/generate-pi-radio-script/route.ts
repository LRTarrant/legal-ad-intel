/**
 * POST /api/campaigns/generate-pi-radio-script
 *
 * Personal-injury counterpart to /generate-radio-script. Takes a PI
 * campaign config (category, market, state, severity, firm) and returns
 * a broadcast-ready radio script — polished by an LLM but grounded in
 * the structured PI template + state compliance from Phase 0.
 *
 * Design choice: rather than asking the LLM to write PI scripts from
 * scratch, we assemble the rendered template (hook, problem, authority,
 * CTA, disclaimer) via routePracticeArea() and pass it to the LLM as
 * source material with instructions to:
 *   1. Polish into broadcast-ready prose at the right word count
 *   2. Honor the firm name + market + state placeholders we've already
 *      substituted
 *   3. Preserve every compliance disclaimer verbatim
 *   4. NOT introduce facts not present in the template
 *
 * This gives us:
 *   - Compliance grounding (templates always own the disclaimer)
 *   - Brand-voice flexibility (LLM polishes wording)
 *   - Phase 1.5 ready (firm brand profile slots into the same prompt
 *     without restructuring this route)
 *
 * Pure-function helpers live in ./testable.ts so they can be unit-
 * tested without spinning up Next request/response or mocking OpenAI.
 *
 * Errors:
 *   400 — missing/invalid input
 *   401 — unauthenticated
 *   403 — entitlement denial (locked tab, geo scope) or firm access
 *   429 — entitlement denial (monthly cap)
 *   502 — upstream LLM failure
 *   504 — LLM timeout
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  checkCampaignBuilderEntitlement,
  entitlementErrorBody,
} from "@/lib/campaign-builder/entitlements";
import { trackCall } from "@/lib/cost-tracking/tracker";
import { routePracticeArea } from "@/lib/campaign-builder/practice-area-router";
import type { PICategory } from "@/lib/campaign-builder/pi-templates/types";
import { getFirmForUser } from "@/lib/firms/server";
import {
  PI_PODCAST_SYSTEM_PROMPT,
  PI_RADIO_SYSTEM_PROMPT,
  brandInputsFromFirm,
  buildPIRadioUserPrompt,
  recommendPIVoice,
  validatePIRadioRequest,
  type BrandPromptInputs,
  type PIRadioScriptRequest,
} from "./testable";

interface PIRadioScriptResponse {
  script: string;
  template_source: {
    category: PICategory;
    hook: string;
    problem: string;
    authority: string;
    cta: string;
    disclaimer: string;
  };
  voice_recommendation: {
    gender: "male" | "female";
    style: string;
    reason: string;
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

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PIRadioScriptRequest;
  try {
    body = (await req.json()) as PIRadioScriptRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const errors = validatePIRadioRequest(body);
  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Validation failed", errors },
      { status: 400 },
    );
  }

  // Entitlement gate: PI access required, geo scope must include the state.
  // is_create=false: this is compute-only (no row created here).
  const gate = await checkCampaignBuilderEntitlement(supabase, user.id, {
    practice_area: "personal_injury",
    state: body.state,
    is_create: false,
  });
  if (!gate.ok) {
    const { body: errBody, status } = entitlementErrorBody(gate);
    return NextResponse.json(errBody, { status });
  }

  // If a firm_id is supplied, verify the user manages it AND fetch the
  // brand profile so the LLM prompt can reflect the firm's voice. The
  // brand fields are optional — firms that haven't filled them out yet
  // get a clean (template-only) prompt, same as Phase 1.
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
      // The router doesn't use market_dma_code in compliance/script flow;
      // pass empty string so the call signature stays satisfied.
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
  const voice_recommendation = recommendPIVoice(
    body.pi_category,
    body.severity_modifiers ?? [],
  );

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 500 },
    );
  }

  const systemPrompt =
    body.format === "podcast" ? PI_PODCAST_SYSTEM_PROMPT : PI_RADIO_SYSTEM_PROMPT;
  const userPrompt = buildPIRadioUserPrompt(body, template, brandInputs);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      console.error("OpenAI API error (PI radio):", response.status, errBody);
      return NextResponse.json(
        { error: "AI service unavailable" },
        { status: 502 },
      );
    }

    const data = await response.json();
    const script = data.choices?.[0]?.message?.content?.trim();
    if (!script) {
      return NextResponse.json({ error: "Empty AI response" }, { status: 502 });
    }

    // Cost tracking. We await here (vs void) so the response body can
    // include cost_cents — useful for the UI's "this generated for $0.07"
    // indicator. trackCall never throws on DB failure.
    const tracked = await trackCall(supabase, {
      user_id: user.id,
      firm_id: resolvedFirmId,
      purpose: "pi_script",
      provider: "openai",
      model: "gpt-4o",
      usage: {
        input_tokens: data.usage?.prompt_tokens ?? 0,
        output_tokens: data.usage?.completion_tokens ?? 0,
      },
      meta: {
        pi_category: body.pi_category,
        state: body.state,
        market: body.market_display_name,
        duration: body.duration,
        format: body.format ?? "radio",
        language: body.language ?? "en",
        severity_modifiers: body.severity_modifiers ?? [],
        // Tag whether brand profile shaped this generation. Useful for
        // measuring brand-aware uptake + correlating quality signals.
        brand_aware: brandInputs !== null && hasAnyBrandSignal(brandInputs),
      },
    });

    const responsePayload: PIRadioScriptResponse = {
      script,
      template_source: {
        category: template.category,
        hook: template.hook,
        problem: template.problem,
        authority: template.authority,
        cta: template.cta,
        disclaimer: template.baseDisclaimer,
      },
      voice_recommendation,
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

    return NextResponse.json(responsePayload);
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === "AbortError") {
      return NextResponse.json({ error: "AI service timed out" }, { status: 504 });
    }
    console.error("PI radio script error:", err);
    return NextResponse.json(
      { error: "Internal error generating script" },
      { status: 500 },
    );
  }
}

/**
 * Returns true if at least one brand profile field is non-empty.
 * Used to tag generation_costs.meta.brand_aware so we can later measure
 * uptake and correlate with quality signals.
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
