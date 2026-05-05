"use client";

/**
 * PIExportCard — bottom-of-builder card with bulk-upload CSV exports
 * for Meta Ads Manager and Google Ads Editor.
 *
 * The card shows three buttons:
 *   1. Download Meta Ads CSV
 *   2. Download Google Ads CSV
 *   3. Download all (zip with both + a README)
 *
 * Inputs are lifted up from the Meta / Google RSA / Video cards via
 * onResult / onVideoUrlChange callbacks the campaign builder wires
 * down. If a result is missing, the corresponding button is disabled
 * with a hint about which card to generate first.
 *
 * No backend involvement — all CSV generation is pure client-side via
 * lib/pi-campaign-export.ts. Same architecture as the tort export.
 */

import { useState } from "react";
import { Download, FileText, Loader2, Package } from "lucide-react";
import {
  downloadPIBulkUploadZip,
  generateGoogleCsv,
  generateMetaCsv,
  type PIExportInputs,
} from "@/lib/pi-campaign-export";

interface PIExportCardProps {
  inputs: PIExportInputs;
  accentColor: string;
}

export function PIExportCard({ inputs, accentColor }: PIExportCardProps) {
  const [busy, setBusy] = useState<"meta" | "google" | "zip" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasMeta = !!inputs.metaAd;
  const hasGoogle = !!inputs.googleRsa;
  const hasAny = hasMeta || hasGoogle;

  function downloadString(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleMeta() {
    if (!hasMeta) return;
    setBusy("meta");
    setError(null);
    try {
      const csv = generateMetaCsv(inputs);
      const date = new Date().toISOString().slice(0, 10);
      downloadString(
        csv,
        `pi_meta_${inputs.state}_${inputs.pi_category}_${date}.csv`,
        "text/csv;charset=utf-8",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function handleGoogle() {
    if (!hasGoogle) return;
    setBusy("google");
    setError(null);
    try {
      const csv = generateGoogleCsv(inputs);
      const date = new Date().toISOString().slice(0, 10);
      downloadString(
        csv,
        `pi_google_${inputs.state}_${inputs.pi_category}_${date}.csv`,
        "text/csv;charset=utf-8",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function handleZip() {
    if (!hasAny) return;
    setBusy("zip");
    setError(null);
    try {
      await downloadPIBulkUploadZip(inputs);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div
          className="rounded-md p-2"
          style={{ backgroundColor: `${accentColor}15` }}
        >
          <Download className="h-5 w-5" style={{ color: accentColor }} />
        </div>
        <div className="flex-1">
          <h3 className="font-heading text-lg font-semibold text-midnight-navy">
            Bulk-upload CSVs
          </h3>
          <p className="mt-0.5 text-xs text-slate-gray">
            Drop these directly into Meta Ads Manager and Google Ads Editor.
            Statuses default to PAUSED — you flip to ENABLED in-platform after
            review.
          </p>
        </div>
      </div>

      {!hasAny && (
        <p className="rounded-md bg-cloud/40 px-3 py-2 text-xs italic text-slate-gray">
          Generate a Meta ad and/or Google search ad above to enable downloads.
        </p>
      )}

      {hasAny && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Button
            label="Meta Ads CSV"
            disabled={!hasMeta || busy !== null}
            busy={busy === "meta"}
            onClick={handleMeta}
            accent={accentColor}
            secondary
            icon={<FileText className="h-4 w-4" />}
            disabledHint={!hasMeta ? "Generate Meta ad first" : undefined}
          />
          <Button
            label="Google Ads CSV"
            disabled={!hasGoogle || busy !== null}
            busy={busy === "google"}
            onClick={handleGoogle}
            accent={accentColor}
            secondary
            icon={<FileText className="h-4 w-4" />}
            disabledHint={
              !hasGoogle ? "Generate Google search ad first" : undefined
            }
          />
          <Button
            label="Download all (ZIP)"
            disabled={busy !== null}
            busy={busy === "zip"}
            onClick={handleZip}
            accent={accentColor}
            icon={<Package className="h-4 w-4" />}
          />
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-md border border-alert/20 bg-alert/5 p-2 text-xs text-alert">
          {error}
        </p>
      )}

      {hasAny && (
        <p className="mt-3 text-[11px] italic text-slate-gray">
          Geo targeting in the Google CSV uses your top metro areas + counties
          from the FARS-grounded geo report. Edit / narrow in-platform after
          import.
        </p>
      )}
    </div>
  );
}

/* ── Subcomponent ──────────────────────────────────────────────────────── */

function Button({
  label,
  disabled,
  busy,
  onClick,
  accent,
  secondary,
  icon,
  disabledHint,
}: {
  label: string;
  disabled?: boolean;
  busy?: boolean;
  onClick: () => void | Promise<void>;
  accent: string;
  secondary?: boolean;
  icon?: React.ReactNode;
  disabledHint?: string;
}) {
  const baseCls =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50";
  const colorCls = secondary
    ? "border bg-white"
    : "text-white";
  const inlineStyle = secondary
    ? { borderColor: accent, color: accent }
    : { backgroundColor: accent };
  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`${baseCls} ${colorCls} w-full`}
        style={inlineStyle}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          icon
        )}
        {busy ? "Building…" : label}
      </button>
      {disabledHint && disabled && (
        <p className="mt-1 text-[11px] italic text-slate-gray">
          {disabledHint}
        </p>
      )}
    </div>
  );
}
