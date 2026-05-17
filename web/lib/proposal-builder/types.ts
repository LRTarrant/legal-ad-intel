/**
 * Shared types for the Proposal Builder persistence layer.
 *
 * Mirrors the `proposals` / `proposal_blocks` tables created in
 * supabase/migrations/20260516000000_create_proposals.sql, plus the
 * request/response shapes for the /api/proposal/* routes.
 *
 * Multi-tenant model (matches the rest of this codebase):
 *   - profiles.tenant_id -> tenants.id
 *   - RLS gates every read/write to the caller's tenant via
 *     public.my_tenant_id(); the server also sets tenant_id explicitly
 *     on insert (same pattern as activity_log / alert_configs).
 */

import type { TenantBranding } from "@/lib/tenant-config";

/* ── Block taxonomy ───────────────────────────────────────────────────── */

export const BLOCK_TYPES = [
  "tort_page",
  "state_intel",
  "ad_intel",
  "campaign",
  "custom_text",
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

/**
 * Ad-intel surfaces a block can point at. Kept in sync with the
 * tooling routes under app/(app)/advertising/ that are NOT tort
 * profiles (see scripts/check-tort-profile-registry.mjs NON_TORT_ROUTES).
 */
export const AD_INTEL_SURFACES = [
  { id: "advertisers", label: "Advertisers" },
  { id: "saturation", label: "Market Saturation" },
  { id: "channel-planner", label: "Channel Planner" },
  { id: "cost-benchmarks", label: "Cost Benchmarks" },
  { id: "creatives", label: "Creatives" },
  { id: "exposure", label: "Exposure" },
  { id: "markets", label: "Markets" },
  { id: "search-visibility", label: "Search Visibility" },
  { id: "trends", label: "Trends" },
  { id: "recall-watchlist", label: "Recall Watchlist" },
] as const;

export type AdIntelSurface = (typeof AD_INTEL_SURFACES)[number]["id"];

/* ── Per-type block_data shapes ───────────────────────────────────────── */

export interface TortPageBlockData {
  tort_slug: string;
  /** Optional cached display label so the canvas/PPTX needn't re-lookup. */
  label?: string;
}

export interface StateIntelBlockData {
  state_abbr: string;
  label?: string;
}

export interface AdIntelBlockData {
  surface: AdIntelSurface;
  label?: string;
}

export interface CampaignBlockData {
  campaign_id: string;
  label?: string;
}

export interface CustomTextBlockData {
  title: string;
  content: string;
}

export type BlockData =
  | TortPageBlockData
  | StateIntelBlockData
  | AdIntelBlockData
  | CampaignBlockData
  | CustomTextBlockData
  | Record<string, unknown>;

/* ── DB row shapes ────────────────────────────────────────────────────── */

export interface ProposalRow {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProposalBlockRow {
  id: string;
  proposal_id: string;
  block_type: BlockType;
  block_data: Record<string, unknown>;
  order: number;
  created_at: string;
  updated_at: string;
}

/* ── Request / response shapes ────────────────────────────────────────── */

export interface CreateProposalRequest {
  title: string;
  description?: string;
}

export interface CreateProposalResponse {
  id: string;
  created_at: string;
}

export interface UpdateProposalRequest {
  title?: string;
  description?: string;
}

export interface UpdateProposalResponse {
  updated_at: string;
}

export interface GetProposalResponse {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  blocks?: ProposalBlockRow[];
  tenant_branding: TenantBranding;
}

export interface ListProposalsResponse {
  proposals: ProposalRow[];
  total: number;
}

export interface CreateBlockRequest {
  block_type: BlockType;
  block_data: Record<string, unknown>;
  order: number;
}

export interface CreateBlockResponse {
  block_id: string;
  order: number;
}

export interface UpdateBlockRequest {
  block_data?: Record<string, unknown>;
  order?: number;
}

export interface UpdateBlockResponse {
  updated_at: string;
}

export interface ReorderBlocksRequest {
  blocks: { id: string; order: number }[];
}

export type ExportFormat = "pptx" | "pdf";

export interface ExportRequest {
  format: ExportFormat;
}

/* ── Validation ───────────────────────────────────────────────────────── */

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

/** RFC-4122-ish UUID shape (relaxed but rejects obvious garbage). */
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateCreateProposal(
  body: CreateProposalRequest,
): ValidationResult {
  const errors: string[] = [];
  if (!body || typeof body.title !== "string" || body.title.trim() === "") {
    errors.push("title is required");
  } else if (body.title.length > 300) {
    errors.push("title must be 300 characters or fewer");
  }
  if (
    body?.description !== undefined &&
    body.description !== null &&
    typeof body.description !== "string"
  ) {
    errors.push("description must be a string");
  }
  return { ok: errors.length === 0, errors };
}

export function validateUpdateProposal(
  body: UpdateProposalRequest,
): ValidationResult {
  const errors: string[] = [];
  if (body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim() === "") {
      errors.push("title must be a non-empty string");
    } else if (body.title.length > 300) {
      errors.push("title must be 300 characters or fewer");
    }
  }
  if (
    body.description !== undefined &&
    body.description !== null &&
    typeof body.description !== "string"
  ) {
    errors.push("description must be a string");
  }
  if (body.title === undefined && body.description === undefined) {
    errors.push("provide at least one of title or description");
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Validate a block's type + payload. We keep block_data permissive
 * (jsonb) but enforce the minimum keys each type needs so the canvas
 * and PPTX renderer can rely on them.
 */
export function validateBlock(
  blockType: unknown,
  blockData: unknown,
): ValidationResult {
  const errors: string[] = [];

  if (
    typeof blockType !== "string" ||
    !(BLOCK_TYPES as readonly string[]).includes(blockType)
  ) {
    errors.push(
      `block_type must be one of ${BLOCK_TYPES.join(", ")} (got ${JSON.stringify(blockType)})`,
    );
    return { ok: false, errors };
  }

  const data = (blockData ?? {}) as Record<string, unknown>;
  if (typeof data !== "object" || Array.isArray(data)) {
    errors.push("block_data must be an object");
    return { ok: false, errors };
  }

  switch (blockType as BlockType) {
    case "tort_page":
      if (!data.tort_slug || typeof data.tort_slug !== "string") {
        errors.push("tort_page blocks require block_data.tort_slug");
      }
      break;
    case "state_intel":
      if (!data.state_abbr || typeof data.state_abbr !== "string") {
        errors.push("state_intel blocks require block_data.state_abbr");
      }
      break;
    case "ad_intel": {
      const valid = new Set<string>(AD_INTEL_SURFACES.map((s) => s.id));
      if (!data.surface || typeof data.surface !== "string") {
        errors.push("ad_intel blocks require block_data.surface");
      } else if (!valid.has(data.surface)) {
        errors.push(`Unknown ad_intel surface: ${JSON.stringify(data.surface)}`);
      }
      break;
    }
    case "campaign":
      if (
        !data.campaign_id ||
        typeof data.campaign_id !== "string" ||
        !UUID_RE.test(data.campaign_id)
      ) {
        errors.push("campaign blocks require a UUID block_data.campaign_id");
      }
      break;
    case "custom_text":
      if (typeof data.title !== "string" || data.title.trim() === "") {
        errors.push("custom_text blocks require a non-empty block_data.title");
      }
      if (typeof data.content !== "string") {
        errors.push("custom_text blocks require block_data.content (string)");
      }
      break;
  }

  return { ok: errors.length === 0, errors };
}

export function validateReorder(
  body: ReorderBlocksRequest,
): ValidationResult {
  const errors: string[] = [];
  if (!body || !Array.isArray(body.blocks) || body.blocks.length === 0) {
    errors.push("blocks must be a non-empty array");
    return { ok: false, errors };
  }
  body.blocks.forEach((b, i) => {
    if (!b || typeof b.id !== "string" || !UUID_RE.test(b.id)) {
      errors.push(`blocks[${i}].id must be a UUID`);
    }
    if (typeof b.order !== "number" || !Number.isFinite(b.order)) {
      errors.push(`blocks[${i}].order must be a number`);
    }
  });
  return { ok: errors.length === 0, errors };
}
