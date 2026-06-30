/**
 * Unit tests for assembleStrategyInputs market scoping.
 * Run with: npx tsx --test lib/strategy-engine/assemble-inputs.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import { assembleStrategyInputs, normalizeDmaName } from "./assemble-inputs";

/** Minimal chainable Supabase mock. Each table/rpc returns canned rows. */
function mockSupabase(tables: Record<string, unknown[]>, rpcs: Record<string, unknown[]> = {}) {
  const builder = (rows: unknown[]) => {
    const b: Record<string, unknown> = {};
    // "range" is required by the paginated media_outlets fetch; the canned row
    // count is < 1000 so the pagination loop breaks after one page.
    for (const m of ["select", "contains", "order", "eq", "limit", "range"]) {
      b[m] = () => b;
    }
    // Awaiting the builder resolves to { data, error }.
    (b as { then: unknown }).then = (resolve: (v: unknown) => void) =>
      resolve({ data: rows, error: null });
    return b;
  };
  return {
    from: (table: string) => builder(tables[table] ?? []),
    rpc: async (fn: string) => ({ data: rpcs[fn] ?? [], error: null }),
  };
}

test("scopes media_outlets to the selected DMA, not the whole state", async () => {
  const sb = mockSupabase(
    {
      dma_markets: [
        { dma_code: "630", display_name: "Birmingham", full_name: "Birmingham AL", rank: 44, states_covered: ["AL"], primary_state: "AL" },
        { dma_code: "691", display_name: "Huntsville", full_name: "Huntsville AL", rank: 81, states_covered: ["AL"], primary_state: "AL" },
      ],
      media_outlets: [
        { call_sign: "WBHM", media_company: "x", media_format: "Audio", media_type: "", format_genre: "News", market: "Birmingham" },
        { call_sign: "WLOR", media_company: "y", media_format: "Audio", media_type: "", format_genre: "Urban", market: "Huntsville" },
      ],
      media_consumption_baseline: [],
      media_profiles: [],
      census_demographics: [],
    },
    { get_pi_competitors_by_dma: [], get_state_accident_summary: [] },
  );

  const { inputs } = await assembleStrategyInputs(sb, "AL", { dmaCode: "691" });

  const markets = inputs.outlets.map((o) => o.name);
  assert.ok(markets.includes("WLOR"), "Huntsville outlet present");
  assert.ok(!markets.includes("WBHM"), "Birmingham outlet must NOT appear for a Huntsville selection");
  assert.equal(inputs.top_dma_name, "Huntsville");
});

test("broadcast_stations backfill stays in the selected DMA", async () => {
  const sb = mockSupabase(
    {
      dma_markets: [
        { dma_code: "630", display_name: "Birmingham", full_name: "Birmingham AL", rank: 44, states_covered: ["AL"], primary_state: "AL" },
        { dma_code: "691", display_name: "Huntsville", full_name: "Huntsville AL", rank: 81, states_covered: ["AL"], primary_state: "AL" },
      ],
      media_outlets: [], // force the broadcast backfill (outlets.length < 6)
      broadcast_stations: [
        { call_sign: "WVTM", service_type: "TV", community_city: "Birmingham", network_affil: "NBC", nielsen_dma: "Birmingham", active: true },
        { call_sign: "WAFF", service_type: "TV", community_city: "Huntsville", network_affil: "NBC", nielsen_dma: "Huntsville", active: true },
      ],
      media_consumption_baseline: [],
      media_profiles: [],
      census_demographics: [],
    },
    { get_pi_competitors_by_dma: [], get_state_accident_summary: [] },
  );

  const { inputs } = await assembleStrategyInputs(sb, "AL", { dmaCode: "691" });
  const names = inputs.outlets.map((o) => o.name);
  assert.ok(names.includes("WAFF"), "Huntsville station present");
  assert.ok(!names.includes("WVTM"), "Birmingham station must NOT backfill for a Huntsville selection");
});

test("unmatched dmaCode returns zero outlets, never the #1 DMA", async () => {
  const sb = mockSupabase(
    {
      dma_markets: [
        { dma_code: "630", display_name: "Birmingham", full_name: "Birmingham AL", rank: 44, states_covered: ["AL"], primary_state: "AL" },
        { dma_code: "691", display_name: "Huntsville", full_name: "Huntsville AL", rank: 81, states_covered: ["AL"], primary_state: "AL" },
      ],
      media_outlets: [
        { call_sign: "WBHM", media_company: "x", media_format: "Audio", media_type: "", format_genre: "News", market: "Birmingham" },
        { call_sign: "WLOR", media_company: "y", media_format: "Audio", media_type: "", format_genre: "Urban", market: "Huntsville" },
      ],
      broadcast_stations: [
        { call_sign: "WVTM", service_type: "TV", community_city: "Birmingham", network_affil: "NBC", nielsen_dma: "Birmingham", active: true },
        { call_sign: "WAFF", service_type: "TV", community_city: "Huntsville", network_affil: "NBC", nielsen_dma: "Huntsville", active: true },
      ],
      media_consumption_baseline: [],
      media_profiles: [],
      census_demographics: [],
    },
    { get_pi_competitors_by_dma: [], get_state_accident_summary: [] },
  );

  // dmaCode "999" does not exist in dma_markets
  const { inputs } = await assembleStrategyInputs(sb, "AL", { dmaCode: "999" });

  assert.equal(inputs.outlets.length, 0, "unmatched dmaCode must yield zero outlets");
  assert.notEqual(inputs.top_dma_name, "Birmingham", "must not fall back to #1 DMA label");
});

