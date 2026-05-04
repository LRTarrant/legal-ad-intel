/**
 * Pure helpers for the "Auto-fill from website" UI flow (Phase 3.2).
 *
 * Handles:
 *   - Diffing the LLM's proposed profile against the current firm
 *   - Merging only user-selected fields into an UpdateFirmInput
 *   - Computing per-field selection defaults (auto-check fields the
 *     LLM produced; auto-uncheck fields it left empty)
 *
 * Lives outside the React component so behavior is unit-testable
 * without a DOM. The component is a thin shell over these.
 */

import type { Firm, UpdateFirmInput } from "./types";

/**
 * Mirror of the route's response shape (the parts the UI needs).
 * Imported here as a duplicate type to keep this module
 * dependency-free \u2014 the route file is server-only.
 */
export interface ProposedBrandProfile {
  tagline: string | null;
  voice_descriptors: string[];
  differentiators: string[];
  partner_names: string[];
  signature_phrases: string[];
  service_areas: string[];
  social_handles: Record<string, string>;
  rationale: string;
}

/**
 * Which fields the user has chosen to apply. Initialized from
 * `defaultFieldSelections(proposed)` and toggled by the per-field
 * checkboxes in the review panel.
 */
export interface FieldSelections {
  tagline: boolean;
  voice_descriptors: boolean;
  differentiators: boolean;
  partner_names: boolean;
  signature_phrases: boolean;
  service_areas: boolean;
  social_handles: boolean;
}

export const ALL_FIELDS: Array<keyof FieldSelections> = [
  "tagline",
  "voice_descriptors",
  "differentiators",
  "partner_names",
  "signature_phrases",
  "service_areas",
  "social_handles",
];

/**
 * Default per-field selections: check fields where the proposed
 * value is non-empty AND differs from the current firm. This way,
 * if the LLM returns the same partner_names that are already on the
 * firm, we don't bother the user with a "you can apply this" toggle
 * for a no-op write.
 *
 * Edge: the rationale field is never selectable \u2014 it's UI commentary
 * only, never persisted.
 */
export function defaultFieldSelections(
  proposed: ProposedBrandProfile,
  current: Pick<
    Firm,
    | "tagline"
    | "voice_descriptors"
    | "differentiators"
    | "partner_names"
    | "signature_phrases"
    | "service_areas"
    | "social_handles"
  >,
): FieldSelections {
  return {
    tagline: !!proposed.tagline?.trim() && proposed.tagline !== current.tagline,
    voice_descriptors:
      proposed.voice_descriptors.length > 0 &&
      !sameStringArray(proposed.voice_descriptors, current.voice_descriptors),
    differentiators:
      proposed.differentiators.length > 0 &&
      !sameStringArray(proposed.differentiators, current.differentiators),
    partner_names:
      proposed.partner_names.length > 0 &&
      !sameStringArray(proposed.partner_names, current.partner_names),
    signature_phrases:
      proposed.signature_phrases.length > 0 &&
      !sameStringArray(proposed.signature_phrases, current.signature_phrases),
    service_areas:
      proposed.service_areas.length > 0 &&
      !sameStringArray(proposed.service_areas, current.service_areas),
    social_handles:
      Object.keys(proposed.social_handles).length > 0 &&
      !sameRecord(proposed.social_handles, current.social_handles),
  };
}

/**
 * Build the PATCH body for /api/firms/[id]. Only fields the user has
 * checked are included; everything else is omitted so the existing
 * firm value is preserved. Always includes extraction_source='auto'
 * and extracted_at=now() when at least one field was applied so the
 * UI can show "last refreshed" in the firm list.
 *
 * Returns null when the user unchecked everything (caller should skip
 * the PATCH instead of sending an empty body).
 */
