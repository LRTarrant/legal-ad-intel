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

import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Loader2, Play, Video } from "lucide-react";
import { fetchWithDemoMode } from "@/lib/admin/demo-mode-client";
import { VoicePicker, type VoicePickerOption } from "./voice-picker";
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
  /**
   * Optional callback that fires when a render completes (and on null
   * on regenerate-clear) so the parent campaign builder can include the
   * video URL in the bulk-upload export.
   */
  onVideoUrlChange?: (videoUrl: string | null) => void;
  /**
   * Optional firm-level logo URL (from firms.logo_url). When provided,
   * the user can toggle a brand watermark onto the rendered MP4.
   */
  firmLogoUrl?: string | null;
}

type WatermarkPosition =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left";

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
  onVideoUrlChange,
  firmLogoUrl,
}: PIVideoCompositionCardProps) {
  const [duration, setDuration] = useState<"15s" | "30s" | "60s">("30s");
  const [platform, setPlatform] = useState<VideoPlatform>("youtube_ad");
  const [language, setLanguage] = useState<"en" | "es">("en");
  const [withVoiceover, setWithVoiceover] = useState(true);

  // Watermark controls (PR F). Default ON when the firm has a logo;
  // user can toggle off and tweak position/size/opacity per render.
  const [wmEnabled, setWmEnabled] = useState<boolean>(!!firmLogoUrl);
  const [wmPosition, setWmPosition] = useState<WatermarkPosition>("bottom-right");
  const [wmSizePct, setWmSizePct] = useState<number>(12);
  const [wmOpacity, setWmOpacity] = useState<number>(0.7);

  // If the firm logo arrives async after mount, default the toggle ON.
  useEffect(() => {
    if (firmLogoUrl) setWmEnabled(true);
  }, [firmLogoUrl]);

  // Voice override state. Defaults to the radio's selectedVoiceId so the
  // video matches the audio the user already heard. They can change it
  // here without affecting the radio. Voices fetched once on mount.
  const [videoVoiceId, setVideoVoiceId] = useState<string>(
    selectedVoiceId ?? "",
  );
  const [voices, setVoices] = useState<VoicePickerOption[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [voicesError, setVoicesError] = useState<string | null>(null);
  const voicesFetchedRef = useRef(false);

  // Pipeline state
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [script, setScript] = useState<PIVideoScriptResult | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  // Fetch voices once when the card mounts. The radio card already does
  // this on its own state, but the user might land on the video card
  // first (e.g. they regenerated scenes and skipped audio).
  useEffect(() => {
    if (voicesFetchedRef.current) return;
    voicesFetchedRef.current = true;
    setVoicesLoading(true);
    fetchWithDemoMode("/api/campaigns/voices")
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? `Failed to load voices (${res.status})`);
        }
        const data = (await res.json()) as { voices: VoicePickerOption[] };
        setVoices(data.voices ?? []);
        // If we don't yet have a videoVoiceId (parent hadn't picked one),
        // pick the first voice so the picker isn't blank.
        if (!videoVoiceId && data.voices?.length > 0) {
          setVideoVoiceId(data.voices[0].id);
        }
      })
      .catch((e: Error) => setVoicesError(e.message))
      .finally(() => setVoicesLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If the parent's selectedVoiceId becomes available AFTER this card
  // mounted (user picks a voice in the radio card later), and the user
  // hasn't diverged here yet, follow the parent's pick.
  useEffect(() => {
    if (selectedVoiceId && !videoVoiceId) {
      setVideoVoiceId(selectedVoiceId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVoiceId]);

  // Reset cached output when the config changes \u2014 stale script + stale
  // images would otherwise quietly mismatch the user's new selection.
  useEffect(() => {
    setScript(null);
    setVideoUrl(null);
    onVideoUrlChange?.(null);
    setError(null);
    // Note: onVideoUrlChange is intentionally omitted from deps below;
    // we only want this effect to fire on config changes, not when
    // the parent recreates the callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    onVideoUrlChange?.(null);

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
        const voiceForVideo = videoVoiceId || selectedVoiceId;
        if (!voiceForVideo) {
          throw new Error(
            "Pick a voice for the video before generating with voiceover.",
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
            voiceId: voiceForVideo,
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
          watermark:
            wmEnabled && firmLogoUrl
              ? {
                  logoUrl: firmLogoUrl,
                  position: wmPosition,
                  sizePct: wmSizePct,
                  opacity: wmOpacity,
                }
              : null,
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
      onVideoUrlChange?.(renderData.videoUrl);
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

      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm text-slate-gray">
          <input
            type="checkbox"
            checked={withVoiceover}
            onChange={(e) => setWithVoiceover(e.target.checked)}
            className="rounded border-cloud"
          />
          Include synthesized voiceover
        </label>

        {/* Brand watermark (PR F) */}
        {firmLogoUrl ? (
          <div className="rounded-md border border-cloud bg-cloud/20 p-4 space-y-3">
            <label className="flex items-center gap-2 text-sm text-slate-gray">
              <input
                type="checkbox"
                checked={wmEnabled}
                onChange={(e) => setWmEnabled(e.target.checked)}
                className="rounded border-cloud"
              />
              <ImageIcon className="h-4 w-4" style={{ color: accentColor }} />
              Bake firm logo onto the rendered video
            </label>
            {wmEnabled && (
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Position">
                  <select
                    value={wmPosition}
                    onChange={(e) =>
                      setWmPosition(e.target.value as WatermarkPosition)
                    }
                    className={selectCls}
                  >
                    <option value="bottom-right">Bottom right</option>
                    <option value="bottom-left">Bottom left</option>
                    <option value="top-right">Top right</option>
                    <option value="top-left">Top left</option>
                  </select>
                </Field>
                <Field label={`Size: ${wmSizePct}% of width`}>
                  <input
                    type="range"
                    min={5}
                    max={30}
                    step={1}
                    value={wmSizePct}
                    onChange={(e) => setWmSizePct(Number(e.target.value))}
                    className="w-full"
                  />
                </Field>
                <Field label={`Opacity: ${Math.round(wmOpacity * 100)}%`}>
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={wmOpacity}
                    onChange={(e) => setWmOpacity(Number(e.target.value))}
                    className="w-full"
                  />
                </Field>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-gray italic">
            Tip: upload a firm logo in Settings → Firms to bake a brand
            watermark onto rendered videos.
          </p>
        )}

        {withVoiceover && (
          <div className="rounded-md border border-cloud bg-cloud/20 p-4 space-y-2">
            <div
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: accentColor }}
            >
              Video voice
            </div>
            <p className="text-[11px] text-slate-gray">
              Defaults to the voice picked in the Audio section. Change here to
              use a different voice on the video.
            </p>
            {voicesLoading && (
              <p className="text-sm text-slate-gray">Loading voice catalog\u2026</p>
            )}
            {voicesError && (
              <p className="text-sm text-red-600">
                Couldn&apos;t load voices: {voicesError}
              </p>
            )}
            {!voicesLoading && voices.length > 0 && (
              <VoicePicker
                voices={voices}
                selectedVoiceId={videoVoiceId}
                onSelectVoice={setVideoVoiceId}
                previewSampleText={
                  script?.scenes?.[0]?.voiceover ?? script?.ctaHeadline ?? ""
                }
                firmId={firmId}
                practiceArea="personal_injury"
                accentColor={accentColor}
              />
            )}
          </div>
        )}
      </div>

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
