/**
 * Tests for the server-side entitlement check.
 *
 * Uses a fake SupabaseClient that the test harness can mock per test —
 * we don't need real DB access to verify the gating logic.
 */

import {
  checkCampaignBuilderEntitlement,
  entitlementErrorBody,
  type ServerSubscription,
} from "./entitlements";

/* ──────────────────────────────────────────────────────────────────────── */
/* Test fixtures + fake supabase                                            */
/* ──────────────────────────────────────────────────────────────────────── */

type SubFetchResult = {
  data: ServerSubscription | null;
  error: { message: string; code?: string } | null;
};

interface FakeOptions {
  /** Return value for the subscriptions lookup. */
  sub: SubFetchResult;
  /** Count returned by the campaigns count query. */
  campaignsCount?: number;
  /** Force an error from the campaigns count query. */
  campaignsError?: { message: string };
}

/**
 * Minimal SupabaseClient mock — only implements .from().select().eq().single()
 * for the subscriptions read, and .from().select(head, count).eq().gte() for
 * the cap count. We type as `any` because we're imitating a portion of the
 * real client surface.
 */
function makeFakeSupabase(opts: FakeOptions): any {
  return {
    from(table: string) {
      if (table === "subscriptions") {
        return {
          select() {
            return {
              eq() {
                return {
                  single: async () => opts.sub,
                };
              },
            };
          },
        };
      }
      if (table === "campaigns") {
        return {
          select(_cols: string, _options?: { count?: string; head?: boolean }) {
            return {
              eq() {
                return {
                  gte: async () => ({
                    count: opts.campaignsCount ?? 0,
                    error: opts.campaignsError ?? null,
                  }),
                };
              },
            };
          },
        };
      }
      throw new Error(`fake supabase: unknown table ${table}`);
    },
  };
}

const ACTIVE_FULL: ServerSubscription = {
  user_id: "user-1",
  buyer_type: "media_company",
  campaign_builder_mass_tort: true,
  campaign_builder_pi: true,
  campaign_builder_monthly_cap: null, // unlimited
  geo_scope_states: null,
  geo_scope_unlimited: true,
  status: "active",
  current_period_start: "2026-05-01T00:00:00Z",
  current_period_end: "2026-06-01T00:00:00Z",
};

const PGRST116 = { message: "0 rows", code: "PGRST116" };

/* ──────────────────────────────────────────────────────────────────────── */
/* Cases                                                                    */
/* ──────────────────────────────────────────────────────────────────────── */

test("ok when user has all entitlements", async () => {
  const sb = makeFakeSupabase({ sub: { data: ACTIVE_FULL, error: null } });
  const result = await checkCampaignBuilderEntitlement(sb, "user-1", {
    practice_area: "personal_injury",
    state: "CA",
    is_create: true,
  });
  expect(result.ok).toBe(true);
});

test("legacy bypass: no subscription row allows mass tort", async () => {
  const sb = makeFakeSupabase({ sub: { data: null, error: PGRST116 } });
  const result = await checkCampaignBuilderEntitlement(sb, "user-1", {
    practice_area: "mass_tort",
  });
  expect(result.ok).toBe(true);
  if (result.ok) expect(result.subscription).toBe(null);
});

test("legacy bypass does NOT extend to PI", async () => {
  const sb = makeFakeSupabase({ sub: { data: null, error: PGRST116 } });
  const result = await checkCampaignBuilderEntitlement(sb, "user-1", {
    practice_area: "personal_injury",
  });
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.code).toBe("practice_area_locked");
    expect(result.status).toBe(403);
  }
});

test("denies when subscription is past_due", async () => {
  const sb = makeFakeSupabase({
    sub: { data: { ...ACTIVE_FULL, status: "past_due" }, error: null },
  });
  const result = await checkCampaignBuilderEntitlement(sb, "user-1", {
    practice_area: "mass_tort",
  });
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.code).toBe("subscription_inactive");
    expect(result.status).toBe(403);
  }
});

test("trialing status is allowed", async () => {
  const sb = makeFakeSupabase({
    sub: { data: { ...ACTIVE_FULL, status: "trialing" }, error: null },
  });
  const result = await checkCampaignBuilderEntitlement(sb, "user-1", {
    practice_area: "mass_tort",
  });
  expect(result.ok).toBe(true);
});

test("denies PI when campaign_builder_pi=false", async () => {
  const sb = makeFakeSupabase({
    sub: { data: { ...ACTIVE_FULL, campaign_builder_pi: false }, error: null },
  });
  const result = await checkCampaignBuilderEntitlement(sb, "user-1", {
    practice_area: "personal_injury",
  });
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.code).toBe("practice_area_locked");
    expect(result.status).toBe(403);
  }
});

test("denies mass tort when campaign_builder_mass_tort=false", async () => {
  const sb = makeFakeSupabase({
    sub: {
      data: { ...ACTIVE_FULL, campaign_builder_mass_tort: false },
      error: null,
    },
  });
  const result = await checkCampaignBuilderEntitlement(sb, "user-1", {
    practice_area: "mass_tort",
  });
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.code).toBe("practice_area_locked");
});

