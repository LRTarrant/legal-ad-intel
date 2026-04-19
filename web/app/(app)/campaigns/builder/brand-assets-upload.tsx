"use client";

import { useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, Trash2, Loader2, AlertTriangle, FileText } from "lucide-react";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 5;
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
const ACCEPTED_TYPES = [...ACCEPTED_IMAGE_TYPES, "application/pdf"];
const ACCEPT_STRING = ACCEPTED_TYPES.join(",");
const SUPABASE_PROJECT_ID = "inmktpwhpkiknctznrys";

export interface BrandAsset {
  url: string;
  name: string;
  type: "image" | "pdf";
  mimeType: string;
}

interface BrandAssetsUploadProps {
  assets: BrandAsset[];
  onAssetsChange: (assets: BrandAsset[]) => void;
  accentColor: string;
}

export function BrandAssetsUpload({ assets, onAssetsChange, accentColor }: BrandAssetsUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionId = useRef(crypto.randomUUID());

  const uploadFiles = useCallback(
    async (files: File[]) => {
      setError(null);

      const remaining = MAX_FILES - assets.length;
      if (remaining <= 0) {
        setError(`Maximum ${MAX_FILES} assets allowed.`);
        return;
      }

      const toUpload = files.slice(0, remaining);
      if (files.length > remaining) {
        setError(`Only ${remaining} more file${remaining === 1 ? "" : "s"} allowed. Uploading first ${toUpload.length}.`);
      }

      for (const file of toUpload) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          setError("Accepted formats: PNG, JPG, SVG, WebP, or PDF.");
          return;
        }
        if (file.size > MAX_FILE_SIZE) {
          setError(`"${file.name}" exceeds the 5MB limit.`);
          return;
        }
      }

      setUploading(true);
      try {
        const supabase = createClient();
        const uploadResults = await Promise.allSettled(
          toUpload.map(async (file) => {
            const ext = file.name.split(".").pop() ?? "bin";
            const fileName = `${crypto.randomUUID()}.${ext}`;
            const filePath = `assets/${sessionId.current}/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from("brand-assets")
              .upload(filePath, file, {
                cacheControl: "3600",
                upsert: false,
              });

            if (uploadError) throw uploadError;

            const publicUrl = `https://${SUPABASE_PROJECT_ID}.supabase.co/storage/v1/object/public/brand-assets/${filePath}`;
            return {
              url: publicUrl,
              name: file.name,
              type: (ACCEPTED_IMAGE_TYPES.includes(file.type) ? "image" : "pdf") as "image" | "pdf",
              mimeType: file.type,
            };
          }),
        );

        const succeeded = uploadResults
          .filter((r): r is PromiseFulfilledResult<BrandAsset> => r.status === "fulfilled")
          .map((r) => r.value);

        const failed = uploadResults.filter((r) => r.status === "rejected").length;

        if (succeeded.length > 0) {
          onAssetsChange([...assets, ...succeeded]);
        }
        if (failed > 0) {
          setError(`${failed} file${failed === 1 ? "" : "s"} failed to upload.`);
        }
      } catch {
        setError("Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [assets, onAssetsChange],
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) uploadFiles(Array.from(files));
    if (e.target) e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) uploadFiles(Array.from(files));
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function removeAsset(index: number) {
    onAssetsChange(assets.filter((_, i) => i !== index));
    setError(null);
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1.5">
        Brand Assets (optional)
      </label>
      <p className="text-[11px] text-slate-gray -mt-1 mb-2">
        Upload existing creatives, brand guidelines, or reference images to improve AI-generated content
      </p>

      {/* Thumbnail grid */}
      {assets.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-2">
          {assets.map((asset, i) => (
            <div
              key={asset.url}
              className="relative group flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2"
            >
              {asset.type === "image" ? (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-cloud overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.url}
                    alt={asset.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-red-50">
                  <FileText className="h-6 w-6 text-red-400" />
                </div>
              )}
              <p className="min-w-0 flex-1 truncate text-xs text-midnight-navy">{asset.name}</p>
              <button
                type="button"
                onClick={() => removeAsset(i)}
                className="shrink-0 rounded p-1 text-slate-gray/40 opacity-0 group-hover:opacity-100 hover:text-alert hover:bg-alert/10 transition-all"
                title="Remove asset"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone — only show when under the limit */}
      {assets.length < MAX_FILES && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          disabled={uploading}
          className={`flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-5 transition-colors ${
            dragOver
              ? "border-intelligence-teal bg-intelligence-teal/5"
              : "border-slate-200 hover:border-slate-300 bg-white"
          } ${uploading ? "cursor-wait opacity-60" : "cursor-pointer"}`}
        >
          {uploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-slate-gray" />
              <p className="mt-1.5 text-xs text-slate-gray">Uploading...</p>
            </>
          ) : (
            <>
              <Upload className="h-5 w-5" style={{ color: accentColor }} />
              <p className="mt-1.5 text-xs font-medium text-midnight-navy">
                Drop files here or click to browse
              </p>
              <p className="mt-0.5 text-[10px] text-slate-gray">
                PNG, JPG, SVG, WebP, or PDF &middot; Max 5MB each &middot; {MAX_FILES - assets.length} remaining
              </p>
            </>
          )}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_STRING}
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-alert">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
