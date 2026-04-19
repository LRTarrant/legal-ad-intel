"use client";

import { useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ImagePlus, Trash2, Loader2, AlertTriangle } from "lucide-react";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
const SUPABASE_PROJECT_ID = "inmktpwhpkiknctznrys";

interface LogoUploadProps {
  logoUrl: string | null;
  onLogoChange: (url: string | null) => void;
  accentColor: string;
}

export function LogoUpload({ logoUrl, onLogoChange, accentColor }: LogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError("Please upload a PNG, JPG, SVG, or WebP image.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError("File must be under 2MB.");
        return;
      }

      setUploading(true);
      try {
        const supabase = createClient();
        const ext = file.name.split(".").pop() ?? "png";
        const fileName = `${crypto.randomUUID()}.${ext}`;
        const filePath = `logos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("brand-assets")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          setError("Upload failed. Please try again.");
          console.error("Storage upload error:", uploadError.message);
          return;
        }

        const publicUrl = `https://${SUPABASE_PROJECT_ID}.supabase.co/storage/v1/object/public/brand-assets/${filePath}`;
        onLogoChange(publicUrl);
      } catch {
        setError("Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [onLogoChange],
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    if (e.target) e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function removeLogo() {
    onLogoChange(null);
    setError(null);
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1.5">
        Brand Logo (optional)
      </label>

      {logoUrl ? (
        <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-cloud overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt="Brand logo preview"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-midnight-navy truncate">
              Logo uploaded
            </p>
            <p className="text-xs text-slate-gray">
              This will appear on your landing page and ad mockups
            </p>
          </div>
          <button
            type="button"
            onClick={removeLogo}
            className="shrink-0 rounded p-1.5 text-slate-gray/50 hover:text-alert hover:bg-alert/10 transition-colors"
            title="Remove logo"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          disabled={uploading}
          className={`flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 transition-colors ${
            dragOver
              ? "border-intelligence-teal bg-intelligence-teal/5"
              : "border-slate-200 hover:border-slate-300 bg-white"
          } ${uploading ? "cursor-wait opacity-60" : "cursor-pointer"}`}
        >
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-slate-gray" />
              <p className="mt-2 text-xs text-slate-gray">Uploading...</p>
            </>
          ) : (
            <>
              <ImagePlus className="h-6 w-6" style={{ color: accentColor }} />
              <p className="mt-2 text-sm font-medium text-midnight-navy">
                Drop your logo here or click to browse
              </p>
              <p className="mt-0.5 text-xs text-slate-gray">
                PNG, JPG, SVG, or WebP &middot; Max 2MB
              </p>
            </>
          )}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
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
