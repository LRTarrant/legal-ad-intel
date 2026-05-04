"use client";

/**
 * PIVideoCompositionCard \u2014 Phase 2.1 of PI feature parity.
 *
 * Orchestrates the full PI video pipeline:
 *   1. Generate the 3-scene storyboard via /api/campaigns/generate-pi-video-script
 *   2. Generate one image per scene via /api/campaigns/generate-pi-scene-image
 *      (library hit if curated PI images exist; AI fallback otherwise)
 *   3. Synthesize concatenated voiceover via /api/campaigns/generate-voiceover
 *      (uses the voice the parent picked in the radio audio section)
 *   4. Render the final mp4 via /api/campaigns/render-video (already PA-agnostic)
 *
 * Design notes:
 *   - Reuses the voice the user already picked in PIRadioScriptGenerator's
 *     AudioSection \u2014 we don't ask them again here.
 *   - Does NOT regenerate scenes if the user clicks Generate twice with
 *     the same config; the script is cached until config changes.
 *   - Aspect ratio defaults to 16:9 (YouTube ad). Vertical 9:16 for
 *     YouTube Short / TikTok / Meta Reel. Square 1:1 for Meta feed.
 *   - Renders progress messages in the button so users know what's
 *     happening during the ~30-60s end-to-end pipeline.
 */

import { useEffect, useState } from "react";
import { Loader2, Play, Video } from "lucide-react";
import { fetchWithDemoMode } from "@/lib/admin/demo-mode-client";
import {
  isEntitlementError,
  reasonFromEntitlementError,
  type UpgradeReason,
  type UpgradeMeta,
} from "@/lib/billing/upgrade-copy";
import type {
  PICategory,
  SeverityModifier,
} from "@/lib/campaign-builder/pi-templates/types";

/* ── Types (mirror the PI video script route's response) ─────────────── */

type VideoPlatform =
  | "youtube_ad"
  | "youtube_short"
  | "tiktok"
  | "meta_reel"
  | "meta_feed";

interface VideoScene {
  sceneNumber: number;
  headline: string;
  subheadline: string;
  imagePrompt: string;
  voiceover: string;
  durationSeconds: number;
}

interface PIVideoScriptResult {
  scenes: VideoScene[];
  ctaHeadline: string;
  ctaPhone: string;
  ctaSubline: string;
  disclaimer: string;
  cost_cents: number;
}

interface PIVideoCompositionCardProps {
  firmId: string | null;
  firmName: string;
  config: {
    pi_category: PICategory;
    market_display_name: string;
    state: string;
    severity_modifiers: SeverityModifier[];
  };
  /** Voice id picked in the PIRadioScriptGenerator's AudioSection. Used
   * for the video's narration so it matches what the user already heard. */
  selectedVoiceId: string | null;
  accentColor: string;
  onEntitlementError?: (params: {
    reason: UpgradeReason;
    meta: UpgradeMeta;
  }) => void;
}

/* ── Platform → resolution map ────────────────────────────────────────── */

const PLATFORM_RESOLUTIONS: Record<
  VideoPlatform,
  { w: number; h: number; label: string }
> = {
  youtube_ad: { w: 1920, h: 1080, label: "YouTube Ad (16:9, 1080p)" },
  youtube_short: { w: 1080, h: 1920, label: "YouTube Short (9:16, 1080p)" },
  tiktok: { w: 1080, h: 1920, label: "TikTok (9:16, 1080p)" },
  meta_reel: { w: 1080, h: 1920, label: "Meta Reel (9:16, 1080p)" },
  meta_feed: { w: 1080, h: 1080, label: "Meta Feed (1:1, 1080p)" },
};

/* ── Helpers ──────────────────────────────────────────────────────────── */

/** Convert a Blob (mp3) into a base64 string (no data URL prefix). */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(",")[1] ?? "");
    };
    reader.readAsDataURL(blob);
  });
}

/* ── Component ────────────────────────────────────────────────────────── */

