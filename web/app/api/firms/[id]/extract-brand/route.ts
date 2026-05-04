/**
 * POST /api/firms/[id]/extract-brand
 *
 * Phase 3.1 of the PI feature parity project. Auto-fills a firm's
 * brand profile (tagline, voice descriptors, partners, etc.) by:
 *
 *   1. Resolving the firm's website_url (or an override URL from the
 *      request body)
 *   2. Fetching + extracting the page via lib/firms/url-extractor
 *      (Phase 3.0)
 *   3. Sending the cleaned signal to gpt-4o in JSON mode
 *   4. Sanitizing + capping the response so it can never produce a
 *      row that the existing PATCH validator would reject
 *   5. (Unless dry_run) writing back to the firms table with
 *      extraction_source='auto' and extracted_at=now()
 *
 * Pure helpers live in ./testable.ts. The route here is the I/O
 * shell \u2014 auth, RLS double-check, fetch coordination, cost tracking.
 *
 * Errors:
 *   400 \u2014 invalid body (e.g. malformed website_url override)
 *   401 \u2014 unauthenticated
 *   403 \u2014 user doesn't manage the firm, or role=viewer (when not dry_run)
 *   404 \u2014 firm not found
 *   422 \u2014 firm has no website_url AND none was provided in body
 *   424 \u2014 fetch failed (DNS, timeout, non-200, redirect loop, etc.)
 *   502 \u2014 LLM upstream failure or response failed shape validation
 *   504 \u2014 LLM timeout
 *
 * Cost: ~$0.005-0.015 per call (gpt-4o, ~500-1500 tokens in, ~300 out).
 * Tracked in generation_costs with purpose='brand_extract'.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFirmForUser, updateFirm } from "@/lib/firms/server";
import { extractFromUrl } from "@/lib/firms/url-extractor";
import { trackCall } from "@/lib/cost-tracking/tracker";
import {
  BRAND_EXTRACT_SYSTEM_PROMPT,
  buildExtractionUserPrompt,
  stripJSONWrapper,
  validateBrandExtractRequest,
  validateExtractedBrandProfile,
  type ExtractedBrandProfile,
} from "./testable";

interface BrandExtractResponse {
  /** The cleaned brand profile produced by the LLM. */
  proposed: ExtractedBrandProfile;
  /** True when the firm row was updated. False on dry_run or on the
   * (rare) case where there were no fields worth writing. */
  saved: boolean;
  /** The URL we actually fetched (post-redirect). */
  source_url: string;
  /** True when the fetched HTML was truncated by the 2MB cap. */
  truncated: boolean;
  /** Total cents charged to the firm for this call. */
  cost_cents: number;
}

