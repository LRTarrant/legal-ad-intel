"use client";

/**
 * PIStrategicBriefCard — first PI artifact whose differentiation comes
 * from data signals competitor agencies and generic SaaS can't surface
 * in one place. Renders right after the PI plan card, before any
 * production cards (radio, video, ads).
 *
 * The card has a single CTA: "Generate strategic brief". Clicking calls
 * /api/campaigns/generate-pi-strategic-brief, which:
 *   1. Pulls FARS / NOAA / BLS / pi_viability_scores signals
 *   2. Hands them to gpt-4o with a strict no-hallucination prompt
 *   3. Returns four sections we render here:
 *        - Why this market
 *        - Top counties to target
 *        - Risk factors
 *        - Recommended angles
 *
 * Every numeric claim in the brief carries a source tag (FARS, NOAA,
 * BLS CFOI, pi_viability_scores) — that's the value-prop hook we keep
 * pulling on.
 */

import { useState } from "react";
import { fetchWithDemoMode } from "@/lib/admin/demo-mode-client";
import { BarChart3, Loader2, MapPin, Target } from "lucide-react";
import {
  isEntitlementError,
  reasonFromEntitlementError,
  type UpgradeMeta,
  type UpgradeReason,
} from "@/lib/billing/upgrade-copy";
import type {
  PIBriefSignalSet,
  PIStrategicBrief,
} from "@/app/api/campaigns/generate-pi-strategic-brief/testable";
import type {
  PICategory,
  SeverityModifier,
} from "@/lib/campaign-builder/pi-templates/types";

interface PIStrategicBriefCardProps {
  firmName: string;
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

interface BriefResponse extends PIStrategicBrief {
  signals: PIBriefSignalSet;
  cost_cents: number;
}

export function PIStrategicBriefCard({
  firmName,
  config,
  accentColor,
  onEntitlementError,
}: PIStrategicBriefCardProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<BriefResponse | null>(null);

  async function handleGenerate() {
    setError(null);
    setGenerating(true);
    try {
      const res = await fetchWithDemoMode(
        "/api/campaigns/generate-pi-strategic-brief",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pi_category: config.pi_category,
            state: config.state,
            firm_name: firmName,
            market_display_name: config.market_display_name,
          }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (isEntitlementError(json) && onEntitlementError) {
          onEntitlementError(reasonFromEntitlementError(json, "personal_injury"));
          return;
        }
        throw new Error(
          json.error ??
            (Array.isArray(json.errors) && json.errors.length > 0
              ? json.errors.join("; ")
              : `Request failed (${res.status})`),
        );
      }
      setBrief(json as BriefResponse);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div
          className="rounded-md p-2"
          style={{ backgroundColor: `${accentColor}15` }}
        >
          <BarChart3 className="h-5 w-5" style={{ color: accentColor }} />
        </div>
        <div className="flex-1">
          <h3 className="font-heading text-lg font-semibold text-midnight-navy">
            Strategic brief
          </h3>
          <p className="mt-0.5 text-xs text-slate-gray">
            Data-grounded recommendations from FARS, NOAA, BLS, and our
            internal legal-climate composite. {brief ? "Generated." : "One click — no inputs."}
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
          style={{ backgroundColor: accentColor }}
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Target className="h-4 w-4" />
              {brief ? "Regenerate" : "Generate"}
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-alert/20 bg-alert/5 p-3 text-sm text-alert">
          {error}
        </div>
      )}

      {brief && (
        <div className="space-y-5">
          {/* Why this market */}
          <Section title="Why this market" icon={<MapPin className="h-4 w-4" />} accent={accentColor}>
            <p className="text-sm leading-relaxed text-midnight-navy">
              {brief.why_this_market}
            </p>
          </Section>

          {/* Top counties */}
          {brief.top_counties_to_target.length > 0 && (
            <Section title="Top counties to target" accent={accentColor}>
              <ul className="space-y-2">
                {brief.top_counties_to_target.map((c, i) => (
                  <li
                    key={`${c.county_name}-${i}`}
                    className="rounded-md border border-cloud bg-cloud/20 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-midnight-navy">
                        {c.county_name}
                      </span>
                      <span className="text-xs text-slate-gray">
                        {c.headline}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs italic text-slate-gray">
                      {c.supporting_stat}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Risk factors */}
          {brief.risk_factors.length > 0 && (
            <Section title="Risk factors" accent={accentColor}>
              <ul className="space-y-2">
                {brief.risk_factors.map((r, i) => (
                  <li
                    key={`${r.label}-${i}`}
                    className="rounded-md border-l-2 border-amber-300 bg-amber-50/40 px-3 py-2"
                  >
                    <span className="text-sm font-semibold text-midnight-navy">
                      {r.label}
                    </span>
                    <p className="mt-0.5 text-xs text-slate-gray">
                      {r.implication}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Recommended angles */}
          {brief.recommended_angles.length > 0 && (
            <Section title="Recommended angles" accent={accentColor}>
              <ul className="space-y-2">
                {brief.recommended_angles.map((a, i) => (
                  <li
                    key={`${a.angle}-${i}`}
                    className="rounded-md border-l-2 px-3 py-2"
                    style={{
                      borderLeftColor: accentColor,
                      backgroundColor: `${accentColor}08`,
                    }}
                  >
                    <span className="text-sm font-semibold text-midnight-navy">
                      {a.angle}
                    </span>
                    <p className="mt-0.5 text-xs text-slate-gray">
                      {a.supporting_data}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Notes */}
          {brief.notes && (
            <p className="rounded-md bg-cloud/40 px-3 py-2 text-xs italic text-slate-gray">
              Note: {brief.notes}
            </p>
          )}

          {/* Source attribution footer + cost */}
          <div className="flex items-center justify-between border-t border-cloud pt-3 text-[11px] text-slate-gray">
            <span>
              Sources: {sourcesLine(brief.signals)}
            </span>
            <span>{(brief.cost_cents / 100).toFixed(2)}¢</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Subcomponents ─────────────────────────────────────────────────────── */

function Section({
  title,
  icon,
  accent,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
        style={{ color: accent }}
      >
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

/**
 * Build a comma-separated source tag list from whichever signal blocks
 * actually populated, so the user knows the brief is grounded in real
 * data they can verify.
 */
function sourcesLine(signals: PIBriefSignalSet): string {
  const parts: string[] = [];
  if (signals.motor_vehicle) parts.push(signals.motor_vehicle.source);
  if (signals.weather) parts.push(signals.weather.source);
  if (signals.construction) parts.push(signals.construction.source);
  if (signals.boating) parts.push(signals.boating.source);
  if (signals.legal_climate) parts.push("pi_viability_scores");
  return parts.length > 0 ? parts.join(", ") : "—";
}
