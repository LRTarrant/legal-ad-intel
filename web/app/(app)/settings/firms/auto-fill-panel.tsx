"use client";

/**
 * Auto-fill panel for Phase 3.2 of the PI feature parity project.
 *
 * Renders inside the firm edit card when the user clicks "Auto-fill
 * from website". Three states:
 *
 *   1. Idle: button only, with the website URL the panel will use.
 *   2. Loading: button shows spinner; panel shows loading message.
 *   3. Reviewing: panel shows proposed profile + per-field checkboxes
 *      + rationale + "Apply selected" / "Discard" buttons.
 *
 * Calls /api/firms/[id]/extract-brand with dry_run=true. On approve,
 * PATCHes the firm with only the selected fields. The route also
 * supports dry_run=false for one-shot apply, but we always preview
 * first \u2014 transparency about cost and content matters.
 *
 * No tests on this file directly (component shell). All decision logic
 * lives in lib/firms/auto-fill-helpers.ts which has full unit tests.
 */

import { useState } from "react";
import { Sparkles, Check, X, Loader2 } from "lucide-react";
import {
  ALL_FIELDS,
  buildApplyPatch,
  defaultFieldSelections,
  summarizeFieldChange,
  type FieldSelections,
  type ProposedBrandProfile,
} from "@/lib/firms/auto-fill-helpers";
import type { FirmWithRole } from "@/lib/firms/types";

interface ExtractResponse {
  proposed: ProposedBrandProfile;
  saved: boolean;
  source_url: string;
  truncated: boolean;
  cost_cents: number;
}

const FIELD_LABELS: Record<keyof FieldSelections, string> = {
  tagline: "Tagline",
  voice_descriptors: "Voice descriptors",
  differentiators: "Differentiators",
  partner_names: "Partner names",
  signature_phrases: "Signature phrases",
  service_areas: "Service areas",
  social_handles: "Social handles",
};

interface AutoFillPanelProps {
  firm: FirmWithRole;
  /** The website URL currently in the form draft. Lets users
   * preview an unsaved URL change before applying. */
  draftUrl: string;
  onApplied: () => void;
}

