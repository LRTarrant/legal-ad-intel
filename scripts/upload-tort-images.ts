#!/usr/bin/env npx tsx
/**
 * Bulk upload curated tort images to Supabase Storage + tort_images table.
 *
 * Usage:
 *   npx tsx scripts/upload-tort-images.ts ./tort_images/
 *
 * Expected folder structure:
 *   ./tort_images/
 *     roundup_01.jpg
 *     roundup_02.png
 *     hair-relaxer_01.jpg
 *     camp-lejeune_01.webp
 *     ...
 *
 * Tort slug is derived from the filename prefix (everything before the last
 * underscore + number). For example:
 *   roundup_01.jpg           → tort_slug = "roundup"
 *   hair-relaxer_01.jpg      → tort_slug = "hair-relaxer"
 *   afff-firefighting-foam_03.png → tort_slug = "afff-firefighting-foam"
 *
 * Requires env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname, basename } from "path";

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function parseTortSlug(filename: string): string | null {
  // Remove extension, then split on last _NN pattern
  const name = basename(filename, extname(filename));
  const match = name.match(/^(.+?)_\d+$/);
  return match ? match[1] : null;
}

async function main() {
  const dir = process.argv[2];
  if (!dir) {
    console.error("Usage: npx tsx scripts/upload-tort-images.ts <folder>");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error(
      "Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required",
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // Collect files
  const files = readdirSync(dir).filter((f) => {
    const ext = extname(f).toLowerCase();
    return ALLOWED_EXTENSIONS.has(ext) && statSync(join(dir, f)).isFile();
  });

  if (files.length === 0) {
    console.error(`No image files found in ${dir}`);
    process.exit(1);
  }

  console.log(`Found ${files.length} images in ${dir}\n`);

  const stats: Record<string, number> = {};
  let uploaded = 0;
  let skipped = 0;

  for (const file of files) {
    const tortSlug = parseTortSlug(file);
    if (!tortSlug) {
      console.warn(`  SKIP ${file} — could not parse tort slug from filename`);
      skipped++;
      continue;
    }

    const ext = extname(file).toLowerCase();
    const storagePath = `${tortSlug}/${file}`;
    const filePath = join(dir, file);
    const fileBuffer = readFileSync(filePath);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("tort-images")
      .upload(storagePath, fileBuffer, {
        contentType: MIME_TYPES[ext] ?? "application/octet-stream",
        upsert: true,
      });

    if (uploadError) {
      console.error(`  FAIL ${file}: ${uploadError.message}`);
      skipped++;
      continue;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("tort-images").getPublicUrl(storagePath);

    // Insert metadata row
    const order = (stats[tortSlug] ?? 0);
    const { error: insertError } = await supabase.from("tort_images").insert({
      tort_slug: tortSlug,
      storage_path: storagePath,
      public_url: publicUrl,
      display_order: order,
    });

    if (insertError) {
      console.error(`  FAIL ${file} (db): ${insertError.message}`);
      skipped++;
      continue;
    }

    stats[tortSlug] = order + 1;
    uploaded++;
    console.log(`  OK   ${file} → ${tortSlug} (#${order})`);
  }

  console.log(
    `\nDone: ${uploaded} uploaded across ${Object.keys(stats).length} torts, ${skipped} skipped`,
  );

  if (Object.keys(stats).length > 0) {
    console.log("\nBreakdown:");
    for (const [slug, count] of Object.entries(stats).sort(
      ([, a], [, b]) => b - a,
    )) {
      console.log(`  ${slug}: ${count} images`);
    }
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
