import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/tort-images
 *
 * Returns a randomized selection of active images, scoped by either:
 *   - tort_slug=roundup            (mass tort, legacy)
 *   - practice_area=personal_injury&pi_category=motorcycle_accident  (PI)
 *
 * Either tort_slug OR (practice_area=personal_injury AND pi_category)
 * is required. Used by the Campaign Builder image picker and the
 * library-first fallback logic in generate-creative.
 *
 * Optional: limit (1-50, default 5).
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
    const practiceArea = searchParams.get("practice_area");
    const piCategory = searchParams.get("pi_category");

    // Caller must specify either tort_slug (mass tort) or PI scope.
    const isPIQuery = practiceArea === "personal_injury";
    if (!tortSlug && !isPIQuery) {
      return NextResponse.json(
        {
          error:
            "Provide either tort_slug or (practice_area=personal_injury and pi_category).",
        },
        { status: 400 },
      );
    }
    if (isPIQuery && !piCategory) {
      return NextResponse.json(
        { error: "pi_category is required when practice_area=personal_injury" },
        { status: 400 },
      );
    }

    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") ?? "5", 10) || 5, 1),
      50,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    let query = db
      .from("tort_images")
      .select("public_url, tags, display_order, demographic_notes")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (isPIQuery) {
      query = query
        .eq("practice_area", "personal_injury")
        .eq("pi_category", piCategory);
    } else {
      // Mass tort path. Be lenient with rows missing practice_area
      // (legacy data): match on tort_slug only. Filter to mass_tort
      // explicitly when the column has a value.
      query = query.eq("tort_slug", tortSlug);
    }

    const { data: images, error } = await query;

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
