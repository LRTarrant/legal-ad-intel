"use client";

/**
 * PIRadioScriptGenerator — sits below the PIScriptCard once the user
 * has generated a PI plan. Lets them turn the structured template into
 * a polished, broadcast-ready radio (or podcast) spot.
 *
 * Phase 1: text-only output. Phase 1.6 will add a "Generate voiceover"
 * button alongside this one to produce playable audio.
 *
 * Inputs come from the parent's PI config state (already in context
 * because the PIPlanResult is the result of that config).
 */

import { useEffect, useMemo, useState } from "react";
import { Loader2, Mic, Play, Volume2 } from "lucide-react";
import { fetchWithDemoMode } from "@/lib/admin/demo-mode-client";
import {
  isEntitlementError,
  reasonFromEntitlementError,
  type UpgradeReason,
  type UpgradeMeta,
} from "@/lib/billing/upgrade-copy";
import type { PIPlanResult } from "./pi-config-form";
import type {
  PICategory,
  SeverityModifier,
} from "@/lib/campaign-builder/pi-templates/types";

interface PIRadioScriptGeneratorProps {
  /** The PI plan result that drives this generator. */
  plan: PIPlanResult;
  /** Selected firm id (from FirmPicker), used for cost attribution. */
  firmId: string | null;
  /** Firm display name (passed back through to the prompt). */
  firmName: string;
  /** Current PI config — these mirror what built the plan. */
  config: {
    pi_category: PICategory;
    market_display_name: string;
    state: string;
    severity_modifiers: SeverityModifier[];
  };
  accentColor: string;
  onEntitlementError?: (params: {
    reason: UpgradeReason;
    meta: UpgradeMeta;
  }) => void;
  /**
   * Called whenever the user picks (or auto-pick selects) a voice. Lets
   * the parent reuse the same voice for downstream steps like the PI
   * video composition pipeline (Phase 2.1).
   */
  onVoiceSelected?: (voiceId: string | null) => void;
}

interface GeneratedScript {
  script: string;
  voice: { gender: "male" | "female"; style: string; reason: string };
  cost_cents: number;
}

interface VoiceOption {
  id: string;
  name: string;
  description: string;
  category: string;
  previewUrl: string;
}

interface GeneratedAudio {
  audioUrl: string;
  cost_cents: number;
  characters_synth: number;
}