test("denies on geo scope violation", async () => {
  const sb = makeFakeSupabase({
    sub: {
      data: {
        ...ACTIVE_FULL,
        geo_scope_unlimited: false,
        geo_scope_states: ["CA", "NY"],
      },
      error: null,
    },
  });
  const result = await checkCampaignBuilderEntitlement(sb, "user-1", {
    practice_area: "personal_injury",
    state: "TX",
  });
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.code).toBe("geo_scope_violation");
    expect(result.status).toBe(403);
  }
});

test("geo scope check normalizes state code to uppercase", async () => {
  const sb = makeFakeSupabase({
    sub: {
      data: {
        ...ACTIVE_FULL,
        geo_scope_unlimited: false,
        geo_scope_states: ["CA"],
      },
      error: null,
    },
  });
  const result = await checkCampaignBuilderEntitlement(sb, "user-1", {
    practice_area: "personal_injury",
    state: "ca",
  });
  expect(result.ok).toBe(true);
});

test("geo scope skipped when geo_scope_unlimited=true", async () => {
  const sb = makeFakeSupabase({
    sub: {
      data: {
        ...ACTIVE_FULL,
        geo_scope_unlimited: true,
        geo_scope_states: null,
      },
      error: null,
    },
  });
  const result = await checkCampaignBuilderEntitlement(sb, "user-1", {
    practice_area: "personal_injury",
    state: "TX",
  });
  expect(result.ok).toBe(true);
});

test("geo scope skipped when no state passed (multi-state job)", async () => {
  const sb = makeFakeSupabase({
    sub: {
      data: {
        ...ACTIVE_FULL,
        geo_scope_unlimited: false,
        geo_scope_states: ["CA"],
      },
      error: null,
    },
  });
  const result = await checkCampaignBuilderEntitlement(sb, "user-1", {
    practice_area: "mass_tort",
    state: null,
  });
  expect(result.ok).toBe(true);
});

test("monthly cap denies when over with is_create=true", async () => {
  const sb = makeFakeSupabase({
    sub: {
      data: { ...ACTIVE_FULL, campaign_builder_monthly_cap: 5 },
      error: null,
    },
    campaignsCount: 5,
  });
  const result = await checkCampaignBuilderEntitlement(sb, "user-1", {
    practice_area: "personal_injury",
    is_create: true,
  });
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.code).toBe("monthly_cap_exceeded");
    expect(result.status).toBe(429);
    expect(result.meta?.cap).toBe(5);
    expect(result.meta?.used).toBe(5);
  }
});

test("monthly cap allows when under", async () => {
  const sb = makeFakeSupabase({
    sub: {
      data: { ...ACTIVE_FULL, campaign_builder_monthly_cap: 5 },
      error: null,
    },
    campaignsCount: 3,
  });
  const result = await checkCampaignBuilderEntitlement(sb, "user-1", {
    practice_area: "personal_injury",
    is_create: true,
  });
  expect(result.ok).toBe(true);
});

test("monthly cap skipped when is_create=false", async () => {
  const sb = makeFakeSupabase({
    sub: {
      data: { ...ACTIVE_FULL, campaign_builder_monthly_cap: 5 },
      error: null,
    },
    campaignsCount: 100, // over cap, but read-only request
  });
  const result = await checkCampaignBuilderEntitlement(sb, "user-1", {
    practice_area: "personal_injury",
    is_create: false,
  });
  expect(result.ok).toBe(true);
});

test("monthly cap unlimited (null) is never tripped", async () => {
  const sb = makeFakeSupabase({
    sub: {
      data: { ...ACTIVE_FULL, campaign_builder_monthly_cap: null },
      error: null,
    },
    campaignsCount: 999,
  });
  const result = await checkCampaignBuilderEntitlement(sb, "user-1", {
    practice_area: "personal_injury",
    is_create: true,
  });
  expect(result.ok).toBe(true);
});

test("entitlementErrorBody maps a denial to {body, status}", () => {
  const denied = {
    ok: false as const,
    status: 429 as const,
    code: "monthly_cap_exceeded" as const,
    reason: "you hit the cap",
    meta: { cap: 5, used: 5 },
  };
  const out = entitlementErrorBody(denied);
  expect(out.status).toBe(429);
  expect(out.body.error).toBe("you hit the cap");
  expect(out.body.code).toBe("monthly_cap_exceeded");
  expect(out.body.meta).toEqual({ cap: 5, used: 5 });
});

test("DB lookup error surfaces as thrown Error", async () => {
  const sb = makeFakeSupabase({
    sub: { data: null, error: { message: "connection lost" } },
  });
  let threw: Error | null = null;
  try {
    await checkCampaignBuilderEntitlement(sb, "user-1", {
      practice_area: "mass_tort",
    });
  } catch (e) {
    threw = e as Error;
  }
  expect(threw !== null).toBe(true);
  if (threw) expect(threw.message).toContain("subscription lookup failed");
});

test("cap query DB error surfaces as thrown Error", async () => {
  const sb = makeFakeSupabase({
    sub: {
      data: { ...ACTIVE_FULL, campaign_builder_monthly_cap: 5 },
      error: null,
    },
    campaignsError: { message: "timeout" },
  });
  let threw: Error | null = null;
  try {
    await checkCampaignBuilderEntitlement(sb, "user-1", {
      practice_area: "mass_tort",
      is_create: true,
    });
  } catch (e) {
    threw = e as Error;
  }
  expect(threw !== null).toBe(true);
  if (threw) expect(threw.message).toContain("cap count query failed");
});
