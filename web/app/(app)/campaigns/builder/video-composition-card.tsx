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
  Volume2,
  Music,
  Play,
  Square,
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

interface VoiceOption {
  id: string;
  name: string;
  description: string;
  category: string;
  previewUrl: string;
}

type BackgroundMusic = "dramatic" | "urgent" | "somber" | "corporate";

const MUSIC_OPTIONS: { value: BackgroundMusic; label: string; description: string }[] = [
  { value: "dramatic", label: "Dramatic", description: "Tense, serious tone" },
  { value: "urgent", label: "Urgent", description: "Fast-paced, action-oriented" },
  { value: "somber", label: "Somber", description: "Empathetic, emotional" },
  { value: "corporate", label: "Corporate", description: "Professional, neutral" },
];

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

  // Voiceover state
  const [voiceoverEnabled, setVoiceoverEnabled] = useState(false);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");
  const [voiceoverScript, setVoiceoverScript] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  // Background music state
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<BackgroundMusic>("dramatic");

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const voicesFetchedRef = useRef(false);

  /* ── Fetch voices ──────────────────────────────────────────────────── */

  async function fetchVoices() {
    if (voicesFetchedRef.current) return;
    voicesFetchedRef.current = true;
    setVoicesLoading(true);
    try {
      const res = await fetch("/api/campaigns/voices");
      if (!res.ok) throw new Error("Failed to fetch voices");
      const data = await res.json();
      setVoices(data.voices ?? []);
      if (data.voices?.length > 0) {
        setSelectedVoiceId(data.voices[0].id);
      }
    } catch {
      voicesFetchedRef.current = false;
    } finally {
      setVoicesLoading(false);
    }
  }

  /* ── Generate voiceover script from scenes ─────────────────────────── */

  function stripMarkdown(text: string): string {
    return text
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/__/g, "")
      .replace(/_/g, " ")
      .replace(/#{1,6}\s/g, "")
      .trim();
  }

  function generateVoiceoverScript(): string {
    const parts: string[] = [];
    for (const scene of scenes) {
      if (scene.headline) {
        const headline = stripMarkdown(scene.headline)
          .replace(/\?$/g, "?")
          .replace(/^([A-Z\s]+)$/, (match) =>
            match.charAt(0) + match.slice(1).toLowerCase(),
          );
        parts.push(headline);
      }
      if (scene.subheadline) {
        parts.push(stripMarkdown(scene.subheadline));
      }
    }
    if (parts.length === 0) return "";
    return parts.join(". ").replace(/\.\./g, ".").replace(/\?\./g, "? ") + ".";
  }

  /* ── Voice preview ─────────────────────────────────────────────────── */

  function stopPreview() {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setIsPreviewPlaying(false);
  }

  async function previewVoice() {
    if (!selectedVoiceId || !voiceoverScript) return;

    if (isPreviewPlaying) {
      stopPreview();
      return;
    }

    setPreviewLoading(true);
    try {
      // Use first sentence only for preview
      const firstSentence = voiceoverScript.split(/[.!?]/)[0]?.trim();
      if (!firstSentence) return;

      const res = await fetch("/api/campaigns/generate-voiceover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: firstSentence + ".", voiceId: selectedVoiceId }),
      });

      if (!res.ok) throw new Error("Preview generation failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audio.onended = () => {
        setIsPreviewPlaying(false);
        previewAudioRef.current = null;
      };

      previewAudioRef.current = audio;
      await audio.play();
      setIsPreviewPlaying(true);
    } catch {
      // Silently fail
    } finally {
      setPreviewLoading(false);
    }
  }

  /* ── Script generation ─────────────────────────────────────────────── */

  async function generateScript() {
    if (!tortName) return;
    setScriptLoading(true);
    setScriptError(null);
    setVideoUrl(null);
    setVoiceoverScript("");

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

  /* ── Server-side video rendering ───────────────────────────────────── */

  async function renderVideo() {
    if (scenes.length === 0) return;
    setRendering(true);
    setRenderError(null);
    setVideoUrl(null);
    stopPreview();

    try {
      const resolution = PLATFORM_RESOLUTIONS[platform];

      // Step 1: Generate images for scenes that need them
      setRenderProgress("Generating scene images...");
      const imageUrls = await generateSceneImages();

      // Update scenes with generated URLs
      const updatedScenes = scenes.map((s, i) => ({
        ...s,
        imageUrl: imageUrls[i] ?? s.imageUrl,
      }));
      setScenes(updatedScenes);

      // Step 2: Generate voiceover audio if enabled
      let voiceoverBase64: string | undefined;
      if (voiceoverEnabled && selectedVoiceId && voiceoverScript) {
        setRenderProgress("Generating voiceover...");
        const voRes = await fetch("/api/campaigns/generate-voiceover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: voiceoverScript,
            voiceId: selectedVoiceId,
          }),
        });

        if (voRes.ok) {
          const audioBlob = await voRes.blob();
          voiceoverBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              // Strip the data URL prefix to get raw base64
              const dataUrl = reader.result as string;
              resolve(dataUrl.split(",")[1] ?? "");
            };
            reader.readAsDataURL(audioBlob);
          });
        }
      }

      // Step 3: Send to server for rendering
      setRenderProgress("Rendering video... this may take 30–60 seconds");
      const res = await fetch("/api/campaigns/render-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenes: updatedScenes.map((s) => ({
            headline: s.headline,
            subheadline: s.subheadline,
            imageUrl: s.imageUrl,
            durationSeconds: s.durationSeconds,
          })),
          cta,
          platform,
          resolution,
          voiceoverBase64,
          backgroundMusic: musicEnabled ? selectedMusic : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Rendering failed");
      }

      // Step 4: Create blob URL from response
      setRenderProgress("Finalizing video...");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
    } catch (err) {
      console.error("Video render error:", err);
      setRenderError(
        err instanceof Error
          ? `Video rendering failed: ${err.message}`
          : "Video rendering failed. Try reducing scene count or refreshing the page.",
      );
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
                      setVoiceoverScript("");
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

          {/* ── Voiceover section ───────────────────────────────────── */}
          {scenes.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  const enabling = !voiceoverEnabled;
                  setVoiceoverEnabled(enabling);
                  if (enabling) {
                    fetchVoices();
                    if (!voiceoverScript && scenes.length > 0) {
                      setVoiceoverScript(generateVoiceoverScript());
                    }
                  }
                }}
                className="flex w-full items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-semibold text-midnight-navy">
                    Add Voiceover
                  </span>
                </div>
                <div
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    voiceoverEnabled ? "bg-blue-500" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                      voiceoverEnabled ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </div>
              </button>

              {voiceoverEnabled && (
                <div className="border-t border-slate-100 px-4 pb-4 space-y-3">
                  {/* Voice selector */}
                  <div className="pt-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1 block">
                      Voice
                    </label>
                    {voicesLoading ? (
                      <div className="flex items-center gap-2 text-sm text-slate-gray py-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Loading voices...
                      </div>
                    ) : (
                      <select
                        value={selectedVoiceId}
                        onChange={(e) => {
                          setSelectedVoiceId(e.target.value);
                          stopPreview();
                        }}
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-midnight-navy focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
                      >
                        {voices.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} — {v.description}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Voiceover script */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1 block">
                      Voiceover Script
                    </label>
                    <textarea
                      value={voiceoverScript}
                      onChange={(e) => setVoiceoverScript(e.target.value)}
                      placeholder="Enter the voiceover narration..."
                      rows={4}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-midnight-navy placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300 resize-none"
                    />
                    <p className="mt-1 text-[11px] text-slate-gray">
                      Auto-populated from scene text. Edit to customize the narration.
                    </p>
                  </div>

                  {/* Preview voice button */}
                  <button
                    type="button"
                    onClick={previewVoice}
                    disabled={previewLoading || !selectedVoiceId || !voiceoverScript}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                      previewLoading || !selectedVoiceId || !voiceoverScript
                        ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                        : isPreviewPlaying
                          ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                          : "border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
                    }`}
                  >
                    {previewLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isPreviewPlaying ? (
                      <Square className="h-3.5 w-3.5" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                    {previewLoading
                      ? "Generating..."
                      : isPreviewPlaying
                        ? "Stop Preview"
                        : "Preview Voice"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Background Music section ─────────────────────────────── */}
          {scenes.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setMusicEnabled(!musicEnabled)}
                className="flex w-full items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <Music className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-semibold text-midnight-navy">
                    Add Background Music
                  </span>
                </div>
                <div
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    musicEnabled ? "bg-blue-500" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                      musicEnabled ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </div>
              </button>

              {musicEnabled && (
                <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2 block">
                    Mood
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {MUSIC_OPTIONS.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setSelectedMusic(m.value)}
                        className={`rounded-lg border-2 px-3 py-2 text-left transition-colors ${
                          selectedMusic === m.value
                            ? "border-blue-500 bg-blue-50"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <span className={`text-sm font-semibold ${
                          selectedMusic === m.value ? "text-blue-600" : "text-midnight-navy"
                        }`}>
                          {m.label}
                        </span>
                        <p className="text-[11px] text-slate-gray mt-0.5">
                          {m.description}
                        </p>
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-gray">
                    Generated ambient tone. Real music tracks coming soon.
                  </p>
                </div>
              )}
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