export function PIRadioScriptGenerator({
  plan,
  firmId,
  firmName,
  config,
  accentColor,
  onEntitlementError,
  onVoiceSelected,
}: PIRadioScriptGeneratorProps) {
  const [duration, setDuration] = useState<"15s" | "30s" | "60s">("30s");
  const [format, setFormat] = useState<"radio" | "podcast">("radio");
  const [language, setLanguage] = useState<"en" | "es">("en");

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<GeneratedScript | null>(null);

  // Audio rendering state — separate flow that fires after the script
  // exists. Voices fetched lazily on first script success.
  const [voices, setVoices] = useState<VoiceOption[] | null>(null);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [voicesError, setVoicesError] = useState<string | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");

  const [audioGenerating, setAudioGenerating] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audio, setAudio] = useState<GeneratedAudio | null>(null);

  // Pick a default voice once both voices and the script's voice
  // recommendation are available. We match by gender + a heuristic on
  // the voice's labels (description includes "warm" / "authoritative"
  // / "calm" etc.). Fallback: first voice in the catalog.
  useEffect(() => {
    if (!voices || !generated || selectedVoiceId) return;
    const wantGender = generated.voice.gender;
    const wantKeywords = generated.voice.style.toLowerCase().split(/[\s,]+/);

    const scored = voices
      .map((v) => {
        const desc = v.description.toLowerCase();
        const genderMatch = desc.includes(wantGender) ? 10 : 0;
        const keywordMatch = wantKeywords.reduce(
          (acc, kw) => (kw.length > 2 && desc.includes(kw) ? acc + 1 : acc),
          0,
        );
        return { v, score: genderMatch + keywordMatch };
      })
      .sort((a, b) => b.score - a.score);

    const best = scored[0]?.v ?? voices[0];
    if (best) setSelectedVoiceId(best.id);
  }, [voices, generated, selectedVoiceId]);

  // Bubble voice selection up to the parent so downstream steps (PI
  // video composition) can reuse the same voice without re-asking.
  useEffect(() => {
    onVoiceSelected?.(selectedVoiceId || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVoiceId]);

  async function fetchVoices() {
    if (voices !== null || voicesLoading) return;
    setVoicesLoading(true);
    setVoicesError(null);
    try {
      const res = await fetchWithDemoMode("/api/campaigns/voices");
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Failed to load voices (${res.status})`);
      }
      const data = (await res.json()) as { voices: VoiceOption[] };
      setVoices(data.voices);
    } catch (e) {
      setVoicesError((e as Error).message);
    } finally {
      setVoicesLoading(false);
    }
  }

  async function handleGenerateAudio() {
    if (!generated || !selectedVoiceId) return;
    setAudioGenerating(true);
    setAudioError(null);
    setAudio(null);
    try {
      const res = await fetchWithDemoMode("/api/campaigns/generate-pi-radio-spot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: generated.script,
          voiceId: selectedVoiceId,
          duration,
          firm_id: firmId ?? undefined,
          pi_category: config.pi_category,
          state: config.state,
          severity_modifiers: config.severity_modifiers,
          language,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Audio generation failed (${res.status})`);
      }
      const data = (await res.json()) as GeneratedAudio;
      setAudio(data);
    } catch (e) {
      setAudioError((e as Error).message);
    } finally {
      setAudioGenerating(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setGenerated(null);
    try {
      const res = await fetchWithDemoMode("/api/campaigns/generate-pi-radio-script", {
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
          format,
          language,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as unknown;
        // Entitlement denial → bubble up to parent for the upgrade modal.
        if (
          body &&
          isEntitlementError(body) &&
          onEntitlementError
        ) {
          const mapped = reasonFromEntitlementError(body, "personal_injury");
          onEntitlementError(mapped);
          setError((body as { error?: string }).error ?? "Upgrade required");
          setGenerating(false);
          return;
        }
        const errMsg =
          (body as { error?: string }).error ?? `Generation failed (${res.status})`;
        throw new Error(errMsg);
      }

      const data = (await res.json()) as {
        script: string;
        voice_recommendation: GeneratedScript["voice"];
        cost_cents: number;
      };
      setGenerated({
        script: data.script,
        voice: data.voice_recommendation,
        cost_cents: data.cost_cents,
      });
      // Reset audio state so the user can re-render against the new script.
      setAudio(null);
      setAudioError(null);
      // Lazily fetch voices on first successful script.
      void fetchVoices();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm space-y-5">
      <div className="flex items-center gap-2">
        <Mic className="h-5 w-5" style={{ color: accentColor }} />
        <h3 className="font-heading text-lg font-semibold text-midnight-navy">
          Radio / podcast script
        </h3>
      </div>

      <p className="text-sm text-slate-gray">
        Polish the structured PI script above into a broadcast-ready spot.
        The compliance disclaimer is preserved verbatim. Your firm&apos;s brand profile
        (voice, tagline, differentiators) shapes the wording —
        {" "}
        <a
          href="/settings/firms"
          className="font-semibold text-intelligence-teal hover:underline"
        >
          edit it in Settings
        </a>
        .
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Length">
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value as "15s" | "30s" | "60s")}
            className={selectCls}
          >
            <option value="15s">15 seconds</option>
            <option value="30s">30 seconds</option>
            <option value="60s">60 seconds</option>
          </select>
        </Field>
        <Field label="Format">
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as "radio" | "podcast")}
            className={selectCls}
          >
            <option value="radio">Radio (direct response)</option>
            <option value="podcast">Podcast (host-read)</option>
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

      <div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: accentColor }}
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Mic className="h-4 w-4" />
              Generate {format === "podcast" ? "podcast" : "radio"} script
            </>
          )}
        </button>
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
      </div>

      {generated && (
        <div className="space-y-4 border-t border-cloud pt-5">
          <div>
            <div
              className="text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: accentColor }}
            >
              Script
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-midnight-navy">
              {generated.script}
            </p>
          </div>

          <div className="rounded-md border border-cloud bg-cloud/30 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-gray">
              <Volume2 className="h-3.5 w-3.5" />
              Recommended voice
            </div>
            <p className="mt-1 text-sm text-midnight-navy">
              <span className="font-semibold capitalize">{generated.voice.gender}</span>
              {" · "}
              {generated.voice.style}
            </p>
            <p className="mt-1 text-xs text-slate-gray">{generated.voice.reason}</p>
          </div>

          {generated.cost_cents > 0 && (
            <p className="text-xs text-slate-gray">
              Script generated for ${(generated.cost_cents / 100).toFixed(2)}
            </p>
          )}

          {/* Audio rendering section — voices + generate audio button */}
          <AudioSection
            voices={voices}
            voicesLoading={voicesLoading}
            voicesError={voicesError}
            selectedVoiceId={selectedVoiceId}
            onSelectVoice={setSelectedVoiceId}
            onGenerate={handleGenerateAudio}
            generating={audioGenerating}
            error={audioError}
            audio={audio}
            accentColor={accentColor}
          />

          {/* Suppress unused-prop warning when plan is read elsewhere by tests */}
          <span className="hidden" data-plan={plan.template.category} />
        </div>
      )}
    </div>
  );
}

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

