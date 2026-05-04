/**
 * Shared types for the firms / firm_managers schema.
 *
 * MCC-style (Google Manager Account) model:
 *   firms          — the entity being marketed (a plaintiff law firm)
 *   firm_managers  — M:N relationship between users and firms, with roles
 *
 * See: supabase/migrations/20260505000000_create_firms_and_managers.sql
 */

/* ── Roles ──────────────────────────────────────────────────────────────── */

/**
 * 'owner'   — the firm itself; max one per firm; typically the law firm
 *             user's auto-created row when their subscription was created
 * 'manager' — agency / media company with full edit + create access
 * 'viewer'  — read-only access (referral partner, future expansion)
 */
export type FirmRole = "owner" | "manager" | "viewer";

/* ── Brand profile (subset of firms, used in PI prompts) ───────────────── */

/**
 * The "what makes this firm sound like itself" payload. Populated either
 * manually (Phase 1.5) or via URL extraction (Phase 3).
 */
export interface FirmBrandProfile {
  website_url: string | null;
  social_handles: Record<string, string>;
  tagline: string | null;
  voice_descriptors: string[];
  differentiators: string[];
  partner_names: string[];
  signature_phrases: string[];
  service_areas: string[];
  extraction_source: "manual" | "auto" | "hybrid";
  extracted_at: string | null;
}

/* ── Full row types ─────────────────────────────────────────────────────── */

export interface Firm extends FirmBrandProfile {
  id: string;
  label: string;
  default_state: string | null;
  default_dma_codes: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FirmManager {
  id: string;
  firm_id: string;
  manager_user_id: string;
  role: FirmRole;
  added_by_user_id: string | null;
  added_at: string;
}

/**
 * Convenience type joining a firm with the current user's role on it.
 * This is what most API list endpoints will return.
 */
export interface FirmWithRole extends Firm {
  /** The current viewer's role on this firm. */
  current_user_role: FirmRole;
}

/* ── Create / update payloads ───────────────────────────────────────────── */

export interface CreateFirmInput {
  label: string;
  /** Brand profile fields are optional on create — they can be filled later. */
  website_url?: string;
  social_handles?: Record<string, string>;
  tagline?: string;
  voice_descriptors?: string[];
  differentiators?: string[];
  partner_names?: string[];
  signature_phrases?: string[];
  service_areas?: string[];
  default_state?: string;
  default_dma_codes?: string[];
  notes?: string;
}

export type UpdateFirmInput = Partial<CreateFirmInput> & {
  /** Allow flipping the source flag when a manual edit follows an auto-extract. */
  extraction_source?: "manual" | "auto" | "hybrid";
};

/* ── Validation helpers ─────────────────────────────────────────────────── */

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateCreateFirm(input: CreateFirmInput): ValidationResult {
  const errors: string[] = [];

  if (!input.label || input.label.trim().length === 0) {
    errors.push("label is required");
  } else if (input.label.length > 200) {
    errors.push("label must be 200 characters or fewer");
  }

  if (input.website_url) {
    try {
      const url = new URL(input.website_url);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        errors.push("website_url must be http or https");
      }
    } catch {
      errors.push("website_url is not a valid URL");
    }
  }

  if (input.default_state) {
    if (!/^[A-Z]{2}$/.test(input.default_state)) {
      errors.push("default_state must be a 2-letter uppercase state code");
    }
  }

  if (input.default_dma_codes) {
    for (const code of input.default_dma_codes) {
      if (!/^\d{3,4}$/.test(code)) {
        errors.push(`default_dma_codes contains invalid code: ${code}`);
        break;
      }
    }
  }

  // Cap text-array fields so a runaway agency PM can't blow up the row.
  const arrayCaps: Array<[keyof CreateFirmInput, number]> = [
    ["voice_descriptors", 20],
    ["differentiators", 20],
    ["partner_names", 50],
    ["signature_phrases", 30],
    ["service_areas", 50],
  ];
  for (const [field, cap] of arrayCaps) {
    const value = input[field];
    if (Array.isArray(value) && value.length > cap) {
      errors.push(`${field} cannot have more than ${cap} entries`);
    }
  }

  return { ok: errors.length === 0, errors };
}