export function AutoFillPanel({ firm, draftUrl, onApplied }: AutoFillPanelProps) {
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "reviewing"; data: ExtractResponse; selections: FieldSelections }
    | { kind: "applying"; data: ExtractResponse; selections: FieldSelections }
  >({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);

  const effectiveUrl = (draftUrl?.trim() || firm.website_url || "").trim();
  const canExtract = effectiveUrl.length > 0;

  async function handleExtract() {
    setError(null);
    setState({ kind: "loading" });
    try {
      const body: { website_url?: string; dry_run: boolean } = { dry_run: true };
      // Send the draft URL only if it differs from the saved one;
      // otherwise we let the route default to firm.website_url.
      if (effectiveUrl && effectiveUrl !== firm.website_url) {
        body.website_url = effectiveUrl;
      }
      const res = await fetch(`/api/firms/${firm.id}/extract-brand`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as Partial<
        ExtractResponse & { error: string; errors: string[] }
      >;
      if (!res.ok || !json.proposed) {
        throw new Error(
          json.error ??
            (Array.isArray(json.errors) && json.errors.length > 0
              ? json.errors.join("; ")
              : `Request failed (${res.status})`),
        );
      }
      const data = json as ExtractResponse;
      setState({
        kind: "reviewing",
        data,
        selections: defaultFieldSelections(data.proposed, firm),
      });
    } catch (e) {
      setError((e as Error).message);
      setState({ kind: "idle" });
    }
  }

  async function handleApply() {
    if (state.kind !== "reviewing") return;
    setError(null);
    const patch = buildApplyPatch(
      state.data.proposed,
      state.selections,
      state.data.source_url,
    );
    if (!patch) {
      setError("Select at least one field to apply, or click Discard.");
      return;
    }
    setState({
      kind: "applying",
      data: state.data,
      selections: state.selections,
    });
    try {
      const res = await fetch(`/api/firms/${firm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Save failed (${res.status})`);
      }
      onApplied();
      setState({ kind: "idle" });
    } catch (e) {
      setError((e as Error).message);
      setState({
        kind: "reviewing",
        data: state.data,
        selections: state.selections,
      });
    }
  }

  function toggleField(field: keyof FieldSelections) {
    if (state.kind !== "reviewing") return;
    setState({
      ...state,
      selections: { ...state.selections, [field]: !state.selections[field] },
    });
  }

  /* ── Render ───────────────────────────────────────────────────────── */

  if (state.kind === "idle" || state.kind === "loading") {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleExtract}
          disabled={!canExtract || state.kind === "loading"}
          className="inline-flex items-center gap-2 rounded-lg border border-intelligence-teal bg-white px-3 py-1.5 text-xs font-semibold text-intelligence-teal transition hover:bg-intelligence-teal hover:text-white disabled:opacity-50"
          title={
            canExtract
              ? "Use AI to suggest brand fields from this firm's website"
              : "Add a website URL above first"
          }
        >
          {state.kind === "loading" ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Reading website…
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Auto-fill from website
            </>
          )}
        </button>
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Reviewing or applying
  const { data, selections } = state;
  const { proposed } = data;
  const isApplying = state.kind === "applying";

  return (
    <div className="space-y-3 rounded-lg border border-intelligence-teal bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-heading text-sm font-semibold text-midnight-navy">
            Review proposed changes
          </h4>
          <p className="mt-0.5 text-xs text-slate-gray">
            From{" "}
            <a
              href={data.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-intelligence-teal underline"
            >
              {data.source_url}
            </a>
            {data.truncated && " · page was large; truncated to first 2 MB"}
            {" · "}cost: {(data.cost_cents / 100).toFixed(2)} ¢
          </p>
        </div>
      </div>

      {proposed.rationale && (
        <div className="rounded-md bg-cloud/40 px-3 py-2 text-xs italic text-midnight-navy">
          {proposed.rationale}
        </div>
      )}

      <ul className="divide-y divide-cloud rounded-md border border-cloud">
        {ALL_FIELDS.map((field) => {
          const summary = summarizeFieldChange(
            field,
            proposed[field] as never,
            firm[field] as never,
          );
          const previewValue = renderPreview(field, proposed);
          const checked = selections[field];
          // Disable fields the LLM didn't extract anything for
          const disabled =
            (field === "tagline" && !proposed.tagline?.trim()) ||
            (field !== "tagline" &&
              field !== "social_handles" &&
              (proposed[field] as string[]).length === 0) ||
            (field === "social_handles" &&
              Object.keys(proposed.social_handles).length === 0);

          return (
            <li
              key={field}
              className={`flex items-start gap-3 px-3 py-2 ${
                disabled ? "opacity-50" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleField(field)}
                disabled={disabled || isApplying}
                className="mt-1 h-4 w-4 rounded border-cloud text-intelligence-teal focus:ring-intelligence-teal/30"
                aria-label={`Apply ${FIELD_LABELS[field]}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
                    {FIELD_LABELS[field]}
                  </span>
                  <span className="text-xs text-slate-gray">{summary}</span>
                </div>
                {previewValue && (
                  <div className="mt-1 break-words text-xs text-midnight-navy">
                    {previewValue}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setState({ kind: "idle" })}
          disabled={isApplying}
          className="inline-flex items-center gap-1.5 rounded-lg border border-cloud bg-white px-3 py-1.5 text-xs font-medium text-slate-gray transition hover:text-midnight-navy disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" />
          Discard
        </button>
        <button
          type="button"
          onClick={handleApply}
          disabled={isApplying}
          className="inline-flex items-center gap-1.5 rounded-lg bg-intelligence-teal px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {isApplying ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          {isApplying ? "Applying…" : "Apply selected"}
        </button>
      </div>
    </div>
  );
}

/* ── Field preview renderers ────────────────────────────────────────────── */

function renderPreview(
  field: keyof FieldSelections,
  proposed: ProposedBrandProfile,
): string | null {
  if (field === "tagline") {
    return proposed.tagline?.trim() ? `"${proposed.tagline}"` : null;
  }
  if (field === "social_handles") {
    const entries = Object.entries(proposed.social_handles);
    if (entries.length === 0) return null;
    return entries.map(([k]) => k).join(", ");
  }
  // String arrays
  const value = proposed[field] as string[];
  if (!value || value.length === 0) return null;
  // Show first 5 inline; more get truncated with a count.
  if (value.length <= 5) return value.join(", ");
  return `${value.slice(0, 5).join(", ")} (+${value.length - 5} more)`;
}