/* ── Audio rendering subcomponent ───────────────────────────────────────────────────── */

interface AudioSectionProps {
  voices: VoiceOption[] | null;
  voicesLoading: boolean;
  voicesError: string | null;
  selectedVoiceId: string;
  onSelectVoice: (id: string) => void;
  onGenerate: () => void;
  generating: boolean;
  error: string | null;
  audio: GeneratedAudio | null;
  accentColor: string;
}

function AudioSection({
  voices,
  voicesLoading,
  voicesError,
  selectedVoiceId,
  onSelectVoice,
  onGenerate,
  generating,
  error,
  audio,
  accentColor,
}: AudioSectionProps) {
  const sortedVoices = useMemo(() => {
    if (!voices) return [];
    // Premade first, then alphabetical — matches /api/campaigns/voices behavior.
    return [...voices].sort((a, b) => {
      if (a.category === "premade" && b.category !== "premade") return -1;
      if (a.category !== "premade" && b.category === "premade") return 1;
      return a.name.localeCompare(b.name);
    });
  }, [voices]);

  return (
    <div className="space-y-3 rounded-md border border-cloud bg-cloud/20 p-4">
      <div
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: accentColor }}
      >
        Audio
      </div>

      {voicesLoading && (
        <p className="text-sm text-slate-gray">Loading voice catalog…</p>
      )}
      {voicesError && (
        <p className="text-sm text-red-600">
          Couldn&apos;t load voices: {voicesError}
        </p>
      )}

      {voices && voices.length === 0 && (
        <p className="text-sm text-slate-gray">
          No voices available in your ElevenLabs account.
        </p>
      )}

      {sortedVoices.length > 0 && (
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <Field label="Voice">
            <select
              value={selectedVoiceId}
              onChange={(e) => onSelectVoice(e.target.value)}
              className="min-w-[16rem] rounded-md border border-cloud bg-white px-3 py-2 text-sm text-midnight-navy focus:border-intelligence-teal focus:outline-none focus:ring-2 focus:ring-intelligence-teal/30"
            >
              {sortedVoices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.description ? ` — ${v.description}` : ""}
                </option>
              ))}
            </select>
          </Field>
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating || !selectedVoiceId}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: accentColor }}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Rendering audio…
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Generate audio
              </>
            )}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {audio && (
        <div className="space-y-2">
          <audio
            controls
            src={audio.audioUrl}
            className="w-full"
            preload="auto"
          />
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-gray">
            <a
              href={audio.audioUrl}
              download="pi-radio-spot.mp3"
              className="font-semibold text-intelligence-teal hover:underline"
            >
              Download mp3
            </a>
            {audio.cost_cents > 0 && (
              <span>Audio cost ${(audio.cost_cents / 100).toFixed(2)}</span>
            )}
            <span>{audio.characters_synth} characters synthesized</span>
          </div>
        </div>
      )}
    </div>
  );
}
