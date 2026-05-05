"use client";

/**
 * FirmLogoUpload — settings UI for persisting a firm's brand logo (PR F).
 *
 * Uploads to the `brand-assets` Supabase bucket (which is public-read,
 * 2MB cap, image-only — see migration 20260419000001). On success, PATCHes
 * the firm row with logo_url + logo_path so the campaign builder picks
 * it up on the next render.
 *
 * Why a dedicated component (instead of reusing BrandAssetsUpload):
 *   - BrandAssetsUpload is multi-file, session-scoped, writes to
 *     tenant-assets. Logos are single-file, firm-scoped, write to
 *     brand-assets. Different model on every axis.
 *   - The watermark feature only needs ONE logo per firm, so the simpler
 *     "upload → preview → replace/delete" pattern is the right shape.
 */

import { useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchWithDemoMode } from "@/lib/admin/demo-mode-client";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // matches bucket policy
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
const ACCEPT_STRING = ACCEPTED_TYPES.join(",");
const SUPABASE_PROJECT_ID = "inmktpwhpkiknctznrys";

interface FirmLogoUploadProps {
  firmId: string;
  /** Current logo URL (from firms.logo_url). */
  logoUrl: string | null;
  /** Current storage path (from firms.logo_path), used to delete the
   *  previous file when a new one is uploaded. */
  logoPath: string | null;
  /** Called after a successful upload or delete so the parent can
   *  refresh the firms list. */
  onChange: () => void;
  /** Read-only mode for viewers. */
  readOnly?: boolean;
}

export function FirmLogoUpload({
  firmId,
  logoUrl,
  logoPath,
  onChange,
  readOnly,
}: FirmLogoUploadProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Accepted formats: PNG, JPG, SVG, or WebP.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("File exceeds 2MB limit. Try optimizing the image first.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const ext = (file.name.split(".").pop() ?? "png").toLowerCase();
      // Per-firm folder, timestamped filename — lets us replace cleanly
      // without collision and keeps audit history if we ever want it.
      const newPath = `firms/${firmId}/logo-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("brand-assets")
        .upload(newPath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });
      if (uploadError) throw new Error(uploadError.message);

      const newUrl = `https://${SUPABASE_PROJECT_ID}.supabase.co/storage/v1/object/public/brand-assets/${newPath}`;

      // Persist on the firm row.
      const res = await fetchWithDemoMode(`/api/firms/${firmId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo_url: newUrl, logo_path: newPath }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Save failed (${res.status})`);
      }

      // Best-effort delete of the previous file (don't fail the whole
      // flow if cleanup fails; orphan logos are harmless).
      if (logoPath && logoPath !== newPath) {
        await supabase.storage.from("brand-assets").remove([logoPath]).catch(() => {});
      }

      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (!logoUrl) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetchWithDemoMode(`/api/firms/${firmId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo_url: null, logo_path: null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Remove failed (${res.status})`);
      }
      // Best-effort delete of the storage object.
      if (logoPath) {
        const supabase = createClient();
        await supabase.storage.from("brand-assets").remove([logoPath]).catch(() => {});
      }
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
          Brand logo
        </span>
        <span className="text-[11px] text-slate-gray">
          PNG / JPG / SVG / WebP, up to 2MB
        </span>
      </div>

      {logoUrl ? (
        <div className="flex items-start gap-4 rounded-md border border-cloud bg-cloud/20 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt="Firm logo preview"
            className="h-16 w-auto max-w-[160px] rounded bg-white object-contain p-1 shadow-sm"
          />
          <div className="flex flex-1 flex-col gap-2 text-xs text-slate-gray">
            <p>
              Used as the default watermark on rendered videos and the logo
              on generated landing pages.
            </p>
            {!readOnly && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy}
                  className="inline-flex items-center gap-1 rounded-md border border-cloud bg-white px-3 py-1.5 text-xs font-semibold text-midnight-navy transition hover:bg-cloud disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Upload className="h-3 w-3" />
                  )}
                  Replace
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={busy}
                  className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy || readOnly}
          className="inline-flex items-center gap-2 rounded-md border border-dashed border-cloud bg-white px-4 py-3 text-sm font-semibold text-slate-gray transition hover:border-intelligence-teal hover:text-intelligence-teal disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {busy ? "Uploading\u2026" : "Upload firm logo"}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_STRING}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
