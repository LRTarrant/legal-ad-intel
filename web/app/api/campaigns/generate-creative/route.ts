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
  brandAssets?: string[];
}

function buildSceneGuidance(tortName: string, audienceNotes: string | null): string {
  const tn = tortName.toLowerCase();

  if (tn.includes('depo') || tn.includes('provera')) {
    return 'Scene: A woman in her 30s-50s in a medical/healthcare setting — perhaps at a doctor\'s office, receiving an injection, or looking concerned about medical paperwork. Focus on women\'s health context. Warm, natural lighting.';
  }
  if (tn.includes('roundup') || tn.includes('paraquat')) {
    return 'Scene: A man in his 50s-60s working outdoors — landscaping, farming, gardening, or agricultural setting. Show real outdoor work environments. Natural sunlight, earth tones.';
  }
  if (tn.includes('hair relaxer')) {
    return 'Scene: A Black woman in her 30s-50s — perhaps in a hair salon, looking at hair care products, or in a domestic setting. Warm, personal atmosphere. Focus on beauty/personal care context.';
  }
  if (tn.includes('talcum') || tn.includes('talc')) {
    return 'Scene: A woman in a personal care / bathroom setting — personal hygiene context. Soft, intimate lighting. Focus on everyday personal care routines.';
  }
  if (tn.includes('afff')) {
    return 'Scene: A firefighter or military service member — fire station, military base, or training ground. Show the working environment where AFFF foam was used. Bold, dramatic lighting.';
  }
  if (tn.includes('social media')) {
    return 'Scene: A concerned parent looking at a teenager\'s phone or a teen looking distressed while using a phone/tablet. Home setting, warm but tense atmosphere. Focus on the parent-child dynamic.';
  }
  if (tn.includes('bard') || tn.includes('powerport')) {
    return 'Scene: An older patient (50s-60s) in a medical treatment setting — perhaps a chemotherapy infusion center, hospital room, or medical consultation. Focus on the medical device / treatment context. Clinical but compassionate feel.';
  }
  if (tn.includes('uber') || tn.includes('lyft') || tn.includes('rideshare')) {
    return 'Scene: A young adult (20s-30s) near a rideshare vehicle — outside a car at night, urban setting, or looking at a phone with a ride app. Focus on the rideshare safety context.';
  }
  if (tn.includes('truck') || tn.includes('large truck')) {
    return 'Scene: A highway scene with a large commercial truck — aftermath setting, truck driver, or trucking environment. Focus on road safety and commercial vehicles.';
  }
  if (tn.includes('motor vehicle') || tn.includes('auto')) {
    return 'Scene: A car accident aftermath — damaged vehicle, person assessing a fender bender, or highway scene. Focus on everyday driving situations.';
  }
  if (tn.includes('motorcycle')) {
    return 'Scene: A motorcycle on an open road or a rider — focus on motorcycle culture and road safety. Dynamic, outdoorsy feel.';
  }
  if (tn.includes('camp lejeune')) {
    return 'Scene: A military veteran or military base environment — Camp Lejeune style setting, base housing, or a veteran reflecting. Honor the military service context.';
  }
  if (tn.includes('nec') || tn.includes('necrotizing')) {
    return 'Scene: A neonatal / NICU setting — premature baby, hospital nursery, or concerned parent at a hospital. Tender, emotional atmosphere.';
  }

  if (audienceNotes) {
    return `Scene: Depict the target audience (${audienceNotes}) in a natural, everyday setting relevant to their life. Warm, empathetic lighting.`;
  }

  return 'Scene: An everyday person in a relatable real-world setting — NOT a legal or corporate setting. Warm, empathetic, authentic feel.';
}

function buildPrompt(req: CreativeRequest, audienceNotes: string | null): string {
  const colorContext = req.brandColors
    ? [
        req.brandColors.primary && `primary color ${req.brandColors.primary}`,
        req.brandColors.secondary && `secondary color ${req.brandColors.secondary}`,
        req.brandColors.accent && `accent color ${req.brandColors.accent}`,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  const sceneGuidance = buildSceneGuidance(req.tortName, audienceNotes);

  return `Create a professional, evocative photograph-style image for an advertisement related to ${req.tortName} cases.

${req.audienceDemo ? `Target audience: ${req.audienceDemo}.` : ""}
${req.messaging ? `Campaign tone: ${req.messaging}.` : ""}
${colorContext ? `Brand color palette: ${colorContext}. Incorporate these colors subtly into the composition through lighting, environment, or accents.` : ""}

Style: ${req.style ?? "Empathetic, modern, clean design"}. The image should feel trustworthy and approachable — suitable as the background visual for a Meta/Facebook advertisement.

${sceneGuidance}

CRITICAL: Do NOT depict any of the following:
- Courtrooms, gavels, legal scales, or legal symbols
- Law firm conference rooms or office settings
- People in business suits or professional legal attire
- Handshakes or corporate interactions
- Generic "justice" or "legal" imagery
- Stethoscopes or generic medical equipment (unless the tort is specifically medical)

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

    // Fetch audience profile for this tort
    let audienceNotes: string | null = null;
    try {
      const { data: profile } = await (supabase as any)
        .from("tort_audience_profiles")
        .select("notes, age_band_weights")
        .ilike("profile_name", `%${body.tortName}%`)
        .limit(1)
        .maybeSingle();
      if (profile?.notes) {
        audienceNotes = profile.notes;
      }
    } catch {
      // Non-blocking: proceed without audience context
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
    const prompt = buildPrompt(body, audienceNotes);
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
