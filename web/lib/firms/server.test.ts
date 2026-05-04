/**
 * Tests for the firms server module — list / get / create / update /
 * ensureSelfFirmForLawFirm.
 *
 * Uses a richer fake-Supabase than entitlements.test.ts because the
 * firms module makes multiple sequential queries (firm_managers then
 * firms). The fake records inserts/updates/queries so tests can assert
 * the right rows were touched.
 */

import {
  listFirmsForUser,
  getFirmForUser,
  createFirm,
  updateFirm,
  ensureSelfFirmForLawFirm,
} from "./server";
import type { Firm, FirmRole } from "./types";

/* ──────────────────────────────────────────────────────────────────────── */
/* Fake supabase                                                            */
/* ──────────────────────────────────────────────────────────────────────── */

interface FakeStores {
  firms: Firm[];
  firm_managers: Array<{
    id: string;
    firm_id: string;
    manager_user_id: string;
    role: FirmRole;
    added_by_user_id?: string | null;
    added_at: string;
  }>;
}

function makeFakeSupabase(initial?: Partial<FakeStores>): {
  client: any;
  stores: FakeStores;
} {
  const stores: FakeStores = {
    firms: initial?.firms ? [...initial.firms] : [],
    firm_managers: initial?.firm_managers ? [...initial.firm_managers] : [],
  };

  let nextId = 1000;
  const newId = () => `00000000-0000-0000-0000-${(nextId++).toString().padStart(12, "0")}`;

  function fromTable(table: keyof FakeStores) {
    // Build a small query-builder-ish chain. Each method returns `this`
    // so callers can chain in any order; the terminal operation runs
    // against the stored filters.
    const filters: Array<{ kind: "eq" | "in"; column: string; value: unknown }> = [];
    let orderCol: string | null = null;
    let orderAsc = true;
    let limitN: number | null = null;
    let insertRow: Record<string, unknown> | null = null;
    let updateRow: Record<string, unknown> | null = null;
    let selecting = false;

    function rowsAfterFilters(): Array<Record<string, unknown>> {
      const all = stores[table] as unknown as Array<Record<string, unknown>>;
      return all.filter((row) =>
        filters.every((f) => {
          if (f.kind === "eq") return row[f.column] === f.value;
          if (f.kind === "in") return (f.value as unknown[]).includes(row[f.column]);
          return true;
        }),
      );
    }

    const builder: any = {
      select(_cols?: string) {
        selecting = true;
        return builder;
      },
      eq(column: string, value: unknown) {
        filters.push({ kind: "eq", column, value });
        return builder;
      },
      in(column: string, values: unknown[]) {
        filters.push({ kind: "in", column, value: values });
        return builder;
      },
      order(column: string, opts?: { ascending?: boolean }) {
        orderCol = column;
        orderAsc = opts?.ascending !== false;
        return builder;
      },
      limit(n: number) {
        limitN = n;
        return builder;
      },
      insert(row: Record<string, unknown>) {
        insertRow = { id: newId(), ...row };
        if (table === "firms") {
          insertRow = {
            ...insertRow,
            social_handles: insertRow.social_handles ?? {},
            voice_descriptors: insertRow.voice_descriptors ?? [],
            differentiators: insertRow.differentiators ?? [],
            partner_names: insertRow.partner_names ?? [],
            signature_phrases: insertRow.signature_phrases ?? [],
            service_areas: insertRow.service_areas ?? [],
            default_dma_codes: insertRow.default_dma_codes ?? [],
            extraction_source: insertRow.extraction_source ?? "manual",
            extracted_at: insertRow.extracted_at ?? null,
            notes: insertRow.notes ?? null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
        if (table === "firm_managers") {
          insertRow = {
            ...insertRow,
            added_at: insertRow.added_at ?? new Date().toISOString(),
          };
        }
        const arr = stores[table] as unknown as Array<Record<string, unknown>>;
        arr.push(insertRow);
        return builder;
      },
      update(payload: Record<string, unknown>) {
        updateRow = payload;
        return builder;
      },
      maybeSingle: async () => {
        const rows = applyOrderAndLimit(rowsAfterFilters());
        return { data: rows[0] ?? null, error: null };
      },
      single: async () => {
        if (insertRow) return { data: insertRow, error: null };
        if (updateRow) {
          const arr = stores[table] as unknown as Array<Record<string, unknown>>;
          let updated: Record<string, unknown> | null = null;
          for (const row of arr) {
            if (filters.every((f) => f.kind === "eq" ? row[f.column] === f.value : true)) {
              Object.assign(row, updateRow);
              updated = row;
              break;
            }
          }
          return updated
            ? { data: updated, error: null }
            : { data: null, error: { message: "0 rows", code: "PGRST116" } };
        }
        const rows = applyOrderAndLimit(rowsAfterFilters());
        if (rows.length === 0) {
          return { data: null, error: { message: "0 rows", code: "PGRST116" } };
        }
        return { data: rows[0], error: null };
      },
      // For chains like select().eq().eq() with NO terminal — we provide
      // a `then` so awaiting the whole chain returns the array result.
      then(resolve: (v: { data: unknown; error: null }) => unknown) {
        if (insertRow) {
          return resolve({ data: insertRow, error: null });
        }
        if (selecting) {
          const rows = applyOrderAndLimit(rowsAfterFilters());
          return resolve({ data: rows, error: null });
        }
        return resolve({ data: null, error: null });
      },
    };

    function applyOrderAndLimit(rows: Array<Record<string, unknown>>) {
      let out = rows;
      if (orderCol) {
        out = [...out].sort((a, b) => {
          const av = a[orderCol!] as string;
          const bv = b[orderCol!] as string;
          return orderAsc ? av.localeCompare(bv) : bv.localeCompare(av);
        });
      }
      if (limitN != null) out = out.slice(0, limitN);
      return out;
    }

    return builder;
  }

  return {
    client: { from: (table: string) => fromTable(table as keyof FakeStores) },
    stores,
  };
}

/* ──────────────────────────────────────────────────────────────────────── */
/* listFirmsForUser                                                         */
/* ──────────────────────────────────────────────────────────────────────── */

test("listFirmsForUser returns empty when user manages nothing", async () => {
  const { client } = makeFakeSupabase();
  const result = await listFirmsForUser(client, "user-x");
  expect(result).toEqual([]);
});

test("listFirmsForUser returns firms with role attached", async () => {
  const firm: Firm = makeFirm("Smith LLP");
  const { client } = makeFakeSupabase({
    firms: [firm],
    firm_managers: [
      {
        id: "fm-1",
        firm_id: firm.id,
        manager_user_id: "user-x",
        role: "owner",
        added_at: "2026-01-01T00:00:00Z",
      },
    ],
  });
  const result = await listFirmsForUser(client, "user-x");
  expect(result.length).toBe(1);
  expect(result[0].id).toBe(firm.id);
  expect(result[0].current_user_role).toBe("owner");
});

/* ──────────────────────────────────────────────────────────────────────── */
/* getFirmForUser                                                           */
/* ──────────────────────────────────────────────────────────────────────── */

test("getFirmForUser returns null when user has no role on firm", async () => {
  const firm: Firm = makeFirm("Smith LLP");
  const { client } = makeFakeSupabase({ firms: [firm], firm_managers: [] });
  const result = await getFirmForUser(client, "user-x", firm.id);
  expect(result).toBe(null);
});

test("getFirmForUser returns firm when user manages it", async () => {
  const firm: Firm = makeFirm("Smith LLP");
  const { client } = makeFakeSupabase({
    firms: [firm],
    firm_managers: [
      {
        id: "fm-1",
        firm_id: firm.id,
        manager_user_id: "user-x",
        role: "manager",
        added_at: "2026-01-01T00:00:00Z",
      },
    ],
  });
  const result = await getFirmForUser(client, "user-x", firm.id);
  expect(result?.id).toBe(firm.id);
  expect(result?.current_user_role).toBe("manager");
});

/* ──────────────────────────────────────────────────────────────────────── */
/* createFirm                                                               */
/* ──────────────────────────────────────────────────────────────────────── */

test("createFirm inserts firm + manager rows", async () => {
  const { client, stores } = makeFakeSupabase();
  const result = await createFirm(client, "user-x", { label: "Acme Law" }, "owner");
  expect(result.label).toBe("Acme Law");
  expect(result.current_user_role).toBe("owner");
  expect(stores.firms.length).toBe(1);
  expect(stores.firm_managers.length).toBe(1);
  expect(stores.firm_managers[0].manager_user_id).toBe("user-x");
  expect(stores.firm_managers[0].role).toBe("owner");
});

test("createFirm trims label whitespace", async () => {
  const { client, stores } = makeFakeSupabase();
  await createFirm(client, "user-x", { label: "  Spaced LLP  " });
  expect(stores.firms[0].label).toBe("Spaced LLP");
});

test("createFirm defaults role to 'manager'", async () => {
  const { client, stores } = makeFakeSupabase();
  await createFirm(client, "user-x", { label: "Acme" });
  expect(stores.firm_managers[0].role).toBe("manager");
});

test("createFirm passes brand profile fields through", async () => {
  const { client, stores } = makeFakeSupabase();
  await createFirm(client, "user-x", {
    label: "Acme",
    voice_descriptors: ["empathetic", "local"],
    differentiators: ["20 years in Birmingham"],
    website_url: "https://acmelaw.com",
  });
  expect(stores.firms[0].voice_descriptors).toEqual(["empathetic", "local"]);
  expect(stores.firms[0].differentiators).toEqual(["20 years in Birmingham"]);
  expect(stores.firms[0].website_url).toBe("https://acmelaw.com");
  expect(stores.firms[0].extraction_source).toBe("manual");
});

/* ──────────────────────────────────────────────────────────────────────── */
/* updateFirm                                                               */
/* ──────────────────────────────────────────────────────────────────────── */

test("updateFirm rejects when user has no role", async () => {
  const firm = makeFirm("X");
  const { client } = makeFakeSupabase({ firms: [firm], firm_managers: [] });
  let threw: Error | null = null;
  try {
    await updateFirm(client, "user-x", firm.id, { tagline: "new" });
  } catch (e) {
    threw = e as Error;
  }
  expect(threw !== null).toBe(true);
  if (threw) expect(threw.message).toContain("not found");
});

test("updateFirm rejects when user is only a viewer", async () => {
  const firm = makeFirm("X");
  const { client } = makeFakeSupabase({
    firms: [firm],
    firm_managers: [
      {
        id: "fm-1",
        firm_id: firm.id,
        manager_user_id: "user-x",
        role: "viewer",
        added_at: "2026-01-01T00:00:00Z",
      },
    ],
  });
  let threw: Error | null = null;
  try {
    await updateFirm(client, "user-x", firm.id, { tagline: "new" });
  } catch (e) {
    threw = e as Error;
  }
  expect(threw !== null).toBe(true);
  if (threw) expect(threw.message).toContain("viewers");
});

test("updateFirm patches only provided fields", async () => {
  const firm = makeFirm("X");
  const { client, stores } = makeFakeSupabase({
    firms: [firm],
    firm_managers: [
      {
        id: "fm-1",
        firm_id: firm.id,
        manager_user_id: "user-x",
        role: "manager",
        added_at: "2026-01-01T00:00:00Z",
      },
    ],
  });
  await updateFirm(client, "user-x", firm.id, { tagline: "new tagline" });
  expect(stores.firms[0].tagline).toBe("new tagline");
  expect(stores.firms[0].label).toBe("X");
});

/* ──────────────────────────────────────────────────────────────────────── */
/* ensureSelfFirmForLawFirm                                                 */
/* ──────────────────────────────────────────────────────────────────────── */

test("ensureSelfFirmForLawFirm is a no-op for ad_agency", async () => {
  const { client, stores } = makeFakeSupabase();
  const result = await ensureSelfFirmForLawFirm(client, "user-x", "ad_agency", "X");
  expect(result).toBe(null);
  expect(stores.firms.length).toBe(0);
  expect(stores.firm_managers.length).toBe(0);
});

test("ensureSelfFirmForLawFirm is a no-op for media_company", async () => {
  const { client, stores } = makeFakeSupabase();
  const result = await ensureSelfFirmForLawFirm(client, "user-x", "media_company", "X");
  expect(result).toBe(null);
  expect(stores.firms.length).toBe(0);
});

test("ensureSelfFirmForLawFirm creates owner row for new law firm user", async () => {
  const { client, stores } = makeFakeSupabase();
  const result = await ensureSelfFirmForLawFirm(client, "user-x", "law_firm", "Acme");
  expect(result?.label).toBe("Acme");
  expect(result?.current_user_role).toBe("owner");
  expect(stores.firms.length).toBe(1);
  expect(stores.firm_managers[0].role).toBe("owner");
});

test("ensureSelfFirmForLawFirm is idempotent — returns existing on second call", async () => {
  const { client, stores } = makeFakeSupabase();
  const first = await ensureSelfFirmForLawFirm(client, "user-x", "law_firm", "Acme");
  const second = await ensureSelfFirmForLawFirm(client, "user-x", "law_firm", "Different Label");
  expect(first?.id).toBe(second?.id);
  // Only one firm + one manager row, despite two calls
  expect(stores.firms.length).toBe(1);
  expect(stores.firm_managers.length).toBe(1);
});

test("ensureSelfFirmForLawFirm falls back to 'My Firm' when label is empty", async () => {
  const { client, stores } = makeFakeSupabase();
  await ensureSelfFirmForLawFirm(client, "user-x", "law_firm", "   ");
  expect(stores.firms[0].label).toBe("My Firm");
});

/* ──────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                  */
/* ──────────────────────────────────────────────────────────────────────── */

function makeFirm(label: string): Firm {
  return {
    id: `firm-${label.replace(/\s+/g, "-").toLowerCase()}`,
    label,
    website_url: null,
    social_handles: {},
    tagline: null,
    voice_descriptors: [],
    differentiators: [],
    partner_names: [],
    signature_phrases: [],
    service_areas: [],
    default_state: null,
    default_dma_codes: [],
    notes: null,
    extraction_source: "manual",
    extracted_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}
