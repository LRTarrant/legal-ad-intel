/**
 * Unit tests for the standalone Strategy composition helpers.
 * node:test + node:assert. Run with `npx tsx --test`.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCompetitiveChannels,
  buildHandoff,
  buildIntegratedPlan,
  leadMetricFor,
  primaryTort,
  validateInterview,
  readinessToFoundation,
  buildGoalText,
  READINESS_QUESTIONS,
} from "./standalone";
import type { StrategyInterviewRequest } from "./standalone";
import { CHANNEL_LABELS } from "./types";
import type { ChannelKey, ChannelPlan, FunnelStage, PlannedChannel } from "./types";
import type { MeasuredChannel, Recommendation } from "./recommendations";

function planned(channel: ChannelKey, stage: FunnelStage, opportunity: number): PlannedChannel {
  return {
    channel,
    label: CHANNEL_LABELS[channel],
    stage,
    fit: 0.6,
    competition: null,
    opportunity,
    outlets: [],
    rationale: "",
  };
}

function planWith(...channels: PlannedChannel[]): ChannelPlan {
  const stages: Record<FunnelStage, PlannedChannel[]> = { awareness: [], consideration: [], conversion: [] };
  for (const c of channels) stages[c.stage].push(c);
  return { archetype: "audience_play", cadence: "always_on", funnel: "brand_led", stages, county_dma_translation: [], confidence: "high" };
}

test("primaryTort maps the first recognized case type", () => {
  assert.deepEqual(primaryTort(["trucking", "auto"]), { slug: "truck_accident", label: "Truck Accident" });
  assert.deepEqual(primaryTort(["unknown"]), { slug: "personal_injury", label: "Personal Injury" });
});

test("leadMetricFor prefers truck, then motorcycle, else total", () => {
  assert.equal(leadMetricFor(["auto", "trucking"]), "truck");
  assert.equal(leadMetricFor(["motorcycle"]), "motorcycle");
  assert.equal(leadMetricFor(["auto"]), "total");
});

test("validateInterview catches missing state / audience / case types", () => {
  assert.deepEqual(validateInterview({ state: "AL", audience: "agency", case_types: ["trucking"], intake_capacity: "scale", goal_context: "Win cases" } as StrategyInterviewRequest), []);
  const errs = validateInterview({ state: "alabama", audience: "x", case_types: [], intake_capacity: "scale", goal_context: "Win cases" } as unknown as StrategyInterviewRequest);
  assert.equal(errs.length, 3);
});

test("buildIntegratedPlan allocations sum to 100", () => {
  const plan = planWith(
    planned("ctv", "awareness", 0.8),
    planned("radio", "awareness", 0.4),
    planned("youtube", "consideration", 0.6),
    planned("search", "conversion", 0.5),
  );
  const alloc = buildIntegratedPlan(plan);
  assert.equal(alloc.reduce((s, a) => s + a.pct, 0), 100);
  // awareness gets the largest share under brand_led
  const awareness = alloc.filter((a) => a.stage === "awareness").reduce((s, a) => s + a.pct, 0);
  assert.ok(awareness >= 40);
});

test("buildHandoff uses the DMA when given, else the state's DMAs", () => {
  const recs = [{ channel: "ctv" }, { channel: "radio" }, { channel: "ctv" }] as Recommendation[];
  const withDma = buildHandoff("truck_accident", "698", recs, ["698", "630"]);
  assert.deepEqual(withDma, { case_type: "truck_accident", dmas: ["698"], channels: ["ctv", "radio"] });
  const stateWide = buildHandoff("truck_accident", null, recs, ["698", "630"]);
  assert.deepEqual(stateWide.dmas, ["698", "630"]);
});

test("buildCompetitiveChannels marks measured vs modeled", () => {
  const measured: MeasuredChannel[] = [{ channel: "search", active_firms: 22, status: "defended" }];
  const recs = [{ channel: "ctv" }, { channel: "search" }] as Recommendation[];
  const channels = buildCompetitiveChannels(measured, recs);
  const search = channels.find((c) => c.channel === "search");
  const ctv = channels.find((c) => c.channel === "ctv");
  assert.equal(search?.measured, true);
  assert.equal(search?.active_firms, 22);
  assert.equal(ctv?.measured, false);
  assert.equal(ctv?.status, "open");
});

/* ── Task 1 (4b): readiness/goal mappers ────────────────────────────────── */

function base(): StrategyInterviewRequest {
  return {
    audience: "agency",
    case_types: ["trucking"],
    state: "AL",
    dma_code: "691",
    county_fips: null,
    budget_tier: "25k_75k",
    goal: "More qualified signups",
    existing_channels: ["paid_search"],
    intake_capacity: "scale",
    goal_context: "Win more truck cases in 90 days; no billboards.",
    readiness: { landing_pages: "yes", tracking: "no", intake: "unsure", web_presence: "yes" },
  };
}

test("validateInterview requires the new framing fields", () => {
  assert.deepEqual(validateInterview(base()), []);
  const noIntake = { ...base(), intake_capacity: "" };
  assert.ok(validateInterview(noIntake).some((e) => /intake/i.test(e)));
  const noContext = { ...base(), goal_context: "   " };
  assert.ok(validateInterview(noContext).some((e) => /winning|goal_context|what/i.test(e)));
});

test("readinessToFoundation maps yes/no/unsure to prerequisite booleans", () => {
  const f = readinessToFoundation(base().readiness);
  assert.equal(f.landing_page, true); // landing_pages: yes
  assert.equal(f.conversion_tracking, false); // tracking: no
  assert.equal(f.call_tracking, false);
  assert.equal(f.fast_intake, undefined); // intake: unsure → omitted
  assert.equal(f.site_health, true); // web_presence: yes
});

test("readinessToFoundation tolerates a missing readiness object", () => {
  assert.deepEqual(readinessToFoundation(undefined), {});
});

test("buildGoalText folds the framing into one string the prompt can use", () => {
  const t = buildGoalText(base());
  assert.ok(t.includes("More qualified signups"));
  assert.ok(/truck cases/.test(t)); // the free-text context
  assert.ok(/intake/i.test(t)); // intake capacity surfaced
});

test("every readiness question maps to at least one real prerequisite", () => {
  for (const q of READINESS_QUESTIONS) {
    assert.ok(q.prerequisites.length > 0, `${q.key} has no prerequisites`);
  }
});
