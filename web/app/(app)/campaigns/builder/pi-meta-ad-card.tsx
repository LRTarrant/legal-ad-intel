"use client";

/**
 * PIMetaAdCard \u2014 sits below the PIVideoCompositionCard once the user
 * has generated a PI plan. Generates Meta (Facebook/Instagram) ad
 * creative: copy fields + image.
 *
 * Phase 4a flow:
 *   1. User picks language, aspect ratio, and optional CTA intent
 *   2. Click "Generate ad" \u2192 calls /generate-pi-meta-ad (text)
 *   3. After text returns, optional "Generate image" button calls
 *      /generate-pi-scene-image with the LLM's image_prompt
 *   4. Render a Meta-style preview alongside the raw fields with
 *      length indicators
 *
 * Why two-step (text then image): images cost ~2-4\u00a2 each; users may
 * regenerate text 2-3x to dial in the angle before committing to an
 * image. Splitting the buttons lets them iterate cheaply on copy.
 */

import { useState } from "react";
import { fetchWithDemoMode } from "@/lib/admin/demo-mode-client";
import {
  Loader2,
  Megaphone,
  Image as ImageIcon,
  Languages,
} from "lucide-react";
import {
  isEntitlementError,
  reasonFromEntitlementError,
  type UpgradeMeta,
  type UpgradeReason,
} from "@/lib/billing/upgrade-copy";
import {
  buildLengthReport,
  META_LIMITS,
  type CTALabel,
  type LengthReport,
  type PIMetaAdResponse,
} from "@/app/api/campaigns/generate-pi-meta-ad/testable";
import type {
  PICategory,
  SeverityModifier,
} from "@/lib/campaign-builder/pi-templates/types";

interface PIMetaAdCardProps {
  firmId: string | null;
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
  /**
   * Optional callback fired whenever a fresh ad is generated so the
   * parent (campaign builder) can keep its export-bundle state in sync.
   * Receives the full result including imageUrl. Pass null on regenerate-
   * to-empty (currently never happens, but reserved).
   */
  onResult?: (result: GeneratedAd | null) => void;
}

interface GeneratedAd extends PIMetaAdResponse {
  cost_cents: number;
  compliance: {
    state: string;
    state_name: string;
    has_explicit_rules: boolean;
    flags: Array<{ severity: "warning" | "review"; summary: string; detail?: string }>;
  };
}

interface GeneratedImage {
  imageUrl: string;
  source: "library" | "generated";
  cost_cents: number;
}

const ASPECT_OPTIONS = [
  { value: "square" as const, label: "Square (1:1)", aspect: "aspect-square" },
  { value: "vertical" as const, label: "Vertical (9:16)", aspect: "aspect-[9/16]" },
  { value: "landscape" as const, label: "Landscape (1.91:1)", aspect: "aspect-[1.91/1]" },
];

const CTA_INTENT_OPTIONS = [
  { value: null, label: "Auto" },
  { value: "phone_call" as const, label: "Phone call" },
  { value: "form_submission" as const, label: "Form / quote" },
  { value: "learn_more" as const, label: "Learn more" },
];

