/**
 * Hardcoded pickers for the Proposal Builder block library.
 *
 * Tort slugs mirror the tort-profile routes under
 * app/(app)/advertising/<slug> (the non-tooling ones). State options
 * derive from the shared US states map. Ad-intel surfaces come from the
 * shared AD_INTEL_SURFACES constant so the API validator and the picker
 * never drift.
 */

import { stateNameToPostal } from "@/lib/usStates";
import { AD_INTEL_SURFACES } from "@/lib/proposal-builder/types";

export interface PickOption {
  value: string;
  label: string;
}

/** Tort profile slugs available as deck blocks. */
export const TORT_OPTIONS: PickOption[] = [
  { value: "afff-firefighting-foam", label: "AFFF Firefighting Foam" },
  { value: "ai-suicide", label: "AI Suicide" },
  { value: "bair-hugger", label: "Bair Hugger" },
  { value: "bard-powerport", label: "Bard PowerPort" },
  { value: "depo-provera", label: "Depo-Provera" },
  { value: "glp1-gastroparesis", label: "GLP-1 Gastroparesis" },
  { value: "glp1-vision-loss", label: "GLP-1 Vision Loss" },
  { value: "hair-relaxer", label: "Hair Relaxer" },
  { value: "olympus-scopes", label: "Olympus Scopes" },
  { value: "paraquat", label: "Paraquat" },
  { value: "pfas-contamination", label: "PFAS Contamination" },
  { value: "roblox-abuse", label: "Roblox Abuse" },
  { value: "roundup", label: "Roundup" },
  { value: "social-media-addiction", label: "Social Media Addiction" },
  { value: "talcum-powder", label: "Talcum Powder" },
];

/** All 50 states + DC, sorted by name, as { value: ABBR, label: Name }. */
export const STATE_OPTIONS: PickOption[] = Object.entries(stateNameToPostal)
  .map(([name, abbr]) => ({ value: abbr, label: name }))
  .sort((a, b) => a.label.localeCompare(b.label));

export const AD_INTEL_OPTIONS: PickOption[] = AD_INTEL_SURFACES.map((s) => ({
  value: s.id,
  label: s.label,
}));

export const BLOCK_TYPE_META = {
  tort_page: { label: "Tort Page", hint: "Pick a mass-tort profile" },
  state_intel: { label: "State Intel", hint: "Pick a state" },
  ad_intel: { label: "Ad Intel", hint: "Pick an ad-intelligence surface" },
  campaign: { label: "Campaign", hint: "Pick a saved campaign" },
  custom_text: { label: "Custom Text", hint: "Freeform title + content" },
} as const;
