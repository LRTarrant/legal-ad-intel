/**
 * Tests for buyer-type-specific upgrade copy.
 *
 * Verifies the SPEC §5.4 acceptance criteria:
 *   - Law firm with MT only sees law-firm-specific copy when clicking PI tab
 *   - Ad agency over campaign cap sees agency-specific copy with overage option
 *   - Media company never sees locked-state copy paths in practice
 *   - Each modal has a "Talk to sales" CTA
 */

import {
  getUpgradeCopy,
  isEntitlementError,
  reasonFromEntitlementError,
  buildSalesMailto,
  type EntitlementErrorBody,
} from "./upgrade-copy";
import type { ClientSubscription } from "@/app/api/subscription/me/route";

/* ──────────────────────────────────────────────────────────────────────── */
/* Fixtures                                                                 */
/* ──────────────────────────────────────────────────────────────────────── */

function makeSub(over: Partial<ClientSubscription> = {}): ClientSubscription {
  return {
    buyer_type: "law_firm",
    subscription_tier: "single_state_mt",
    billing_cycle: "annual",
    campaign_builder_mass_tort: true,
    campaign_builder_pi: false,
    campaign_builder_monthly_cap: 25,
    campaign_builder_white_label: false,
    campaign_builder_api_access: false,
    geo_scope_states: ["AL"],
    geo_scope_unlimited: false,
    seats_included: 2,
    seats_used: 1,
    active_tort_addons: [],
    status: "active",
    ...over,
  };
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Locked tab cases                                                         */
/* ──────────────────────────────────────────────────────────────────────── */

test("law firm with MT sees PI-locked copy referencing Single State + Both", () => {
  const copy = getUpgradeCopy("pi_locked", makeSub());
  expect(copy.headline).toContain("Personal Injury");
  expect(copy.body).toContain("Single State + Both");
  expect(copy.body).toContain("$1,500");
  expect(copy.primaryCta).toBe("Talk to sales");
});

test("law firm with PI sees MT-locked copy referencing Single State + Both", () => {
  const copy = getUpgradeCopy(
    "mt_locked",
    makeSub({ campaign_builder_mass_tort: false, campaign_builder_pi: true }),
  );
  expect(copy.headline).toContain("Mass Tort");
  expect(copy.body).toContain("Single State + Both");
  expect(copy.body).toContain("$1,500");
});

test("ad agency PI-locked copy references Multi-Market upgrade", () => {
  const copy = getUpgradeCopy(
    "pi_locked",
    makeSub({ buyer_type: "ad_agency" }),
  );
  expect(copy.body).toContain("Multi-Market");
});

test("media company PI-locked falls back gracefully (should never trigger)", () => {
  const copy = getUpgradeCopy(
    "pi_locked",
    makeSub({ buyer_type: "media_company" }),
  );
  expect(copy.headline).toContain("Upgrade required");
  expect(copy.primaryCta).toBe("Talk to sales");
});

/* ──────────────────────────────────────────────────────────────────────── */
/* Cap exceeded — ad agency overage                                         */
/* ──────────────────────────────────────────────────────────────────────── */

test("ad agency with cap=50 (Regional) gets $25 overage option", () => {
  const sub = makeSub({
    buyer_type: "ad_agency",
    campaign_builder_monthly_cap: 50,
  });
  const copy = getUpgradeCopy("monthly_cap_exceeded", sub, {
    cap: 50,
    used: 50,
  });
  expect(copy.headline).toContain("Monthly campaign cap");
  expect(copy.body).toContain("50 of 50");
  expect(copy.body).toContain("$25");
  expect(copy.overage).toEqual({
    label: "Generate anyway ($25)",
    pricePerCampaign: 25,
  });
});

test("ad agency with cap=200 (Multi-Market) gets $15 overage option", () => {
  const sub = makeSub({
    buyer_type: "ad_agency",
    campaign_builder_monthly_cap: 200,
  });
  const copy = getUpgradeCopy("monthly_cap_exceeded", sub, {
    cap: 200,
    used: 200,
  });
  expect(copy.body).toContain("$15");
  expect(copy.overage?.pricePerCampaign).toBe(15);
});

test("ad agency with cap=null (Enterprise) has no overage option", () => {
  const sub = makeSub({
    buyer_type: "ad_agency",
    campaign_builder_monthly_cap: null,
  });
  const copy = getUpgradeCopy("monthly_cap_exceeded", sub, {
    cap: 0,
    used: 0,
  });
  expect(copy.overage).toBeUndefined();
});

test("law firm cap-exceeded copy references Multi-State, no overage", () => {
  const sub = makeSub({ campaign_builder_monthly_cap: 25 });
  const copy = getUpgradeCopy("monthly_cap_exceeded", sub, {
    cap: 25,
    used: 25,
  });
  expect(copy.body).toContain("Multi-State");
  expect(copy.body).toContain("$3,500");
  expect(copy.overage).toBeUndefined();
});

/* ──────────────────────────────────────────────────────────────────────── */
/* Geo scope                                                                */
/* ──────────────────────────────────────────────────────────────────────── */

test("law firm geo violation surfaces requested state in headline", () => {
  const copy = getUpgradeCopy("geo_scope_violation", makeSub(), {
    requested_state: "TX",
    allowed_states: ["AL"],
  });
  expect(copy.headline).toContain("TX");
  expect(copy.body).toContain("1 state");
  expect(copy.body).toContain("Multi-State");
});

test("law firm geo violation pluralizes state count correctly", () => {
  const copy = getUpgradeCopy("geo_scope_violation", makeSub({ geo_scope_states: ["AL", "GA", "FL"] }), {
    requested_state: "TX",
    allowed_states: ["AL", "GA", "FL"],
  });
  expect(copy.body).toContain("3 states");
});

test("ad agency geo violation references Multi-Market upgrade", () => {
  const copy = getUpgradeCopy(
    "geo_scope_violation",
    makeSub({ buyer_type: "ad_agency" }),
    { requested_state: "NY", allowed_states: ["CA"] },
  );
  expect(copy.body).toContain("Multi-Market");
  expect(copy.headline).toContain("NY");
});

/* ──────────────────────────────────────────────────────────────────────── */
/* No subscription                                                          */
/* ──────────────────────────────────────────────────────────────────────── */

test("no subscription always returns generic no_access copy", () => {
  const copy = getUpgradeCopy("pi_locked", null);
  expect(copy.headline).toContain("access required");
  expect(copy.primaryCta).toBe("Talk to sales");
});

test("no_access reason returns no_access copy regardless of sub", () => {
  const copy = getUpgradeCopy("no_access", makeSub());
  expect(copy.headline).toContain("access required");
});

/* ──────────────────────────────────────────────────────────────────────── */
/* Talk-to-sales CTA invariant (SPEC §5.4 acceptance criterion)             */
/* ──────────────────────────────────────────────────────────────────────── */

test("every reason × buyer combo produces a 'Talk to sales' CTA", () => {
  const reasons = [
    "pi_locked",
    "mt_locked",
    "no_access",
    "monthly_cap_exceeded",
    "geo_scope_violation",
  ] as const;
  const buyers: ClientSubscription["buyer_type"][] = [
    "law_firm",
    "ad_agency",
    "media_company",
  ];
  for (const reason of reasons) {
    for (const buyer of buyers) {
      const copy = getUpgradeCopy(reason, makeSub({ buyer_type: buyer }), {
        cap: 10,
        used: 10,
        requested_state: "TX",
        allowed_states: ["AL"],
      });
      expect(copy.primaryCta).toBe("Talk to sales");
    }
  }
});

/* ──────────────────────────────────────────────────────────────────────── */
/* isEntitlementError type guard                                            */
/* ──────────────────────────────────────────────────────────────────────── */

test("isEntitlementError accepts known codes", () => {
  expect(isEntitlementError({ code: "monthly_cap_exceeded", error: "x" })).toBe(true);
  expect(isEntitlementError({ code: "practice_area_locked", error: "x" })).toBe(true);
  expect(isEntitlementError({ code: "geo_scope_violation", error: "x" })).toBe(true);
  expect(isEntitlementError({ code: "subscription_inactive", error: "x" })).toBe(true);
});

test("isEntitlementError rejects unknown / non-entitlement bodies", () => {
  expect(isEntitlementError({ code: "validation_failed" })).toBe(false);
  expect(isEntitlementError({ error: "oops" })).toBe(false);
  expect(isEntitlementError(null)).toBe(false);
  expect(isEntitlementError("string")).toBe(false);
});

/* ──────────────────────────────────────────────────────────────────────── */
/* reasonFromEntitlementError                                               */
/* ──────────────────────────────────────────────────────────────────────── */

test("practice_area_locked maps to pi_locked when caller asked for PI", () => {
  const body: EntitlementErrorBody = {
    error: "x",
    code: "practice_area_locked",
  };
  const out = reasonFromEntitlementError(body, "personal_injury");
  expect(out.reason).toBe("pi_locked");
});

test("practice_area_locked maps to mt_locked when caller asked for MT", () => {
  const body: EntitlementErrorBody = {
    error: "x",
    code: "practice_area_locked",
  };
  const out = reasonFromEntitlementError(body, "mass_tort");
  expect(out.reason).toBe("mt_locked");
});

test("monthly_cap_exceeded carries cap/used/period_end into meta", () => {
  const body: EntitlementErrorBody = {
    error: "x",
    code: "monthly_cap_exceeded",
    meta: { cap: 25, used: 25, period_end: "2026-06-01T00:00:00Z" },
  };
  const out = reasonFromEntitlementError(body, "personal_injury");
  expect(out.reason).toBe("monthly_cap_exceeded");
  expect(out.meta.cap).toBe(25);
  expect(out.meta.used).toBe(25);
  expect(out.meta.period_end).toBe("2026-06-01T00:00:00Z");
});

test("geo_scope_violation carries state context into meta and uppercases", () => {
  const body: EntitlementErrorBody = {
    error: "x",
    code: "geo_scope_violation",
    meta: { requested_state: "tx", allowed_states: ["AL", "GA"] },
  };
  const out = reasonFromEntitlementError(body, "personal_injury");
  expect(out.reason).toBe("geo_scope_violation");
  expect(out.meta.requested_state).toBe("TX");
  expect(out.meta.allowed_states).toEqual(["AL", "GA"]);
});

test("subscription_inactive maps to no_access", () => {
  const body: EntitlementErrorBody = {
    error: "x",
    code: "subscription_inactive",
  };
  const out = reasonFromEntitlementError(body, "personal_injury");
  expect(out.reason).toBe("no_access");
});

/* ──────────────────────────────────────────────────────────────────────── */
/* buildSalesMailto                                                         */
/* ──────────────────────────────────────────────────────────────────────── */

test("buildSalesMailto produces a sales@ link with subject + body", () => {
  const link = buildSalesMailto("pi_locked", makeSub());
  expect(link).toContain("mailto:sales@legalmarketingintelligence.com");
  expect(link).toContain("subject=");
  expect(link).toContain("body=");
});

test("buildSalesMailto handles null subscription", () => {
  const link = buildSalesMailto("no_access", null);
  expect(link).toContain("mailto:sales@");
});
