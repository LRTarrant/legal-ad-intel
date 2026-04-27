import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

async function requireAdmin(supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["tenant_admin", "super_admin"].includes(profile.role)) {
    return null;
  }
  return user;
}

/**
 * GET /api/admin/tort-images?tort_slug=roundup
 * Returns all images (active + inactive) for admin management.
 * Omit tort_slug to get all images grouped by tort.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await requireAdmin(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tortSlug = req.nextUrl.searchParams.get("tort_slug");
    const serviceClient = getServiceClient();

    let query = serviceClient
      .from("tort_images")
      .select("*")
      .order("tort_slug")
      .order("display_order", { ascending: true });

    if (tortSlug) {
      query = query.eq("tort_slug", tortSlug);
    }

    const { data, error } = await query;
    if (error) {
      console.error("tort_images fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch images" },
        { status: 500 },
      );
    }

    return NextResponse.json({ images: data ?? [] });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/tort-images
 * Create a new tort_images row after uploading to storage.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await requireAdmin(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      tort_slug,
      storage_path,
      public_url,
      tags,
      demographic_notes,
      source_url,
      license_note,
      display_order,
    } = body;

    if (!tort_slug || !storage_path || !public_url) {
      return NextResponse.json(
        { error: "tort_slug, storage_path, and public_url are required" },
        { status: 400 },
      );
    }

    const serviceClient = getServiceClient();
    const { data, error } = await serviceClient
      .from("tort_images")
      .insert({
        tort_slug,
        storage_path,
        public_url,
        tags: tags ?? [],
        demographic_notes: demographic_notes ?? null,
        source_url: source_url ?? null,
        license_note: license_note ?? null,
        display_order: display_order ?? 0,
      })
      .select()
      .single();

    if (error) {
      console.error("tort_images insert error:", error);
      return NextResponse.json(
        { error: "Failed to create image record" },
        { status: 500 },
      );
    }

    return NextResponse.json({ image: data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/tort-images
 * Update an existing tort_images row (tags, notes, order, active status).
 */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await requireAdmin(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 },
      );
    }

    const serviceClient = getServiceClient();
    const { data, error } = await serviceClient
      .from("tort_images")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("tort_images update error:", error);
      return NextResponse.json(
        { error: "Failed to update image" },
        { status: 500 },
      );
    }

    return NextResponse.json({ image: data });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/tort-images
 * Remove a tort image (deletes from storage + table row).
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await requireAdmin(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 },
      );
    }

    const serviceClient = getServiceClient();

    // Get the storage_path before deleting the row
    const { data: image } = await serviceClient
      .from("tort_images")
      .select("storage_path")
      .eq("id", id)
      .single();

    if (image?.storage_path) {
      await serviceClient.storage
        .from("tort-images")
        .remove([image.storage_path]);
    }

    const { error } = await serviceClient
      .from("tort_images")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("tort_images delete error:", error);
      return NextResponse.json(
        { error: "Failed to delete image" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
