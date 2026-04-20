"use client";

import { useState, useRef } from "react";
import {
  Film,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Loader2,
  Download,
  RefreshCw,
  Plus,
  Trash2,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────────────────── */

interface VideoScene {
  sceneNumber: number;
  headline: string;
  subheadline: string;
  imagePrompt: string;
  durationSeconds: number;
  imageUrl?: string | null;
}

interface CtaSettings {
  headline: string;
  phone: string;
  subline: string;
  disclaimer: string;
}

type Platform = "youtube_ad" | "youtube_short" | "tiktok" | "meta_reel" | "meta_feed";
type Duration = "15s" | "30s" | "60s";

const VIDEO_PLATFORMS = [
  { value: "youtube_ad" as const, label: "YouTube Ad", aspect: "16:9" },
  { value: "youtube_short" as const, label: "YouTube Short", aspect: "9:16" },
  { value: "tiktok" as const, label: "TikTok", aspect: "9:16" },
  { value: "meta_reel" as const, label: "Meta Reel", aspect: "9:16" },
  { value: "meta_feed" as const, label: "Meta Feed", aspect: "1:1" },
];

const PLATFORM_RESOLUTIONS: Record<Platform, { w: number; h: number }> = {
  youtube_ad: { w: 1920, h: 1080 },
  youtube_short: { w: 1080, h: 1920 },
  tiktok: { w: 1080, h: 1920 },
  meta_reel: { w: 1080, h: 1920 },
  meta_feed: { w: 1080, h: 1080 },
};

const MAX_SCENES: Record<Duration, number> = { "15s": 2, "30s": 4, "60s": 6 };

/* ── Component ──────────────────────────────────────────────────────────── */

export function VideoCompositionCard({
  expanded,
  onToggleExpand,
  tortName,
  firmName,
  states,
}: {
  expanded: boolean;
  onToggleExpand: () => void;
  tortName: string;
  firmName: string;
  states: string[];
}) {
  const [platform, setPlatform] = useState<Platform>("youtube_ad");
  const [duration, setDuration] = useState<Duration>("30s");
  const [scenes, setScenes] = useState<VideoScene[]>([]);
  const [cta, setCta] = useState<CtaSettings>({
    headline: "CALL NOW",
    phone: "1-800-555-0100",
    subline: "24/7 \u2022 Free Consultation \u2022 No Fee Unless You Win",
    disclaimer: "Attorney advertising. Prior results do not guarantee a similar outcome.",
  });
  const [activeTab, setActiveTab] = useState(0);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const ffmpegRef = useRef<any>(null);

  /* ── Script generation ─────────────────────────────────────────────── */

  async function generateScript() {
    if (!tortName) return;
    setScriptLoading(true);
    setScriptError(null);
    setVideoUrl(null);

    try {
      const res = await fetch("/api/campaigns/generate-video-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration,
          platform,
          tort_name: tortName,
          firm_name: firmName || undefined,
          states: states.length > 0 ? states : undefined,
        }),
      });
      if (!res.ok) throw new Error("Script generation failed");
      const data = await res.json();

      if (data.scenes) {
        setScenes(data.scenes.map((s: any) => ({ ...s, imageUrl: null })));
        setCta({
          headline: data.ctaHeadline ?? "CALL NOW",
          phone: data.ctaPhone ?? "1-800-555-0100",
          subline: data.ctaSubline ?? "24/7 \u2022 Free Consultation \u2022 No Fee Unless You Win",
          disclaimer: data.disclaimer ?? "Attorney advertising. Prior results do not guarantee a similar outcome.",
        });
        setActiveTab(0);
      }
    } catch {
      setScriptError("Failed to generate script. Try again or enter scenes manually.");
    } finally {
      setScriptLoading(false);
    }
  }

  /* ── Scene editing helpers ─────────────────────────────────────────── */

  function updateScene(index: number, updates: Partial<VideoScene>) {
    setScenes((prev) => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  }

  function addScene() {
    if (scenes.length >= MAX_SCENES[duration]) return;
    const newScene: VideoScene = {
      sceneNumber: scenes.length + 1,
      headline: "",
      subheadline: "",
      imagePrompt: "",
      durationSeconds: 6,
      imageUrl: null,
    };
    setScenes((prev) => [...prev, newScene]);
  }

  function removeScene(index: number) {
    if (scenes.length <= 2) return;
    setScenes((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, sceneNumber: i + 1 })));
    if (activeTab >= scenes.length - 1) {
      setActiveTab(Math.max(0, scenes.length - 2));
    }
  }

  /* ── Image generation for scenes ──────────────────────────────────── */

  async function generateSceneImages(): Promise<(string | null)[]> {
    const results = await Promise.allSettled(
      scenes.map(async (scene) => {
        if (scene.imageUrl) return scene.imageUrl;
        if (!scene.imagePrompt) return null;

        try {
          const res = await fetch("/api/campaigns/generate-creative", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tortName,
              firmName: firmName || undefined,
              style: scene.imagePrompt,
            }),
          });
          if (!res.ok) return null;
          const data = await res.json();
          return data.imageUrl ?? null;
        } catch {
          return null;
        }
      }),
    );

    return results.map((r) => (r.status === "fulfilled" ? r.value : null));
  }

  /* ── FFmpeg.wasm rendering ─────────────────────────────────────────── */

  async function loadFFmpeg() {
    if (ffmpegRef.current) return ffmpegRef.current;

    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const { toBlobURL } = await import("@ffmpeg/util");

    const ffmpeg = new FFmpeg();

    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });

    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  }

  async function renderVideo() {
    if (scenes.length === 0) return;
    setRendering(true);
    setRenderError(null);
    setVideoUrl(null);

    try {
      const res = PLATFORM_RESOLUTIONS[platform];

      // Step 1: Generate images for scenes that need them
      setRenderProgress("Generating scene images...");
      const imageUrls = await generateSceneImages();

      // Update scenes with generated URLs
      setScenes((prev) =>
        prev.map((s, i) => ({
          ...s,
          imageUrl: imageUrls[i] ?? s.imageUrl,
        })),
      );

      // Step 2: Load FFmpeg
      setRenderProgress("Loading video engine...");
      const ffmpeg = await loadFFmpeg();

      // Step 3: Download images and write to virtual filesystem
      setRenderProgress("Preparing scene assets...");
      const sceneFiles: string[] = [];

      for (let i = 0; i < scenes.length; i++) {
        const imgUrl = imageUrls[i];
        if (imgUrl) {
          try {
            const imgRes = await fetch(imgUrl);
            const imgBlob = await imgRes.blob();
            const imgBuf = new Uint8Array(await imgBlob.arrayBuffer());
            const fname = `scene_${i}.jpg`;
            await ffmpeg.writeFile(fname, imgBuf);
            sceneFiles.push(fname);
          } catch {
            // Create a solid color fallback
            sceneFiles.push(null as any);
          }
        } else {
          sceneFiles.push(null as any);
        }
      }

      // Step 4: Build each scene clip and concat
      setRenderProgress("Rendering video scenes...");
      const clipFiles: string[] = [];

      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const dur = scene.durationSeconds;
        const clipName = `clip_${i}.mp4`;

        // Escape text for ffmpeg drawtext
        const headline = scene.headline.replace(/'/g, "\u2019").replace(/:/g, "\\:");
        const subheadline = scene.subheadline.replace(/'/g, "\u2019").replace(/:/g, "\\:");

        if (sceneFiles[i]) {
          // Scene with image background
          await ffmpeg.exec([
            "-loop", "1",
            "-i", sceneFiles[i],
            "-t", String(dur),
            "-vf", [
              `scale=${res.w}:${res.h}:force_original_aspect_ratio=increase`,
              `crop=${res.w}:${res.h}`,
              `drawbox=x=0:y=0:w=${res.w}:h=${res.h}:color=black@0.50:t=fill`,
              `drawtext=text='${headline}':fontsize=${Math.round(res.w / 16)}:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2-${Math.round(res.h / 20)}:shadowcolor=black@0.8:shadowx=2:shadowy=2`,
              `drawtext=text='${subheadline}':fontsize=${Math.round(res.w / 28)}:fontcolor=#FFD700:x=(w-text_w)/2:y=(h+text_h)/2+${Math.round(res.h / 30)}:shadowcolor=black@0.8:shadowx=1:shadowy=1`,
            ].join(","),
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-preset", "ultrafast",
            "-y", clipName,
          ]);
        } else {
          // Solid dark background fallback
          await ffmpeg.exec([
            "-f", "lavfi",
            "-i", `color=c=#0f172a:s=${res.w}x${res.h}:d=${dur}`,
            "-vf", [
              `drawtext=text='${headline}':fontsize=${Math.round(res.w / 16)}:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2-${Math.round(res.h / 20)}:shadowcolor=black@0.8:shadowx=2:shadowy=2`,
              `drawtext=text='${subheadline}':fontsize=${Math.round(res.w / 28)}:fontcolor=#FFD700:x=(w-text_w)/2:y=(h+text_h)/2+${Math.round(res.h / 30)}:shadowcolor=black@0.8:shadowx=1:shadowy=1`,
            ].join(","),
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-preset", "ultrafast",
            "-y", clipName,
          ]);
        }
        clipFiles.push(clipName);
      }

      // Step 5: CTA scene
      setRenderProgress("Adding CTA scene...");
      const ctaDur = 5;
      const ctaHeadline = cta.headline.replace(/'/g, "\u2019").replace(/:/g, "\\:");
      const ctaPhone = cta.phone.replace(/'/g, "\u2019").replace(/:/g, "\\:");
      const ctaSubline = cta.subline.replace(/'/g, "\u2019").replace(/:/g, "\\:");
      const ctaDisclaimer = cta.disclaimer.replace(/'/g, "\u2019").replace(/:/g, "\\:");

      await ffmpeg.exec([
        "-f", "lavfi",
        "-i", `color=c=#0a0a0a:s=${res.w}x${res.h}:d=${ctaDur}`,
        "-vf", [
          `drawtext=text='${ctaHeadline}':fontsize=${Math.round(res.w / 12)}:fontcolor=white:x=(w-text_w)/2:y=${Math.round(res.h * 0.25)}:shadowcolor=black@0.8:shadowx=2:shadowy=2`,
          `drawtext=text='${ctaPhone}':fontsize=${Math.round(res.w / 10)}:fontcolor=#FFD700:x=(w-text_w)/2:y=${Math.round(res.h * 0.4)}:shadowcolor=black@0.8:shadowx=2:shadowy=2`,
          `drawtext=text='${ctaSubline}':fontsize=${Math.round(res.w / 30)}:fontcolor=white:x=(w-text_w)/2:y=${Math.round(res.h * 0.58)}`,
          `drawtext=text='${ctaDisclaimer}':fontsize=${Math.round(res.w / 50)}:fontcolor=#888888:x=(w-text_w)/2:y=${Math.round(res.h * 0.88)}`,
        ].join(","),
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "ultrafast",
        "-y", "cta.mp4",
      ]);
      clipFiles.push("cta.mp4");

      // Step 6: Concat all clips
      setRenderProgress("Combining scenes...");
      const concatList = clipFiles.map((f) => `file '${f}'`).join("\n");
      await ffmpeg.writeFile("concat.txt", new TextEncoder().encode(concatList));

      await ffmpeg.exec([
        "-f", "concat",
        "-safe", "0",
        "-i", "concat.txt",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "ultrafast",
        "-movflags", "+faststart",
        "-y", "output.mp4",
      ]);

      // Step 7: Read output and create blob URL
      setRenderProgress("Finalizing video...");
      const outputData = await ffmpeg.readFile("output.mp4");
      const blob = new Blob([outputData], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);

      // Cleanup virtual filesystem
      for (const f of [...clipFiles, "concat.txt", "output.mp4", ...sceneFiles.filter(Boolean)]) {
        try { await ffmpeg.deleteFile(f); } catch { /* ignore */ }
      }
    } catch (err) {
      console.error("Video render error:", err);
      setRenderError("Video rendering failed. Try reducing scene count or refreshing the page.");
    } finally {
      setRendering(false);
      setRenderProgress("");
    }
  }

  /* ── Render ────────────────────────────────────────────────────────── */

  const isCta = activeTab === scenes.length;
  const canAddScene = scenes.length < MAX_SCENES[duration];

  return (
    <div className="rounded-lg border-l-4 border-l-blue-500 bg-white shadow-sm">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex w-full items-center justify-between p-6"
      >
        <div className="flex items-center gap-2">
          <Film className="h-5 w-5 text-blue-500" />
          <h3 className="font-heading text-lg font-semibold text-midnight-navy">
            AI Video Creative
          </h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-600">
            <Sparkles className="h-3 w-3" />
            AI
          </span>
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-600">
            BETA
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-slate-gray" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-gray" />
        )}
      </button>

      {/* Expandable content */}
      {expanded && (
        <div className="border-t border-slate-100 px-6 pb-6 space-y-5">
          {/* Platform selector */}
          <div className="pt-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2 block">
              Platform
            </label>
            <div className="flex flex-wrap gap-2">
              {VIDEO_PLATFORMS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPlatform(p.value)}
                  className={`rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-colors ${
                    platform === p.value
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-slate-200 text-midnight-navy hover:border-slate-300"
                  }`}
                >
                  {p.label} <span className="text-xs opacity-75">({p.aspect})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Duration toggle */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2 block">
              Duration
            </label>
            <div className="flex gap-2">
              {(["15s", "30s", "60s"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDuration(d);
                    if (scenes.length > 0) {
                      setScenes([]);
                      setVideoUrl(null);
                    }
                  }}
                  className={`rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-colors ${
                    duration === d
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-slate-200 text-midnight-navy hover:border-slate-300"
                  }`}
                >
                  {d === "15s" ? "15 seconds" : d === "30s" ? "30 seconds" : "60 seconds"}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Script button */}
          <button
            type="button"
            onClick={generateScript}
            disabled={scriptLoading || !tortName}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white transition-colors ${
              scriptLoading || !tortName
                ? "bg-slate-300 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 shadow-sm"
            }`}
          >
            {scriptLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Script...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Script
              </>
            )}
          </button>

          {scriptError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {scriptError}
            </div>
          )}

          {/* Scene Editor */}
          {scenes.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
              {/* Tab bar */}
              <div className="flex items-center border-b border-slate-200 bg-white overflow-x-auto">
                {scenes.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveTab(i)}
                    className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      activeTab === i
                        ? "border-blue-500 text-blue-600 bg-blue-50/50"
                        : "border-transparent text-slate-gray hover:text-midnight-navy"
                    }`}
                  >
                    Scene {i + 1}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setActiveTab(scenes.length)}
                  className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    isCta
                      ? "border-blue-500 text-blue-600 bg-blue-50/50"
                      : "border-transparent text-slate-gray hover:text-midnight-navy"
                  }`}
                >
                  CTA
                </button>
                {canAddScene && (
                  <button
                    type="button"
                    onClick={addScene}
                    className="px-3 py-2.5 text-slate-gray hover:text-blue-500 transition-colors"
                    title="Add scene"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Scene content */}
              <div className="p-4 space-y-4">
                {!isCta && scenes[activeTab] && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
                        Scene {activeTab + 1} of {scenes.length}
                      </span>
                      {scenes.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeScene(activeTab)}
                          className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1 block">
                        Headline
                      </label>
                      <input
                        type="text"
                        value={scenes[activeTab].headline}
                        onChange={(e) => updateScene(activeTab, { headline: e.target.value })}
                        placeholder="e.g., EXPOSED TO ROUNDUP?"
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-midnight-navy focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1 block">
                        Subheadline
                      </label>
                      <input
                        type="text"
                        value={scenes[activeTab].subheadline}
                        onChange={(e) => updateScene(activeTab, { subheadline: e.target.value })}
                        placeholder="e.g., You Could Be At Risk"
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-midnight-navy focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1 block">
                        Image Direction
                      </label>
                      <textarea
                        value={scenes[activeTab].imagePrompt}
                        onChange={(e) => updateScene(activeTab, { imagePrompt: e.target.value })}
                        placeholder="Describe the background image for this scene..."
                        rows={2}
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-midnight-navy placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300 resize-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1 block">
                        Duration: {scenes[activeTab].durationSeconds}s
                      </label>
                      <input
                        type="range"
                        min={3}
                        max={15}
                        value={scenes[activeTab].durationSeconds}
                        onChange={(e) => updateScene(activeTab, { durationSeconds: Number(e.target.value) })}
                        className="w-full accent-blue-500"
                      />
                      <div className="flex justify-between text-[10px] text-slate-gray">
                        <span>3s</span>
                        <span>15s</span>
                      </div>
                    </div>
                  </>
                )}

                {/* CTA editor */}
                {isCta && (
                  <>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
                      Call-to-Action Scene
                    </span>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1 block">
                        CTA Headline
                      </label>
                      <input
                        type="text"
                        value={cta.headline}
                        onChange={(e) => setCta({ ...cta, headline: e.target.value })}
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-midnight-navy focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1 block">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        value={cta.phone}
                        onChange={(e) => setCta({ ...cta, phone: e.target.value })}
                        placeholder="1-800-555-0100"
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-midnight-navy focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1 block">
                        CTA Subline
                      </label>
                      <input
                        type="text"
                        value={cta.subline}
                        onChange={(e) => setCta({ ...cta, subline: e.target.value })}
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-midnight-navy focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1 block">
                        Disclaimer
                      </label>
                      <textarea
                        value={cta.disclaimer}
                        onChange={(e) => setCta({ ...cta, disclaimer: e.target.value })}
                        rows={2}
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-midnight-navy focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300 resize-none"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Generate Video button */}
          {scenes.length > 0 && (
            <button
              type="button"
              onClick={renderVideo}
              disabled={rendering || scenes.length === 0}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white transition-colors ${
                rendering || scenes.length === 0
                  ? "bg-slate-300 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600 shadow-sm"
              }`}
            >
              {rendering ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {renderProgress || "Rendering video... this may take 30-60 seconds"}
                </>
              ) : (
                <>
                  <Film className="h-4 w-4" />
                  Generate Video
                </>
              )}
            </button>
          )}

          {/* Error */}
          {renderError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {renderError}
            </div>
          )}

          {/* Video preview + download */}
          {videoUrl && (
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <video
                  src={videoUrl}
                  controls
                  className="w-full rounded"
                />
              </div>

              <div className="flex gap-2">
                <a
                  href={videoUrl}
                  download={`video-${platform}-${duration}.mp4`}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-midnight-navy hover:bg-slate-50 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download MP4
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setVideoUrl(null);
                    renderVideo();
                  }}
                  disabled={rendering}
                  className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                    rendering
                      ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
                  }`}
                >
                  <RefreshCw className="h-4 w-4" />
                  Regenerate
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
