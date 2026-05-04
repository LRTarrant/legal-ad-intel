/**
 * Shared types for Campaign Builder persistence layer.
 *
 * These mirror the `campaigns` table created in
 * supabase/migrations/20260504000002_create_campaigns_table.sql,
 * plus request/response shapes for the save/list/get/delete API routes.
 *
 * Persistence philosophy: this table stores ONLY the campaign config
 * a user submitted — never generated assets (audio, video, scripts).
 * Users re-render assets from saved config on demand.
 */

import type { PICategory, SeverityModifier } from "./pi-templates/types";

/* ── DB row shape ─────────────────────────────────────────────────────── */

/**
 * Mirror of the campaigns table row. Keep fields in the same order as
 * the migration so it's easy to diff against reality.
 */
export interface CampaignRow {
  id: string;
  user_id: string;
  practice_area: "mass_tort" | "personal_injury";
  tort_slug: string | null;
  pi_category: PICategory | null;
  state: string | null;
  market_dma_code: string | null;
  market_display_name: string | null;
  severity_modifiers: SeverityModifier[];
  config: Record<string, unknown>;
  name: string | null;
  status: "draft" | "active" | "archived";
  created_at: string;
  updated_at: string;
}

/* ── Save (create / update) ───────────────────────────────────────────── */

/**
 * Body for POST /api/campaigns/save.
 *
 * If `id` is provided → update that campaign (RLS enforces ownership).
 * If `id` is omitted → create a new campaign owned by the current user.
 */
export interface SaveCampaignRequest {
  id?: string;
  practice_area: "mass_tort" | "personal_injury";
  tort_slug?: string;
  pi_category?: PICategory;
  state?: string;
  market_dma_code?: string;
  market_display_name?: string;
  severity_modifiers?: SeverityModifier[];
  config?: Record<string, unknown>;
  name?: string;
  status?: "draft" | "active" | "archived";
}

export interface SaveCampaignResponse {
  campaign: CampaignRow;
}

/* ── List ─────────────────────────────────────────────────────────────── */

/**
 * Query params for GET /api/campaigns/list:
 *
 *   /api/campaigns/list?practice_area=personal_injury&status=active&limit=25&cursor=<id>
 *
 * Cursor is the id of the last item from the previous page; results
 * are ordered by created_at DESC (newest first).
 */
export interface ListCampaignsParams {
  practice_area?: "mass_tort" | "personal_injury";
  status?: "draft" | "active" | "archived";
  limit?: number;
  cursor?: string;
}

export interface ListCampaignsResponse {
  campaigns: CampaignRow[];
  /** Cursor for the next page; absent when no more results. */
  next_cursor: string | null;
}

/* ── Single get ───────────────────────────────────────────────────────── */

export interface GetCampaignResponse {
  campaign: CampaignRow;
}

/* ── DMA markets ──────────────────────────────────────────────────────── */

export interface DMAMarket {
  dma_code: string;
  display_name: string;
  full_name: string;
  primary_state: string;
  states_covered: string[];
  population: number | null;
  rank: number | null;
}

export interface ListDMAMarketsResponse {
  markets: DMAMarket[];
}

/* ── Validation helpers ───────────────────────────────────────────────── */

/**
 * Server-side validation matching the DB CHECK constraints. Surfaces
 * errors before hitting Postgres so we can return clean 400s.
 */
export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateSaveCampaign(body: SaveCampaignRequest): ValidationResult {
  const errors: string[] = [];

  if (body.practice_area !== "mass_tort" && body.practice_area !== "personal_injury") {
    errors.push(
      `practice_area must be 'mass_tort' or 'personal_injury' (got ${JSON.stringify(body.practice_area)})`,
    );
  }

  if (body.practice_area === "mass_tort") {
    if (!body.tort_slug) {
      errors.push("mass_tort campaigns require tort_slug");
    }
  }

  if (body.practice_area === "personal_injury") {
    if (!body.pi_category) {
      errors.push("personal_injury campaigns require pi_category");
    }
    if (!body.market_dma_code) {
      errors.push("personal_injury campaigns require market_dma_code");
    }
  }

  if (body.severity_modifiers && body.severity_modifiers.length > 0) {
    const allowed = new Set<SeverityModifier>(["fatal", "catastrophic"]);
    for (const m of body.severity_modifiers) {
      if (!allowed.has(m)) {
        errors.push(`Unknown severity modifier: ${JSON.stringify(m)}`);
      }
    }
    if (
      body.severity_modifiers.includes("fatal") &&
      body.severity_modifiers.includes("catastrophic")
    ) {
      errors.push(
        "severity_modifiers 'fatal' and 'catastrophic' are mutually exclusive",
      );
    }
  }

  if (body.status && !["draft", "active", "archived"].includes(body.status)) {
    errors.push(`Invalid status: ${JSON.stringify(body.status)}`);
  }

  return { ok: errors.length === 0, errors };
}
