"use client";

/**
 * VoicePicker — shared voice selector with preview button.
 *
 * Used by:
 *   - PIRadioScriptGenerator's AudioSection
 *   - PIVideoCompositionCard's voice override section
 *
 * Behavior:
 *   - Renders a <select> over the loaded ElevenLabs voice catalog
 *   - Previews ~1-2 seconds of the chosen voice via
 *     /api/campaigns/generate-voiceover with a short canned line
 *   - Only one preview can play at a time (managed locally per instance)
 *   - Toggling preview while playing stops it
 *   - Falls back to a generic preview line if `previewSampleText` is empty
 *
 * Cost note: each preview is one /generate-voiceover call (~1¢ per call
 * for a short sample). The callable site can pass `firmId` so preview
 * costs roll up to the firm just like the production voiceover.
 *
 * The voices array is loaded by the caller (we don't refetch here);
 * callers already do this for their own state and we just read it.
 */

import { useEffect, useRef, useState } from "react";
import { Loader2, Play, Square } from "lucide-react";
import { fetchWithDemoMode } from "@/lib/admin/demo-mode-client";

export interface VoicePickerOption {
  id: string;
  name: string;
  description?: string;
  category?: string;
}

interface VoicePickerProps {
  /** Loaded voice catalog (from /api/campaigns/voices). */
  voices: VoicePickerOption[];
  /** Currently selected voice id. */
  selectedVoiceId: string;
  /** Called when the user picks a different voice. */
  onSelectVoice: (id: string) => void;
  /**
   * Optional sample text used for the preview. We trim to the first
   * sentence so previews stay short and cheap. Falls back to a generic
   * "This is a preview..." line when empty.
   */
  previewSampleText?: string;
  /**
   * Optional firm id — passed to /generate-voiceover so the preview's
   * tiny cost lands on the same firm as the production call.
   */
  firmId?: string | null;
  /** "personal_injury" | "mass_tort" — for cost analytics. */
  practiceArea?: "personal_injury" | "mass_tort";
  /** Tailwind/inline color used to highlight the active control. */
  accentColor?: string;
  /** Disabled state passes through to the select + button. */
  disabled?: boolean;
  /** Optional id used to scope the <label> for/htmlFor. */
  htmlId?: string;
}

const FALLBACK_PREVIEW_LINE =
  "This is a preview of the voice you selected. Listen to the tone before generating the full audio.";

export function VoicePicker({
  voices,
  selectedVoiceId,
  onSelectVoice,
  previewSampleText,
  firmId,
  practiceArea,
  accentColor = "#0EA5A4",
  disabled = false,
  htmlId,
}: VoicePickerProps) {
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup audio on unmount or when selected voice changes mid-play.
  useEffect(() => {
    return () => {
      stopPreview();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If the user changes the voice while a preview is playing, stop it.
  // The next click on Preview will fetch the new voice's sample.
  useEffect(() => {
    stopPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVoiceId]);

  function stopPreview() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setIsPlaying(false);
  }

  async function handlePreviewClick() {
    if (!selectedVoiceId || isPreviewLoading || disabled) return;

    if (isPlaying) {
      stopPreview();
      return;
    }

    setIsPreviewLoading(true);
    setPreviewError(null);

    try {
      // Trim to first sentence so the preview stays short and cheap.
      const sample = (previewSampleText ?? "").trim();
      const firstSentence = sample.split(/[.!?]/)[0]?.trim() || "";
      const text =
        firstSentence.length > 0
          ? firstSentence + "."
          : FALLBACK_PREVIEW_LINE;

      const res = await fetchWithDemoMode("/api/campaigns/generate-voiceover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voiceId: selectedVoiceId,
          firm_id: firmId ?? undefined,
          practice_area: practiceArea,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Preview failed (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        setIsPlaying(false);
        // Revoke the object URL once playback is over so we don't leak.
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) audioRef.current = null;
      };
      audio.onerror = () => {
        setIsPlaying(false);
        setPreviewError("Couldn't play preview audio.");
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) audioRef.current = null;
      };

      audioRef.current = audio;
      await audio.play();
      setIsPlaying(true);
    } catch (e) {
      setPreviewError((e as Error).message);
    } finally {
      setIsPreviewLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          id={htmlId}
          value={selectedVoiceId}
          onChange={(e) => onSelectVoice(e.target.value)}
          disabled={disabled || voices.length === 0}
          className="min-w-[16rem] flex-1 rounded-md border border-cloud bg-white px-3 py-2 text-sm text-midnight-navy focus:border-intelligence-teal focus:outline-none focus:ring-2 focus:ring-intelligence-teal/30 disabled:opacity-50"
        >
          {voices.length === 0 && (
            <option value="">No voices available</option>
          )}
          {voices.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
              {v.description ? ` — ${v.description}` : ""}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handlePreviewClick}
          disabled={disabled || !selectedVoiceId || isPreviewLoading}
          className="inline-flex items-center justify-center gap-1.5 rounded-md border bg-white px-3 py-2 text-xs font-semibold transition hover:bg-cloud/40 disabled:opacity-50"
          style={{ borderColor: accentColor, color: accentColor }}
          aria-label={isPlaying ? "Stop voice preview" : "Play voice preview"}
        >
          {isPreviewLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading…
            </>
          ) : isPlaying ? (
            <>
              <Square className="h-3.5 w-3.5" />
              Stop preview
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" />
              Preview voice
            </>
          )}
        </button>
      </div>

      {previewError && (
        <p className="text-[11px] text-alert">{previewError}</p>
      )}
    </div>
  );
}