export function PIMetaAdCard({
  firmId,
  firmName,
  config,
  accentColor,
  onEntitlementError,
  onResult,
}: PIMetaAdCardProps) {
  const [language, setLanguage] = useState<"en" | "es">("en");
  const [aspectRatio, setAspectRatio] =
    useState<"square" | "vertical" | "landscape">("square");
  const [ctaIntent, setCTAIntent] = useState<
    "phone_call" | "form_submission" | "learn_more" | null
  >(null);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ad, setAd] = useState<GeneratedAd | null>(null);

  const [imageGenerating, setImageGenerating] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [image, setImage] = useState<GeneratedImage | null>(null);

  async function handleGenerateText() {
    setError(null);
    setGenerating(true);
    setImage(null); // reset image when text changes \u2014 they're paired
    setImageError(null);
    try {
      const res = await fetchWithDemoMode("/api/campaigns/generate-pi-meta-ad", {
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
          aspect_ratio: aspectRatio,
          cta_intent: ctaIntent,
        }),
      });
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
      setAd(json as GeneratedAd);
      onResult?.(json as GeneratedAd);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateImage() {
    if (!ad) return;
    setImageError(null);
    setImageGenerating(true);
    try {
      const res = await fetchWithDemoMode("/api/campaigns/generate-pi-scene-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pi_category: config.pi_category,
          state: config.state,
          firm_id: firmId,
          imagePrompt: ad.image_prompt,
          // Map our card's aspect ratio onto the scene image route's
          // fixed size enum. Square → 1024x1024, vertical → 1024x1792,
          // landscape → 1792x1024.
          size: aspectToSize(aspectRatio),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (isEntitlementError(json) && onEntitlementError) {
          const next = reasonFromEntitlementError(json, "personal_injury");
          onEntitlementError(next);
          return;
        }
        throw new Error(json.error ?? `Image request failed (${res.status})`);
      }
      setImage({
        imageUrl: json.imageUrl ?? "",
        source: json.source ?? "generated",
        cost_cents: json.cost_cents ?? 0,
      });
    } catch (e) {
      setImageError((e as Error).message);
    } finally {
      setImageGenerating(false);
    }
  }

  const lengthReports: LengthReport[] | null = ad ? buildLengthReport(ad) : null;
  const aspectClass =
    ASPECT_OPTIONS.find((a) => a.value === aspectRatio)?.aspect ??
    "aspect-square";

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div
          className="rounded-md p-2"
          style={{ backgroundColor: `${accentColor}15` }}
        >
          <Megaphone className="h-5 w-5" style={{ color: accentColor }} />
        </div>
        <div>
          <h3 className="font-heading text-lg font-semibold text-midnight-navy">
            Meta ad creative
          </h3>
          <p className="mt-0.5 text-xs text-slate-gray">
            Facebook / Instagram feed ad. Text first, then image.
          </p>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid gap-4 md:grid-cols-3">
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

        <Field label="Aspect ratio">
          <SegmentedControl
            value={aspectRatio}
            onChange={setAspectRatio}
            options={ASPECT_OPTIONS.map((o) => ({ value: o.value, label: o.label.split(" ")[0] }))}
          />
        </Field>

        <Field label="CTA intent" hint="Nudges the model toward a CTA category">
          <SegmentedControl
            value={ctaIntent}
            onChange={setCTAIntent}
            options={CTA_INTENT_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />
        </Field>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleGenerateText}
          disabled={generating}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
          style={{ backgroundColor: accentColor }}
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating ad…
            </>
          ) : (
            <>
              <Megaphone className="h-4 w-4" />
              {ad ? "Regenerate ad copy" : "Generate ad"}
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
      {ad && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Field cards */}
          <div className="space-y-4">
            <FieldCard
              label="Primary text"
              value={ad.primary_text}
              report={lengthReports?.find((r) => r.field === "primary_text")}
            />
            <FieldCard
              label="Headline"
              value={ad.headline}
              report={lengthReports?.find((r) => r.field === "headline")}
            />
            <FieldCard
              label="Description"
              value={ad.description}
              report={lengthReports?.find((r) => r.field === "description")}
            />
            <div className="rounded-md border border-cloud bg-white p-4">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                CTA button
              </div>
              <span className="inline-flex items-center rounded-md bg-cloud px-3 py-1 text-sm font-semibold text-midnight-navy">
                {ad.cta_label}
              </span>
            </div>
            <div className="rounded-md border border-cloud bg-white p-4">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                Why this CTA
              </div>
              <p className="text-sm italic text-midnight-navy">{ad.rationale}</p>
            </div>
            <div className="rounded-md border border-dashed border-cloud bg-cloud/30 p-4">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                Image prompt (used for image generation)
              </div>
              <p className="break-words text-xs text-midnight-navy">
                {ad.image_prompt}
              </p>
            </div>
            {ad.compliance.flags.length > 0 && (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-yellow-900">
                  {ad.compliance.state_name} compliance flags
                </div>
                <ul className="space-y-1 text-xs text-yellow-900">
                  {ad.compliance.flags.map((f, i) => (
                    <li key={i}>
                      <strong className="capitalize">{f.severity}:</strong>{" "}
                      {f.summary}
                      {f.detail ? ` \u2014 ${f.detail}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Preview
            </div>
            <MetaAdPreview
              ad={ad}
              firmName={firmName}
              imageUrl={image?.imageUrl}
              aspectClass={aspectClass}
              loadingImage={imageGenerating}
            />
            <div className="space-y-1">
              <button
                type="button"
                onClick={handleGenerateImage}
                disabled={imageGenerating}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-intelligence-teal bg-white px-3 py-2 text-xs font-semibold text-intelligence-teal transition hover:bg-intelligence-teal hover:text-white disabled:opacity-50"
              >
                {imageGenerating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Generating image…
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-3.5 w-3.5" />
                    {image ? "Regenerate image" : "Generate image"}
                  </>
                )}
              </button>
              {image && (
                <p className="text-center text-xs text-slate-gray">
                  {image.source === "library"
                    ? "Library image"
                    : "AI-generated"}{" "}
                  · {(image.cost_cents / 100).toFixed(2)}¢
                </p>
              )}
              {imageError && (
                <p className="text-center text-xs text-alert">{imageError}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Field card ─────────────────────────────────────────────────────────── */

function FieldCard({
  label,
  value,
  report,
}: {
  label: string;
  value: string;
  report?: LengthReport;
}) {
  const colorByStatus =
    report?.status === "over"
      ? "text-alert"
      : report?.status === "tight"
      ? "text-amber-600"
      : "text-slate-gray";

  return (
    <div className="rounded-md border border-cloud bg-white p-4">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
          {label}
        </span>
        {report && (
          <span className={`text-xs ${colorByStatus}`}>
            {report.length} / {report.recommended} rec
            {report.length > report.recommended ? ` (max ${report.max})` : ""}
          </span>
        )}
      </div>
      <p className="break-words text-sm text-midnight-navy">{value}</p>
    </div>
  );
}

/* ── Meta ad preview ───────────────────────────────────────────────────── */

function MetaAdPreview({
  ad,
  firmName,
  imageUrl,
  aspectClass,
  loadingImage,
}: {
  ad: PIMetaAdResponse;
  firmName: string;
  imageUrl: string | undefined;
  aspectClass: string;
  loadingImage: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-cloud bg-white shadow-sm">
      {/* Header strip */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="h-8 w-8 flex-shrink-0 rounded-full bg-intelligence-teal/20" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-midnight-navy">
            {firmName}
          </div>
          <div className="text-[10px] text-slate-gray">Sponsored</div>
        </div>
      </div>

      {/* Primary text */}
      <div className="px-3 pb-2 text-xs text-midnight-navy">
        {ad.primary_text}
      </div>

      {/* Image */}
      <div className={`relative w-full bg-cloud ${aspectClass}`}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="Ad creative"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-gray">
            {loadingImage ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Generating image…
              </span>
            ) : (
              <span>Image will appear here</span>
            )}
          </div>
        )}
      </div>

      {/* Headline / description / CTA */}
      <div className="flex items-center justify-between gap-3 border-t border-cloud bg-cloud/30 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-midnight-navy">
            {ad.headline}
          </div>
          <div className="truncate text-[10px] text-slate-gray">
            {ad.description}
          </div>
        </div>
        <span className="flex-shrink-0 rounded-md bg-white px-3 py-1.5 text-[10px] font-semibold text-midnight-navy shadow-sm">
          {ad.cta_label}
        </span>
      </div>
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
      {hint && (
        <p className="mt-1 text-[11px] text-slate-gray">{hint}</p>
      )}
    </div>
  );
}

/**
 * Generic segmented control \u2014 typed so caller can pass any value type
 * (string, null, etc.). Highlights the active option.
 */
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
 * Map our 3-way aspect ratio onto the scene image route's fixed
 * resolution enum. Picks the closest standard size for each shape.
 */
function aspectToSize(
  aspect: "square" | "vertical" | "landscape",
): "1024x1024" | "1024x1792" | "1792x1024" {
  if (aspect === "vertical") return "1024x1792";
  if (aspect === "landscape") return "1792x1024";
  return "1024x1024";
}

// Suppress unused-vars warnings for the limit constants when imported
// only for typing context; they're useful for IDE quick-look.
void META_LIMITS;
export type { CTALabel };
