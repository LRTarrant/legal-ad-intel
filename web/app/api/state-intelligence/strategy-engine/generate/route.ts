/**
 * POST /api/state-intelligence/strategy-engine/generate
 *
 * The Strategy Engine writer endpoint. The deterministic core (lib/strategy-engine)
 * has already decided everything; this route re-assembles the market inputs
 * SERVER-SIDE (never trusting the client), runs the scorer + channel planner,
 * then asks gpt-4o to NARRATE the fixed plan in the chosen voice.
 *
 * Three-layer no-absolute-reach enforcement: the digest carries no reach, the
 * system prompt forbids it, and validateStrategyProse rejects prose that slips
 * one in. Mirrors generate-pi-strategic-brief for auth / entitlement / cost.
 *
 * Errors:
 *   400 — invalid input, or the chosen archetype is locked out by a rule
 *   401 — unauthenticated
 *   403 — entitlement / demo-mode denial
 *   422 — not enough market data to build a plan
 *   502 — LLM upstream failure or response failed validation
 *   504 — LLM timeout
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
import { assembleStrategyInputs } from "@/lib/strategy-engine/assemble-inputs";
import { detectGorilla, scoreArchetypes } from "@/lib/strategy-engine/archetypes";
import { buildStrategyPlan } from "@/lib/strategy-engine/channel-plan";
import {
  STRATEGY_SYSTEM_PROMPT,
  buildStrategyUserPrompt,
  stripJSONWrapper,
  validateStrategyProse,
  validateStrategyRequest,
  type StrategyRequest,
} from "@/lib/strategy-engine/prompt";
import type { GeneratedStrategy } from "@/lib/strategy-engine/types";

const LLM_TIMEOUT_MS = 30_000;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: StrategyRequest;
  try {
    body = (await req.json()) as StrategyRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const errors = validateStrategyRequest(body);
  if (errors.length > 0) {
    return NextResponse.json({ error: "Validation failed", errors }, { status: 400 });
  }

  // Demo-mode override (super_admin only).
  let demoMode;
  try {
    demoMode = await readDemoModeOverride(supabase, req, user.id);
  } catch (e) {
    if (e instanceof DemoModeAccessDenied) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    throw e;
  }

  // Entitlement gate: PI access + geo scope must include the state.
  const gate = await checkCampaignBuilderEntitlement(
    supabase,
    user.id,
    { practice_area: "personal_injury", state: body.state, is_create: false },
    demoMode,
  );
  if (!gate.ok) {
    const { body: errBody, status } = entitlementErrorBody(gate);
    return NextResponse.json(errBody, { status });
  }

  // ── Re-assemble inputs server-side (never trust the client) ───────────
  const { inputs, errors: dataErrors } = await assembleStrategyInputs(
    supabase as unknown as Parameters<typeof assembleStrategyInputs>[0],
    body.state,
    { tortSlug: body.tort_slug, tortLabel: body.tort_label },
  );
  if (dataErrors.length > 0) {
    console.warn("[strategy-engine] data warnings:", dataErrors);
  }

  // Need at least one channel and either advertiser or local signal to plan.
  if (inputs.channels.length === 0 && !inputs.local_signal) {
    return NextResponse.json(
      { error: "Not enough market data to build a strategy for this state yet." },
      { status: 422 },
    );
  }

  // ── Run the deterministic core ────────────────────────────────────────
  const gorilla = detectGorilla(inputs.top_advertisers);
  const scored = scoreArchetypes(inputs);
  const chosen = scored.find((a) => a.key === body.archetype);
  if (!chosen) {
    return NextResponse.json({ error: "Unknown archetype" }, { status: 400 });
  }
  if (chosen.locked_out) {
    return NextResponse.json(
      {
        error: "That strategy is locked for this market.",
        reason: chosen.lock_reason,
      },
      { status: 400 },
    );
  }

  const plan = buildStrategyPlan(
    inputs,
    chosen,
    gorilla,
    body.cadence ?? chosen.recommended_cadence,
    body.funnel ?? chosen.recommended_funnel,
  );

  // ── LLM call (writer only) ────────────────────────────────────────────
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
  }

  const userPrompt = buildStrategyUserPrompt(plan, body.voice);
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
        model: "gpt-4o",
        temperature: 0.4,
        max_tokens: 1100,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: STRATEGY_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("OpenAI error (strategy-engine):", response.status, errText);
      return NextResponse.json({ error: "AI service unavailable" }, { status: 502 });
    }
    llmData = await response.json();
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === "AbortError") {
      return NextResponse.json({ error: "AI service timed out" }, { status: 504 });
    }
    console.error("strategy-engine error:", err);
    return NextResponse.json({ error: "Internal error generating strategy" }, { status: 500 });
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
    console.error("strategy-engine: JSON parse failed:", err, "content:", rawContent);
    return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 502 });
  }

  const result = validateStrategyProse(parsedJson);
  if (!result.ok) {
    console.error("strategy-engine: validation failed:", result.errors, "raw:", rawContent);
    return NextResponse.json(
      { error: "AI response failed validation", errors: result.errors },
      { status: 502 },
    );
  }

  // Cost tracking. Await so cost_cents is available in the response body.
  const tracked = await trackCall(supabase, {
    user_id: user.id,
    firm_id: null,
    purpose: "strategy_engine",
    provider: "openai",
    model: "gpt-4o",
    called_from: "api/state-intelligence/strategy-engine/generate",
    usage: {
      input_tokens: llmData.usage?.prompt_tokens ?? 0,
      output_tokens: llmData.usage?.completion_tokens ?? 0,
    },
    latency_ms,
    meta: {
      state: body.state,
      archetype: body.archetype,
      voice: body.voice,
      gorilla: gorilla.present,
      confidence: plan.confidence,
      data_warnings: dataErrors,
    },
  });

  const payload: GeneratedStrategy = {
    plan,
    prose: result.value,
    voice: body.voice,
    cost_cents: tracked.cost_cents ?? null,
  };
  return NextResponse.json(payload);
}