export function PIVideoCompositionCard({
  firmId,
  firmName,
  config,
  selectedVoiceId,
  accentColor,
  onEntitlementError,
}: PIVideoCompositionCardProps) {
  const [duration, setDuration] = useState<"15s" | "30s" | "60s">("30s");
  const [platform, setPlatform] = useState<VideoPlatform>("youtube_ad");
  const [language, setLanguage] = useState<"en" | "es">("en");
  const [withVoiceover, setWithVoiceover] = useState(true);

  // Pipeline state
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [script, setScript] = useState<PIVideoScriptResult | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  // Reset cached output when the config changes \u2014 stale script + stale
  // images would otherwise quietly mismatch the user's new selection.
  useEffect(() => {
    setScript(null);
    setVideoUrl(null);
    setError(null);
  }, [
    config.pi_category,
    config.market_display_name,
    config.state,
    duration,
    platform,
    language,
  ]);

  async function handleRun() {
    setRunning(true);
    setError(null);
    setVideoUrl(null);

    try {
      // ── Step 1: storyboard ─────────────────────────────────────────
      setProgress("Generating video script\u2026");
      let storyboard = script;
      if (!storyboard) {
        const res = await fetchWithDemoMode("/api/campaigns/generate-pi-video-script", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pi_category: config.pi_category,
            market_display_name: config.market_display_name,
            state: config.state,
            firm_id: firmId ?? undefined,
            firm_name: firmName,
            severity_modifiers: config.severity_modifiers,
            duration,
            platform,
            language,
          }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as unknown;
          if (body && isEntitlementError(body) && onEntitlementError) {
            const mapped = reasonFromEntitlementError(body, "personal_injury");
            onEntitlementError(mapped);
            throw new Error((body as { error?: string }).error ?? "Upgrade required");
          }
          throw new Error(
            (body as { error?: string }).error ??
              `Script generation failed (${res.status})`,
          );
        }
        storyboard = (await res.json()) as PIVideoScriptResult;
        setScript(storyboard);
      }

      // ── Step 2: per-scene images (parallel) ─────────────────────────
      setProgress("Rendering scene images\u2026");
      const imageSize =
        platform === "meta_feed"
          ? "1024x1024"
          : platform === "youtube_ad"
            ? "1792x1024"
            : "1024x1792";
      const sceneImageUrls = await Promise.all(
        storyboard.scenes.map(async (scene) => {
          const res = await fetchWithDemoMode("/api/campaigns/generate-pi-scene-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pi_category: config.pi_category,
              imagePrompt: scene.imagePrompt,
              size: imageSize,
              firm_id: firmId ?? undefined,
              state: config.state,
              scene_number: scene.sceneNumber,
            }),
          });
          if (!res.ok) {
            const body = (await res.json().catch(() => ({}))) as { error?: string };
            throw new Error(
              body.error ?? `Scene ${scene.sceneNumber} image failed`,
            );
          }
          const data = (await res.json()) as { imageUrl: string };
          return data.imageUrl;
        }),
      );

      // ── Step 3: voiceover (optional) ───────────────────────────────
      let voiceoverBase64: string | undefined;
      if (withVoiceover) {
        if (!selectedVoiceId) {
          throw new Error(
            "Pick a voice in the Audio section above before generating video with voiceover.",
          );
        }
        setProgress("Synthesizing voiceover\u2026");
        const fullVoiceover = storyboard.scenes
          .map((s) => s.voiceover)
          .join(" ");
        const voRes = await fetchWithDemoMode("/api/campaigns/generate-voiceover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: fullVoiceover,
            voiceId: selectedVoiceId,
            firm_id: firmId ?? undefined,
            practice_area: "personal_injury",
            pi_category: config.pi_category,
          }),
        });
        if (!voRes.ok) {
          const body = (await voRes.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? "Voiceover generation failed");
        }
        const audioBlob = await voRes.blob();
        voiceoverBase64 = await blobToBase64(audioBlob);
      }

      // ── Step 4: render ─────────────────────────────────────────────
      setProgress("Composing video (this can take 30-60 seconds)\u2026");
      const resolution = PLATFORM_RESOLUTIONS[platform];
      const renderRes = await fetchWithDemoMode("/api/campaigns/render-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenes: storyboard.scenes.map((s, i) => ({
            headline: s.headline,
            subheadline: s.subheadline,
            imageUrl: sceneImageUrls[i],
            durationSeconds: s.durationSeconds,
          })),
          cta: {
            headline: storyboard.ctaHeadline,
            phone: storyboard.ctaPhone,
            subline: storyboard.ctaSubline,
            disclaimer: storyboard.disclaimer,
          },
          platform,
          resolution: { w: resolution.w, h: resolution.h },
          voiceoverBase64,
          backgroundMusic: null,
        }),
      });
      if (!renderRes.ok) {
        const body = (await renderRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? `Render failed (${renderRes.status})`);
      }
      const renderData = (await renderRes.json()) as { videoUrl?: string };
      if (!renderData.videoUrl) throw new Error("Render returned no videoUrl");
      setVideoUrl(renderData.videoUrl);
      setProgress(null);
    } catch (e) {
      setError((e as Error).message);
      setProgress(null);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm space-y-5">
      <div className="flex items-center gap-2">
        <Video className="h-5 w-5" style={{ color: accentColor }} />
        <h3 className="font-heading text-lg font-semibold text-midnight-navy">
          Video ad
        </h3>
      </div>

      <p className="text-sm text-slate-gray">
        Compose a 3-scene video using your firm&apos;s brand-aware PI script,
        a curated or AI-generated image per scene, and \u2014 if a voice is
        selected above \u2014 a synthesized voiceover. Compliance disclaimer
        is preserved verbatim from the template.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Length">
          <select
            value={duration}
            onChange={(e) =>
              setDuration(e.target.value as "15s" | "30s" | "60s")
            }
            className={selectCls}
          >
            <option value="15s">15 seconds</option>
            <option value="30s">30 seconds</option>
            <option value="60s">60 seconds</option>
          </select>
        </Field>
        <Field label="Platform">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as VideoPlatform)}
            className={selectCls}
          >
            {Object.entries(PLATFORM_RESOLUTIONS).map(([key, info]) => (
              <option key={key} value={key}>
                {info.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Language">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as "en" | "es")}
            className={selectCls}
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
          </select>
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-gray">
        <input
          type="checkbox"
          checked={withVoiceover}
          onChange={(e) => setWithVoiceover(e.target.checked)}
          className="rounded border-cloud"
        />
        Include synthesized voiceover (uses the voice selected in the Audio
        section above)
      </label>

      <div>
        <button
          type="button"
          onClick={handleRun}
          disabled={running}
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: accentColor }}
        >
          {running ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {progress ?? "Working\u2026"}
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Generate video
            </>
          )}
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {videoUrl && (
        <div className="space-y-2 border-t border-cloud pt-5">
          <div
            className="text-xs font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: accentColor }}
          >
            Video
          </div>
          <video
            controls
            src={videoUrl}
            className="w-full rounded-md bg-black"
            preload="metadata"
          />
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-gray">
            <a
              href={videoUrl}
              download="pi-video-ad.mp4"
              className="font-semibold text-intelligence-teal hover:underline"
            >
              Download mp4
            </a>
            <span>{duration} \u00b7 {PLATFORM_RESOLUTIONS[platform].label}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Local primitives (mirror PIRadioScriptGenerator's) ──────────────── */

const selectCls =
  "w-full rounded-md border border-cloud bg-white px-3 py-2 text-sm text-midnight-navy focus:border-intelligence-teal focus:outline-none focus:ring-2 focus:ring-intelligence-teal/30";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-gray">
        {label}
      </span>
      {children}
    </label>
  );
}
