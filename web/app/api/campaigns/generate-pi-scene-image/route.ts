/**
 * POST /api/campaigns/generate-pi-scene-image
 *
 * Generates one image for one PI video scene.
 *
 * Resolution order:
 *   1. Curated PI library image for this pi_category (if MIN_COUNT met)
 *   2. AI generation via Imagen → DALL-E fallback, using the LLM's
 *      imagePrompt from the storyboard
 *
 * The video composition UI calls this once per scene (3 calls per
 * 3-scene storyboard). Each call is cost-tracked under purpose="image_gen".
 *
 * Why not reuse /api/campaigns/generate-creative:
 *   - That route is heavily tort-tuned (per-tort scene guidance hard-
 *     coded for Roundup, Depo-Provera, etc.). PI categories don't fit
 *     that mold.
 *   - PI scenes already get an LLM-authored imagePrompt from
 *     generate-pi-video-script. The "scene guidance" is already there.
 *   - PI cost attribution should land on firm_id, which the existing
 *     /generate-creative route doesn't carry.
 *
 * Errors:
 *   400 \u2014 missing/invalid input
 *   401 \u2014 unauthenticated
 *   403 \u2014 firm_id supplied but caller doesn't manage it; or PI access
 *           denied (we run the entitlement gate so unauthorized users
 *           don't burn images they can't actually use)
 *   429 \u2014 entitlement denial (monthly cap)
 *   502 \u2014 upstream provider failure
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  checkCampaignBuilderEntitlement,
  entitlementErrorBody,
} from "@/lib/campaign-builder/entitlements";
import { trackCall } from "@/lib/cost-tracking/tracker";
import { getFirmForUser } from "@/lib/firms/server";
import {
  createImageProviderWithFallback,
  getPILibraryImage,
} from "@/lib/services/image-generation";
import { getAvailablePICategories } from "@/lib/campaign-builder/pi-templates";
import type { PICategory } from "@/lib/campaign-builder/pi-templates/types";

interface PISceneImageRequest {
  pi_category: PICategory;
  /** The imagePrompt string from the LLM storyboard. */
  imagePrompt: string;
  /** Output aspect ratio. Defaults 16:9 for video. */
  size?: "1024x1024" | "1024x1792" | "1792x1024";
  /** Optional firm attribution. RLS-checked when present. */
  firm_id?: string;
  /** Optional state \u2014 used for the entitlement geo gate. Skipped when
   * the caller knows the entitlement was already validated upstream. */
  state?: string;
  /** Optional analytics meta. */
  scene_number?: number;
}

const MAX_PROMPT_CHARS = 2000;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PISceneImageRequest;
  try {
    body = (await req.json()) as PISceneImageRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate
  if (
    !body.pi_category ||
    !getAvailablePICategories().includes(body.pi_category)
  ) {
    return NextResponse.json(
      { error: "pi_category is required and must be a v1 PI category" },
      { status: 400 },
    );
  }
  if (!body.imagePrompt?.trim()) {
    return NextResponse.json(
      { error: "imagePrompt is required" },
      { status: 400 },
    );
  }
  if (body.imagePrompt.length > MAX_PROMPT_CHARS) {
    return NextResponse.json(
      { error: `imagePrompt exceeds ${MAX_PROMPT_CHARS} characters` },
      { status: 400 },
    );
  }
  const size = body.size ?? "1792x1024";
  if (!["1024x1024", "1024x1792", "1792x1024"].includes(size)) {
    return NextResponse.json(
      { error: "size must be 1024x1024, 1024x1792, or 1792x1024" },
      { status: 400 },
    );
  }

  // Entitlement gate \u2014 PI access required. State check only when a
  // state is supplied (this route is sometimes called from a flow
  // where the script already passed the geo gate).
  const gate = await checkCampaignBuilderEntitlement(supabase, user.id, {
    practice_area: "personal_injury",
    state: body.state ?? null,
    is_create: false,
  });
  if (!gate.ok) {
    const { body: errBody, status } = entitlementErrorBody(gate);
    return NextResponse.json(errBody, { status });
  }

  // Firm verification (cost attribution)
  let resolvedFirmId: string | null = null;
  if (body.firm_id) {
    const firm = await getFirmForUser(supabase, user.id, body.firm_id);
    if (!firm) {
      return NextResponse.json(
        { error: "firm_id not found or you don't manage that firm" },
        { status: 403 },
      );
    }
    resolvedFirmId = firm.id;
  }

  // 1. Try the curated library first
  const libraryImageUrl = await getPILibraryImage(
    body.pi_category,
    supabase,
  );
  if (libraryImageUrl) {
    // Library hit \u2014 record at $0.00 cost, just for visibility.
    void trackCall(supabase, {
      user_id: user.id,
      firm_id: resolvedFirmId,
      purpose: "image_gen",
      provider: "internal",
      model: "pi_library",
      usage: { image_count: 1 },
      meta: {
        pi_category: body.pi_category,
        scene_number: body.scene_number,
        source: "library",
      },
    });
    return NextResponse.json({
      imageUrl: libraryImageUrl,
      source: "library",
      cost_cents: 0,
    });
  }

  // 2. AI generation fallback
  const provider = createImageProviderWithFallback();

  let imageUrl: string;
  try {
    imageUrl = await provider.generate(body.imagePrompt, { size });
  } catch (e) {
    console.error("PI scene image gen failed:", e);
    return NextResponse.json(
      { error: "Image generation failed" },
      { status: 502 },
    );
  }

  // Detect provider for cost tracking. The fallback factory decides at
  // runtime; we infer from env which one likely served the request.
  // Imperfect but good enough for COGS reporting at this stage.
  const usedImagen = Boolean(
    process.env.GOOGLE_VERTEX_API_KEY && process.env.GOOGLE_CLOUD_PROJECT_ID,
  );
  const providerName = usedImagen ? "google" : "openai";
  const modelName = usedImagen ? "imagen-4-fast" : "dall-e-3";

  const tracked = await trackCall(supabase, {
    user_id: user.id,
    firm_id: resolvedFirmId,
    purpose: "image_gen",
    provider: providerName,
    model: modelName,
    usage: { image_count: 1 },
    meta: {
      pi_category: body.pi_category,
      scene_number: body.scene_number,
      source: "ai",
      size,
    },
  });

  return NextResponse.json({
    imageUrl,
    source: "ai",
    cost_cents: tracked.cost_cents,
  });
}
