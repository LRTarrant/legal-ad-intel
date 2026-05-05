/**
 * Server-side firm management helpers.
 *
 * Encapsulates the create/list/lookup flows on top of the firms +
 * firm_managers tables. UI and API routes call these instead of hitting
 * Supabase directly so:
 *   - The auto-create rules for law firms live in one place
 *   - Buyer-type-specific defaults stay consistent
 *   - We can log every firm-touch through one path (cost attribution
 *     in Phase 0.5 will plug in here)
 *
 * Pattern matches the existing entitlements.ts approach: take a SupabaseClient,
 * cast to `any` for the tables not yet in generated Database types.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CreateFirmInput,
  Firm,
  FirmRole,
  FirmWithRole,
  UpdateFirmInput,
} from "./types";

/* ──────────────────────────────────────────────────────────────────────── */
/* List firms managed by a user                                             */
/* ──────────────────────────────────────────────────────────────────────── */

/**
 * List every firm the user has any role on, with their role attached.
 *
 * Used by:
 *   - Settings → Client Firms list (agency / media)
 *   - Settings → My Firm (law firm — should return exactly 1)
 *   - Campaign Builder firm picker
 */
export async function listFirmsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<FirmWithRole[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Two-step query to keep RLS happy: fetch firm_managers first, then
  // fetch the firms by id. Avoids relying on PostgREST's join syntax
  // for tables not yet in the generated types.
  const { data: rels, error: relErr } = (await db
    .from("firm_managers")
    .select("firm_id, role")
    .eq("manager_user_id", userId)) as {
    data: Array<{ firm_id: string; role: FirmRole }> | null;
    error: { message: string } | null;
  };
  if (relErr) throw new Error(`firm_managers list failed: ${relErr.message}`);
  if (!rels || rels.length === 0) return [];

  const firmIds = rels.map((r) => r.firm_id);
  const { data: firms, error: firmErr } = (await db
    .from("firms")
    .select("*")
    .in("id", firmIds)
    .order("label", { ascending: true })) as {
    data: Firm[] | null;
    error: { message: string } | null;
  };
  if (firmErr) throw new Error(`firms list failed: ${firmErr.message}`);
  if (!firms) return [];

  const roleByFirm = new Map(rels.map((r) => [r.firm_id, r.role]));
  return firms.map((f) => ({
    ...f,
    current_user_role: roleByFirm.get(f.id) ?? "viewer",
  }));
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Look up a single firm with role check                                    */
/* ──────────────────────────────────────────────────────────────────────── */

/**
 * Fetch a firm by id, but ONLY if the requesting user has a role on it.
 * Returns null when the user has no role on the firm (or the firm doesn't
 * exist). Use this for any route that takes a firm_id parameter.
 */
export async function getFirmForUser(
  supabase: SupabaseClient,
  userId: string,
  firmId: string,
): Promise<FirmWithRole | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: rel, error: relErr } = (await db
    .from("firm_managers")
    .select("role")
    .eq("firm_id", firmId)
    .eq("manager_user_id", userId)
    .single()) as {
    data: { role: FirmRole } | null;
    error: { message: string; code?: string } | null;
  };
  if (relErr && relErr.code !== "PGRST116" && !relErr.message?.includes("0 rows")) {
    throw new Error(`firm_managers lookup failed: ${relErr.message}`);
  }
  if (!rel) return null;

  const { data: firm, error: firmErr } = (await db
    .from("firms")
    .select("*")
    .eq("id", firmId)
    .single()) as {
    data: Firm | null;
    error: { message: string; code?: string } | null;
  };
  if (firmErr || !firm) return null;

  return { ...firm, current_user_role: rel.role };
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Create a firm with the caller as a manager                               */
/* ──────────────────────────────────────────────────────────────────────── */

/**
 * Create a new firm and attach the caller as a manager (or owner).
 *
 * Implementation note — RLS gotcha:
 *   The firms SELECT policy only matches rows the user manages (i.e. has a
 *   firm_managers row for). If we INSERT firms with `.select().single()`,
 *   the implicit RETURNING fires the SELECT policy on the brand-new row
 *   BEFORE the firm_managers row exists, and Postgres surfaces this as the
 *   misleading error: `new row violates row-level security policy for
 *   table "firms"`. The INSERT itself is allowed (`WITH CHECK (true)`),
 *   only the RETURNING visibility fails.
 *
 *   Fix: generate the id client-side, INSERT both rows without RETURNING,
 *   then SELECT once at the end (now visible because firm_managers exists).
 *
 * If firm_managers insert fails we attempt to delete the orphan firm so
 * the user can retry without dirtying the table.
 */
