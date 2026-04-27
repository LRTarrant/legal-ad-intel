"use client";

import { useEffect, useState, useCallback } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { createClient } from "@/lib/supabase/client";
import {
  Upload,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Save,
} from "lucide-react";

const PRIORITY_TORTS = [
  "roundup",
  "hair-relaxer",
  "depo-provera",
  "paraquat",
  "talcum-powder",
  "camp-lejeune",
  "afff-firefighting-foam",
  "social-media-addiction",
];

interface TortImage {
  id: string;
  tort_slug: string;
  storage_path: string;
  public_url: string;
  display_order: number;
  tags: string[];
  demographic_notes: string | null;
  source_url: string | null;
  license_note: string | null;
  is_active: boolean;
  created_at: string;
}

function formatSlug(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TortImagesAdmin() {
  const tenant = useTenant();
  const accentColor = tenant.accentColor ?? "#1A8C96";

  const [images, setImages] = useState<TortImage[]>([]);
  const [tortSlugs, setTortSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTort, setSelectedTort] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showToast = useCallback(
    (type: "success" | "error", message: string) => {
      setToast({ type, message });
      setTimeout(() => setToast(null), 4000);
    },
    [],
  );

  const fetchImages = useCallback(async () => {
    try {
      const url = selectedTort
        ? `/api/admin/tort-images?tort_slug=${selectedTort}`
        : "/api/admin/tort-images";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setImages(data.images ?? []);
    } catch {
      showToast("error", "Failed to load images");
    } finally {
      setLoading(false);
    }
  }, [selectedTort, showToast]);

  const fetchTortSlugs = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await (supabase as any)
        .from("mass_torts")
        .select("slug")
        .not("slug", "is", null)
        .order("slug");
      if (data) {
        setTortSlugs(data.map((r: { slug: string }) => r.slug));
      }
    } catch {
      setTortSlugs(PRIORITY_TORTS);
    }
  }, []);

  useEffect(() => {
    fetchTortSlugs();
  }, [fetchTortSlugs]);

  useEffect(() => {
    setLoading(true);
    fetchImages();
  }, [fetchImages]);

  async function handleUpload(files: FileList, tortSlug: string) {
    setUploading(true);
    const supabase = createClient();
    let uploaded = 0;

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const timestamp = Date.now();
      const storagePath = `${tortSlug}/${tortSlug}_${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("tort-images")
        .upload(storagePath, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        showToast("error", `Failed to upload ${file.name}: ${uploadError.message}`);
        continue;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("tort-images").getPublicUrl(storagePath);

      const res = await fetch("/api/admin/tort-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tort_slug: tortSlug,
          storage_path: storagePath,
          public_url: publicUrl,
          display_order: images.filter((i) => i.tort_slug === tortSlug).length + uploaded,
        }),
      });

      if (!res.ok) {
        showToast("error", `Failed to save record for ${file.name}`);
        continue;
      }

      uploaded++;
    }

    if (uploaded > 0) {
      showToast("success", `Uploaded ${uploaded} image${uploaded > 1 ? "s" : ""}`);
      fetchImages();
    }
    setUploading(false);
  }

  async function handleDelete(image: TortImage) {
    const res = await fetch("/api/admin/tort-images", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: image.id }),
    });

    if (!res.ok) {
      showToast("error", "Failed to delete image");
      return;
    }

    showToast("success", "Image deleted");
    fetchImages();
  }

  async function handleUpdate(id: string, updates: Partial<TortImage>) {
    const res = await fetch("/api/admin/tort-images", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });

    if (!res.ok) {
      showToast("error", "Failed to update image");
      return;
    }

    showToast("success", "Image updated");
    fetchImages();
  }

  async function handleReorder(image: TortImage, direction: "up" | "down") {
    const tortImages = images
      .filter((i) => i.tort_slug === image.tort_slug)
      .sort((a, b) => a.display_order - b.display_order);

    const idx = tortImages.findIndex((i) => i.id === image.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= tortImages.length) return;

    const other = tortImages[swapIdx];
    await Promise.all([
      handleUpdate(image.id, { display_order: other.display_order }),
      handleUpdate(other.id, { display_order: image.display_order }),
    ]);
  }

  const grouped = images.reduce<Record<string, TortImage[]>>((acc, img) => {
    (acc[img.tort_slug] ??= []).push(img);
    return acc;
  }, {});

  const sortedTorts = Object.keys(grouped).sort((a, b) => {
    const aP = PRIORITY_TORTS.indexOf(a);
    const bP = PRIORITY_TORTS.indexOf(b);
    if (aP >= 0 && bP >= 0) return aP - bP;
    if (aP >= 0) return -1;
    if (bP >= 0) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-8">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "border border-green-500/30 bg-green-500/10 text-green-700"
              : "border border-red-500/30 bg-red-500/10 text-red-700"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">
            Tort Image Library
          </h1>
          <p className="mt-1 text-sm text-slate-gray">
            Manage curated images for tort advertising creative. Images here are
            used instead of AI-generated images.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700">
          Filter by tort:
        </label>
        <select
          value={selectedTort ?? ""}
          onChange={(e) => setSelectedTort(e.target.value || null)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          <option value="">All torts</option>
          {tortSlugs.map((slug) => (
            <option key={slug} value={slug}>
              {formatSlug(slug)}
            </option>
          ))}
        </select>
        <span className="text-sm text-slate-500">
          {images.length} image{images.length !== 1 ? "s" : ""} total
        </span>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-charcoal">
          Upload Images
        </h2>
        <div className="flex items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Tort
            </label>
            <select
              id="upload-tort"
              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              defaultValue={PRIORITY_TORTS[0]}
            >
              {(tortSlugs.length > 0 ? tortSlugs : PRIORITY_TORTS).map(
                (slug) => (
                  <option key={slug} value={slug}>
                    {formatSlug(slug)}
                  </option>
                ),
              )}
            </select>
          </div>
          <div>
            <label
              htmlFor="file-upload"
              className={`flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 ${
                uploading ? "opacity-50" : ""
              }`}
              style={{ backgroundColor: accentColor }}
            >
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading..." : "Choose Files"}
            </label>
            <input
              id="file-upload"
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                if (!e.target.files?.length) return;
                const select = document.getElementById(
                  "upload-tort",
                ) as HTMLSelectElement;
                handleUpload(e.target.files, select.value);
                e.target.value = "";
              }}
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Accepts PNG, JPEG, WebP. Up to 5 MB per file. Select multiple files at
          once.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-slate-gray">Loading...</p>
        </div>
      ) : sortedTorts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
          <ImageIcon className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 text-sm text-slate-500">
            No images uploaded yet. Use the uploader above to add curated images.
          </p>
        </div>
      ) : (
        sortedTorts.map((tort) => {
          const tortImages = grouped[tort].sort(
            (a, b) => a.display_order - b.display_order,
          );
          const isPriority = PRIORITY_TORTS.includes(tort);

          return (
            <section key={tort}>
              <div className="mb-3 flex items-center gap-3">
                <h2 className="text-lg font-semibold text-charcoal">
                  {formatSlug(tort)}
                </h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {tortImages.length} image{tortImages.length !== 1 ? "s" : ""}
                </span>
                {isPriority && (
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: `${accentColor}20`,
                      color: accentColor,
                    }}
                  >
                    Priority
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {tortImages.map((img) => (
                  <div
                    key={img.id}
                    className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="relative aspect-square bg-slate-100">
                      <img
                        src={img.public_url}
                        alt={`${tort} image`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      {!img.is_active && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <span className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white">
                            Inactive
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 px-2 py-1.5">
                      <span className="text-[10px] text-slate-400">
                        #{img.display_order}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleReorder(img, "up")}
                          className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          title="Move up"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleReorder(img, "down")}
                          className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          title="Move down"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setExpandedImage(
                              expandedImage === img.id ? null : img.id,
                            )
                          }
                          className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          title="Edit details"
                        >
                          <Save className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(img)}
                          className="rounded p-0.5 text-red-400 hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {img.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 px-2 pb-2">
                        {img.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {expandedImage === img.id && (
                      <ImageEditForm
                        image={img}
                        onSave={(updates) => {
                          handleUpdate(img.id, updates);
                          setExpandedImage(null);
                        }}
                        onCancel={() => setExpandedImage(null)}
                        accentColor={accentColor}
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

function ImageEditForm({
  image,
  onSave,
  onCancel,
  accentColor,
}: {
  image: TortImage;
  onSave: (updates: Partial<TortImage>) => void;
  onCancel: () => void;
  accentColor: string;
}) {
  const [tags, setTags] = useState(image.tags.join(", "));
  const [notes, setNotes] = useState(image.demographic_notes ?? "");
  const [sourceUrl, setSourceUrl] = useState(image.source_url ?? "");
  const [licenseNote, setLicenseNote] = useState(image.license_note ?? "");
  const [isActive, setIsActive] = useState(image.is_active);

  return (
    <div className="border-t border-slate-200 bg-slate-50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600">Edit Details</span>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div>
        <label className="block text-[10px] font-medium text-slate-500">
          Tags (comma-separated)
        </label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-xs focus:border-slate-400 focus:outline-none"
          placeholder="salon, portrait, mature"
        />
      </div>

      <div>
        <label className="block text-[10px] font-medium text-slate-500">
          Demographic Notes
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-xs focus:border-slate-400 focus:outline-none"
          placeholder="Black woman, 30s, salon setting"
        />
      </div>

      <div>
        <label className="block text-[10px] font-medium text-slate-500">
          Source URL
        </label>
        <input
          type="text"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-xs focus:border-slate-400 focus:outline-none"
          placeholder="https://pexels.com/..."
        />
      </div>

      <div>
        <label className="block text-[10px] font-medium text-slate-500">
          License Note
        </label>
        <input
          type="text"
          value={licenseNote}
          onChange={(e) => setLicenseNote(e.target.value)}
          className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-xs focus:border-slate-400 focus:outline-none"
          placeholder="Pexels free commercial"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id={`active-${image.id}`}
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-slate-300"
        />
        <label
          htmlFor={`active-${image.id}`}
          className="text-[10px] font-medium text-slate-500"
        >
          Active
        </label>
      </div>

      <button
        onClick={() =>
          onSave({
            tags: tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
            demographic_notes: notes || null,
            source_url: sourceUrl || null,
            license_note: licenseNote || null,
            is_active: isActive,
          })
        }
        className="w-full rounded px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
        style={{ backgroundColor: accentColor }}
      >
        Save Changes
      </button>
    </div>
  );
}