const LLM_TIMEOUT_MS = 30_000;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: firmId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Body is optional. We accept "no body" as "extract using stored URL".
  let rawBody: unknown = {};
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
  }

  const validation = validateBrandExtractRequest(rawBody);
  if (!validation.ok) {
    return NextResponse.json(
      { error: "Validation failed", errors: validation.errors },
      { status: 400 },
    );
  }
  const { website_url: overrideUrl, dry_run: dryRun } = validation.value;

  // Firm lookup. getFirmForUser returns null for any of: not found, no
  // manager row, RLS blocked. We surface as 404 so we don't leak whether
  // the firm exists.
  const firm = await getFirmForUser(supabase, user.id, firmId);
  if (!firm) {
    return NextResponse.json({ error: "Firm not found" }, { status: 404 });
  }

  // Viewers can dry-run (preview) but not save.
  if (!dryRun && firm.current_user_role === "viewer") {
    return NextResponse.json(
      { error: "Viewers cannot update a firm. Pass dry_run=true to preview." },
      { status: 403 },
    );
  }

  const targetUrl = overrideUrl ?? firm.website_url;
  if (!targetUrl) {
    return NextResponse.json(
      {
        error:
          "Firm has no website_url and none was provided. Add a website to the firm first.",
      },
      { status: 422 },
    );
  }

  // Phase 3.0 fetcher. Returns ok/error \u2014 never throws.
  const fetched = await extractFromUrl(targetUrl);
  if (!fetched.ok || !fetched.page) {
    return NextResponse.json(
      {
        error: `Could not fetch website: ${fetched.error ?? "unknown error"}`,
        source_url: targetUrl,
      },
      { status: 424 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 500 },
    );
  }

  const userPrompt = buildExtractionUserPrompt({
    finalUrl: fetched.url,
    page: fetched.page,
  });

  // Call gpt-4o in JSON mode. We want determinism for an extract task,
  // so temperature=0.2 \u2014 still allows some flex on phrasing of the
  // rationale field but keeps voice_descriptors stable across runs.
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
        model: "gpt-4o",
        temperature: 0.2,
        max_tokens: 800,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: BRAND_EXTRACT_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      console.error("OpenAI API error (brand extract):", response.status, errBody);
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
    console.error("Brand extract LLM error:", err);
    return NextResponse.json(
      { error: "Internal error calling AI service" },
      { status: 500 },
    );
  }

  const latency_ms = Date.now() - llmStartedAt;

  const rawContent = llmData.choices?.[0]?.message?.content?.trim();
  if (!rawContent) {
    return NextResponse.json(
      { error: "Empty AI response" },
      { status: 502 },
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(stripJSONWrapper(rawContent));
  } catch (err) {
    console.error("Brand extract: JSON parse failed:", err, "content:", rawContent);
    return NextResponse.json(
      { error: "AI returned invalid JSON" },
      { status: 502 },
    );
  }

  const profileResult = validateExtractedBrandProfile(parsedJson);
  if (!profileResult.ok) {
    console.error(
      "Brand extract: response failed validation:",
      profileResult.errors,
      "raw:",
      rawContent,
    );
    return NextResponse.json(
      {
        error: "AI response failed validation",
        errors: profileResult.errors,
      },
      { status: 502 },
    );
  }
  const proposed = profileResult.value;

  // Cost tracking. We await so cost_cents can land in the response.
  // trackCall never throws on DB failure.
  const tracked = await trackCall(supabase, {
    user_id: user.id,
    firm_id: firmId,
    purpose: "brand_extract",
    provider: "openai",
    model: "gpt-4o",
    usage: {
      input_tokens: llmData.usage?.prompt_tokens ?? 0,
      output_tokens: llmData.usage?.completion_tokens ?? 0,
    },
    latency_ms,
    meta: {
      source_url: targetUrl,
      final_url: fetched.url,
      truncated: fetched.truncated ?? false,
      dry_run: dryRun ?? false,
      word_count: fetched.page.wordCount,
    },
  });

  // Decide whether the proposed profile is worth saving. If everything
  // is empty (page was thin / JS-rendered / not a firm site), we skip
  // the write rather than blank out a manually-edited firm.
  const hasAnySignal = profileHasSignal(proposed);

  let saved = false;
  if (!dryRun && hasAnySignal) {
    try {
      await updateFirm(supabase, user.id, firmId, {
        // Always set website_url so the URL the user typed actually
        // sticks (only matters when overrideUrl was supplied).
        website_url: targetUrl,
        tagline: proposed.tagline ?? undefined,
        voice_descriptors: proposed.voice_descriptors,
        differentiators: proposed.differentiators,
        partner_names: proposed.partner_names,
        signature_phrases: proposed.signature_phrases,
        service_areas: proposed.service_areas,
        social_handles: proposed.social_handles,
        extraction_source: "auto",
        extracted_at: new Date().toISOString(),
      });
      saved = true;
    } catch (e) {
      console.error("Brand extract: firm update failed:", e);
      // We've already tracked the LLM cost; the user got a useful
      // proposed profile back. Surface as 502 with the proposed payload
      // so the UI can offer a "retry save" path without re-spending.
      return NextResponse.json(
        {
          error: `Save failed: ${(e as Error).message}`,
          proposed,
          source_url: fetched.url,
          cost_cents: tracked.cost_cents,
        },
        { status: 502 },
      );
    }
  }

  const responsePayload: BrandExtractResponse = {
    proposed,
    saved,
    source_url: fetched.url,
    truncated: fetched.truncated ?? false,
    cost_cents: tracked.cost_cents,
  };

  return NextResponse.json(responsePayload);
}

/**
 * Returns true if the proposed profile has at least one non-empty
 * field worth persisting. Avoids overwriting a manually-curated firm
 * with all-empty auto values when the page was thin.
 */
function profileHasSignal(p: ExtractedBrandProfile): boolean {
  return Boolean(
    (p.tagline && p.tagline.trim()) ||
      p.voice_descriptors.length > 0 ||
      p.differentiators.length > 0 ||
      p.partner_names.length > 0 ||
      p.signature_phrases.length > 0 ||
      p.service_areas.length > 0 ||
      Object.keys(p.social_handles).length > 0,
  );
}