export async function createFirm(
  supabase: SupabaseClient,
  userId: string,
  input: CreateFirmInput,
  role: FirmRole = "manager",
): Promise<FirmWithRole> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Generate the UUID up front so we can INSERT without RETURNING and
  // still know the id we just created.
  const firmId = crypto.randomUUID();

  const firmRow = {
    id: firmId,
    label: input.label.trim(),
    website_url: input.website_url ?? null,
    social_handles: input.social_handles ?? {},
    tagline: input.tagline ?? null,
    voice_descriptors: input.voice_descriptors ?? [],
    differentiators: input.differentiators ?? [],
    partner_names: input.partner_names ?? [],
    signature_phrases: input.signature_phrases ?? [],
    service_areas: input.service_areas ?? [],
    pronunciation_overrides: input.pronunciation_overrides ?? [],
    default_state: input.default_state ?? null,
    default_dma_codes: input.default_dma_codes ?? [],
    notes: input.notes ?? null,
    extraction_source: "manual",
  };

  // Step 1: insert firms row, NO RETURNING (skip implicit SELECT-policy
  // check that would fail — see big comment above).
  const { error: firmErr } = await db.from("firms").insert(firmRow);
  if (firmErr) {
    throw new Error(`firm insert failed: ${firmErr.message}`);
  }

  // Step 2: insert firm_managers row that makes the firm visible to the
  // user. From this point on the firm row is also visible via SELECT.
  const { error: relErr } = await db.from("firm_managers").insert({
    firm_id: firmId,
    manager_user_id: userId,
    role,
    added_by_user_id: userId,
  });
  if (relErr) {
    // No DELETE policy on firms; orphan rows from this branch are rare
    // and a periodic cleanup job will sweep them in v2.
    throw new Error(`firm_managers insert failed: ${relErr.message}`);
  }

  // Step 3: now SELECT the firm — visible because firm_managers row exists.
  const { data: firm, error: selErr } = (await db
    .from("firms")
    .select("*")
    .eq("id", firmId)
    .single()) as {
    data: Firm | null;
    error: { message: string } | null;
  };
  if (selErr || !firm) {
    throw new Error(
      `firm post-insert read failed: ${selErr?.message ?? "unknown"}`,
    );
  }

  return { ...firm, current_user_role: role };
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Update a firm's brand profile / metadata                                 */
/* ──────────────────────────────────────────────────────────────────────── */

export async function updateFirm(
  supabase: SupabaseClient,
  userId: string,
  firmId: string,
  input: UpdateFirmInput,
): Promise<Firm> {
  // RLS already restricts updates to managers/owners, but we double-check
  // here so we can return a clean error instead of an opaque Postgres
  // permission failure.
  const existing = await getFirmForUser(supabase, userId, firmId);
  if (!existing) {
    throw new Error("firm not found or you don't have access");
  }
  if (existing.current_user_role === "viewer") {
    throw new Error("viewers cannot update a firm");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const payload: Record<string, unknown> = {};
  if (input.label !== undefined) payload.label = input.label.trim();
  if (input.website_url !== undefined) payload.website_url = input.website_url;
  if (input.social_handles !== undefined) payload.social_handles = input.social_handles;
  if (input.tagline !== undefined) payload.tagline = input.tagline;
  if (input.voice_descriptors !== undefined) payload.voice_descriptors = input.voice_descriptors;
  if (input.differentiators !== undefined) payload.differentiators = input.differentiators;
  if (input.partner_names !== undefined) payload.partner_names = input.partner_names;
  if (input.signature_phrases !== undefined) payload.signature_phrases = input.signature_phrases;
  if (input.service_areas !== undefined) payload.service_areas = input.service_areas;
  if (input.pronunciation_overrides !== undefined) payload.pronunciation_overrides = input.pronunciation_overrides;
  if (input.default_state !== undefined) payload.default_state = input.default_state;
  if (input.default_dma_codes !== undefined) payload.default_dma_codes = input.default_dma_codes;
  if (input.notes !== undefined) payload.notes = input.notes;
  if (input.extraction_source !== undefined) payload.extraction_source = input.extraction_source;
  if (input.extracted_at !== undefined) payload.extracted_at = input.extracted_at;

  if (Object.keys(payload).length === 0) {
    // No-op: just return the existing row.
    const { current_user_role: _ignored, ...rest } = existing;
    return rest as Firm;
  }

  const { data, error } = (await db
    .from("firms")
    .update(payload)
    .eq("id", firmId)
    .select()
    .single()) as { data: Firm | null; error: { message: string } | null };
  if (error || !data) {
    throw new Error(`firm update failed: ${error?.message ?? "unknown"}`);
  }
  return data;
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Auto-create the "self firm" for a law firm subscription                  */
/* ──────────────────────────────────────────────────────────────────────── */

/**
 * Idempotent: ensures a law firm user has exactly one firm where they
 * are the owner. Called the first time a law firm user touches Campaign
 * Builder so they don't have to manually configure a "client" — they
 * ARE the client.
 *
 * Returns the existing or newly-created self-firm.
 *
 * For agencies and media companies, this is a no-op — they manage many
 * firms via the explicit "Add client" flow.
 */
export async function ensureSelfFirmForLawFirm(
  supabase: SupabaseClient,
  userId: string,
  buyerType: "law_firm" | "ad_agency" | "media_company",
  defaultLabel: string,
): Promise<FirmWithRole | null> {
  if (buyerType !== "law_firm") return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Already has an owned firm?
  const { data: existing } = (await db
    .from("firm_managers")
    .select("firm_id, role")
    .eq("manager_user_id", userId)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle()) as {
    data: { firm_id: string; role: FirmRole } | null;
    error: { message: string } | null;
  };

  if (existing) {
    return getFirmForUser(supabase, userId, existing.firm_id);
  }

  // None — create one with the user as owner.
  return createFirm(
    supabase,
    userId,
    { label: defaultLabel.trim() || "My Firm" },
    "owner",
  );
}
