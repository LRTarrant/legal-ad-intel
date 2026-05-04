/* ── Image Generation Provider Abstraction ──────────────────────────────
 * Swap providers (DALL-E → Imagen → etc.) without touching callers.
 * Default: Imagen 4 via Vertex AI. Fallback: DALL-E 3 via OpenAI.
 * ────────────────────────────────────────────────────────────────────── */

export interface ImageGenerationOptions {
  size: "1024x1024" | "1024x1792" | "1792x1024";
}

export interface ImageGenerationProvider {
  generate(prompt: string, options: ImageGenerationOptions): Promise<string>; // returns image URL
}

/* ── Size → aspect ratio mapping for Imagen ──────────────────────────── */

const SIZE_TO_ASPECT_RATIO: Record<ImageGenerationOptions["size"], string> = {
  "1024x1024": "1:1",
  "1024x1792": "9:16",
  "1792x1024": "16:9",
};

/* ── Imagen 4 via Vertex AI REST API ─────────────────────────────────── */

export class ImagenProvider implements ImageGenerationProvider {
  private apiKey: string;
  private projectId: string;

  constructor(apiKey: string, projectId: string) {
    this.apiKey = apiKey;
    this.projectId = projectId;
  }

  async generate(prompt: string, options: ImageGenerationOptions): Promise<string> {
    const region = "us-central1";
    const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${region}/publishers/google/models/imagen-4-fast:predict?key=${this.apiKey}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: SIZE_TO_ASPECT_RATIO[options.size] ?? "1:1",
          outputOptions: { mimeType: "image/png" },
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      console.error("Imagen API error:", response.status, errBody);
      throw new Error(`Imagen generation failed (${response.status})`);
    }

    const data = await response.json();
    const prediction = data.predictions?.[0];
    if (!prediction?.bytesBase64Encoded) {
      throw new Error("No image data in Imagen response");
    }

    const mimeType = prediction.mimeType ?? "image/png";
    return `data:${mimeType};base64,${prediction.bytesBase64Encoded}`;
  }
}

/* ── DALL-E 3 via OpenAI (fallback) ──────────────────────────────────── */

export class DallEProvider implements ImageGenerationProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(prompt: string, options: ImageGenerationOptions): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: options.size,
        quality: "standard",
      }),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      console.error("DALL-E API error:", response.status, errBody);
      throw new Error(`Image generation failed (${response.status})`);
    }

    const data = await response.json();
    const url = data.data?.[0]?.url;
    if (!url) {
      throw new Error("No image URL in response");
    }
    return url;
  }
}

/* ── Factory ───────────────────────────────────────────────────────── */

export function createImageProvider(): ImageGenerationProvider {
  const vertexApiKey = process.env.GOOGLE_VERTEX_API_KEY;
  const gcpProject = process.env.GOOGLE_CLOUD_PROJECT;

  if (vertexApiKey && gcpProject) {
    console.log("[image-gen] Using Imagen 4 provider");
    return new ImagenProvider(vertexApiKey, gcpProject);
  }

  console.log("[image-gen] Imagen not configured, falling back to DALL-E");
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new Error("No image generation provider configured (need GOOGLE_VERTEX_API_KEY + GOOGLE_CLOUD_PROJECT, or OPENAI_API_KEY)");
  }
  return new DallEProvider(openaiKey);
}

/* ── Auto-fallback wrapper ────────────────────────────────────────────
 * Tries Imagen first; on failure, falls back to DALL-E (if available).
 * ────────────────────────────────────────────────────────────────────── */

/* ── Tort image library lookup ─────────────────────────────────────────
 * Checks the curated tort_images table first. Returns a random public_url
 * if enough curated images exist for the tort slug, otherwise null so
 * callers can fall back to AI generation.
 * ────────────────────────────────────────────────────────────────────── */

const TORT_IMAGE_LIBRARY_MIN_COUNT = parseInt(
  process.env.TORT_IMAGE_LIBRARY_MIN_COUNT ?? "3",
  10,
);

export async function getTortLibraryImage(
  tortSlug: string,
  supabase: any,
): Promise<string | null> {
  try {
    const { data: images, error } = await supabase
      .from("tort_images")
      .select("public_url")
      .eq("tort_slug", tortSlug)
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error || !images || images.length < TORT_IMAGE_LIBRARY_MIN_COUNT) {
      return null;
    }

    // Pick a random image from the library
    const pick = images[Math.floor(Math.random() * images.length)];
    return pick.public_url;
  } catch {
    return null;
  }
}

/**
 * PI version of getTortLibraryImage. Returns a random library image
 * for the given pi_category, or null if there aren't enough curated
 * PI images yet to skip the AI generation fallback.
 *
 * Same MIN_COUNT threshold as mass tort — we want enough variety
 * before we skip AI generation entirely.
 */
export async function getPILibraryImage(
  piCategory: string,
  supabase: any,
): Promise<string | null> {
  try {
    const { data: images, error } = await supabase
      .from("tort_images")
      .select("public_url")
      .eq("practice_area", "personal_injury")
      .eq("pi_category", piCategory)
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error || !images || images.length < TORT_IMAGE_LIBRARY_MIN_COUNT) {
      return null;
    }

    const pick = images[Math.floor(Math.random() * images.length)];
    return pick.public_url;
  } catch {
    return null;
  }
}

export function createImageProviderWithFallback(): ImageGenerationProvider {
  const primary = createImageProvider();
  const openaiKey = process.env.OPENAI_API_KEY;
  const isPrimaryImagen = primary instanceof ImagenProvider;

  if (!isPrimaryImagen || !openaiKey) {
    return primary;
  }

  const fallback = new DallEProvider(openaiKey);

  return {
    async generate(prompt, options) {
      try {
        return await primary.generate(prompt, options);
      } catch (err) {
        console.warn("[image-gen] Imagen failed, falling back to DALL-E:", err);
        return fallback.generate(prompt, options);
      }
    },
  };
}
