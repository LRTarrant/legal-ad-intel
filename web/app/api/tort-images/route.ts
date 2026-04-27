import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/tort-images?tort_slug=roundup&limit=5
 *
 * Returns a randomized selection of active images for the given tort.
 * Used by the Campaign Builder image picker and the library-first
 * fallback logic in generate-creative.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const tortSlug = searchParams.get("tort_slug");
    if (!tortSlug) {
      return NextResponse.json(
        { error: "tort_slug query parameter is required" },
        { status: 400 },
      );
    }

    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") ?? "5", 10) || 5, 1),
      50,
    );

    // Fetch all active images for this tort, ordered by display_order
    const { data: images, error } = await (supabase as any)
      .from("tort_images")
      .select("public_url, tags, display_order, demographic_notes")
      .eq("tort_slug", tortSlug)
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("tort_images query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch images" },
        { status: 500 },
      );
    }

    if (!images || images.length === 0) {
      return NextResponse.json({ images: [], total: 0 });
    }

    // Randomize and limit
    const shuffled = [...images].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, limit);

    return NextResponse.json({
      images: selected,
      total: images.length,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
