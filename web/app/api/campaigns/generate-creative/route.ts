import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createImageProviderWithFallback } from "@/lib/services/image-generation";

interface CreativeRequest {
  tortName: string;
  firmName?: string;
  audienceDemo?: string;
  messaging?: string;
  brandColors?: {
    primary?: string | null;
    secondary?: string | null;
    accent?: string | null;
  };
  style?: string;
}

function buildPrompt(req: CreativeRequest): string {
  const colorContext = req.brandColors
    ? [
        req.brandColors.primary && `primary color ${req.brandColors.primary}`,
        req.brandColors.secondary && `secondary color ${req.brandColors.secondary}`,
        req.brandColors.accent && `accent color ${req.brandColors.accent}`,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  return `Create a professional, evocative photograph-style image for a legal advertisement related to ${req.tortName} cases.

${req.audienceDemo ? `Target audience: ${req.audienceDemo}.` : ""}
${req.messaging ? `Campaign tone: ${req.messaging}.` : ""}
${colorContext ? `Brand color palette: ${colorContext}. Incorporate these colors subtly into the composition through lighting, environment, or accents.` : ""}

Style: ${req.style ?? "Professional legal advertisement, empathetic, modern, clean design"}. The image should feel trustworthy and approachable — suitable as the background visual for a Meta/Facebook advertisement for a law firm.

Show a scene that evokes empathy, hope, and professionalism. Consider depicting supportive human interactions, professional settings, or aspirational imagery relevant to the legal context.

CRITICAL: Do NOT include any text, words, letters, numbers, logos, or typography in the image. The image must be purely visual — no headlines, no body copy, no watermarks, no text of any kind. Text will be overlaid separately.`;
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

    const body: CreativeRequest = await req.json();
    if (!body.tortName) {
      return NextResponse.json(
        { error: "tortName is required" },
        { status: 400 },
      );
    }

    let provider;
    try {
      provider = createImageProviderWithFallback();
    } catch {
      return NextResponse.json(
        { error: "Image generation not configured" },
        { status: 503 },
      );
    }
    const prompt = buildPrompt(body);
    const imageUrl = await provider.generate(prompt, { size: "1024x1024" });

    return NextResponse.json({ imageUrl });
  } catch (err) {
    console.error("Creative generation error:", err);
    return NextResponse.json(
      { error: "Image generation failed" },
      { status: 500 },
    );
  }
}
