"use client";

/**
 * PIGoogleRSACard — sits below the PIMetaAdCard once the user has
 * generated a PI plan. Generates Google Responsive Search Ads (RSA):
 * a portfolio of headlines and descriptions Google rotates dynamically.
 *
 * Phase 4b flow:
 *   1. User picks language, optionally pastes a final URL
 *   2. Click "Generate ad" → calls /generate-pi-google-rsa
 *   3. Render:
 *        a) Faux SERP preview (one possible combo)
 *        b) Full headline list (15) with length indicators
 *        c) Full description list (4) with length indicators
 *        d) path1/path2 fields
 *
 * No image leg here — Google RSAs are pure text.
 *
 * Why two columns: same as Meta card. Field cards on the left (the user
 * will copy/paste these into Google Ads asset library), preview on the
 * right (so they can see roughly how the ad will render).
 */

import { useState } from "react";
import { fetchWithDemoMode } from "@/lib/admin/demo-mode-client";
import { Loader2, Search, Languages, Link as LinkIcon } from "lucide-react";
import {
  isEntitlementError,
  reasonFromEntitlementError,
  type UpgradeMeta,
  type UpgradeReason,
} from "@/lib/billing/upgrade-copy";
import {
  buildRSALengthReports,
  GOOGLE_RSA_LIMITS,
  type PIGoogleRSAResponse,
  type RSAItemReport,
} from "@/app/api/campaigns/generate-pi-google-rsa/testable";
import type {
  PICategory,
  SeverityModifier,
} from "@/lib/campaign-builder/pi-templates/types";

interface PIGoogleRSACardProps {
  firmId: string | null;
  firmName: string;
  config: {
    pi_category: PICategory;
    market_display_name: string;
    state: string;
    severity_modifiers: SeverityModifier[];
  };
  /** Optional firm website URL — pre-fills the final URL input. */
  defaultFinalUrl?: string | null;
  accentColor: string;
  onEntitlementError?: (params: {
    reason: UpgradeReason;
    meta: UpgradeMeta;
  }) => void;
}

interface GeneratedRSA extends PIGoogleRSAResponse {
  cost_cents: number;
  compliance: {
    state: string;
    state_name: string;
    has_explicit_rules: boolean;
    flags: Array<{
      severity: "warning" | "review";
      summary: string;
      detail?: string;
    }>;
  };
}

