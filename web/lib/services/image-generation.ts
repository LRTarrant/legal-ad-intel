/* ── Image Generation Provider Abstraction ──────────────────────────────
 * Swap providers (DALL-E → Gemini Imagen → etc.) without touching callers.
 * ────────────────────────────────────────────────────────────────────── */

export interface ImageGenerationOptions {
  size: "1024x1024" | "1024x1792" | "1792x1024";
}

export interface ImageGenerationProvider {
  generate(prompt: string, options: ImageGenerationOptions): Promise<string>; // returns image URL
}

/* ── DALL-E 3 via OpenAI ───────────────────────────────────────────── */

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
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }
  // Future: check for GOOGLE_VERTEX_KEY to return GeminiImagenProvider, etc.
  return new DallEProvider(apiKey);
}