test("forwards the selected DMA to the competitor RPC so the competitive field is market-scoped", async () => {
  const rpcCalls: Array<{ fn: string; params?: Record<string, unknown> }> = [];
  const builder = (rows: unknown[]) => {
    const b: Record<string, unknown> = {};
    for (const m of ["select", "contains", "order", "eq", "limit", "range"]) b[m] = () => b;
    (b as { then: unknown }).then = (resolve: (v: unknown) => void) => resolve({ data: rows, error: null });
    return b;
  };
  const sb = {
    from: () => builder([]),
    rpc: async (fn: string, params?: Record<string, unknown>) => {
      rpcCalls.push({ fn, params });
      return { data: [], error: null };
    },
  };

  await assembleStrategyInputs(sb, "AL", { dmaCode: "691" });
  const competitorCall = rpcCalls.find((c) => c.fn === "get_pi_competitors_by_dma");
  assert.ok(competitorCall, "competitor RPC must be called");
  assert.equal(competitorCall!.params?.p_dma_code, "691", "selected DMA must be forwarded");

  // No DMA selected → statewide (NULL p_dma_code), not undefined.
  rpcCalls.length = 0;
  await assembleStrategyInputs(sb, "AL", {});
  const statewideCall = rpcCalls.find((c) => c.fn === "get_pi_competitors_by_dma");
  assert.equal(statewideCall!.params?.p_dma_code, null, "no DMA → null (statewide), not undefined");
});

test("normalizeDmaName collapses Nielsen market variants but preserves state disambiguation", () => {
  // Dallas: short dim label, two media_outlets spellings, and the broadcast spelling all align.
  const dallas = normalizeDmaName("Dallas-Ft. Worth");
  assert.equal(normalizeDmaName("Dallas"), "DALLAS"); // sanity: short label
  assert.equal(normalizeDmaName("Dallas-Ft.Worth"), dallas);
  assert.equal(normalizeDmaName("DALLAS-FT. WORTH"), dallas);
  assert.equal(dallas, "DALLAS FT WORTH");

  // Washington DC: comma variant aligns.
  assert.equal(normalizeDmaName("Washington DC"), normalizeDmaName("Washington, DC"));

  // St. Louis: period collapses to space.
  assert.equal(normalizeDmaName("St. Louis"), "ST LOUIS");

  // Disambiguation MUST survive — Portland ME and Portland OR stay distinct.
  assert.notEqual(normalizeDmaName("Portland, ME"), normalizeDmaName("Portland, OR"));
});

test("short dim label matches an outlet whose market is the Nielsen variant (via full_name)", async () => {
  const sb = mockSupabase(
    {
      dma_markets: [
        // display "Dallas", full_name carries the Nielsen variant.
        { dma_code: "623", display_name: "Dallas", full_name: "Dallas-Ft. Worth", rank: 5, states_covered: ["TX"], primary_state: "TX" },
      ],
      media_outlets: [
        { call_sign: "KDFW", media_company: "x", media_format: "Video", media_type: "", format_genre: "News", market: "Dallas-Ft.Worth" },
      ],
      media_consumption_baseline: [],
      media_profiles: [],
      census_demographics: [],
    },
    { get_pi_competitors_by_dma: [], get_state_accident_summary: [] },
  );

  const { inputs } = await assembleStrategyInputs(sb, "TX", { dmaCode: "623" });
  const names = inputs.outlets.map((o) => o.name);
  assert.ok(names.includes("KDFW"), "Nielsen-variant outlet must match the short 'Dallas' label via full_name");
});

test("Portland-OR selection excludes a Portland, ME outlet (no cross-state leak)", async () => {
  const sb = mockSupabase(
    {
      dma_markets: [
        { dma_code: "820", display_name: "Portland OR", full_name: "Portland, OR", rank: 21, states_covered: ["OR"], primary_state: "OR" },
      ],
      media_outlets: [
        { call_sign: "KGW", media_company: "x", media_format: "Video", media_type: "", format_genre: "News", market: "Portland, OR" },
        { call_sign: "WCSH", media_company: "y", media_format: "Video", media_type: "", format_genre: "News", market: "Portland, ME" },
      ],
      media_consumption_baseline: [],
      media_profiles: [],
      census_demographics: [],
    },
    { get_pi_competitors_by_dma: [], get_state_accident_summary: [] },
  );

  const { inputs } = await assembleStrategyInputs(sb, "OR", { dmaCode: "820" });
  const names = inputs.outlets.map((o) => o.name);
  assert.ok(names.includes("KGW"), "Portland OR outlet present");
  assert.ok(!names.includes("WCSH"), "Portland, ME outlet must NOT leak into a Portland, OR selection");
});