export function buildApplyPatch(
  proposed: ProposedBrandProfile,
  selections: FieldSelections,
  sourceUrl: string,
): UpdateFirmInput | null {
  const patch: UpdateFirmInput = {};
  let any = false;

  if (selections.tagline) {
    patch.tagline = proposed.tagline ?? "";
    any = true;
  }
  if (selections.voice_descriptors) {
    patch.voice_descriptors = proposed.voice_descriptors;
    any = true;
  }
  if (selections.differentiators) {
    patch.differentiators = proposed.differentiators;
    any = true;
  }
  if (selections.partner_names) {
    patch.partner_names = proposed.partner_names;
    any = true;
  }
  if (selections.signature_phrases) {
    patch.signature_phrases = proposed.signature_phrases;
    any = true;
  }
  if (selections.service_areas) {
    patch.service_areas = proposed.service_areas;
    any = true;
  }
  if (selections.social_handles) {
    patch.social_handles = proposed.social_handles;
    any = true;
  }

  if (!any) return null;

  // Always pin the URL the user actually fetched so the firm row
  // matches the source we extracted from. Keep this even when the
  // user only applied one field \u2014 otherwise refreshing later from
  // a different URL gets confusing.
  patch.website_url = sourceUrl;

  // "hybrid" when only some fields were taken, "auto" when all were
  // taken. Lets us surface "your firm profile is fully auto-filled"
  // vs "partially auto-filled" in the UI later.
  const allTaken = ALL_FIELDS.every((f) => selections[f]);
  patch.extraction_source = allTaken ? "auto" : "hybrid";
  patch.extracted_at = new Date().toISOString();

  return patch;
}

/**
 * For UI display: produce a short before/after summary string for one
 * field, suitable for showing in the review panel.
 *
 * Examples:
 *   summarizeFieldChange("voice_descriptors", ["calm","local"], [])
 *     \u2192 "Adding 2: calm, local"
 *   summarizeFieldChange("tagline", "We fight.", "We fight harder.")
 *     \u2192 "Replace: \"We fight harder.\" \u2192 \"We fight.\""
 */
export function summarizeFieldChange(
  field: keyof FieldSelections,
  proposed: string | string[] | Record<string, string> | null,
  current: string | string[] | Record<string, string> | null,
): string {
  if (field === "tagline") {
    const p = (proposed as string | null)?.trim() ?? "";
    const c = (current as string | null)?.trim() ?? "";
    if (!c && p) return `Set: "${truncate(p, 80)}"`;
    if (c && !p) return "Clear current tagline";
    return `Replace: "${truncate(c, 60)}" \u2192 "${truncate(p, 60)}"`;
  }

  if (field === "social_handles") {
    const p = (proposed as Record<string, string>) ?? {};
    const c = (current as Record<string, string>) ?? {};
    const newKeys = Object.keys(p).filter((k) => !(k in c));
    const changedKeys = Object.keys(p).filter((k) => k in c && p[k] !== c[k]);
    const parts: string[] = [];
    if (newKeys.length > 0) parts.push(`+${newKeys.length} new`);
    if (changedKeys.length > 0) parts.push(`~${changedKeys.length} updated`);
    return parts.length > 0 ? parts.join(", ") : "No change";
  }

  // String arrays.
  const p = (proposed as string[] | null) ?? [];
  const c = (current as string[] | null) ?? [];
  const cSet = new Set(c.map((s) => s.toLowerCase()));
  const additions = p.filter((s) => !cSet.has(s.toLowerCase()));
  const removalsCount = c.length - p.filter((s) => cSet.has(s.toLowerCase())).length;
  const parts: string[] = [];
  if (additions.length > 0) {
    parts.push(`Adding ${additions.length}: ${additions.slice(0, 3).join(", ")}${additions.length > 3 ? "\u2026" : ""}`);
  }
  if (removalsCount > 0 && p.length > 0) {
    parts.push(`Removing ${removalsCount}`);
  }
  if (parts.length === 0) {
    return p.length === 0 ? "Nothing extracted" : "No change";
  }
  return parts.join(" \u00b7 ");
}

/* ── Internal helpers ───────────────────────────────────────────────────── */

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "\u2026";
}

function sameStringArray(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const aSorted = [...a].map((s) => s.toLowerCase()).sort();
  const bSorted = [...b].map((s) => s.toLowerCase()).sort();
  for (let i = 0; i < aSorted.length; i++) {
    if (aSorted[i] !== bSorted[i]) return false;
  }
  return true;
}

function sameRecord(
  a: Record<string, string>,
  b: Record<string, string>,
): boolean {
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i++) {
    if (aKeys[i] !== bKeys[i]) return false;
    if (a[aKeys[i]] !== b[bKeys[i]]) return false;
  }
  return true;
}