export function PIGoogleRSACard({
  firmId,
  firmName,
  config,
  defaultFinalUrl,
  accentColor,
  onEntitlementError,
}: PIGoogleRSACardProps) {
  const [language, setLanguage] = useState<"en" | "es">("en");
  const [finalUrl, setFinalUrl] = useState<string>(defaultFinalUrl ?? "");

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ad, setAd] = useState<GeneratedRSA | null>(null);

  async function handleGenerate() {
    setError(null);
    setGenerating(true);
    try {
      const res = await fetchWithDemoMode(
        "/api/campaigns/generate-pi-google-rsa",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pi_category: config.pi_category,
            market_display_name: config.market_display_name,
            state: config.state,
            firm_id: firmId,
            firm_name: firmName,
            severity_modifiers: config.severity_modifiers,
            language,
            final_url: finalUrl.trim() || null,
          }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (isEntitlementError(json) && onEntitlementError) {
          const next = reasonFromEntitlementError(json, "personal_injury");
          onEntitlementError(next);
          return;
        }
        throw new Error(
          json.error ??
            (Array.isArray(json.errors) && json.errors.length > 0
              ? json.errors.join("; ")
              : `Request failed (${res.status})`),
        );
      }
      setAd(json as GeneratedRSA);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  const reports = ad ? buildRSALengthReports(ad) : null;

  // Display URL for the SERP preview. Falls back to a placeholder if the
  // user hasn't supplied a final URL.
  const displayDomain = (() => {
    const trimmed = finalUrl.trim();
    if (!trimmed) return "your-firm.com";
    try {
      const u = new URL(
        trimmed.startsWith("http") ? trimmed : `https://${trimmed}`,
      );
      return u.hostname.replace(/^www\./, "");
    } catch {
      return trimmed;
    }
  })();

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div
          className="rounded-md p-2"
          style={{ backgroundColor: `${accentColor}15` }}
        >
          <Search className="h-5 w-5" style={{ color: accentColor }} />
        </div>
        <div>
          <h3 className="font-heading text-lg font-semibold text-midnight-navy">
            Google search ad
          </h3>
          <p className="mt-0.5 text-xs text-slate-gray">
            Responsive Search Ad — 15 headlines, 4 descriptions. Text only.
          </p>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Language" icon={<Languages className="h-3.5 w-3.5" />}>
          <SegmentedControl
            value={language}
            onChange={setLanguage}
            options={[
              { value: "en", label: "English" },
              { value: "es", label: "Spanish" },
            ]}
          />
        </Field>

        <Field
          label="Final URL"
          icon={<LinkIcon className="h-3.5 w-3.5" />}
          hint="Optional — used to suggest URL display paths"
        >
          <input
            type="url"
            inputMode="url"
            placeholder="https://your-firm.com/personal-injury"
            value={finalUrl}
            onChange={(e) => setFinalUrl(e.target.value)}
            className="w-full rounded-md border border-cloud bg-white px-3 py-1.5 text-sm text-midnight-navy placeholder:text-slate-gray focus:border-intelligence-teal focus:outline-none"
          />
        </Field>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
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
              <Search className="h-4 w-4" />
              {ad ? "Regenerate ad" : "Generate ad"}
            </>
          )}
        </button>
        {ad && (
          <span className="text-xs text-slate-gray">
            {(ad.cost_cents / 100).toFixed(2)}¢
          </span>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-alert/20 bg-alert/5 p-3 text-sm text-alert">
          {error}
        </div>
      )}

      {/* Output */}
      {ad && reports && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Field cards (copy targets) */}
          <div className="space-y-5">
            <AssetGroup
              title="Headlines"
              hint={`Up to ${GOOGLE_RSA_LIMITS.headline.count} — each ≤ ${GOOGLE_RSA_LIMITS.headline.maxChars} chars`}
              items={reports.headlines}
            />

            <AssetGroup
              title="Descriptions"
              hint={`Up to ${GOOGLE_RSA_LIMITS.description.count} — each ≤ ${GOOGLE_RSA_LIMITS.description.maxChars} chars`}
              items={reports.descriptions}
            />

            <div className="grid grid-cols-2 gap-3">
              <FieldCard
                label="Path 1"
                value={ad.path1 || "—"}
                length={ad.path1.length}
                max={GOOGLE_RSA_LIMITS.path.maxChars}
              />
              <FieldCard
                label="Path 2"
                value={ad.path2 || "—"}
                length={ad.path2.length}
                max={GOOGLE_RSA_LIMITS.path.maxChars}
              />
            </div>

            {ad.rationale && (
              <p className="rounded-md bg-cloud/40 px-3 py-2 text-xs italic text-slate-gray">
                {ad.rationale}
              </p>
            )}

            {ad.compliance.flags.length > 0 && (
              <div className="space-y-1.5">
                {ad.compliance.flags.map((f, i) => (
                  <div
                    key={i}
                    className={`rounded-md border px-3 py-2 text-xs ${
                      f.severity === "warning"
                        ? "border-alert/20 bg-alert/5 text-alert"
                        : "border-amber-200 bg-amber-50 text-amber-900"
                    }`}
                  >
                    <span className="font-semibold">{f.summary}</span>
                    {f.detail && <span className="ml-1">— {f.detail}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SERP-style preview (right rail) */}
          <SERPPreview
            displayDomain={displayDomain}
            path1={ad.path1}
            path2={ad.path2}
            headlines={ad.headlines}
            description={ad.descriptions[0]}
          />
        </div>
      )}
    </div>
  );
}

/* ── Field primitives ──────────────────────────────────────────────────── */

function Field({
  label,
  hint,
  icon,
  children,
}: {
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-gray">
        {icon}
        <span>{label}</span>
      </div>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-gray">{hint}</p>}
    </div>
  );
}

function SegmentedControl<T>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (next: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-md border border-cloud bg-white p-0.5">
      {options.map((opt, i) => {
        const active = Object.is(opt.value, value);
        return (
          <button
            key={`${i}-${opt.label}`}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded px-2.5 py-1 text-xs font-medium transition ${
              active
                ? "bg-intelligence-teal text-white"
                : "text-slate-gray hover:text-midnight-navy"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * AssetGroup — renders a labeled list of (text, length) items with
 * status-colored char counters. Used for the headlines and descriptions
 * panels; both use the same row layout.
 */
function AssetGroup({
  title,
  hint,
  items,
}: {
  title: string;
  hint: string;
  items: RSAItemReport[];
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h4 className="text-sm font-semibold text-midnight-navy">{title}</h4>
        <span className="text-[11px] text-slate-gray">
          {items.length} • {hint}
        </span>
      </div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li
            key={`${i}-${it.text}`}
            className="flex items-center justify-between gap-3 rounded-md border border-cloud bg-cloud/20 px-3 py-2"
          >
            <span className="truncate text-sm text-midnight-navy">
              {it.text}
            </span>
            <span
              className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-mono ${statusClass(it.status)}`}
            >
              {it.length}/{it.max}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * FieldCard — single labeled value with char count. Used for path1/path2.
 */
function FieldCard({
  label,
  value,
  length,
  max,
}: {
  label: string;
  value: string;
  length: number;
  max: number;
}) {
  const status: RSAItemReport["status"] =
    length > max ? "over" : length >= max - 3 ? "tight" : "ok";
  return (
    <div className="rounded-md border border-cloud bg-cloud/20 px-3 py-2">
      <div className="mb-0.5 flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-gray">
          {label}
        </span>
        <span
          className={`rounded px-1 py-0.5 text-[10px] font-mono ${statusClass(status)}`}
        >
          {length}/{max}
        </span>
      </div>
      <div className="truncate text-sm text-midnight-navy">{value}</div>
    </div>
  );
}

function statusClass(status: RSAItemReport["status"]): string {
  if (status === "over") return "bg-alert/15 text-alert";
  if (status === "tight") return "bg-amber-100 text-amber-900";
  return "bg-emerald-100 text-emerald-900";
}

/**
 * SERPPreview — faux Google search-result rendering. Picks the first
 * three headlines (separated by " | ") to mimic what Google shows when
 * it picks a triple from the asset pool. Real-world Google rotates
 * combinations; we just show one as a sanity check the copy reads okay.
 */
function SERPPreview({
  displayDomain,
  path1,
  path2,
  headlines,
  description,
}: {
  displayDomain: string;
  path1: string;
  path2: string;
  headlines: string[];
  description: string;
}) {
  const triple = headlines.slice(0, 3).join(" | ");
  const pathSuffix = [path1, path2].filter(Boolean).join(" › ");
  const displayUrl = pathSuffix
    ? `${displayDomain} › ${pathSuffix}`
    : displayDomain;

  return (
    <div className="rounded-md border border-cloud bg-white p-4 shadow-sm">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
        Search preview
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="rounded border border-slate-300 px-1 py-0 text-[9px] font-bold text-slate-gray">
            Sponsored
          </span>
          <span className="truncate text-slate-gray">{displayUrl}</span>
        </div>
        <div className="text-base font-medium leading-snug text-[#1a0dab]">
          {triple}
        </div>
        <div className="text-xs leading-snug text-slate-gray">
          {description}
        </div>
      </div>

      <p className="mt-3 text-[10px] italic text-slate-gray">
        Google rotates combinations from the pool. This shows one possible
        rendering using the first three headlines.
      </p>
    </div>
  );
}
