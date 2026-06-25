"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import type { GeneratedStrategy } from "@/lib/strategy-engine/types";

/**
 * Posts the generated strategy to the stateless export route and triggers a
 * PPTX download. Nothing is persisted server-side — the payload the client
 * already holds is the source of truth.
 */
export function DownloadDeckButton({ strategy }: { strategy: GeneratedStrategy }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/state-intelligence/strategy-engine/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(strategy),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "lmi-strategy.pptx";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleDownload}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg border-2 border-intelligence-teal px-4 py-2 text-[13px] font-semibold text-intelligence-teal transition hover:bg-intelligence-teal hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-intelligence-teal/60 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {busy ? "Building deck…" : "Download deck (.pptx)"}
      </button>
      {error && <span className="text-[11.5px] text-red-600">{error}</span>}
    </div>
  );
}
