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

import { useState } from "react";
import { Loader2, Mic, Volume2 } from "lucide-react";
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
}

interface GeneratedScript {
  script: string;
  voice: { gender: "male" | "female"; style: string; reason: string };
  cost_cents: number;
}

export function PIRadioScriptGenerator({
  plan,
  firmId,
  firmName,
  config,
  accentColor,
  onEntitlementError,
}: PIRadioScriptGeneratorProps) {
  const [duration, setDuration] = useState<"15s" | "30s" | "60s">("30s");
  const [format, setFormat] = useState<"radio" | "podcast">("radio");
  const [language, setLanguage] = useState<"en" | "es">("en");

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<GeneratedScript | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setGenerated(null);
    try {
      const res = await fetch("/api/campaigns/generate-pi-radio-script", {
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
              Generated for ${(generated.cost_cents / 100).toFixed(2)}
            </p>
          )}

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
